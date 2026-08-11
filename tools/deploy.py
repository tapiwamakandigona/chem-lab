#!/usr/bin/env python3
"""Deploy dist/ to Appwrite Sites (site 'chemlab', chemlab.tapiwa.me).

Usage:  npm run build && python3 tools/deploy.py
Reads APPWRITE_ENDPOINT / APPWRITE_PROJECT_ID / APPWRITE_API_KEY from
the env or from CREDS_FILE (default /work/.secrets/credentials.env).
No secrets live in this repo.
"""
import io
import os
import re
import sys
import tarfile
import time

import urllib.request
import urllib.error
import uuid

CREDS_FILE = os.environ.get("CREDS_FILE", "/work/.secrets/credentials.env")
SITE_ID = "chemlab"


def load_creds():
    vals = {}
    for key in ("APPWRITE_ENDPOINT", "APPWRITE_PROJECT_ID", "APPWRITE_API_KEY"):
        if os.environ.get(key):
            vals[key] = os.environ[key]
    if len(vals) < 3 and os.path.exists(CREDS_FILE):
        for line in open(CREDS_FILE):
            m = re.match(r"([A-Z_]+)=(.*)", line.strip())
            if m and m.group(1) not in vals:
                vals[m.group(1)] = m.group(2).strip().strip("'\"")
    missing = [k for k in ("APPWRITE_ENDPOINT", "APPWRITE_PROJECT_ID", "APPWRITE_API_KEY") if k not in vals]
    if missing:
        sys.exit(f"missing credentials: {missing}")
    return vals


def tar_dist(dist):
    buf = io.BytesIO()
    with tarfile.open(fileobj=buf, mode="w:gz") as tf:
        for root, _dirs, files in os.walk(dist):
            for f in files:
                full = os.path.join(root, f)
                tf.add(full, arcname=os.path.relpath(full, dist))
    return buf.getvalue()


def api(creds, method, path, data=None, headers=None):
    req = urllib.request.Request(
        creds["APPWRITE_ENDPOINT"] + path,
        data=data,
        method=method,
        headers={
            "x-appwrite-project": creds["APPWRITE_PROJECT_ID"],
            "x-appwrite-key": creds["APPWRITE_API_KEY"],
            **(headers or {}),
        },
    )
    with urllib.request.urlopen(req, timeout=120) as r:
        import json
        return json.loads(r.read())


def main():
    creds = load_creds()
    dist = os.path.join(os.path.dirname(__file__), "..", "dist")
    if not os.path.exists(os.path.join(dist, "index.html")):
        sys.exit("dist/index.html missing — run `npm run build` first")
    code = tar_dist(dist)
    print(f"uploading {len(code)} bytes...")

    boundary = uuid.uuid4().hex
    body = io.BytesIO()
    for name, value in (("activate", "true"),):
        body.write(f"--{boundary}\r\nContent-Disposition: form-data; name=\"{name}\"\r\n\r\n{value}\r\n".encode())
    body.write(
        f"--{boundary}\r\nContent-Disposition: form-data; name=\"code\"; filename=\"code.tar.gz\"\r\n"
        f"Content-Type: application/gzip\r\n\r\n".encode()
    )
    body.write(code)
    body.write(f"\r\n--{boundary}--\r\n".encode())

    dep = api(
        creds, "POST", f"/sites/{SITE_ID}/deployments",
        data=body.getvalue(),
        headers={"content-type": f"multipart/form-data; boundary={boundary}"},
    )
    dep_id = dep["$id"]
    print("deployment:", dep_id, dep["status"])

    for _ in range(60):
        d = api(creds, "GET", f"/sites/{SITE_ID}/deployments/{dep_id}")
        print("status:", d["status"], flush=True)
        if d["status"] == "ready":
            print("LIVE: https://chemlab.tapiwa.me/")
            return
        if d["status"] == "failed":
            print(d.get("buildLogs", "")[-2000:])
            sys.exit(1)
        time.sleep(5)
    sys.exit("timed out waiting for deployment")


if __name__ == "__main__":
    main()
