import {db,$,showAvatar} from './edsverity-client.js';
const guestEls=document.querySelectorAll('[data-guest-only]');
const memberEls=document.querySelectorAll('[data-member-only]');
function showGuest(){guestEls.forEach(n=>n.hidden=false);memberEls.forEach(n=>n.hidden=true);if($('account-pill'))$('account-pill').hidden=true;}
async function showMember(user){
 let name=user.user_metadata?.full_name?.trim()||user.email?.split('@')[0]||'Member',avatar='';
 const {data}=await db.from('profiles').select('full_name,avatar_url').eq('id',user.id).maybeSingle();
 if(data){name=data.full_name?.trim()||name;avatar=data.avatar_url||'';}
 guestEls.forEach(n=>n.hidden=true);memberEls.forEach(n=>n.hidden=false);
 if($('account-pill'))$('account-pill').hidden=false;
 if($('nav-name'))$('nav-name').textContent=name.split(/\s+/)[0];
 if($('mobile-account-name'))$('mobile-account-name').textContent=name;
 showAvatar($('nav-avatar'),avatar,name);showAvatar($('home-proof-avatar'),avatar,name);
 if($('home-proof-title'))$('home-proof-title').textContent=name+'’s EdsVerity profile';
 if($('home-proof-subtitle'))$('home-proof-subtitle').textContent='Your projects, interests and next steps in one place.';
 if($('home-proof-note'))$('home-proof-note').textContent='This account is linked to your profile and contributions.';
}
async function signOut(){await db.auth.signOut();location.assign('index.html');}
$('global-signout')?.addEventListener('click',signOut);
$('mobile-signout')?.addEventListener('click',signOut);
window.addEventListener('edsverity:profile-updated',e=>{if($('nav-name'))$('nav-name').textContent=(e.detail?.full_name||'Member').split(/\s+/)[0];});
window.addEventListener('edsverity:avatar-updated',e=>{showAvatar($('nav-avatar'),e.detail?.url,e.detail?.full_name);showAvatar($('home-proof-avatar'),e.detail?.url,e.detail?.full_name);});
try{const {data:{user}}=await db.auth.getUser();if(user)await showMember(user);else showGuest();}catch{showGuest();}
