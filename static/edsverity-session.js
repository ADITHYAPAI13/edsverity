import {db,$,showAvatar,authUser,signOut,protectedPages,signInRedirect,message,signingOut} from './edsverity-client.js';
const guestEls=document.querySelectorAll('[data-guest-only]');
const memberEls=document.querySelectorAll('[data-member-only]');
let version=0, currentUser=null, currentAvatar='';
function showGuest(){
 guestEls.forEach(n=>n.hidden=false);memberEls.forEach(n=>n.hidden=true);
 if($('account-pill')){$('account-pill').hidden=true;$('account-pill').open=false;}
}
function renderMember(user,name,avatar){
 guestEls.forEach(n=>n.hidden=true);memberEls.forEach(n=>n.hidden=false);
 if($('account-pill'))$('account-pill').hidden=false;
 if($('nav-name'))$('nav-name').textContent=name.split(/\s+/)[0];
 if($('mobile-account-name'))$('mobile-account-name').textContent=name;
 showAvatar($('nav-avatar'),avatar,name);showAvatar($('home-proof-avatar'),avatar,name);
 if($('home-proof-title'))$('home-proof-title').textContent=name+'’s EdsVerity profile';
 if($('home-proof-subtitle'))$('home-proof-subtitle').textContent='Your projects, interests and next steps in one place.';
 if($('home-proof-note'))$('home-proof-note').textContent='This account is linked to your profile and contributions.';
}
async function showMember(user){
 const request=++version;
 const fallback=user.user_metadata?.full_name?.trim()||user.email?.split('@')[0]||'Member';
 renderMember(user,fallback,'');
 try {
  const {data,error}=await db.from('profiles').select('full_name,avatar_url').eq('id',user.id).maybeSingle();
  if(request!==version)return;
  if(error)throw error;
  currentAvatar=data?.avatar_url||'';
  renderMember(user,data?.full_name?.trim()||fallback,currentAvatar);
 } catch {
  if(request===version) {
   let status=$('session-message');
   if(!status){status=document.createElement('p');status.id='session-message';document.querySelector('main').prepend(status);}
   message('session-message','Your account is signed in, but profile details could not load. Please reload to try again.',true);
  }
 }
}
for(const id of ['global-signout','mobile-signout'])$(id)?.addEventListener('click',event=>signOut(event.currentTarget));
window.addEventListener('edsverity:profile-updated',e=>{
 if(currentUser){version++;renderMember(currentUser,e.detail.full_name||'Member',currentAvatar);}
});
window.addEventListener('edsverity:avatar-updated',e=>{
 if(currentUser){version++;currentAvatar=e.detail.url;renderMember(currentUser,e.detail.full_name||'Member',currentAvatar);}
});
// Supabase callbacks must stay synchronous: defer queries until its auth lock is released.
db.auth.onAuthStateChange((event,session)=>{
 if(event==='INITIAL_SESSION'||event==='TOKEN_REFRESHED'||signingOut)return;
 if(event==='SIGNED_IN'&&$('auth-form'))return;
 setTimeout(()=>{
  const next=session?.user;
  if(!next){
   version++;currentUser=null;showGuest();
   if(protectedPages.has(document.body.dataset.livePage))signInRedirect();
   else location.reload(); // Clear any account-specific forms/data on public pages too.
  }else if(currentUser?.id!==next.id){location.reload();}
  else if(event==='USER_UPDATED'){currentUser=next;showMember(next);}
 },0);
});
currentUser=await authUser();
if(currentUser)await showMember(currentUser);else showGuest();
