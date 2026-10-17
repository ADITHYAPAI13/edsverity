EDSVERITY LIVE DATA UPGRADE — OCTOBER 2026

1. Keep your backend/ folder and existing GitHub repository.
2. Upload the replacement HTML files to repository root, and files from static/ into repository static/.
3. Important: GitHub web uploads may not overwrite existing files automatically. If blocked, edit each file in GitHub or use GitHub Desktop.
4. After GitHub Pages finishes, sign in at login.html. It redirects to dashboard.html.
5. Edit profile on profile.html. Project and career pages read live Supabase records and allow authenticated posting.

Uses the existing Supabase project and the three tables you created: public.profiles, public.projects, public.jobs. No migrations required for these basic operations.

CURRENT LIMITATIONS: Other sections (forum, mentors, resumes, analytics, My Stars, etc.) are not connected to live data. Jobs are not employer-verified. Public-readable posts are visible to all; do not include personal or private information. RLS policies must remain enabled. No dedicated moderation or abuse prevention yet. Not production-ready.

QA: test login -> dashboard, profile save -> refresh, publish project -> refresh, publish job -> refresh, sign out. See errors in browser console if a request fails. Do not publish secrets or service_role keys.
