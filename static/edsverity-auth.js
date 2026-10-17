import {db,$,message} from './edsverity-client.js';
const form=$('auth-form'), submit=$('submit-button'), signout=$('signout-button');
const isRegister=location.pathname.endsWith('register.html');
const nextFromQuery=new URLSearchParams(location.search).get('next');
const next=(nextFromQuery && /^[a-z_]+\.html$/.test(nextFromQuery))?nextFromQuery:'dashboard.html';
const goDashboard=()=>location.assign(new URL(next,location.href).href);
async function checkCurrent(){const {data:{session}}=await db.auth.getSession();if(session&&!isRegister)goDashboard();}
form?.addEventListener('submit',async event=>{
 event.preventDefault();submit.disabled=true;message('auth-status','Please wait…');
 try{
  const email=$('email').value.trim(),password=$('password').value;
  if(isRegister){
   const full_name=$('fullname').value.trim();
   const {data,error}=await db.auth.signUp({email,password,options:{data:{full_name},emailRedirectTo:new URL('login.html',location.href).href}});
   if(error)throw error;
   if(data.session){message('auth-status','Account created. Opening dashboard…');goDashboard();}
   else message('auth-status','Check your inbox and confirm your email address, then sign in.');
  }else{
   const {error}=await db.auth.signInWithPassword({email,password});if(error)throw error;
   message('auth-status','Signed in. Opening your dashboard…');goDashboard();
  }
 }catch(e){message('auth-status',e.message||'Unable to sign in.',true);}finally{submit.disabled=false;}
});
signout?.addEventListener('click',async()=>{const {error}=await db.auth.signOut();message('auth-status',error?error.message:'Signed out.',!!error);if(!error)location.assign('index.html');});
checkCurrent().catch(()=>message('auth-status','Sign-in service temporarily unavailable.',true));
