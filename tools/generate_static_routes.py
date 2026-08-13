#!/usr/bin/env python3
"""Generate static SPA fallbacks and an indexable ChemLab sitemap.

Each public route gets a tiny HTML entry with route-specific title,
description, canonical URL and JSON-LD. Vite then resolves its module graph in
the normal build. Appwrite can serve deep links without custom rewrite rules,
and crawlers receive meaningful metadata before React boots.
"""
from __future__ import annotations

from html import escape
import json
from pathlib import Path
import re
import shutil

ROOT = Path(__file__).resolve().parents[1]
INDEX = ROOT / "index.html"
GENERATED = ROOT / ".generated"
BASE_URL = "https://chemlab.tapiwa.me"

PRACTICALS = [
    ("titration", "Acid-Base & Redox Titration", "Operate a burette, read the meniscus, obtain concordant titres and complete marked Cambridge 9701-style calculations."),
    ("clock", "Iodine Clock Reaction", "Run five concentrations, measure reaction time, graph rate and interpret a Cambridge 9701-style gradient."),
    ("enthalpy", "Enthalpy of Solution", "Measure an exothermic temperature change, correct for heat loss and calculate enthalpy of solution."),
    ("qual", "Qualitative Analysis", "Test unknown salts and identify their ions from your own observations and chemical evidence."),
    ("grav", "Water of Crystallisation", "Heat a hydrated salt to constant mass and determine its water of crystallisation from measured masses."),
    ("gas", "Molar Gas Volume", "Collect carbon dioxide in a gas syringe and calculate percentage purity from your final volume."),
    ("organic", "Organic Analysis", "Use deciding tests to identify the functional groups in five unknown organic liquids."),
    ("electro", "Electrochemical Cells", "Build half-cells, measure cell potentials and identify an unknown metal from polarity and E° data."),
    ("chroma", "Paper Chromatography", "Develop a chromatogram, measure Rf values and identify the dyes in an unknown mixture."),
    ("flame", "Flame Tests", "Control sodium contamination and identify metal ions from their characteristic flame colours."),
    ("distill", "Simple Distillation", "Set condenser flow, control boiling and separate water safely by simple distillation."),
    ("solubility", "Solubility & Crystallisation", "Measure first-crystal temperatures and construct a potassium nitrate solubility curve."),
    ("peroxide", "Catalytic Decomposition Kinetics", "Collect oxygen-time curves and compare initial rates while controlling experimental variables."),
    ("iodine-rate", "Iodine–Propanone Rate Titration", "Quench a timed sample, titrate residual iodine and calculate a reaction rate from concordant results."),
]

ROUTES = [
    ("/guide", "Learner’s Guide — ChemLab", "Follow a 19-milestone learn-by-doing route through Cambridge 9701 practical chemistry skills."),
    ("/mocks", "Marked Mock Papers — ChemLab", "Open three marked chemistry mock-paper workflows based on results you collect in ChemLab practicals."),
    *[
        (f"/practical/{slug}", f"{title} — ChemLab", description)
        for slug, title, description in PRACTICALS
    ],
]


def route_html(base: str, route: str, title: str, description: str) -> str:
    canonical = f"{BASE_URL}{route}"
    page = base
    page = re.sub(r"<title>.*?</title>", f"<title>{escape(title)}</title>", page, count=1)
    page = re.sub(
        r'<meta name="description" content="[^"]*" />',
        f'<meta name="description" content="{escape(description, quote=True)}" />',
        page,
        count=1,
    )
    page = re.sub(
        r'<meta property="og:title" content="[^"]*" />',
        f'<meta property="og:title" content="{escape(title, quote=True)}" />',
        page,
        count=1,
    )
    page = re.sub(
        r'<meta property="og:description" content="[^"]*" />',
        f'<meta property="og:description" content="{escape(description, quote=True)}" />',
        page,
        count=1,
    )
    page = re.sub(
        r'<meta property="og:url" content="[^"]*" />',
        f'<meta property="og:url" content="{canonical}" />',
        page,
        count=1,
    )
    page = re.sub(
        r'<link rel="canonical" href="[^"]*" />',
        f'<link rel="canonical" href="{canonical}" />',
        page,
        count=1,
    )
    page = page.replace('<script type="application/ld+json">', '<script type="application/ld+json" data-root-schema hidden>', 1)
    schema = {
        "@context": "https://schema.org",
        "@type": "LearningResource",
        "name": title.replace(" — ChemLab", ""),
        "url": canonical,
        "description": description,
        "educationalLevel": "Cambridge International AS & A Level",
        "learningResourceType": "Interactive simulation" if route.startswith("/practical/") else "Study guide",
        "isAccessibleForFree": True,
        "provider": {"@type": "Organization", "name": "ChemLab"},
    }
    schema_tag = f'<script type="application/ld+json">{json.dumps(schema, ensure_ascii=False)}</script>'
    return page.replace("</head>", f"    {schema_tag}\n  </head>", 1)


def main() -> None:
    base = INDEX.read_text()
    shutil.rmtree(GENERATED, ignore_errors=True)
    for route_root in ("guide", "mocks", "practical"):
        shutil.rmtree(ROOT / route_root, ignore_errors=True)
    inputs: dict[str, str] = {"main": str(INDEX)}
    for i, (route, title, description) in enumerate(ROUTES):
        target = ROOT / route.lstrip("/") / "index.html"
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(route_html(base, route, title, description))
        inputs[f"route_{i}"] = str(target)

    sitemap_routes = ["/", *(route for route, _, _ in ROUTES)]
    lines = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ]
    for route in sitemap_routes:
        priority = "1.0" if route == "/" else "0.8"
        lines += [
            "  <url>",
            f"    <loc>{BASE_URL}{route}</loc>",
            "    <lastmod>2026-08-13</lastmod>",
            "    <changefreq>weekly</changefreq>",
            f"    <priority>{priority}</priority>",
            "  </url>",
        ]
    lines.append("</urlset>")
    (ROOT / "public" / "sitemap.xml").write_text("\n".join(lines) + "\n")
    GENERATED.mkdir(parents=True, exist_ok=True)
    (GENERATED / "inputs.json").write_text(json.dumps(inputs, indent=2) + "\n")
    print(f"generated {len(ROUTES)} route entries and {len(sitemap_routes)} sitemap URLs")


if __name__ == "__main__":
    main()
