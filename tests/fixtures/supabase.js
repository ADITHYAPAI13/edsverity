// Browser-only test double. No credentials, external requests or production data.
const userA={id:'owner-a',email:'owner@example.test',user_metadata:{full_name:'Owner A'},created_at:'2026-01-01'};
const userB={id:'applicant-b',email:'applicant@example.test',user_metadata:{full_name:'Applicant B'},created_at:'2026-01-01'};
const initial={user:userB,profiles:[],jobs:[{id:'job-1',posted_by:userA.id,title:'Research intern',company:'Example lab',description:'Help document real research projects.',job_type:'Internship',created_at:'2026-01-02'}],projects:[],job_applications:[],forum_threads:[],forum_replies:[],failures:{},calls:[]};
let state=JSON.parse(localStorage.getItem('ev-test-state')||'null')||initial;
const callbacks=[];
function persist(){localStorage.setItem('ev-test-state',JSON.stringify(state));}
window.fixture={get state(){return state;},userA,userB,persist,emit(event,user){state.user=user;persist();callbacks.forEach(fn=>fn(event,user?{user}:null));}};
function fail(key){
 const mode=state.failures[key];if(!mode)return null;
 delete state.failures[key];persist();
 if(mode==='throw')throw new Error('Simulated connection failure');
 return {message:'Simulated permission failure',code:mode};
}
class Query {
 constructor(table){this.table=table;this.filters=[];this.operation='select';}
 select(fields,options={}){this.fields=fields;this.countOnly=options.head;return this;}
 eq(k,v){this.filters.push(r=>r[k]===v);return this;}
 in(k,values){this.filters.push(r=>values.includes(r[k]));return this;}
 order(){return this;}
 limit(n){this.max=n;return this;}
 maybeSingle(){this.single=true;return this;}
 insert(payload){this.operation='insert';this.payload=payload;return this;}
 upsert(payload){this.operation='upsert';this.payload=payload;return this;}
 update(payload){this.operation='update';this.payload=payload;return this;}
 delete(){this.operation='delete';return this;}
 async then(resolve,reject){
  try {
   const key=`${this.table}.${this.operation}`;
   state.calls.push({key,payload:this.payload});persist();
   if(state.delay)await new Promise(r=>setTimeout(r,state.delay));
   const error=fail(key);if(error)return resolve({error,data:null});
   const table=state[this.table];let rows=table.filter(r=>this.filters.every(fn=>fn(r)));
   if(this.operation==='insert'){
    if(this.table==='job_applications'&&table.some(r=>r.job_id===this.payload.job_id&&r.applicant_id===this.payload.applicant_id))return resolve({error:{code:'23505',message:'Duplicate application'}});
    const row={id:`${this.table}-${table.length+1}`,created_at:'2026-02-01',status:'submitted',...this.payload};table.push(row);rows=[row];
   }
   if(this.operation==='upsert'){
    let row=table.find(r=>r.id===this.payload.id);if(row)Object.assign(row,this.payload);else{row={...this.payload};table.push(row);}rows=[row];
   }
   if(this.operation==='update')rows.forEach(r=>Object.assign(r,this.payload));
   if(this.operation==='delete')state[this.table]=table.filter(r=>!rows.includes(r));
   if(this.table==='job_applications'&&this.fields?.includes('jobs('))rows=rows.map(r=>({...r,jobs:state.jobs.find(j=>j.id===r.job_id)}));
   if(this.max)rows=rows.slice(0,this.max);
   persist();return resolve({data:this.single?(rows[0]||null):rows,count:rows.length,error:null});
  }catch(error){return reject(error);}
 }
}
export function createClient(){return {
 from:table=>new Query(table),
 auth:{
  async getUser(){const error=fail('auth.getUser');return {data:{user:state.user},error};},
  async getSession(){return {data:{session:state.user?{user:state.user}:null},error:null};},
  onAuthStateChange(fn){callbacks.push(fn);return {data:{subscription:{unsubscribe(){}}}};},
  async signOut(){const error=fail('auth.signOut');if(error)return {error};window.fixture.emit('SIGNED_OUT',null);return {error:null};},
  async signInWithPassword(){const error=fail('auth.signIn');if(error)return {error};window.fixture.emit('SIGNED_IN',userB);return {data:{user:userB},error:null};},
  async signUp(){return {data:{session:null},error:null};}
 },
 storage:{from:()=>({
  async upload(path){const error=fail('storage.upload');state.calls.push({key:'storage.upload',path});persist();return {data:{path},error};},
  getPublicUrl:path=>({data:{publicUrl:'https://avatars.example.test/'+path}})
 })}
};}
