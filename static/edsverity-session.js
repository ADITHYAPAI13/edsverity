import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
const sb = createClient('https://ixrvjjarpexyhzmqntjb.supabase.co', 'sb_publishable_FQnjqHl0SfbeC9bzVYeubA_T9Uf7Qeu');
const byId = id => document.getElementById(id);
const initials = name => (name || 'EV').trim().split(/\s+/).slice(0,2).map(word => word.charAt(0).toUpperCase()).join('');
const pill = byId('account-pill');
const avatar = byId('nav-avatar');
function setAvatar(container, url, fullName) {
  if (!container) return;
  container.textContent = initials(fullName);
  if (url && url.startsWith('https://')) {
    const img = document.createElement('img');
    img.src = url; img.alt = ''; img.loading = 'lazy';
    img.addEventListener('error', () => img.remove(), {once:true});
    container.appendChild(img);
  }
}
function setGuest(isGuest) {
  document.querySelectorAll('[data-guest-only]').forEach(e => e.hidden = !isGuest);
  document.querySelectorAll('[data-member-only]').forEach(e => e.hidden = isGuest);
  if (pill) pill.hidden = isGuest;
}
async function showAccount(user) {
  let fullName = user.user_metadata?.full_name?.trim() || user.email?.split('@')[0] || 'Member';
  let photo = '';
  const {data, error} = await sb.from('profiles').select('full_name,avatar_url').eq('id',user.id).maybeSingle();
  if (!error && data) {
    fullName = data.full_name?.trim() || fullName;
    photo = data.avatar_url || '';
  }
  setGuest(false);
  if (byId('nav-name')) byId('nav-name').textContent = fullName.split(/\s+/)[0];
  if (byId('mobile-account-name')) byId('mobile-account-name').textContent = fullName;
  setAvatar(avatar, photo, fullName);
  if (byId('home-proof-avatar')) setAvatar(byId('home-proof-avatar'), photo, fullName);
  if (byId('home-proof-title')) byId('home-proof-title').textContent = fullName + '’s EdsVerity profile';
  if (byId('home-proof-subtitle')) byId('home-proof-subtitle').textContent = 'Your work, projects and interests in one place.';
  if (byId('home-proof-note')) byId('home-proof-note').textContent = 'Your profile is linked to your signed-in account.';
}
async function signOut() { await sb.auth.signOut(); window.location.href='index.html'; }
byId('global-signout')?.addEventListener('click',signOut);
byId('mobile-signout')?.addEventListener('click',signOut);
window.addEventListener('edsverity:avatar-updated', e => {
  setAvatar(avatar,e.detail?.url,e.detail?.full_name);
  setAvatar(byId('home-proof-avatar'),e.detail?.url,e.detail?.full_name);
});
window.addEventListener('edsverity:profile-updated', e => {
  if (byId('nav-name')) byId('nav-name').textContent = (e.detail?.full_name || 'Member').split(/\s+/)[0];
});
try {
  const {data:{user}} = await sb.auth.getUser();
  if (user) await showAccount(user); else setGuest(true);
} catch (e) { setGuest(true); }
