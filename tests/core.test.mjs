import test from 'node:test';
import assert from 'node:assert/strict';
import {siteType,phoneNumber,autoMap,toLead,planImport,sameCompany,exportCsv,filterLeads,classifyNiche} from '../dist/core.mjs';

test('classifica presença digital',()=>{
  assert.equal(siteType(''),'missing');
  assert.equal(siteType('instagram.com/acme'),'social');
  assert.equal(siteType('https://ifood.com.br/acme'),'platform');
  assert.equal(siteType('https://acme.com.br'),'own');
  assert.equal(siteType('javascript:alert(1)'),'review');
});

test('valida e normaliza telefone brasileiro',()=>{
  assert.equal(phoneNumber('(11) 99999-1234'),'5511999991234');
  assert.equal(phoneNumber('912 345 678','PT'),'351912345678');
  assert.equal(phoneNumber('123'),'');
});

test('reconhece colunas e remove duplicatas no arquivo',()=>{
  const headers=['Nome da empresa','Cidade','Telefone','Website'];
  const mapping=autoMap(headers);
  const rows=[['ACME','São Paulo','11999991234',''],['Acme','São Paulo','11999991234','https://acme.com']];
  const plan=planImport(rows,mapping,[]);
  assert.equal(plan.leads.length,1);assert.equal(plan.duplicates,1);assert.equal(plan.leads[0].website,'https://acme.com');
});

test('detecta empresa existente e preserva identificação',()=>{
  assert.equal(sameCompany({name:'Café Bom',city:'São Paulo',address:'Rua A 10',phone:''},{name:'Cafe Bom',city:'Sao Paulo',address:'Rua A, 10',phone:''}),true);
});

test('protege CSV contra fórmulas e filtra sem site',()=>{
  const lead={name:'=IMPORTXML("x")',city:'SP',website:'',status:'new'};
  assert.match(exportCsv([lead]),/"'=IMPORTXML/);
  assert.equal(filterLeads([lead],{site:'without'},'all').length,1);
});

test('classifica nichos automaticamente e permite separar a lista',()=>{
  assert.equal(classifyNiche({name:'Clínica Harmonia',category:'Clínica de estética'}),'aesthetics');
  assert.equal(classifyNiche({name:'Imóveis Brasil',category:'Imobiliária'}),'real_estate');
  const leads=[{name:'Clínica A',category:'Estética',niche:'aesthetics'},{name:'Imóveis B',category:'Imobiliária',niche:'real_estate'}];
  assert.equal(filterLeads(leads,{},'niche:aesthetics').length,1);
});

test('remove descartados da lista geral e mantém a área de descartados',()=>{
  const leads=[{name:'Ativa',status:'new'},{name:'Arquivada',status:'discarded'}];
  assert.deepEqual(filterLeads(leads,{},'all').map(l=>l.name),['Ativa']);
  assert.deepEqual(filterLeads(leads,{},'discarded').map(l=>l.name),['Arquivada']);
});

test('separa empresas e importações por país',()=>{
  const leads=[
    {name:'Clínica Central',city:'Lisboa',country_code:'PT',status:'new'},
    {name:'Clínica Central',city:'Lisboa',country_code:'BR',status:'new'}
  ];
  assert.equal(sameCompany(leads[0],leads[1]),false);
  assert.deepEqual(filterLeads(leads,{country:'PT'},'all').map(l=>l.country_code),['PT']);
  const mapping=autoMap(['Nome da empresa','Cidade']);
  const plan=planImport([['Empresa Europa','Dublin']],mapping,leads,'IE');
  assert.equal(plan.leads[0].country_code,'IE');
});
