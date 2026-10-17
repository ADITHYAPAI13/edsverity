EDSVERITY — CLEAN NAVIGATION + ACCOUNT HEADER FIX

WHAT WAS FIXED
- One navigation system: the top navigation and Explore menu. The repeated left sidebar is removed from ALL interior pages.
- All original main sections remain linked under Explore (Home/About/Careers/Preparation/Research/Profile/Networking/My Stars/Forum/Tools/Analytics/Settings/Investor/Community Impact/Events/News and Contact).
- Signed-in header hides Sign in and Join EdsVerity. A single round account avatar appears with dropdown links to Dashboard, Profile, Resume, My Stars, Settings and Sign out.
- Home page illustrative "profile preview" replaced by a real profile invitation; when logged in, your name/photo appear there.
- Dashboard application activity relocated out of the little account-info card.
- Existing Supabase Auth, profiles, projects and jobs logic preserved.

HOW TO UPLOAD (do not upload this README into your public site unless desired)
1. BACK UP your current GitHub repository (Download ZIP under Code).
2. In GitHub ADITHYAPAI13/edsverity, replace the existing .html files in repository root with this package's 21 .html files.
3. Replace these five files INSIDE repository static/: site.css, site.js, edsverity-auth.js, edsverity-live.js, edsverity-session.js. Also upload edsverity-emblem.svg.
4. Keep backend/ untouched. Do not upload SQL, .env or passwords.
5. Commit, wait for GitHub Pages deployment, then hard-refresh (Cmd+Shift+R).
6. Test one signed-out page, one signed-in page, dashboard/profile avatar, account dropdown and mobile navigation.

The existing Supabase project and database schema do not need any changes for this navigation fix.
If any live feature fails after upload, restore your backup and send the console error or screenshot.
