EdsVerity authentication patch (existing GitHub Pages site)

UPLOAD these 3 files maintaining paths:
login.html (replace root file)
register.html (replace root file)
static/edsverity-auth.js (new file in static directory)

In Supabase Dashboard: Authentication > URL Configuration
Site URL: https://adithyapai13.github.io/edsverity/
Redirect URLs: add https://adithyapai13.github.io/edsverity/login.html

Email confirmation should remain enabled. Test with an email address you own. No service-role key or database password goes in browser source.

Do not upload this READ_ME_FIRST.txt unless you want it public.
This only activates registration/sign-in; dashboards, profiles and job/project posting are separate future integrations.
