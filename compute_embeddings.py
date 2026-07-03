"""
compute_embeddings.py
=====================
Generates paper_embeddings.json — required by the AI Assistant tab.

For each of the 129 papers in data.csv this script:
  1. Builds a text document combining title, abstract, and extracted attributes.
  2. Calls the Gemini Embedding 001 API (taskType RETRIEVAL_DOCUMENT).
  3. Saves all embeddings + paper summaries to paper_embeddings.json.

Run once (takes ~5 min on free-tier quota due to rate limiting):

    pip install google-genai pandas
    python compute_embeddings.py

Then copy paper_embeddings.json next to index.html and serve.

Config ── edit the two constants below if your paths differ.
"""

import os, json, time, math, sys
import pandas as pd

# ── CONFIG ────────────────────────────────────────────────────────────────────
INPUT_CSV  = "data.csv"            # path to your data.csv
OUTPUT_JSON = "paper_embeddings.json"   # output — put next to index.html
GEMINI_API_KEY = "AIzaSyAvL3SZGDk-eWuYlKZIV0nsd3FzoFE1OmU"

# Gemini free tier: 1,500 requests/day, 5 RPM for embedding model.
# We embed one paper at a time with a 13-second sleep to stay under 5 RPM.
REQUESTS_PER_MINUTE = 4            # conservative: leave headroom
SLEEP_BETWEEN = 60.0 / REQUESTS_PER_MINUTE   # seconds between requests
EMBED_DIMENSIONS = 768
# ──────────────────────────────────────────────────────────────────────────────

try:
    from google import genai
    from google.genai import types
except ImportError:
    print("ERROR: google-genai not installed.  Run:  pip install google-genai pandas")
    sys.exit(1)

# ── Load data ─────────────────────────────────────────────────────────────────
print(f"Reading {INPUT_CSV} …")
df = pd.read_csv(INPUT_CSV, encoding="utf-8-sig")
df.columns = df.columns.str.strip()
print(f"  {len(df)} rows, {len(df.columns)} columns")

# Fill NaN with empty string for safe .strip() calls
df = df.fillna("")

# Validate required columns
REQUIRED = ["Title", "Abstract"]
missing = [c for c in REQUIRED if c not in df.columns]
if missing:
    print(f"ERROR: Required columns not found: {missing}")
    print(f"Available columns: {df.columns.tolist()}")
    sys.exit(1)

# Optional columns (skipped gracefully if absent)
OPT_COLS = [
    "Author (Year)", "maturity_level", "ai_technique",
    "digital_technology", "construction_phase", "electrical_scope",
    "pain_point_addressed", "electrical_work_category",
]

def get(row, col):
    v = str(row.get(col, "")).strip()
    return None if not v or v.lower() in ("nan", "n/a", "not applicable", "not specified") else v

def build_doc(row):
    """Combine paper fields into a single embedding document."""
    parts = []
    title = get(row, "Title")
    if title: parts.append(f"Title: {title}")
    abstract = get(row, "Abstract")
    if abstract: parts.append(f"Abstract: {abstract}")
    for col, label in [
        ("maturity_level",         "Maturity"),
        ("ai_technique",           "AI Technique"),
        ("digital_technology",     "Digital Technology"),
        ("construction_phase",     "Construction Phase"),
        ("electrical_scope",       "Electrical Scope"),
        ("pain_point_addressed",   "Pain Point"),
        ("electrical_work_category", "Electrical Work Category"),
    ]:
        v = get(row, col)
        if v: parts.append(f"{label}: {v}")
    return "\n".join(parts)

def build_summary(row):
    """Compact summary dict stored alongside the embedding for LLM context."""
    return {
        "title":              get(row, "Title"),
        "abstract":           get(row, "Abstract"),
        "maturity":           get(row, "maturity_level"),
        "ai_technique":       get(row, "ai_technique"),
        "digital_technology": get(row, "digital_technology"),
        "construction_phase": get(row, "construction_phase"),
        "electrical_scope":   get(row, "electrical_scope"),
        "pain_point":         get(row, "pain_point_addressed"),
    }

def make_citation(row):
    """Build an APA-style short citation string."""
    cit = get(row, "Author (Year)")
    if cit:
        return cit
    # Fallback: first author last name + year
    authors_raw = str(row.get("Author full names", "")).strip()
    year = str(row.get("Year", "")).strip()
    if authors_raw:
        first = authors_raw.split(";")[0].split(",")[0].strip()
        suffix = " et al." if ";" in authors_raw else ""
        return f"{first}{suffix} ({year})" if year else first
    return f"Unknown ({year})" if year else "Unknown"

# ── Embed ─────────────────────────────────────────────────────────────────────
print(f"\nInitialising Gemini client …")
if GEMINI_API_KEY == "YOUR_API_KEY_HERE":
    print("ERROR: Set GEMINI_API_KEY as an environment variable or edit the constant at the top of this script.")
    sys.exit(1)

client = genai.Client(api_key=GEMINI_API_KEY)

papers_out = []
n = len(df)
print(f"Embedding {n} papers (sleeping {SLEEP_BETWEEN:.1f}s between requests)…")
print("This will take approximately", math.ceil(n * SLEEP_BETWEEN / 60), "minutes.\n")

for i, row in df.iterrows():
    paper_id = str(row.get("ID", i)).strip() or str(i)
    doc_text = build_doc(row)
    citation = make_citation(row)

    attempt = 0
    while True:
        try:
            result = client.models.embed_content(
                model="gemini-embedding-001",
                contents=doc_text,
                config=types.EmbedContentConfig(
                    task_type="RETRIEVAL_DOCUMENT",
                    output_dimensionality=EMBED_DIMENSIONS,
                ),
            )
            vec = result.embeddings[0].values
            break
        except Exception as e:
            attempt += 1
            if attempt > 5:
                print(f"  ✖  Paper {i+1} failed after 5 retries: {e}")
                vec = [0.0] * EMBED_DIMENSIONS
                break
            wait = 60 * attempt   # exponential-ish backoff
            print(f"  ⚠  Error (attempt {attempt}), retrying in {wait}s: {e}")
            time.sleep(wait)

    papers_out.append({
        "id":        paper_id,
        "citation":  citation,
        "embedding": list(vec),
        "summary":   build_summary(row),
    })

    pct = (i + 1) / n * 100
    bar = "█" * int(pct / 5) + "░" * (20 - int(pct / 5))
    print(f"  [{bar}] {pct:5.1f}%  {i+1}/{n}  {citation}", end="\r")
    if i < n - 1:
        time.sleep(SLEEP_BETWEEN)

print(f"\n\nDone. Writing {OUTPUT_JSON} …")
output = {
    "model":    "gemini-embedding-001",
    "dimensions": EMBED_DIMENSIONS,
    "n_papers": len(papers_out),
    "papers":   papers_out,
}
with open(OUTPUT_JSON, "w", encoding="utf-8") as f:
    json.dump(output, f, ensure_ascii=False)

size_kb = os.path.getsize(OUTPUT_JSON) / 1024
print(f"✔  Saved {OUTPUT_JSON}  ({size_kb:.0f} KB, {len(papers_out)} papers)")
print(f"\nNext step: copy {OUTPUT_JSON} next to index.html and serve the folder.")
