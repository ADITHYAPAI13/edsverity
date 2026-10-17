// Public connection settings only. Row Level Security protects user-owned data.
// Never add Supabase secret keys or database passwords to this file.
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
export const db = createClient(
  'https://ixrvjjarpexyhzmqntjb.supabase.co',
  'sb_publishable_FQnjqHl0SfbeC9bzVYeubA_T9Uf7Qeu'
);
export const $ = id => document.getElementById(id);
export const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, v => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[v]));
export const dateText = value => value ? new Date(value).toLocaleDateString(undefined,{year:'numeric',month:'short',day:'numeric'}) : '—';
export const initials = name => (name || 'EV').trim().split(/\s+/).slice(0,2).map(s=>s[0]?.toUpperCase()||'').join('');
export function message(id, txt, error=false){const node=$(id);if(node){node.textContent=txt;node.className=error?'live-error':'live-muted';}}
export function showAvatar(element,url,name){if(!element)return;element.textContent=initials(name);if(typeof url==='string'&&url.startsWith('https://')){const img=document.createElement('img');img.src=url;img.alt='';img.loading='lazy';img.addEventListener('error',()=>img.remove(),{once:true});element.appendChild(img);}}
export async function authUser(required=false){const {data:{user},error}=await db.auth.getUser();if(required&&(!user||error)){const next=location.pathname.split('/').pop();location.assign(`login.html?next=${encodeURIComponent(next)}`);throw new Error('Please sign in to access this page.');}return user;}
export async function ownProfile(u){const {data,error}=await db.from('profiles').select('*').eq('id',u.id).maybeSingle();if(error)throw error;return data||{id:u.id,full_name:u.user_metadata?.full_name||'',headline:'',bio:'',college:'',skills:'',discoverable:false};}
export async function records(table,limit=100){const {data,error}=await db.from(table).select('*').order('created_at',{ascending:false}).limit(limit);if(error)throw error;return data||[];}
export function helpfulError(error){const txt=String(error?.message||error||'Unknown error');return /relation .* does not exist|schema cache|column .* does not exist|permission denied/i.test(txt)?'Missing database setup or access policy. Run the included Supabase migration and retry.':txt;}
