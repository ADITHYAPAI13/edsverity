EDSVERITY - BACKEND UPLOAD GUIDE

UPLOAD ONLY the folder named 'backend' into the ROOT of your existing GitHub edsverity repository.
Do NOT upload the ZIP itself. Do NOT upload the demo .env file with real credentials.

Expected GitHub:
edsverity/
  index.html
  ...other HTML...
  static/
  backend/
    app.py
    requirements.txt
    .env.example

IN RENDER CONFIGURATION:
Name: edsverity-api
Language: Python 3
Branch: main
Region: Singapore
Root Directory: backend
Build Command: pip install -r requirements.txt
Start Command: gunicorn app:app --bind 0.0.0.0:$PORT
Instance: Free ($0)
Health Check Path: /api/health
Environment Variables:
  SUPABASE_URL = https://YOUR-PROJECT-REF.supabase.co
  SUPABASE_PUBLISHABLE_KEY = YOUR project's publishable key
  FRONTEND_ORIGIN = https://adithyapai13.github.io

Do not publish database passwords, SUPABASE secret keys, JWT signing keys, or service_role keys.
After deploy, visit https://YOUR-RENDER-URL/api/health .

IMPORTANT: This is a foundational backend API. Frontend JavaScript is NOT yet connected.
Auth sign-up and sign-in will be performed using Supabase Auth in a later step.
GET public: /api/projects, /api/jobs
Needs authenticated Bearer token: /api/me, /api/profile (GET/PUT), /api/projects POST, /api/jobs POST.
Your already-created Supabase SQL tables and RLS policies are prerequisites.
This is not production hardened: add rate limits, moderation, validation and monitoring before public launch.
