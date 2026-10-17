const toggle = document.querySelector('.menu-toggle');
const mobile = document.getElementById('mobile-menu');
function closeMobile(restoreFocus = false) {
  if (!mobile || mobile.hidden) return;
  mobile.hidden = true;
  toggle.setAttribute('aria-expanded', 'false');
  toggle.setAttribute('aria-label', 'Open navigation');
  if (restoreFocus) toggle.focus();
}
toggle?.addEventListener('click', () => {
  if (!mobile.hidden) return closeMobile();
  mobile.hidden = false;
  toggle.setAttribute('aria-expanded', 'true');
  toggle.setAttribute('aria-label', 'Close navigation');
});
const disclosures = [...document.querySelectorAll('.nav-disclosure, .account-dropdown')];
for (const disclosure of disclosures) {
  disclosure.addEventListener('toggle', () => {
    if (disclosure.open) disclosures.forEach(other => { if (other !== disclosure) other.open = false; });
  });
}
document.addEventListener('click', event => {
  disclosures.forEach(d => { if (!d.contains(event.target)) d.open = false; });
  if (!event.target.closest('.site-header')) closeMobile();
});
document.addEventListener('keydown', event => {
  if (event.key !== 'Escape') return;
  disclosures.forEach(d => {
    if (d.open && d.contains(document.activeElement)) d.querySelector('summary').focus();
    d.open = false;
  });
  closeMobile(true);
});
matchMedia('(min-width: 961px)').addEventListener('change', event => {
  if (event.matches) closeMobile();
  else disclosures.forEach(d => { d.open = false; });
});

// Keep navigation usable even if the external authentication SDK cannot load.
// Import each module once and surface failures rather than leaving inert forms.
const protectedPages = ['dashboard', 'profile', 'resume', 'settings', 'mystars'];
const protectedPage = protectedPages.includes(document.body.dataset.livePage);
const controls = [...document.querySelectorAll('main form button, #avatar-file, #settings-save, #settings-signout, #print-resume')];
controls.forEach(control => { control.disabled = true; });
async function initialize() {
  try {
    const client = await import('./edsverity-client.js');
    if (protectedPage) await client.authUser(true);
    const modules = [import('./edsverity-session.js')];
    if (document.body.dataset.livePage) modules.push(import('./edsverity-live.js'));
    if (document.getElementById('auth-form')) modules.push(import('./edsverity-auth.js'));
    await Promise.all(modules);
    // Page-specific modules own their loading controls after initialization.
    controls.forEach(control => { control.disabled = false; });
  } catch (error) {
    if (error.message === 'Please sign in to access this page.') return;
    let status = document.getElementById('page-message') || document.getElementById('auth-status');
    if (!status) {
      status = document.createElement('p');
      document.querySelector('main').prepend(status);
    }
    status.setAttribute('role', 'alert');
    status.className = 'live-error';
    status.textContent = 'Account services could not load. Check your connection and reload this page. Navigation is still available.';
    document.querySelectorAll('.live-feed, #resume-document').forEach(node => {
      node.textContent = 'Content is unavailable. Please reload to try again.';
    });
  }
}
initialize();
