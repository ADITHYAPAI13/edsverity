import {db,$,escapeHTML as esc,dateText as date,showAvatar,message,authUser,ownProfile,records,helpfulError} from './edsverity-client.js';

const item = (title,meta,description) => `<article class="live-item"><p class="live-muted">${esc(meta)}</p><h3>${esc(title)}</h3><p class="linebreak">${esc(description)}</p></article>`;
const empty = text => `<p class="empty-state">${esc(text)}</p>`;
const count = async(table,filter) => {let q=db.from(table).select('id',{count:'exact',head:true});if(filter)q=q.eq(filter[0],filter[1]);const {count,error}=await q;if(error)throw error;return count??0;};

async function profilePage(){
 const u=await authUser(true),p=await ownProfile(u);
 $('user-email').textContent=u.email||'—';
 for(const field of ['full_name','headline','bio','college','skills'])$(field).value=p[field]||'';
 $('discoverable').checked=!!p.discoverable;
 showAvatar($('avatar-preview'),p.avatar_url,p.full_name||u.user_metadata?.full_name);
 $('profile-form').addEventListener('submit',async e=>{
  e.preventDefault();const btn=$('save-profile');btn.disabled=true;message('profile-message','Saving…');
  const value={id:u.id,discoverable:$('discoverable').checked};
  for(const field of ['full_name','headline','bio','college','skills'])value[field]=$(field).value.trim();
  const {error}=await db.from('profiles').upsert(value,{onConflict:'id'});
  message('profile-message',error?helpfulError(error):'Saved. Your profile is up to date.',!!error);
  if(!error){showAvatar($('avatar-preview'),p.avatar_url,value.full_name);window.dispatchEvent(new CustomEvent('edsverity:profile-updated',{detail:{full_name:value.full_name}}));}
  btn.disabled=false;
 });
 $('avatar-file').addEventListener('change',async e=>{
  const f=e.target.files?.[0];if(!f)return;
  if(!['image/jpeg','image/png','image/webp'].includes(f.type)||f.size>2*1024*1024){message('avatar-message','Select a JPG, PNG or WebP under 2 MB.',true);return;}
  message('avatar-message','Uploading photo…');
  const ext={'image/jpeg':'jpg','image/png':'png','image/webp':'webp'}[f.type];
  const path=`${u.id}/profile.${ext}`;
  const {error:upErr}=await db.storage.from('avatars').upload(path,f,{contentType:f.type,upsert:true});
  if(upErr){message('avatar-message',helpfulError(upErr),true);return;}
  const url=db.storage.from('avatars').getPublicUrl(path).data.publicUrl+'?v='+Date.now();
  const {error}=await db.from('profiles').upsert({id:u.id,avatar_url:url},{onConflict:'id'});
  message('avatar-message',error?helpfulError(error):'Photo saved successfully.',!!error);
  if(!error){p.avatar_url=url;const name=$('full_name').value;showAvatar($('avatar-preview'),url,name);window.dispatchEvent(new CustomEvent('edsverity:avatar-updated',{detail:{url,full_name:name}}));}
 });
}

async function applicationPanels(u){
 const me=$('my-applications'),received=$('received-applications');if(!me&&!received)return;
 const [myRes,ownRes]=await Promise.all([
   db.from('job_applications').select('id,job_id,status,cover_note,created_at,jobs(title,company)').eq('applicant_id',u.id).order('created_at',{ascending:false}),
   db.from('jobs').select('id,title').eq('posted_by',u.id)
 ]);
 if(me)me.innerHTML=myRes.error?empty(helpfulError(myRes.error)):(myRes.data||[]).length?(myRes.data||[]).map(a=>item(a.jobs?.title||'Job application',`${a.jobs?.company||'Opportunity'} · ${a.status} · ${date(a.created_at)}`,a.cover_note)).join(''):empty('No applications yet. Explore current opportunities to apply.');
 if(!received)return;
 if(ownRes.error){received.innerHTML=empty(helpfulError(ownRes.error));return;}
 const jobs=ownRes.data||[];
 if(!jobs.length){received.innerHTML=empty('You have not posted any opportunities yet.');return;}
 const {data,error}=await db.from('job_applications').select('id,job_id,applicant_id,status,cover_note,created_at').in('job_id',jobs.map(j=>j.id)).order('created_at',{ascending:false});
 if(error){received.innerHTML=empty(helpfulError(error));return;}
 if(!data?.length){received.innerHTML=empty('No applications received yet.');return;}
 // Names are available only for members who opted into the directory or applied to an employer's listing.
 const userIds=[...new Set(data.map(a=>a.applicant_id))];
 const {data:profiles}=await db.from('profiles').select('id,full_name,headline').in('id',userIds);
 const names=new Map((profiles||[]).map(p=>[p.id,p]));
 received.innerHTML=data.map(a=>{
  const p=names.get(a.applicant_id),name=p?.full_name||`Applicant ${a.applicant_id.slice(0,8)}`;
  return `<article class="live-item"><p class="live-muted">${esc(jobs.find(j=>j.id===a.job_id)?.title||'Opportunity')} · ${date(a.created_at)}</p><h3>${esc(name)}</h3>${p?.headline?`<p>${esc(p.headline)}</p>`:''}<p class="linebreak">${esc(a.cover_note)}</p><label class="review-label">Application status <select class="review-status" data-id="${esc(a.id)}"><option value="submitted" ${a.status==='submitted'?'selected':''}>Submitted</option><option value="reviewing" ${a.status==='reviewing'?'selected':''}>Reviewing</option><option value="shortlisted" ${a.status==='shortlisted'?'selected':''}>Shortlisted</option><option value="rejected" ${a.status==='rejected'?'selected':''}>Not selected</option></select></label><span class="review-feedback" role="status"></span></article>`;
 }).join('');
 received.querySelectorAll('.review-status').forEach(select=>select.addEventListener('change',async()=>{
  const msg=select.closest('.live-item').querySelector('.review-feedback');msg.textContent='Saving…';
  const {error}=await db.from('job_applications').update({status:select.value}).eq('id',select.dataset.id);
  msg.textContent=error?helpfulError(error):'Saved';if(error)msg.classList.add('live-error');
 }));
}

async function dashboardPage(){
 const u=await authUser(true),p=await ownProfile(u);
 $('account-name').textContent=p.full_name||u.user_metadata?.full_name||'Member';$('account-email').textContent=u.email;
 $('dashboard-joined').textContent=`Member since ${date(u.created_at)}`;
 showAvatar($('dashboard-avatar'),p.avatar_url,p.full_name||u.user_metadata?.full_name);
 const [mine,posted,all,projects,jobs]=await Promise.all([
  count('projects',['owner_id',u.id]),count('jobs',['posted_by',u.id]),count('projects'),records('projects',4),records('jobs',4)
 ]);
 $('my-project-count').textContent=mine;$('my-job-count').textContent=posted;$('all-project-count').textContent=all;
 $('latest-projects').innerHTML=projects.length?projects.map(r=>item(r.title,r.category||'Project',r.description)).join(''):empty('No projects have been posted yet.');
 $('latest-jobs').innerHTML=jobs.length?jobs.map(r=>item(r.title,[r.company,r.job_type].filter(Boolean).join(' · '),r.description)).join(''):empty('No opportunities have been posted yet.');
 await applicationPanels(u);
}

async function listingsPage(type){
 const table=type==='jobs'?'jobs':'projects';const owner=type==='jobs'?'posted_by':'owner_id';
 const u=await authUser(false);let data=[],applied=new Set();
 if(u){$('publish-guest')?.classList.add('live-hidden');$('publish-form')?.classList.remove('live-hidden');}
 const feed=$('live-records'),search=$('live-search');
 async function refresh(){
  try{data=await records(table);
   if(u&&type==='jobs'){
    const {data:a,error}=await db.from('job_applications').select('job_id').eq('applicant_id',u.id);
    if(error)throw error;applied=new Set((a||[]).map(x=>x.job_id));
   }
   render();message('list-message','');
  }catch(e){message('list-message',helpfulError(e),true);feed.innerHTML=empty('Listings are temporarily unavailable.');}
 }
 function render(){const term=(search?.value||'').toLowerCase().trim();const rows=data.filter(r=>Object.values(r).some(v=>String(v??'').toLowerCase().includes(term)));
  feed.innerHTML=rows.length?rows.map(r=>{
   const isOwner=u?.id===r[owner];const meta=type==='jobs'?[r.company,r.location,r.job_type].filter(Boolean).join(' · '):[r.category,r.status].filter(Boolean).join(' · ');
   return `<article class="live-item"><p class="live-muted">${esc(meta)} · ${date(r.created_at)}</p><h3>${esc(r.title)}</h3><p class="linebreak">${esc(r.description)}</p>${r.skills_required?`<p class="live-muted">Skills: ${esc(r.skills_required)}</p>`:''}${type==='jobs'&&r.application_instructions?`<p class="live-muted">How to apply: ${esc(r.application_instructions)}</p>`:''}<div class="card-actions">${type==='jobs'&&u&&!isOwner?`<button class="apply-trigger" data-id="${esc(r.id)}" ${applied.has(r.id)?'disabled':''}>${applied.has(r.id)?'Applied':'Apply for this role'}</button>`:''}${type==='jobs'&&!u?'<a href="login.html?next=careers.html">Sign in to apply →</a>':''}${isOwner?`<button class="delete-trigger" data-id="${esc(r.id)}">Remove my ${type==='jobs'?'listing':'project'}</button>`:''}</div></article>`;
  }).join(''):empty(term?'No matching records. Try another search.':'Nothing posted yet. Be the first to share something useful.');
  feed.querySelectorAll('.delete-trigger').forEach(btn=>btn.addEventListener('click',async()=>{
   if(!confirm('Remove this listing permanently?'))return;
   const {error}=await db.from(table).delete().eq('id',btn.dataset.id);
   if(error)message('list-message',helpfulError(error),true);else refresh();
  }));
  feed.querySelectorAll('.apply-trigger').forEach(btn=>btn.addEventListener('click',()=>apply(btn.dataset.id)));
 }
 async function apply(job_id){
  if(!u){location.assign('login.html?next=careers.html');return;}
  const note=prompt('Briefly describe your relevant experience and interest (10–2000 characters):');
  if(note===null)return;if(note.trim().length<10||note.trim().length>2000){message('list-message','Application note must be 10–2000 characters.',true);return;}
  const {error}=await db.from('job_applications').insert({job_id,applicant_id:u.id,cover_note:note.trim()});
  if(error){message('list-message',helpfulError(error),true);return;}
  applied.add(job_id);message('list-message','Your application was submitted. Track it on your dashboard.');render();
 }
 search?.addEventListener('input',render);
 $('publish-form')?.addEventListener('submit',async e=>{
  e.preventDefault();if(!u)return;
  const f=e.currentTarget,btn=$('publish-button'),v=name=>f.elements.namedItem(name).value.trim();
  const payload={title:v('title'),description:v('description'),[owner]:u.id};
  if(type==='jobs')for(const k of ['company','location','job_type','application_instructions'])payload[k]=v(k);
  else for(const k of ['category','skills_required'])payload[k]=v(k);
  if(payload.title.length<3||payload.description.length<10){message('publish-message','Add a descriptive title and at least 10 characters of detail.',true);return;}
  btn.disabled=true;message('publish-message','Publishing…');
  const {error}=await db.from(table).insert(payload);
  message('publish-message',error?helpfulError(error):'Published successfully.',!!error);
  if(!error){f.reset();await refresh();}btn.disabled=false;
 });
 if(type==='jobs'&&$('jobs-workspace'))$('jobs-workspace').innerHTML=u?'<a href="dashboard.html">Open your dashboard to see applications and review applicants →</a>':'<a href="login.html?next=careers.html">Sign in to track applications →</a>';
 await refresh();
 // Recheck listings when returning to the tab; changes are saved immediately in Supabase.
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});
}

async function forumPage(){
 const u=await authUser(false),feed=$('forum-feed'),search=$('forum-search');let threads=[];
 if(u){$('forum-guest')?.classList.add('live-hidden');$('thread-form')?.classList.remove('live-hidden');}
 async function refresh(){try{threads=await records('forum_threads');render();}catch(e){feed.innerHTML=empty(helpfulError(e));}}
 function render(){const q=(search.value||'').toLowerCase();const visible=threads.filter(t=>[t.title,t.body,t.category].join(' ').toLowerCase().includes(q));
 feed.innerHTML=visible.length?visible.map(t=>`<article class="live-item discussion"><p class="live-muted">${esc(t.category)} · ${date(t.created_at)}</p><h3>${esc(t.title)}</h3><p class="linebreak">${esc(t.body)}</p><div class="card-actions"><button class="view-replies" data-id="${esc(t.id)}">View replies</button>${u?.id===t.author_id?`<button class="delete-thread delete-trigger" data-id="${esc(t.id)}">Delete my discussion</button>`:''}</div><div class="replies live-hidden" id="replies-${esc(t.id)}"></div></article>`).join(''):empty('No discussions yet. Start the first conversation.');
 feed.querySelectorAll('.view-replies').forEach(b=>b.addEventListener('click',()=>loadReplies(b.dataset.id)));
 feed.querySelectorAll('.delete-thread').forEach(b=>b.addEventListener('click',async()=>{if(!confirm('Delete this discussion and replies?'))return;const {error}=await db.from('forum_threads').delete().eq('id',b.dataset.id);if(error)message('page-message',helpfulError(error),true);else refresh()}));
 }
 async function loadReplies(id){const box=$('replies-'+id);if(!box)return;
  box.classList.remove('live-hidden');box.textContent='Loading replies…';
  const {data,error}=await db.from('forum_replies').select('id,author_id,body,created_at').eq('thread_id',id).order('created_at',{ascending:true});
  if(error){box.textContent=helpfulError(error);return;}
  box.innerHTML=`<h4>Replies</h4>${data?.length?data.map(r=>`<div class="reply"><small>${date(r.created_at)}</small><p class="linebreak">${esc(r.body)}</p></div>`).join(''):empty('No replies yet.')}${u?`<form class="reply-form"><label>Your reply<textarea name="body" maxlength="3000" minlength="2" required></textarea></label><button type="submit">Post reply</button><p role="status" class="reply-status"></p></form>`:'<p><a href="login.html?next=forum.html">Sign in to reply →</a></p>'}`;
  box.querySelector('form')?.addEventListener('submit',async e=>{e.preventDefault();const f=e.currentTarget,body=f.elements.namedItem('body').value.trim();if(body.length<2)return;const {error}=await db.from('forum_replies').insert({thread_id:id,author_id:u.id,body});if(error)f.querySelector('.reply-status').textContent=helpfulError(error);else loadReplies(id);});
 }
 search.addEventListener('input',render);
 $('thread-form')?.addEventListener('submit',async e=>{e.preventDefault();if(!u)return;const f=e.currentTarget, v=n=>f.elements.namedItem(n).value.trim();const btn=$('thread-submit');btn.disabled=true;const {error}=await db.from('forum_threads').insert({author_id:u.id,title:v('title'),category:v('category'),body:v('body')});message('thread-message',error?helpfulError(error):'Discussion published.',!!error);if(!error){f.reset();await refresh();}btn.disabled=false;});
 await refresh();document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});
}

async function networkPage(){const feed=$('members-feed'),search=$('members-search');let people=[];
 try{const {data,error}=await db.from('profiles').select('id,full_name,headline,college,skills').eq('discoverable',true).order('full_name',{ascending:true}).limit(100);if(error)throw error;people=data||[];
  const render=()=>{const term=search.value.toLowerCase().trim();const visible=people.filter(p=>[p.full_name,p.headline,p.college,p.skills].join(' ').toLowerCase().includes(term));feed.innerHTML=visible.length?visible.map(p=>item(p.full_name||'EdsVerity member',[p.headline,p.college].filter(Boolean).join(' · '),p.skills||'Skills not listed')).join(''):empty('No members match your search yet. Profiles are private unless their owners opt in.');};search.addEventListener('input',render);render();
 }catch(e){message('page-message',helpfulError(e),true);feed.innerHTML=empty('Directory unavailable.');}
}

async function resumePage(){const u=await authUser(true),p=await ownProfile(u),data=await db.from('projects').select('title,description,category,created_at').eq('owner_id',u.id).order('created_at',{ascending:false}).limit(10);if(data.error)throw data.error;
 const name=p.full_name||u.user_metadata?.full_name||'Your name';
 $('resume-document').innerHTML=`<h2>${esc(name)}</h2><p>${esc(p.headline||'Independent learner and builder')}</p><p>${esc(u.email||'')}</p>${p.college?`<h3>Education / Organization</h3><p>${esc(p.college)}</p>`:''}${p.bio?`<h3>About</h3><p class="linebreak">${esc(p.bio)}</p>`:''}${p.skills?`<h3>Skills</h3><p>${esc(p.skills)}</p>`:''}<h3>Selected projects</h3>${data.data?.length?data.data.map(j=>`<div class="resume-project"><strong>${esc(j.title)}</strong><small> · ${date(j.created_at)}</small><p class="linebreak">${esc(j.description)}</p></div>`).join(''):empty('No projects published yet. Add one to strengthen your résumé.')}`;
 $('print-resume').addEventListener('click',()=>window.print());
}
async function settingsPage(){const u=await authUser(true),p=await ownProfile(u);$('settings-email').textContent=u.email||'—';$('settings-discoverable').checked=!!p.discoverable;
 $('settings-save').addEventListener('click',async()=>{const {error}=await db.from('profiles').upsert({id:u.id,discoverable:$('settings-discoverable').checked},{onConflict:'id'});message('settings-message',error?helpfulError(error):'Preference saved.',!!error);});
 $('settings-signout').addEventListener('click',async()=>{await db.auth.signOut();location.assign('index.html');});
}
async function starsPage(){const u=await authUser(true);const [p,t,a]=await Promise.all([count('projects',['owner_id',u.id]),count('forum_threads',['author_id',u.id]),count('job_applications',['applicant_id',u.id])]);$('stars-projects').textContent=p;$('stars-threads').textContent=t;$('stars-applications').textContent=a;}
async function analyticsPage(){const [p,j,t]=await Promise.all([count('projects'),count('jobs'),count('forum_threads')]);$('analytics-projects').textContent=p;$('analytics-jobs').textContent=j;$('analytics-threads').textContent=t;}
const start={dashboard:dashboardPage,profile:profilePage,jobs:()=>listingsPage('jobs'),projects:()=>listingsPage('projects'),forum:forumPage,networking:networkPage,resume:resumePage,settings:settingsPage,mystars:starsPage,analytics_growth:analyticsPage};
const current=document.body.dataset.livePage;
if(start[current])start[current]().catch(error=>message('page-message',helpfulError(error),true));
