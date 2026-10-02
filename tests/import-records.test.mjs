import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareImportRecords} from '../dist/import-records.mjs';

test('a reimportação mantém a identidade apontada pelo histórico',()=>{
  const existing={id:'11111111-1111-4111-8111-111111111111',country_code:'BR',business_key:'name:acme|sao paulo',name:'Acme',city:'São Paulo',phone:'11999991234',place_id:'',niche:'beauty',status:'contacted',notes:'Responder na sexta',favorite:true};
  const incoming={country_code:'BR',name:'Acme',city:'São Paulo',place_id:'novo-place-id',phone:'11999991234',niche:'services'};
  const result=prepareImportRecords([incoming],[existing],'BR','2026-10-02T12:00:00Z');
  assert.equal(result.inserts.length,0);
  assert.equal(result.updates.length,1);
  assert.equal(result.updates[0].id,existing.id);
  assert.equal(result.updates[0].business_key,existing.business_key);
  assert.equal(result.updates[0].place_id,'novo-place-id');
  assert.equal(result.updates[0].status,'contacted');
  assert.equal(result.updates[0].notes,'Responder na sexta');
  assert.equal(result.updates[0].niche,'beauty');
  assert.equal(result.updates[0].favorite,true);
});

test('empresas novas deixam o banco gerar a identificação',()=>{
  const result=prepareImportRecords([{country_code:'BR',name:'Nova empresa',city:'Recife',phone:'81999991234'}],[],'BR','2026-10-02T12:00:00Z');
  assert.equal(result.updates.length,0);
  assert.equal(result.inserts.length,1);
  assert.equal(Object.hasOwn(result.inserts[0],'id'),false);
  assert.equal(result.inserts[0].business_key,'phone:nova empresa|81999991234|recife');
});
