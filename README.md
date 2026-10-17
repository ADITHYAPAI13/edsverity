# EdsVerity — Source Repository (October 2026)

This is the complete source based on the actual `edsverity-main.zip` repository snapshot.

## Hosted architecture
- **GitHub Pages:** public HTML + `static/` assets at `https://adithyapai13.github.io/edsverity/`
- **Supabase Auth:** registration, email confirmation, and login.
- **Supabase PostgREST + PostgreSQL with RLS:** profile, projects, jobs, applications, discussions, and an opt-in member directory.
- **Supabase Storage:** public `avatars` bucket; only the account owner can upload under their user-ID folder.
- **Supabase Edge Function:** `supabase/functions/edsverity-api/index.ts` is tracked as **source only**. GitHub Pages does not deploy it. Existing function can remain unchanged.
- **`backend/`:** an earlier optional Flask API prototype preserved for reference. It is NOT deployed by GitHub Pages and isn't required for the current website.

## Development and review

Use the existing checkout and a dedicated development branch. The site has no build
step or frontend package installation:

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

Read [the technical audit](docs/TECHNICAL_AUDIT.md) and
[the review/test guide](docs/REVIEW.md) for the first stability changes, validation,
and unresolved live-database checks. Browser tests use an explicit test double;
they never write production records.

Submit changes through a pull request into `main`. Do not force-push or merge without
owner approval. The documented GitHub Pages configuration is `Deploy from a branch`
→ `main` → `/(root)`; pushing a development branch does not update that deployment.
After an approved merge, check the Pages deployment and verify the live workflows.

The database is managed separately. No SQL migration is required for the first
stability branch. Existing setup SQL is under `supabase/` and in the repository root;
do not blindly rerun it or assume it has been applied. Start with the read-only
`supabase/VERIFY_ACCESS.sql` inventory before preparing any permissions migration.
Never upload credentials, `.env` files or service-role keys.

## Honest feature status
Implemented client workflows (live database behavior still requires verification): auth, dashboard content counts, profile edit/photo, projects, job posts/applications/statuses, discussions and replies, opt-in directory, printable résumé, member contribution counts and platform public-content totals.

Not yet production-complete: organizations verification, messaging, mentor booking, marketplace transactions, formal certifications, verified scoring and leagues, abuse prevention/moderation tooling, notifications, audit logging, rate limits and comprehensive tests. Editorial pages (e.g. preparation) are navigation/resources, not full backend applications.

The `sb_publishable_...` key in `static/edsverity-client.js` is intentionally public. **RLS policies are essential.** Never add secret keys to frontend source.
