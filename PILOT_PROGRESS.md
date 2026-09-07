# Outly pilot checkpoint — 8 September 2026

## Saved baseline

The previous release was saved in commits 2c63310 and febe3bb, pushed to the existing managed Sites source repository, and published as version 3. The repository was clean when this session resumed.

## Current hardening

- Per-person known-cost ceiling is exactly 115%, rounded down to whole rupees (₹3,000 → ₹3,450).
- Travel tolerance requires the affected participant’s consent; no silent extra five minutes.
- Plans must fit both duration bounds and a continuous intersection of everyone’s time windows.
- Recorded opening periods must cover both stops. Missing live opening hours do not qualify; the explicit preview catalogue is labelled as unverified.
- Dietary requirements must all be recorded as verified for dining to qualify.
- Missing live routes and failed providers never become approximate live results or sample inventory.
- Transfers between stops use Routes for each travel mode in live mode.
- Duplicate submissions use the same private response token. The group has a database-enforced ten-person submission limit.
- Private responses can be retrieved using the participant’s edit key without exposing another participant’s answers.
- Locking and generation use conditional database writes so changed answers cannot be silently overwritten or published.
- Approval transactions preserve other answers and apply a proposal once. Duration acceptance no longer changes the entire duration preference to “flexible.”
- Expired links reject reads and writes; request-time cleanup removes expired origins.
- Disabling a venue override removes it from candidates.
- Alternative plans use different activity venues. Unknown dining costs are explicit.

## Verification

23 automated tests pass across deterministic constraints, database-backed group workflows (using SQLite), concurrent submissions/approvals, expiry, lock/generation races and mocked provider failures. Type checking and the deployment build pass.

These tests do not establish live Google accuracy or real-device acceptance.

## Remaining before a customer pilot

1. Founder: create the Google Cloud project, enable billing/Places/Routes, then add the restricted API key using secure configuration. Founder plans to do this in the morning.
2. Configure admin access and optional OpenAI summaries; do not paste secrets into chat or commit them.
3. Verify real Delhi searches, hours, travel/transit results, Google attribution and data-retention requirements with the live integration.
4. Complete the remaining conflict fallbacks (alternative shared dates, budget and second-choice activities), final selection/usefulness measurement, and API abuse controls before public rollout.
5. Add a scheduled cleanup mechanism; current expiry cleanup runs when requests arrive, not at a guaranteed background deadline.
6. Complete iPhone Safari, Android Chrome and desktop full-journey QA and controlled cohort testing.
7. Keep the site owner-private until readiness checks pass and the founder authorizes the pilot audience.

The release is a working preview, not yet a signed-off customer pilot.
