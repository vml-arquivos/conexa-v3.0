from __future__ import annotations

import collections
import json
import re
from pathlib import Path

import pdfplumber

PDF = Path(__file__).with_name("sequencia-pedagogica-matriz-2026.pdf")
SEGMENTS = {
    "EI01": ("BEBÊS", "BEBES"),
    "EI02": ("BEM PEQUENAS", "CRIANCAS BEM PEQUENAS"),
    "EI03": ("CRIANÇAS PEQUENAS", "CRIANCAS PEQUENAS"),
}
DATE_RE = re.compile(r"^(\d{2})/(\d{2})$")
CODE_RE = re.compile(r"^EI0[123][A-Z]{2}\d{2}$")
FIELD_BY_CODE = {
    "EO": "O eu, o outro e o nós",
    "CG": "Corpo, gestos e movimentos",
    "TS": "Traços, sons, cores e formas",
    "EF": "Escuta, fala, pensamento e imaginação",
    "ET": "Espaços, tempos, quantidades, relações e transformações",
}
BOUNDS = {
    "date": (59, 140),
    "campo": (140, 230),
    "code": (200, 320),
    "bncc": (320, 460),
    "curriculo": (460, 645),
    "intencionalidade": (645, 800),
}

def norm(text: str) -> str:
    return " ".join((text or "").split()).strip()

def words_in_col(words, left, right):
    return [w["text"] for w in words if w["x0"] >= left - 5 and w["x1"] <= right + 5]

def header_segment(text: str):
    upper = (text or "").upper()
    for segment, hints in SEGMENTS.items():
        if any(hint in upper for hint in hints):
            return segment
    return None

def visible_field(text: str):
    upper = norm(text).upper()
    checks = [
        ("O EU", "EO"),
        ("CORPO", "CG"),
        ("TRAÇOS", "TS"),
        ("TRACOS", "TS"),
        ("ESCUTA", "EF"),
        ("ESPAÇOS", "ET"),
        ("ESPACOS", "ET"),
    ]
    for marker, field in checks:
        if marker in upper:
            return field
    return None

entries = []
page_segments = collections.Counter()
with pdfplumber.open(PDF) as pdf:
    current_segment = None
    for page_number, page in enumerate(pdf.pages, start=1):
        page_text = page.extract_text() or ""
        found = header_segment(page_text)
        if found:
            current_segment = found
        if not current_segment:
            continue
        page_segments[current_segment] += 1
        words = page.extract_words(x_tolerance=3, y_tolerance=3)
        rows = collections.defaultdict(list)
        for word in words:
            rows[round(word["top"] / 4) * 4].append(word)
        for y in sorted(rows):
            row = sorted(rows[y], key=lambda item: item["x0"])
            date_text = norm(" ".join(words_in_col(row, *BOUNDS["date"])))
            date_match = DATE_RE.match(date_text.split()[0] if date_text else "")
            if not date_match:
                continue
            raw_code_text = norm(" ".join(words_in_col(row, *BOUNDS["code"])))
            code_text = raw_code_text.strip("()[]")
            if not CODE_RE.match(code_text):
                continue
            code_segment = code_text[:4]
            field_text = norm(" ".join(words_in_col(row, *BOUNDS["campo"])))
            entries.append({
                "page": page_number,
                "segment": code_segment,
                "date": f"{date_match.group(1)}/{date_match.group(2)}",
                "field_text": field_text,
                "field_code": code_text[4:6],
                "code": code_text,
                "objective_bncc": norm(" ".join(words_in_col(row, *BOUNDS["bncc"]))),
                "objective_curriculo": norm(" ".join(words_in_col(row, *BOUNDS["curriculo"]))),
                "intencionalidade": norm(" ".join(words_in_col(row, *BOUNDS["intencionalidade"]))),
                "visible_field_code": visible_field(field_text),
            })

by_segment = collections.Counter(entry["segment"] for entry in entries)
by_field = collections.defaultdict(collections.Counter)
for entry in entries:
    by_field[entry["segment"]][entry["field_code"]] += 1
mismatches = [entry for entry in entries if entry["visible_field_code"] and entry["visible_field_code"] != entry["field_code"]]
duplicate_dates = []
for key, group in __import__("itertools").groupby(sorted(entries, key=lambda e: (e["segment"], e["date"])), key=lambda e: (e["segment"], e["date"])):
    rows = list(group)
    if len(rows) > 1:
        duplicate_dates.append({"segment": key[0], "date": key[1], "count": len(rows), "pages": [r["page"] for r in rows]})
code_segment_mismatches = [e for e in entries if e["code"][:4] != e["segment"]]
empty_normative = [e for e in entries if not e["objective_bncc"] or not e["objective_curriculo"]]

result = {
    "pdf": str(PDF),
    "pages": len(pdf.pages),
    "pages_by_segment": dict(page_segments),
    "entries_total": len(entries),
    "entries_by_segment": dict(by_segment),
    "entries_by_field": {segment: dict(counts) for segment, counts in by_field.items()},
    "field_code_mismatch_count": len(mismatches),
    "field_code_mismatches": mismatches,
    "code_segment_mismatch_count": len(code_segment_mismatches),
    "code_segment_mismatches": code_segment_mismatches,
    "duplicate_segment_date_count": len(duplicate_dates),
    "duplicate_segment_dates": duplicate_dates,
    "empty_normative_count": len(empty_normative),
    "empty_normative_examples": empty_normative[:20],
}
Path(__file__).with_name("pdf-column-audit.json").write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
print(json.dumps(result, ensure_ascii=False, indent=2))
