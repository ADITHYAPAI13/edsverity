# EdsVerity audit and first stability changes

Audited starting commit: `dab0e93339a4d214068dc8bb683733801a41957e` on GitHub `main`.
The existing checkout had no pending file changes. Remote Git read/fetch succeeded.
Initially both GraphQL and REST PR listing returned `Forbidden` at the network proxy.
After allowing `api.github.com`, PR creation/listing succeeded. PR #1 is the only open
PR and targets `main`; it is mergeable. This branch does not replace or merge another branch.

## Architecture and coverage

Inspected all 22 HTML documents, shared scripts/styles, both SQL setup files,
`backend/app.py`, its requirements, and the Supabase Edge Function source.

- GitHub Pages serves HTML, CSS and browser ES modules. There is no build or runtime
  package installation. `static/site.js` now boots the existing Supabase modules
  with a visible failure state. Public Supabase configuration is reused unchanged.
- Account routes: dashboard, profile, settings, resume, My Stars. Public data routes:
  careers, projects, forum, networking, platform activity. Auth routes: login/register.
- Home, about, contact, preparation, resources, investors/partners, community impact,
  events and news are editorial/navigation pages. Events are explicitly unscheduled
  concepts; mentorship and messaging are already identified as roadmap features.
- The Flask prototype is not referenced by the website. Its directory is not proof
  of deployment. The Edge Function source is a health-only response, not the app's
  database backend. `backend-test.html` incorrectly read `data.message` from its
  `{platform,status}` response; corrected and labeled as an optional diagnostic.
- `static/app.js` and `static/app.css` are unused legacy assets; retained. The old
  script's misleading `sent=1` success message is not executed by current pages.

## Defects addressed in this branch

- Replaced native application `prompt()` with a labeled modal dialog. It uses real
  job title/company, validates 10–2000 trimmed Unicode characters, prevents repeated
  submission, preserves notes on failure, handles a database duplicate, and restores
  focus. Escape/Cancel cannot interrupt an in-flight write. No new database fields.
- Guest/account navigation follows session changes. Failed logout stays visible
  and reports the failure. Profile name and initials update in desktop and mobile
  menus. Network failure is not silently treated as an anonymous session.
- Dependency load failures now show an error and keep forms disabled. Account pages
  check authentication before attaching handlers. Authentication redirects use an
  allowlist of actual routes and preserve the GitHub Pages subdirectory.
- Profile, avatar, preferences, publishing, replies and review controls recover after
  both Supabase-returned errors and thrown exceptions. Review failure restores the
  saved status. Update/delete checks require returned rows before claiming success.
- Avatar input checks MIME, size and image decoding. The public bucket's privacy
  implications are stated accurately. Missing/broken photos fall back to initials.
- Removed repeated links across the expanded desktop menu and account menu, and
  within mobile navigation. Only one disclosure stays open; Escape restores focus;
  mobile navigation closes on desktop resize. Added touch sizes, wrapping and dialog
  styling consistent with the existing white/cream and green design.
- Removed misleading footer copy suggesting real listings are sample content.

## Security findings and unresolved database verification

Frontend checks are usability safeguards, not authorization. Supabase RLS must
independently enforce every operation. **Live policies, grants and constraints were not inspected or changed**, and there
are no new migrations in this branch. A final read-only API check returned HTTP 200
for auth settings and zero-row queries selecting the expected frontend columns on
profiles, jobs, projects, job_applications (including the jobs relationship),
forum_threads and forum_replies. This confirms those API fields/relationships are
available; it does not establish row isolation or authenticated write permissions.

`supabase/EDSVERITY_SUPABASE_MIGRATION.sql` contains unique application constraints,
no-self-application checks, employer-only status updates and an immutable-fields
trigger. It assumes base `profiles`, `jobs`, `projects` tables already exist. It
only enables RLS on jobs/projects; their original SELECT/INSERT/UPDATE/DELETE policies
are not defined in this repository. Existing policies with unknown names may grant
broader access because permissive policies combine with OR. The older root SQL
script does not restrict a new application's initial status; the newer migration
replaces its named application policies. Do not blindly rerun either file.

Profile directory and employer policies grant access to entire qualifying rows, not
just the columns requested by the UI. If legacy profile tables contain sensitive
columns, selected frontend fields do not protect them. Public avatars can be fetched
by anyone with the URL even for non-discoverable profiles. A future scoped privacy
migration needs the actual schema/policy inventory and an agreed public-field model.

Run `supabase/VERIFY_ACCESS.sql` in the existing project's SQL Editor to collect
read-only metadata, then test with separate authorized accounts A/B/C and an
anonymous session. Check that B cannot read unrelated applications, C cannot alter
A's listings or review B's application, private profiles stay inaccessible, only
A can review B's application to A's job, and B can read the resulting status.
Never disable RLS, use an elevated key in the browser, or seed production with tests.

## Later phases (not represented as completed)

- Verify and, if needed, repair base-table RLS using a separate reviewed migration;
  check grants, column privacy, application constraints and storage permissions.
- Live account confirmation/refresh, profile-photo persistence, two-account hiring,
  project ownership and forum journeys with authorized test accounts.
- Pagination beyond the current 100-record feeds; job filters/own-listing views;
  profile completeness and richer dashboard/portfolio summaries.
- Expand the original sitemap through useful, separately reviewed workflows:
  academic resources, practice, exam preparation, research/hackathons, careers,
  community/events, recognition/mentorship, marketplace and subscriptions. Current
  resource/preparation pages are editorial, not completed learning products.
- Connections, groups, direct messages, bookings, verified recognition and commerce
  require schema, permissions and end-to-end implementation; no placeholder pages
  or fake counters were added.
