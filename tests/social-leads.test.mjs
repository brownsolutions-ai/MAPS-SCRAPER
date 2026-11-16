import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareManualLead,boardStatus,boardLeads} from '../dist/social-core.mjs';
import {prepareImportRecords} from '../dist/import-records.mjs';

test('cadastro normaliza telefone e exige nome, origem, estado e etapa válidos',()=>{
  const input={name:'  Café Brasil  ',phone:'(11) 99999-1234',state:'SP',source:'whatsapp',status:'new'};
  assert.equal(prepareManualLead(input).phone,'5511999991234');
  assert.equal(prepareManualLead(input).name,'Café Brasil');
  for(const bad of [{name:''},{phone:'123'},{state:'ZZ'},{source:'fake'},{status:'fake'}])assert.throws(()=>prepareManualLead({...input,...bad}));
  assert.equal(prepareManualLead({...input,source:'instagram',phone:''}).phone,null);
});

test('quadro filtra origem e fila sem excluir descartados ou alterar status antigos',()=>{
  const leads=[{id:'a',name:'A',source:'whatsapp',country_code:'BR',state:'SP',status:'discarded'}, {id:'b',name:'B',source:'instagram',country_code:'BR',state:'RJ',status:'replied',contact_queue:true}];
  assert.deepEqual(boardLeads(leads,'whatsapp',{}).map(l=>l.id),['a']);
  assert.deepEqual(boardLeads(leads,'queue',{}).map(l=>l.id),['b']);
  assert.equal(boardLeads(leads,'queue',{region:'SP'}).length,0);
  assert.equal(boardStatus('replied'),'negotiation');
  assert.equal(boardStatus('followup'),'retry');
});

test('reimportar preserva origem, fila, categoria e etapa comercial',()=>{
  const existing={id:'a',name:'Café',phone:'11999991234',source:'whatsapp',contact_queue:true,lead_category_id:'category',status:'won'};
  const {updates}=prepareImportRecords([{name:'Café',phone:'11999991234'}],[existing],'BR','2026-11-15');
  for(const key of ['source','contact_queue','lead_category_id','status'])assert.equal(updates[0][key],existing[key]);
});

test('reimportar base antiga não exige as colunas sociais antes da migração',()=>{
  const existing={id:'a',name:'Empresa antiga',phone:'11999991234',status:'contacted'};
  const {updates}=prepareImportRecords([{name:'Empresa antiga',phone:'11999991234'}],[existing],'BR','2026-11-15');
  assert.equal(Object.hasOwn(updates[0],'source'),false);
  assert.equal(Object.hasOwn(updates[0],'contact_queue'),false);
});
