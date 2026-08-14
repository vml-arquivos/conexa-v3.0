from __future__ import annotations

import collections
import json
import re
from pathlib import Path

TEXT = Path(__file__).with_name("sequencia-pedagogica-matriz-2026.txt").read_text(encoding="utf-8")
lines = TEXT.splitlines()

segment_pattern = re.compile(r"\b(EI0[123])\b\s*[–-]\s*(Beb[eê]s|Crian[cç]as Bem Pequenas|Crian[cç]as Pequenas)", re.IGNORECASE)
code_pattern = re.compile(r"\((EI0[123])([A-Z]{2})(\d{2})\)")
field_names = {
    "EO": "O eu, o outro e o nós",
    "CG": "Corpo, gestos e movimentos",
    "TS": "Traços, sons, cores e formas",
    "EF": "Escuta, fala, pensamento e imaginação",
    "ET": "Espaços, tempos, quantidades, relações e transformações",
}

current_segment = None
segment_counts = collections.Counter()
field_counts = collections.defaultdict(collections.Counter)
code_counts = collections.Counter()
wrong_segment_codes = []
field_mismatch = []
segment_markers = []

for number, line in enumerate(lines, start=1):
    marker = segment_pattern.search(line)
    if marker:
        current_segment = marker.group(1).upper()
        segment_markers.append({"line": number, "segment": current_segment, "label": marker.group(2)})
    for code_match in code_pattern.finditer(line):
        segment, field, number_code = code_match.groups()
        code = f"{segment}{field}{number_code}"
        code_counts[code] += 1
        segment_counts[segment] += 1
        field_counts[segment][field] += 1
        if current_segment and current_segment != segment:
            wrong_segment_codes.append({"line": number, "current_segment": current_segment, "code": code, "text": line.strip()})
        visible_field = next((name for name in field_names.values() if name.lower() in line.lower()), None)
        expected_field = field_names.get(field)
        if visible_field and expected_field and visible_field != expected_field:
            field_mismatch.append({"line": number, "code": code, "declared_field": visible_field, "code_field": expected_field, "text": line.strip()})

result = {
    "total_lines": len(lines),
    "segment_markers": segment_markers,
    "segment_counts": dict(segment_counts),
    "field_counts": {segment: dict(counts) for segment, counts in field_counts.items()},
    "distinct_codes": len(code_counts),
    "total_code_occurrences": sum(code_counts.values()),
    "top_codes": code_counts.most_common(25),
    "wrong_segment_code_count": len(wrong_segment_codes),
    "wrong_segment_codes": wrong_segment_codes[:100],
    "field_mismatch_count": len(field_mismatch),
    "field_mismatches": field_mismatch[:100],
}
Path(__file__).with_name("matrix-structure-audit.json").write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
print(json.dumps(result, ensure_ascii=False, indent=2))
