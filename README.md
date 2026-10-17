# EdsVerity — Source Repository (October 2026)

This is the complete source based on the actual `edsverity-main.zip` repository snapshot.

## Hosted architecture
- **GitHub Pages:** public HTML + `static/` assets at `https://adithyapai13.github.io/edsverity/`
- **Supabase Auth:** registration, email confirmation, and login.
- **Supabase PostgREST + PostgreSQL with RLS:** profile, projects, jobs, applications, discussions, and an opt-in member directory.
- **Supabase Storage:** public `avatars` bucket; only the account owner can upload under their user-ID folder.
- **Supabase Edge Function:** `supabase/functions/edsverity-api/index.ts` is tracked as **source only**. GitHub Pages does not deploy it. Existing function can remain unchanged.
- **`backend/`:** an earlier optional Flask API prototype preserved for reference. It is NOT deployed by GitHub Pages and isn't required for the current website.

## Deployment steps
1. **Back up** the current GitHub repository and (if important data exists) your Supabase database.
2. Run `EDSVERITY_SUPABASE_MIGRATION.sql` from the outer downloaded ZIP in **Supabase SQL Editor** (not on GitHub Pages). It creates only additive fields/tables and replaces EdsVerity-specific policies/triggers. It should not delete user records.
3. Upload the **contents of `UPLOAD_TO_GITHUB/`**, not that folder itself, to the root of `ADITHYAPAI13/edsverity` on branch `main`. The `.html` files belong in repo root, and all JavaScript/CSS/SVG files stay inside `static/`.
4. GitHub Pages settings should remain `Deploy from a branch` → `main` → `/(root)`.
5. When publishing completes, refresh the website and verify: sign in, dashboard, profile editing/photo, jobs, a test application, forum, directory visibility, and résumé print.

**Note:** GitHub's browser uploader sometimes cannot replace existing files in one drop; if it refuses or skips duplicates, use GitHub Desktop to synchronize the extracted full repository instead of deleting the project. Never upload credentials, `.env` or service-role keys.

## Honest feature status
Live and database-backed: auth, dashboard content counts, profile edit/photo, projects, job posts/applications/statuses, discussions and replies, opt-in directory, printable résumé, member contribution counts and platform public-content totals.

Not yet production-complete: organizations verification, messaging, mentor booking, marketplace transactions, formal certifications, verified scoring and leagues, abuse prevention/moderation tooling, notifications, audit logging, rate limits and comprehensive tests. Editorial pages (e.g. preparation) are navigation/resources, not full backend applications.

The `sb_publishable_...` key in `static/edsverity-client.js` is intentionally public. **RLS policies are essential.** Never add secret keys to frontend source.
