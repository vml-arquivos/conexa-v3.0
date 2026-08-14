from __future__ import annotations

from pathlib import Path
import re
import pdfplumber

pdf = Path(__file__).with_name('sequencia-pedagogica-matriz-2026.pdf')
code = re.compile(r'EI0[123][A-Z]{2}\d{2}')
date = re.compile(r'\d{2}/\d{2}')
with pdfplumber.open(pdf) as doc:
    printed = 0
    for page_number, page in enumerate(doc.pages, 1):
        words = page.extract_words(x_tolerance=3, y_tolerance=3)
        hits = [w for w in words if code.search(w['text']) or date.fullmatch(w['text'])]
        if not hits:
            continue
        print(f'PAGE {page_number} width={page.width} height={page.height}')
        for word in sorted(hits, key=lambda w: (w['top'], w['x0']))[:80]:
            print(f"  {word['text']!r} x0={word['x0']:.1f} x1={word['x1']:.1f} top={word['top']:.1f}")
        printed += 1
        if printed >= 3:
            break
