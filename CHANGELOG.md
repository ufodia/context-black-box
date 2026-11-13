# Changelog

## Unreleased

- Prevented unfinished text and report imports from overwriting newer workspace changes.
- Validated and recomputed reports before replacing the current review; empty text and rule-free reports are rejected.
- Fixed exact-match boundaries next to astral Unicode letters and combining marks.
- Indexed summary words by sentence to avoid scanning every rule word against unrelated sentences.
- Added regression coverage for import races and atomic report restoration.

## 0.1.0 — 2026-11-13

Initial open-source implementation of Context Black Box.

- Paste text or import plain text, Markdown, and documented JSON message arrays.
- Pin exact source excerpts, with their original character offsets.
- Separate exact textual matches, heuristic review candidates, and wording not found.
- Inspect possible numerical, negation, and commitment changes.
- Review individual findings and export a recovery note or hash-validated JSON report.

Includes synthetic examples, local artwork, tests, and English documentation.
