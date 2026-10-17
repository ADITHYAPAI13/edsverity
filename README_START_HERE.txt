EDSVERITY CORE UPGRADE — OCT 2026

1. BACKUP your GitHub repository first.
2. Supabase SQL Editor -> New Query -> paste SUPABASE_SETUP_RUN_ONCE.sql -> Run ONCE. Do not rerun this unmodified SQL: policies have fixed names.
3. Upload/replace every .html file from this package in GitHub root.
4. Upload/replace all files from static/ into repository static/ (including edsverity-session.js and edsverity-emblem.svg).
5. DO NOT upload SQL, README, .env secrets, or alter your backend/ folder for GitHub Pages.
6. Once published, sign in and test: dashboard; edit profile; upload JPG; post a project; post a job; apply from a second account; review application from the posting account.

CURRENT FUNCTIONAL SCOPE: Supabase Auth, profile editing/avatar, live projects/jobs, applicant submission and owner review status, and dashboard. Other sitemap modules are NOT completed. The existing website pages for mentorship, news, forums, marketplace, etc are still not fully live-backed. Job listings are unverified community submissions and application notes are viewable by job poster. Do not use for sensitive employment info until moderation, server-side validation, privacy notices and secure communications are implemented.

IF ERRORS: Policies may already exist from previous scripts; do not blindly delete working tables. If Storage bucket already exists, inspect its public access and MIME limits. Under free service limits, deployment is not guaranteed always-on.
