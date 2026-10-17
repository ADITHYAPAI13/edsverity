# Review: stability and application flow

## Implemented

This is the first stability change set, with related account error recovery and the
requested application dialog. It preserves the existing static/Supabase architecture
and design. It does not claim completion of all six product phases.

- Shared navigation and boot/error handling across the 21 main site pages.
- Session-aware account header, safer redirects and visible logout failures.
- Profile/avatar/preferences, publishing, forum reply and application-review recovery.
- Careers application dialog with validation, submission feedback and duplicate guards.
- Optional health diagnostic correction; honest footer and avatar-privacy copy.

Files: all root HTML pages receive consistent navigation/boot/footer changes;
`careers.html` also adds the dialog and `profile.html` clarifies photo privacy.
`backend-test.html` corrects the health response field. Shared implementation is in
`static/site.js`, `site.css`, `edsverity-client.js`, `edsverity-session.js`,
`edsverity-auth.js`, `edsverity-live.js`, and new `edsverity-application.js`.
Tests live in `tests/`; documentation in `docs/` and `README.md`; `.gitignore` excludes
local test artifacts. `supabase/VERIFY_ACCESS.sql` only reads schema/policy metadata.
No application dependencies, hosting platforms or database migrations were added.

## Test commands

Use Python 3.12+ and Node 24 (syntax checks only). In a test virtual environment:

```sh
python3 -m venv .venv
.venv/bin/python -m pip install -r tests/requirements.txt
# Use existing Chromium or install Playwright Chromium if your machine needs it.
# Set CHROMIUM_PATH to its executable, e.g. /usr/bin/chromium.
.venv/bin/python -m unittest discover -s tests -v
for file in static/*.js tests/fixtures/*.js; do node --check "$file" || exit; done
git diff --check
```

The browser runner starts its own local HTTP server. It replaces only the Supabase
SDK with `tests/fixtures/supabase.js`, blocks other external requests, and resets
state in each browser context. No TLS verification bypass or certificate-store
change is used. **These tests do not verify actual Supabase API behavior or RLS.**

Coverage includes the A-posts/B-applies/A-reviews/B-tracks journey; duplicate/error
handling; whitespace/overlength notes; in-flight Escape blocking; focus restoration;
profile edits and image decoding/upload/refresh against fixture storage; settings;
projects; forum/reply failures; escaped untrusted content; guest/protected routes;
session expiry; logout failures; external redirect rejection; GitHub Pages `/edsverity/`
redirects; SDK-load failure; mobile keyboard/resize behavior. The 21 main routes and
application dialog are checked at 1440, 1024, 768, 390 and 320px widths for overflow.
HTML5 parsing, unique IDs, label targets and local route/asset existence cover all
22 HTML files. A mobile dialog screenshot was also visually inspected.

## Executed validation

The final run passed all **13 tests** (12 browser tests and one structural test)
in 87.289 seconds. The responsive test visits 21 main pages at five widths and
checks the application dialog at each width. All 22 documents passed HTML5 parsing,
unique-ID, label-target and local-link checks. Node syntax checks passed for every
shared script and the test fixture; `git diff --check` passed.

The run used Python 3.12.14, Playwright 1.62.0 and system Chromium. Initial harness
selector/image errors were corrected. The forum retry regression exposed a real
message-helper class replacement defect; preserving semantic classes fixed it, and
the complete suite then passed. No checks against live Supabase are included in
these results.

## Not tested against the live service

Live Supabase schema, RLS, auth email confirmation, account-provider configuration,
real storage writes, multi-user isolation and database persistence remain unverified.
The environment proxy denied the Supabase host; Chromium also rejected the proxy
certificate for the CDN. No certificate trust change was made. These restrictions
are not evidence that the deployed website itself is broken.

Use authorized test accounts for the live journeys after access is available. For
profile privacy and ownership checks, see `TECHNICAL_AUDIT.md` and the read-only SQL
inventory. Never use a service-role key to simulate a browser authorization test.

## Review and deployment

Review the audit, shared bootstrap/session changes, dialog, and fixture-test results.
Run the regression suite and inspect desktop/mobile behavior. Confirm the actual
Supabase policies with the separate read-only inventory and authorized accounts before
claiming live security or persistence. No SQL in this branch needs to be applied as
a migration. Future policy repairs should be separately reviewed.

Merge only with the project owner's approval. An approved merge to the configured
Pages branch requires a successful Pages deployment before the live site changes.
This task did not merge into `main`, deploy the website or modify Supabase records.
