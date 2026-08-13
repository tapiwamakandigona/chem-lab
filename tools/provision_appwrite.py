#!/usr/bin/env python3
"""Provision the ChemLab classroom schema in Appwrite. Idempotent.

Reads credentials from the environment (never from the repo):
    APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID, APPWRITE_DATA_KEY

Design notes that the schema encodes deliberately:

* Learners have no accounts. A join code is the capability token, so `classes`
  and `assignments` are readable by `any` — their contents are a class name,
  assignment titles and practical ids, i.e. no personal data. This is a
  conscious tradeoff: it also means the collections are enumerable by anyone
  with the project id. The fix, when it matters, is an Appwrite Function that
  mediates code -> class lookup so the collections can go private.
* `submissions` is create-for-`any`, but each document is written with
  document-level read/update/delete for the owning teacher only. A learner
  cannot read another learner's submission, or their own back — their copy
  lives on their own device.
* Aliases, never names or emails. Nothing here can identify a minor.

Run:  APPWRITE_DATA_KEY=... python3 tools/provision_appwrite.py [--dry-run]
"""

from __future__ import annotations

import json
import os
import sys
import time
import urllib.error
import urllib.request

DB_ID = "chemlab"
DB_NAME = "ChemLab"

# (key, type, size/extra, required, array)
CLASSES_ATTRS = [
    ("teacherId", "string", 64, True),
    ("name", "string", 60, True),
    ("code", "string", 8, True),
]
ASSIGNMENTS_ATTRS = [
    ("classId", "string", 64, True),
    ("title", "string", 80, True),
    ("items", "string", 4000, True),   # JSON array of {kind,id}
    ("dueAt", "string", 32, False),
]
SUBMISSIONS_ATTRS = [
    ("assignmentId", "string", 64, True),
    ("classId", "string", 64, True),
    ("alias", "string", 24, True),
    ("payload", "string", 100000, True),  # versioned chemlab-progress export
    ("itemsDone", "integer", None, False),
    ("itemsRequired", "integer", None, False),
    ("mockMarks", "integer", None, False),
    ("mockAvailable", "integer", None, False),
]

COLLECTIONS = [
    # id, name, permissions, attributes, indexes
    (
        "classes",
        "Classes",
        ['read("any")', 'create("users")'],
        CLASSES_ATTRS,
        [("code_unique", "unique", ["code"]), ("teacher_idx", "key", ["teacherId"])],
    ),
    (
        "assignments",
        "Assignments",
        ['read("any")', 'create("users")'],
        ASSIGNMENTS_ATTRS,
        [("class_idx", "key", ["classId"])],
    ),
    (
        "submissions",
        "Submissions",
        ['create("any")'],
        SUBMISSIONS_ATTRS,
        [("assignment_idx", "key", ["assignmentId"]), ("class_idx", "key", ["classId"])],
    ),
]


class Appwrite:
    def __init__(self, endpoint: str, project: str, key: str, dry_run: bool = False):
        self.endpoint = endpoint.rstrip("/")
        self.project = project
        self.key = key
        self.dry_run = dry_run

    def call(self, method: str, path: str, body: dict | None = None):
        if self.dry_run and method != "GET":
            print(f"    DRY-RUN {method} {path}")
            return 200, {}
        req = urllib.request.Request(self.endpoint + path, method=method)
        req.add_header("Content-Type", "application/json")
        req.add_header("X-Appwrite-Project", self.project)
        req.add_header("X-Appwrite-Key", self.key)
        data = json.dumps(body).encode() if body is not None else None
        try:
            with urllib.request.urlopen(req, data, timeout=45) as r:
                return r.status, json.loads(r.read() or b"{}")
        except urllib.error.HTTPError as e:
            raw = e.read().decode()
            try:
                return e.code, json.loads(raw)
            except ValueError:
                return e.code, {"raw": raw[:400]}


def ensure_database(aw: Appwrite) -> None:
    status, body = aw.call("GET", f"/databases/{DB_ID}")
    if status == 200:
        print(f"  database {DB_ID}: exists")
        return
    status, body = aw.call("POST", "/databases", {"databaseId": DB_ID, "name": DB_NAME})
    print(f"  database {DB_ID}: created ({status})" if status < 400 else f"  database FAILED {status} {body}")
    if status >= 400 and body.get("type") != "database_already_exists":
        sys.exit(1)


def ensure_collection(aw: Appwrite, cid: str, name: str, perms: list[str]) -> None:
    status, _ = aw.call("GET", f"/databases/{DB_ID}/collections/{cid}")
    if status == 200:
        print(f"  collection {cid}: exists")
        return
    status, body = aw.call("POST", f"/databases/{DB_ID}/collections", {
        "collectionId": cid,
        "name": name,
        "permissions": perms,
        "documentSecurity": True,
        "enabled": True,
    })
    if status >= 400 and body.get("type") != "collection_already_exists":
        sys.exit(f"  collection {cid} FAILED {status} {body}")
    print(f"  collection {cid}: created")


def ensure_attribute(aw: Appwrite, cid: str, attr) -> None:
    key, kind, size, required = attr
    status, existing = aw.call("GET", f"/databases/{DB_ID}/collections/{cid}/attributes/{key}")
    if status == 200:
        print(f"    attr {key}: exists ({existing.get('status')})")
        return
    if kind == "string":
        path = f"/databases/{DB_ID}/collections/{cid}/attributes/string"
        body = {"key": key, "size": size, "required": required}
    elif kind == "integer":
        path = f"/databases/{DB_ID}/collections/{cid}/attributes/integer"
        body = {"key": key, "required": required}
    else:
        sys.exit(f"unsupported attribute type {kind}")
    status, res = aw.call("POST", path, body)
    if status >= 400 and res.get("type") != "attribute_already_exists":
        sys.exit(f"    attr {key} FAILED {status} {res}")
    print(f"    attr {key}: created")


def wait_available(aw: Appwrite, cid: str, keys: list[str], timeout: float = 90) -> bool:
    """Attributes are built asynchronously; an index on a 'processing' attribute fails."""
    if aw.dry_run:
        return True
    deadline = time.time() + timeout
    while time.time() < deadline:
        status, body = aw.call("GET", f"/databases/{DB_ID}/collections/{cid}/attributes")
        states = {a["key"]: a.get("status") for a in body.get("attributes", [])}
        pending = [k for k in keys if states.get(k) != "available"]
        if not pending:
            return True
        time.sleep(2)
    print(f"    WARNING: attributes still processing in {cid}: {pending}")
    return False


def ensure_index(aw: Appwrite, cid: str, index) -> None:
    key, kind, attrs = index
    status, _ = aw.call("GET", f"/databases/{DB_ID}/collections/{cid}/indexes/{key}")
    if status == 200:
        print(f"    index {key}: exists")
        return
    status, res = aw.call("POST", f"/databases/{DB_ID}/collections/{cid}/indexes", {
        "key": key, "type": kind, "attributes": attrs,
    })
    if status >= 400 and res.get("type") != "index_already_exists":
        sys.exit(f"    index {key} FAILED {status} {res}")
    print(f"    index {key}: created")


def main() -> None:
    dry = "--dry-run" in sys.argv
    endpoint = os.environ.get("APPWRITE_ENDPOINT", "https://fra.cloud.appwrite.io/v1")
    project = os.environ.get("APPWRITE_PROJECT_ID")
    key = os.environ.get("APPWRITE_DATA_KEY")
    if not project or not key:
        sys.exit("APPWRITE_PROJECT_ID and APPWRITE_DATA_KEY must be set")

    aw = Appwrite(endpoint, project, key, dry_run=dry)
    print(f"provisioning {DB_ID} on {endpoint} (project {project[:12]}…){' [DRY RUN]' if dry else ''}")
    ensure_database(aw)
    for cid, name, perms, attrs, indexes in COLLECTIONS:
        ensure_collection(aw, cid, name, perms)
        for attr in attrs:
            ensure_attribute(aw, cid, attr)
        wait_available(aw, cid, [a[0] for a in attrs])
        for index in indexes:
            ensure_index(aw, cid, index)
    print("done")


if __name__ == "__main__":
    main()
