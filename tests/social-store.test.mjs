import test from 'node:test';
import assert from 'node:assert/strict';
import {initialize,saveManualLead,updateRecords,createCategory,loadAll} from '../dist/store.mjs';

test('salva no servidor, recarrega etapas e categorias e não altera estado quando o servidor recusa',async()=>{
  const originalFetch=globalThis.fetch;
  const tables={companies:[],lead_events:[],import_batches:[],lead_categories:[]};
  let reject=false;
  globalThis.localStorage={getItem:()=>null,setItem:()=>{}};
  globalThis.fetch=async(input,init={})=>{
    const url=new URL(typeof input==='string'?input:input.url||String(input));
    const table=url.pathname.split('/').pop(),method=init.method||'GET';
    if(reject&&method!=='GET')return new Response(JSON.stringify({message:'Gravação recusada',code:'42501'}),{status:403});
    let rows=tables[table]||[];
    if(method==='POST'){
      const values=JSON.parse(init.body);const inserted=(Array.isArray(values)?values:[values]).map(row=>({id:crypto.randomUUID(),created_at:new Date().toISOString(),...row}));
      tables[table].push(...inserted);rows=inserted;
    }
    if(method==='PATCH'){
      const ids=url.searchParams.get('id');rows=rows.filter(row=>ids.includes(row.id));rows.forEach(row=>Object.assign(row,JSON.parse(init.body)));
    }
    const accept=new Headers(init.headers).get('accept')||'';
    return new Response(JSON.stringify(accept.includes('vnd.pgrst.object')?rows[0]:rows),{status:200,headers:{'Content-Type':'application/json'}});
  };
  try{
    const state={leads:[],events:[],imports:[],categories:[],demo:true};
    await initialize(state,()=>{},()=>{});
    const category=await createCategory(state,'Parceiros');
    const lead=await saveManualLead(state,{name:'Teste',phone:'11999991234',state:'SP',source:'whatsapp',status:'new',lead_category_id:category.id});
    await updateRecords(state,[lead.id],{contact_queue:true,status:'contacted'});
    await loadAll(state);
    assert.equal(state.leads[0].contact_queue,true);
    assert.equal(state.leads[0].status,'contacted');
    assert.equal(state.leads[0].lead_category_id,category.id);
    await saveManualLead(state,{...state.leads[0],status:'won'},lead.id);
    assert.equal(state.events[0].to_status,'won');
    reject=true;
    await assert.rejects(updateRecords(state,[lead.id],{status:'discarded'}),/recusada/);
    assert.equal(state.leads[0].status,'won');
    await assert.rejects(saveManualLead(state,{name:'Outro',phone:'21999991234',state:'RJ',source:'whatsapp',status:'new'}),/recusada/);
    assert.equal(state.leads.length,1);
    state.demo=true;
    await assert.rejects(updateRecords(state,[lead.id],{status:'new'}),/conexão/);
  }finally{globalThis.fetch=originalFetch;delete globalThis.localStorage;}
});
