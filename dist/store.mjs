import {createClient} from './vendor/supabase.js';
import {SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY} from './config.mjs';
import {businessKey,mergeCompany,sameCompany,classifyNiche,leadCountry} from './core.mjs';
import {REGIONS} from './regions.mjs';
import {prepareImportRecords} from './import-records.mjs';
import {prepareManualLead} from './social-core.mjs';

let db=null;
let rerender=()=>{};
let notify=()=>{};
const LOCAL_CACHE_KEY='mapa-leads-public-cache-v1';
const LOCAL_MIGRATION_KEY='mapa-leads-public-cache-migrated-v1:'+SUPABASE_URL;
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
  state.leads=cached.leads.map(l=>({...l,country_code:leadCountry(l),niche:l.niche||classifyNiche(l)}));
  state.events=cached.events||[];
  state.imports=cached.imports||[];
  return true;
}

function localMigrationDone(){try{return localStorage.getItem(LOCAL_MIGRATION_KEY)==='1';}catch{return false;}}
function markLocalMigrationDone(){try{localStorage.setItem(LOCAL_MIGRATION_KEY,'1');}catch{}}

async function migrateLocalToRemote(cached){
  if(!cached?.leads?.length||localMigrationDone())return false;
  const now=new Date().toISOString();
  const records=cached.leads.map(l=>({
    country_code:leadCountry(l),business_key:businessKey(l),name:l.name,city:l.city||null,state:l.state||null,address:l.address||null,
    phone:l.phone||null,website:l.website||null,rating:l.rating??null,reviews:l.reviews??null,
    category:l.category||null,niche:l.niche||classifyNiche(l),maps_url:l.maps_url||null,
    place_id:l.place_id||null,instagram:l.instagram||null,email:l.email||null,status:l.status||'new',
    notes:l.notes||'',favorite:!!l.favorite,follow_up_at:l.follow_up_at||null,updated_at:l.updated_at||now
  }));
  for(let i=0;i<records.length;i+=300){const {error}=await db.from('companies').upsert(records.slice(i,i+300),{onConflict:'business_key',ignoreDuplicates:true});if(error)throw new Error(errMessage(error));}
  const batches=(cached.imports||[]).map(b=>({country_code:b.country_code||'BR',filename:b.filename||'Importação anterior',source_rows:b.source_rows||0,created_count:b.created_count||0,updated_count:b.updated_count||0,skipped_count:b.skipped_count||0,created_at:b.created_at||now}));
  if(batches.length){const {error}=await db.from('import_batches').insert(batches);if(error)throw new Error(errMessage(error));}
  markLocalMigrationDone();return true;
}

const errMessage=error=>{
  const m=String(error?.message||error||'Erro desconhecido');
  if(/failed to fetch|fetch failed|networkerror|network request failed/i.test(m))return 'Não foi possível acessar o endereço do Supabase. Confira a conexão, a URL e se o projeto está ativo.';
  if(/relation .* does not exist|schema cache|could not find the table/i.test(m))return 'As tabelas do CRM ainda não foram criadas no Supabase. Abra Configurações e execute o arquivo schema.sql.';
  if(/invalid login credentials/i.test(m))return 'E-mail ou senha incorretos.';
  if(/email not confirmed/i.test(m))return 'Confirme seu e-mail antes de entrar.';
  return m;
};

export function client(){return db;}

function requireSocial(state){
  if(!db||state.demo||state.loading)throw new Error('Sem conexão com o banco. Reconecte para salvar.');
  if(!state.socialReady)throw new Error('Atualize o banco com social-leads.sql para ativar os leads sociais.');
}

export async function saveManualLead(state,input,id){
  requireSocial(state);
  const record=prepareManualLead(input);
  if(record.lead_category_id&&!state.categories.some(c=>c.id===record.lead_category_id))throw new Error('Escolha uma categoria existente.');
  const existing=state.leads.find(l=>l.id===id);
  if(id&&!existing)throw new Error('Lead não encontrado. Atualize a base.');
  const duplicate=state.leads.find(l=>l.id!==id&&sameCompany(l,record));
  if(duplicate)throw new Error('Essa empresa já existe na base. Use a busca para enviá-la à fila de contato.');
  // A identidade usada por importações e histórico permanece estável na edição.
  if(existing)record.business_key=existing.business_key;
  record.updated_at=new Date().toISOString();
  const query=id?db.from('companies').update(record).eq('id',id):db.from('companies').insert(record);
  const {data,error}=await query.select().single();
  if(error)throw new Error(error.code==='23505'?'Essa empresa já foi cadastrada. Atualize a base.':errMessage(error));
  state.leads=id?state.leads.map(l=>l.id===id?data:l):[data,...state.leads];
  if(existing&&existing.status!==data.status){
    const {data:events,error:eventError}=await db.from('lead_events').insert({company_id:id,event_type:'status_changed',from_status:existing.status,to_status:data.status,description:'Status atualizado'}).select();
    if(!eventError)state.events=[...(events||[]),...state.events];
  }
  saveLocal(state);
  notify(id?'Lead atualizado no banco.':'Lead adicionado ao banco.');
  return data;
}

export async function createCategory(state,value){
  requireSocial(state);
  const name=String(value||'').trim();
  if(!name||name.length>60)throw new Error('Use entre 1 e 60 caracteres para a categoria.');
  const {data,error}=await db.from('lead_categories').insert({name}).select().single();
  if(error)throw new Error(error.code==='23505'?'Essa categoria já existe.':errMessage(error));
  state.categories.push(data);
  return data;
}

export async function moveRecords(state,ids,country,region){
  if(!db||state.demo||state.loading)throw new Error('Aguarde a conexão com o banco para mover leads.');
  if(!REGIONS[country]||(region&&!REGIONS[country].some(r=>r.code===region)))throw new Error('Escolha um país e uma região válidos.');
  const uniqueIds=[...new Set(ids)];
  if(!uniqueIds.length)throw new Error('Selecione pelo menos um lead.');
  const {data,error}=await db.rpc('move_crm_leads',{p_ids:uniqueIds,p_country:country,p_state:region||null});
  if(error)throw new Error(errMessage(error));
  const moved=new Map((data?.moved||[]).map(l=>[l.id,l]));
  state.leads=state.leads.map(l=>moved.get(l.id)||l);
  const {data:events,error:eventError}=await db.from('lead_events').select('*').in('company_id',uniqueIds).order('created_at',{ascending:false});
  if(!eventError){state.events=[...(events||[]),...state.events.filter(e=>!uniqueIds.includes(e.company_id))];}
  saveLocal(state);
  return {moved:data?.moved||[],skipped:data?.skipped||[]};
}

export async function initialize(state,onRender,onToast){
  rerender=onRender;notify=onToast;
  db=createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  hydrateLocal(state);rerender();
  await loadAll(state);
}

async function fetchAll(table){
  const rows=[];
  for(let from=0;;from+=1000){
    const {data,error}=await db.from(table).select('*').order('created_at',{ascending:false}).order('id',{ascending:false}).range(from,from+999);
    if(error)return {data:[],error};
    rows.push(...data);
    if(data.length<1000)return {data:rows,error:null};
  }
}

export async function loadAll(state){
  if(!db)return;
  const cached=readLocal();
  state.loading=true;rerender();
  let companies,events,imports;
  try{
    [companies,events,imports]=await Promise.all([
      fetchAll('companies'),
      fetchAll('lead_events'),
      fetchAll('import_batches')
    ]);
  }catch(error){
    state.loading=false;state.demo=true;hydrateLocal(state);rerender();throw new Error(errMessage(error));
  }
  state.loading=false;
  const error=companies.error||events.error||imports.error;
  if(error){state.demo=true;hydrateLocal(state);rerender();throw new Error(errMessage(error));}
  if(await migrateLocalToRemote(cached)){notify('Leads deste computador sincronizados com a base compartilhada.');return loadAll(state);}
  const categories=await fetchAll('lead_categories');
  state.socialReady=!categories.error;
  state.categories=categories.data||[];
  state.demo=false;state.leads=(companies.data||[]).map(l=>({...l,country_code:leadCountry(l),niche:l.niche||classifyNiche(l)}));state.events=events.data||[];state.imports=(imports.data||[]).map(b=>({...b,country_code:b.country_code||'BR'}));rerender();
  markLocalMigrationDone();
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
  if(state.loading||state.demo||!db)throw new Error('Sem conexão com o banco. Reconecte para salvar a alteração.');
  if(Object.keys(patch).some(k=>['contact_queue','lead_category_id'].includes(k))&&!state.socialReady)throw new Error('Atualize o banco com social-leads.sql antes de salvar.');
  const before=new Map(state.leads.filter(l=>ids.includes(l.id)).map(l=>[l.id,{...l}]));
  const now=new Date().toISOString();
  const clean=Object.fromEntries(Object.entries(patch).filter(([k])=>['status','favorite','notes','follow_up_at','niche','state','contact_queue','lead_category_id'].includes(k)));
  clean.updated_at=now;
  const {data,error}=await db.from('companies').update(clean).in('id',ids).select();
  if(error)throw new Error(errMessage(error));
  if(data.length!==new Set(ids).size){await loadAll(state);throw new Error('Alguns leads não estão mais disponíveis. A base foi atualizada.');}
  const saved=new Map(data.map(l=>[l.id,l]));
  state.leads=state.leads.map(l=>saved.get(l.id)||l);
  const events=[];
  for(const id of ids){
    const old=before.get(id);if(!old)continue;
    if(patch.status&&patch.status!==old.status)events.push({company_id:id,event_type:'status_changed',from_status:old.status,to_status:patch.status,description:'Status atualizado'});
    if(Object.hasOwn(patch,'state')&&patch.state!==old.state)events.push({company_id:id,event_type:'region_changed',description:patch.state?'Estado / região atualizado':'Estado / região removido'});
    if(patch.niche&&patch.niche!==old.niche)events.push({company_id:id,event_type:'niche_changed',description:'Nicho atualizado manualmente'});
    if(Object.hasOwn(patch,'notes')&&patch.notes!==old.notes)events.push({company_id:id,event_type:'note_updated',description:'Notas atualizadas'});
    if(Object.hasOwn(patch,'follow_up_at')&&patch.follow_up_at!==old.follow_up_at)events.push({company_id:id,event_type:'follow_up_scheduled',description:patch.follow_up_at?'Próximo contato agendado':'Agendamento removido'});
  }
  if(events.length){const {data,error:eventError}=await db.from('lead_events').insert(events).select();if(!eventError)state.events=[...(data||[]),...state.events];}
  saveLocal(state);
  notify(ids.length>1?'Leads atualizados.':'Lead atualizado.');
}

export async function importCompanies(state,plan,filename,country='BR'){
  const now=new Date().toISOString();
  if(state.demo){
    const current=[...state.leads];
    for(const incoming of plan.leads){const prepared={...incoming,country_code:country};const i=current.findIndex(x=>sameCompany(x,prepared));if(i>=0)current[i]=mergeCompany(current[i],prepared);else current.unshift({...prepared,id:crypto.randomUUID(),status:'new',notes:'',favorite:false,follow_up_at:null,created_at:now,updated_at:now});}
    state.leads=current;state.imports.unshift({id:crypto.randomUUID(),country_code:country,filename,created_count:plan.created,updated_count:plan.updated,skipped_count:plan.invalid+plan.duplicates,created_at:now});saveLocal(state);rerender();return {saved:false};
  }
  const {updates,inserts}=prepareImportRecords(plan.leads,state.leads,country,now);
  for(let i=0;i<updates.length;i+=300){const {error}=await db.from('companies').upsert(updates.slice(i,i+300),{onConflict:'id'});if(error)throw new Error(errMessage(error));}
  let created=0;
  for(let i=0;i<inserts.length;i+=300){const {data,error}=await db.from('companies').upsert(inserts.slice(i,i+300),{onConflict:'business_key',ignoreDuplicates:true}).select('id');if(error)throw new Error(errMessage(error));created+=(data||[]).length;}
  const batch={country_code:country,filename,source_rows:plan.leads.length+plan.invalid+plan.duplicates,created_count:created,updated_count:updates.length,skipped_count:plan.invalid+plan.duplicates+inserts.length-created};
  const {error}=await db.from('import_batches').insert(batch);if(error)throw new Error(errMessage(error));
  await loadAll(state);return {saved:true};
}
