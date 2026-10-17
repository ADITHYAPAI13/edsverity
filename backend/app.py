"""EdsVerity prototype API. Supabase Auth verifies tokens; PostgREST enforces RLS."""
import os
from urllib.parse import quote
import requests
from flask import Flask, jsonify, request
from flask_cors import CORS

app = Flask(__name__)
SUPABASE_URL = os.environ.get('SUPABASE_URL', '').rstrip('/')
SUPABASE_PUBLISHABLE_KEY = os.environ.get('SUPABASE_PUBLISHABLE_KEY', '')
FRONTEND_ORIGIN = os.environ.get('FRONTEND_ORIGIN', 'https://adithyapai13.github.io').rstrip('/')
CORS(app, resources={r'/api/*': {'origins': [FRONTEND_ORIGIN]}}, supports_credentials=False)
TIMEOUT = 12


def configured():
    return bool(SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY)


def api_headers(token=None):
    h = {'apikey': SUPABASE_PUBLISHABLE_KEY, 'Content-Type': 'application/json'}
    if token:
        h['Authorization'] = 'Bearer ' + token
    return h


def bearer_token():
    auth = request.headers.get('Authorization', '')
    if not auth.startswith('Bearer '):
        return None
    token = auth.removeprefix('Bearer ').strip()
    return token if token else None


def current_user(token):
    if not token:
        return None
    try:
        r = requests.get(SUPABASE_URL + '/auth/v1/user', headers=api_headers(token), timeout=TIMEOUT)
        if r.ok:
            user = r.json()
            if isinstance(user, dict) and user.get('id'):
                return user
    except (requests.RequestException, ValueError):
        pass
    return None


def rest(table, *, method='GET', token=None, params=None, payload=None, prefer=None):
    headers = api_headers(token)
    if prefer:
        headers['Prefer'] = prefer
    return requests.request(method, SUPABASE_URL + '/rest/v1/' + table,
                            headers=headers, params=params, json=payload, timeout=TIMEOUT)


def result(resp):
    try:
        data = resp.json() if resp.content else None
    except ValueError:
        data = None
    if not resp.ok:
        # Avoid exposing detailed upstream errors or connection information to visitors.
        return jsonify({'error': 'Database request could not be completed'}), 502
    return jsonify(data), 200


def missing_config():
    return jsonify({'error': 'Backend is not configured'}), 503


def auth_required():
    token = bearer_token()
    user = current_user(token) if configured() else None
    if not user:
        return None, None, (jsonify({'error': 'Sign in required'}), 401)
    return token, user, None


def valid_text(value, limit):
    return isinstance(value, str) and bool(value.strip()) and len(value.strip()) <= limit


@app.get('/api/health')
def health():
    return jsonify({'service': 'edsverity-api', 'status': 'ok', 'database_configured': configured()})


@app.get('/api/projects')
def projects_list():
    if not configured(): return missing_config()
    try:
        return result(rest('projects', params={'select':'id,owner_id,title,description,category,skills_required,status,created_at', 'order':'created_at.desc', 'limit':'50'}))
    except requests.RequestException:
        return jsonify({'error':'Database temporarily unavailable'}), 503


@app.post('/api/projects')
def projects_post():
    if not configured(): return missing_config()
    token, user, error = auth_required()
    if error: return error
    d = request.get_json(silent=True) or {}
    if not valid_text(d.get('title'), 160) or not valid_text(d.get('description'), 5000):
        return jsonify({'error':'Title (up to 160 characters) and description (up to 5000 characters) are required'}), 400
    payload = {'owner_id':user['id'], 'title':d['title'].strip(), 'description':d['description'].strip(),
               'category':str(d.get('category') or '')[:100], 'skills_required':str(d.get('skills_required') or '')[:300]}
    try:
        return result(rest('projects', method='POST', token=token, payload=payload, prefer='return=representation'))
    except requests.RequestException:
        return jsonify({'error':'Database temporarily unavailable'}), 503


@app.get('/api/jobs')
def jobs_list():
    if not configured(): return missing_config()
    try:
        return result(rest('jobs', params={'select':'id,posted_by,title,company,location,job_type,description,created_at','order':'created_at.desc','limit':'50'}))
    except requests.RequestException:
        return jsonify({'error':'Database temporarily unavailable'}), 503


@app.post('/api/jobs')
def jobs_post():
    if not configured(): return missing_config()
    token, user, error = auth_required()
    if error: return error
    d = request.get_json(silent=True) or {}
    if not all(valid_text(d.get(k), lim) for k, lim in [('title',160),('company',160),('description',5000)]):
        return jsonify({'error':'Title, company and description are required'}), 400
    payload = {'posted_by':user['id'], 'title':d['title'].strip(), 'company':d['company'].strip(),
               'description':d['description'].strip(), 'location':str(d.get('location') or '')[:160],
               'job_type':str(d.get('job_type') or '')[:80]}
    try:
        return result(rest('jobs',method='POST',token=token,payload=payload,prefer='return=representation'))
    except requests.RequestException:
        return jsonify({'error':'Database temporarily unavailable'}), 503


@app.route('/api/profile', methods=['GET','PUT'])
def profile():
    if not configured(): return missing_config()
    token, user, error = auth_required()
    if error: return error
    try:
        if request.method == 'GET':
            return result(rest('profiles',token=token, params={'id':'eq.'+quote(user['id']), 'select':'id,full_name,headline,bio,college,skills,created_at'}))
        d = request.get_json(silent=True) or {}
        allowed = ('full_name','headline','bio','college','skills')
        if not isinstance(d, dict) or any(not isinstance(d.get(k),str) or len(d[k]) > (3000 if k=='bio' else 300) for k in d if k in allowed):
            return jsonify({'error':'Invalid profile fields'}), 400
        payload = {'id':user['id']}
        payload.update({k:d[k].strip() for k in allowed if k in d})
        return result(rest('profiles',method='POST',token=token,payload=payload,prefer='resolution=merge-duplicates,return=representation'))
    except requests.RequestException:
        return jsonify({'error':'Database temporarily unavailable'}), 503


@app.get('/api/me')
def me():
    if not configured(): return missing_config()
    _token, user, error = auth_required()
    if error: return error
    return jsonify({'id':user['id'], 'email':user.get('email')})


@app.errorhandler(404)
def not_found(_):
    return jsonify({'error':'Route not found'}), 404


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=int(os.environ.get('PORT','8000')))
