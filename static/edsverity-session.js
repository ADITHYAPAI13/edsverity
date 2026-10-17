import {createClient} from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
const sb=createClient('https://ixrvjjarpexyhzmqntjb.supabase.co','sb_publishable_FQnjqHl0SfbeC9bzVYeubA_T9Uf7Qeu');
const $=id=>document.getElementById(id);
const initials=s=>(s||'EV').trim().split(/\s+/).slice(0,2).map(w=>w[0]?.toUpperCase()||'').join('');
const {data:{session}}=await sb.auth.getSession();
if(session?.user){
 const u=session.user;
 let full=u.user_metadata?.full_name||u.email?.split('@')[0]||'Member'; let avatar='';
 const {data:p,error}=await sb.from('profiles').select('full_name,avatar_url').eq('id',u.id).maybeSingle();
 if(!error&&p){full=p.full_name||full;avatar=p.avatar_url||'';}
 const pill=$('account-pill'); if(pill)pill.hidden=false;
 const name=$('nav-name');if(name)name.textContent=full.split(' ')[0];
 const face=$('nav-avatar');if(face){face.textContent=initials(full);if(avatar){const im=document.createElement('img');im.src=avatar;im.alt='';im.loading='lazy';im.onerror=()=>im.remove();face.prepend(im)}}
 document.querySelectorAll('.header-signin,.header-actions a[href="register.html"]').forEach(e=>e.hidden=true);
 const so=$('global-signout');if(so){so.hidden=false;so.onclick=async()=>{await sb.auth.signOut();location.href='index.html';};}
}
