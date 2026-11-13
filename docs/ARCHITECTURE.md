# Architecture

`src/core.ts` provides the deterministic comparison, source-rule validation, conversation parsing, and recovery-note formatter. `src/main.ts` owns selection offsets, input limits, review state, SHA-256 fingerprints through Web Crypto, and browser file operations. `src/demo.ts` is a fully synthetic source/summary pair. There is no model provider, backend, or network dependency in the analysis.

## Trust boundaries

All imported content is untrusted data. Render document text through text nodes or textarea values. JSON importers validate shapes and limits before applying state. Exports are generated locally. Tests cover meaningful state/provenance invariants; the browser remains responsible for file decoding and rendering.
