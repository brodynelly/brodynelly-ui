# Review template

Format: `opencode-luuna.review/v1`. **Template; verdict initially blocked.**

- Reviewer role and fresh session reference:
- Assignment / plan revision / acceptance criteria:
- Exact candidate/base identities and dependency bindings:
- Implementation transcript received: **must be no**:
- Current files/diff/specifications/check artifacts actually inspected:
- Evidence freshness and missing verification:
- Verdict: `pass`, `changes_required`, or `blocked`:

## Findings

Each finding: ID, severity, path/location, What, Why, concrete Fix, source/evidence,
affected acceptance criterion, and whether it blocks approval. Distinguish
observations from design judgment and unverified hypotheses. Missing required
checks cannot be waived by a positive verdict.

## What works and limits

Keep useful behavior intact. State what the evidence cannot establish. Request
controlled verification rather than editing the candidate. UI reviews cite only
Apple/reference files actually read and apply web-appropriate rules.
