import {createClient} from './vendor/supabase.js';
import {SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY} from './config.mjs';
import {businessKey,mergeCompany,sameCompany,classifyNiche} from './core.mjs';

let db=null;
let rerender=()=>{};
let notify=()=>{};
const LOCAL_CACHE_KEY='mapa-leads-public-cache-v1';

function readLocal(){
  try{
    const raw=localStorage.getItem(LOCAL_CACHE_KEY);
    if(!raw)return null;
    const parsed=JSON.parse(raw);
    return parsed&&Array.isArray(parsed.leads)?parsed:null;
  }catch{return null;}
}

function saveLocal(state){
  try{localStorage.setItem(LOCAL_CACHE_KEY,JSON.stringify({leads:state.leads||[],events:state.events||[],imports:state.imports||[]}));}catch{}
}

function hydrateLocal(state){
  const cached=readLocal();
  if(!cached)return false;
  state.leads=cached.leads.map(l=>({...l,niche:l.niche||classifyNiche(l)}));
  state.events=cached.events||[];
  state.imports=cached.imports||[];
  return true;
}

const errMessage=error=>{
  const m=String(error?.message||error||'Erro desconhecido');
  if(/relation .* does not exist|schema cache|could not find the table/i.test(m))return 'As tabelas do CRM ainda não foram criadas no Supabase. Abra Configurações e execute o arquivo schema.sql.';
  if(/invalid login credentials/i.test(m))return 'E-mail ou senha incorretos.';
  if(/email not confirmed/i.test(m))return 'Confirme seu e-mail antes de entrar.';
  return m;
};

export function client(){return db;}

export async function initialize(state,onRender,onToast){
  rerender=onRender;notify=onToast;
  db=createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  hydrateLocal(state);rerender();
  await loadAll(state);
}

export async function loadAll(state){
  if(!db)return;
  state.loading=true;rerender();
  const [companies,events,imports]=await Promise.all([
    db.from('companies').select('*').order('created_at',{ascending:false}),
    db.from('lead_events').select('*').order('created_at',{ascending:false}),
    db.from('import_batches').select('*').order('created_at',{ascending:false})
  ]);
  state.loading=false;
  const error=companies.error||events.error||imports.error;
  if(error){state.demo=true;hydrateLocal(state);rerender();throw new Error(errMessage(error));}
  state.demo=false;state.leads=(companies.data||[]).map(l=>({...l,niche:l.niche||classifyNiche(l)}));state.events=events.data||[];state.imports=imports.data||[];rerender();
  saveLocal(state);
}

export async function signIn(state,email,password){
  if(!db)throw new Error('A conexão ainda está sendo iniciada.');
  const {data,error}=await db.auth.signInWithPassword({email,password});
  if(error)throw new Error(errMessage(error));
  state.user=data.user;await loadAll(state);return data;
}

export async function signUp(state,email,password){
  if(!db)throw new Error('A conexão ainda está sendo iniciada.');
  const {data,error}=await db.auth.signUp({email,password});
  if(error)throw new Error(errMessage(error));
  if(data.session){state.user=data.user;await loadAll(state);}
  return data;
}

export async function signOut(state){if(db)await db.auth.signOut();state.user=null;state.demo=true;state.leads=[];state.events=[];state.imports=[];rerender();}

export async function updateRecords(state,ids,patch){
  if(!ids.length)return;
  const before=new Map(state.leads.filter(l=>ids.includes(l.id)).map(l=>[l.id,{...l}]));
  const now=new Date().toISOString();
  state.leads=state.leads.map(l=>ids.includes(l.id)?{...l,...patch,updated_at:now}:l);
  if(state.demo){saveLocal(state);rerender();notify('Alteração salva neste navegador. Execute o schema para compartilhar com outras pessoas.');return;}
  const clean=Object.fromEntries(Object.entries(patch).filter(([k])=>['status','favorite','notes','follow_up_at'].includes(k)));
  clean.updated_at=now;
  const {error}=await db.from('companies').update(clean).in('id',ids);
  if(error){state.leads=state.leads.map(l=>before.has(l.id)?before.get(l.id):l);rerender();throw new Error(errMessage(error));}
  const events=[];
  for(const id of ids){
    const old=before.get(id);if(!old)continue;
    if(patch.status&&patch.status!==old.status)events.push({company_id:id,event_type:'status_changed',from_status:old.status,to_status:patch.status,description:'Status atualizado'});
    if(Object.hasOwn(patch,'notes')&&patch.notes!==old.notes)events.push({company_id:id,event_type:'note_updated',description:'Notas atualizadas'});
    if(Object.hasOwn(patch,'follow_up_at')&&patch.follow_up_at!==old.follow_up_at)events.push({company_id:id,event_type:'follow_up_scheduled',description:patch.follow_up_at?'Próximo contato agendado':'Agendamento removido'});
  }
  if(events.length){const {data,error:eventError}=await db.from('lead_events').insert(events).select();if(!eventError)state.events=[...(data||[]),...state.events];}
  notify(ids.length>1?'Leads atualizados.':'Lead atualizado.');
}

export async function importCompanies(state,plan,filename){
  const now=new Date().toISOString();
  if(state.demo){
    const current=[...state.leads];
    for(const incoming of plan.leads){const i=current.findIndex(x=>sameCompany(x,incoming));if(i>=0)current[i]=mergeCompany(current[i],incoming);else current.unshift({...incoming,id:crypto.randomUUID(),status:'new',notes:'',favorite:false,follow_up_at:null,created_at:now,updated_at:now});}
    state.leads=current;state.imports.unshift({id:crypto.randomUUID(),filename,created_count:plan.created,updated_count:plan.updated,skipped_count:plan.invalid+plan.duplicates,created_at:now});saveLocal(state);rerender();return {saved:false};
  }
  const records=plan.leads.map(incoming=>{
    const existing=state.leads.find(x=>sameCompany(x,incoming));
    const merged=existing?mergeCompany(existing,incoming):incoming;
    return {id:existing?.id,business_key:businessKey(merged),name:merged.name,city:merged.city||null,state:merged.state||null,address:merged.address||null,phone:merged.phone||null,website:merged.website||null,rating:merged.rating,reviews:merged.reviews,category:merged.category||null,niche:merged.niche||classifyNiche(merged),maps_url:merged.maps_url||null,place_id:merged.place_id||null,instagram:merged.instagram||null,email:merged.email||null,status:existing?.status||'new',notes:existing?.notes||'',favorite:existing?.favorite||false,follow_up_at:existing?.follow_up_at||null,updated_at:now};
  }).map(r=>Object.fromEntries(Object.entries(r).filter(([,v])=>v!==undefined)));
  for(let i=0;i<records.length;i+=300){const {error}=await db.from('companies').upsert(records.slice(i,i+300),{onConflict:'business_key'});if(error)throw new Error(errMessage(error));}
  const batch={filename,source_rows:plan.leads.length+plan.invalid+plan.duplicates,created_count:plan.created,updated_count:plan.updated,skipped_count:plan.invalid+plan.duplicates};
  const {error}=await db.from('import_batches').insert(batch);if(error)throw new Error(errMessage(error));
  await loadAll(state);return {saved:true};
}
