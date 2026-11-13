# Use Context Black Box

1. Choose **Load sample flight** to inspect a planted handoff failure.
2. Select **Source** on a finding to jump to the exact original excerpt.
3. Review the candidate wording. **Mark reviewed** records your decision; it is not an automatic verification.
4. For your own conversation, paste or import the source, highlight important text, and choose **Pin selection**. Paste the summary and choose **Compare summary**.
5. Download the recovery note for your next session, and save a report to preserve the complete local review.

## Save your work

Use the export controls before refreshing or closing the tab. Downloads are ordinary local files and can contain the input content. Review them before sharing.

## Troubleshooting

If a file is rejected, check [File formats](FORMATS.md) and the displayed error. Use the supplied synthetic sample to distinguish an application problem from an unsupported input. If the application does not start, verify Node.js 24 and run `npm ci` from the project directory. Report reproducible problems through GitHub with redacted inputs.

`examples/conversation.json` and `examples/summary.txt` demonstrate the supported input contract. The built-in sample contains planted omissions, a budget mutation, and a possibility changed into a promise. These are synthetic examples, not measured failure rates of any model.
