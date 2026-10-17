import {db, $, authUser, message, helpfulError} from './edsverity-client.js';

export function applicationDialog(user, onSubmitted) {
 const dialog=$('application-dialog'), form=$('application-form');
 const note=$('application-note'), submit=$('application-submit'), cancel=$('application-cancel');
 let job=null, busy=false, opener=null;
 const length=()=>Array.from(note.value.trim()).length;
 function validate(){
  const size=length();
  $('application-count').textContent=`${size} / 2000 characters`;
  note.setCustomValidity(size<10||size>2000?'Write between 10 and 2000 characters.':'');
 }
 function close(){if(!busy)dialog.close();}
 cancel.addEventListener('click',close);
 dialog.addEventListener('cancel',event=>{if(busy)event.preventDefault();});
 dialog.addEventListener('close',()=>{
  const replacement=job&&document.querySelector(`.apply-trigger[data-id="${CSS.escape(job.id)}"]`);
  if(opener?.isConnected&&!opener.disabled)opener.focus();
  else if(replacement&&!replacement.disabled)replacement.focus();
  else $('live-search')?.focus();
 });
 note.addEventListener('input',validate);
 form.addEventListener('submit',async event=>{
  event.preventDefault();if(busy||!job)return;
  validate();if(!form.reportValidity())return;
  busy=true;submit.disabled=true;cancel.disabled=true;note.readOnly=true;
  form.setAttribute('aria-busy','true');message('application-message','Submitting your application…');
  try {
   const active=await authUser(true);
   if(active.id!==user.id)throw new Error('Your account changed. Reload this page before applying.');
   if(job.posted_by===active.id)throw new Error('You cannot apply to your own listing.');
   const {error}=await db.from('job_applications').insert({job_id:job.id,applicant_id:active.id,cover_note:note.value.trim()});
   if(error&&error.code!=='23505')throw error;
   busy=false;dialog.close();
   onSubmitted(job.id,error?'You have already applied to this opportunity. View it on your dashboard.':'Your application was submitted. Track it on your dashboard.');
  } catch(error) {message('application-message',helpfulError(error),true);}
  finally {
   busy=false;submit.disabled=false;cancel.disabled=false;note.readOnly=false;
   form.removeAttribute('aria-busy');
  }
 });
 return (selected,trigger)=>{
  if(busy||dialog.open||!user||selected.posted_by===user.id)return;
  job=selected;opener=trigger;form.reset();
  $('application-job-title').textContent=job.title;
  $('application-company').textContent=job.company||'Community opportunity';
  message('application-message','');validate();dialog.showModal();note.focus();
 };
}
