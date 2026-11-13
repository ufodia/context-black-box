# Scope and limitations

- The tool sees only the source and summary you supply; it cannot inspect hidden model context or proprietary compaction state.
- Exact wording may appear in a quotation, negation, or hypothetical context. Check the surrounding text.
- Token overlap proposes candidates; it does not establish semantic equivalence. A missing match is not proof that a paraphrased idea is absent.
- The heuristic matcher is tuned for English text. It is not a general multilingual meaning checker.
- Source edits clear pinned rules to preserve provenance. Summary edits invalidate findings and review decisions.
- Up to 200 rules, 5,000 characters per rule, and one million characters per text. Nothing persists automatically across refreshes.

This is an initial functional release. Browser checks and unit tests exercise defined flows; they do not establish universal document or language support.
