# File formats

Input JSON is either an array of `{ "role": "user", "content": "text" }` messages or `{ "messages": [...] }`. Content must be a string; provider-specific nested exports need conversion. Reports use `schema: "context-black-box/v1"` with `source`, `summary`, SHA-256 fingerprints for each, and `constraints` containing exact quotes, unique IDs, source offsets, and user review flags. Imports validate both hashes and exact source slices, then recompute findings instead of trusting imported verdicts.

## Examples

`examples/conversation.json` and `examples/summary.txt` demonstrate the supported input contract. The built-in sample contains planted omissions, a budget mutation, and a possibility changed into a promise. These are synthetic examples, not measured failure rates of any model.

Schema names are versioned. Unknown schemas are rejected rather than silently migrated. Keep the original input if you need to reproduce an export.
