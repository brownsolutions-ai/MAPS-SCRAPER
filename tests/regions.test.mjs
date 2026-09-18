import test from 'node:test';
import assert from 'node:assert/strict';
import {REGIONS,resolveRegion,leadRegion,regionMatches} from '../dist/regions.mjs';
import {COUNTRIES,filterLeads,autoMap,planImport,phoneNumber} from '../dist/core.mjs';
test('todos os países têm catálogo completo sem códigos repetidos',()=>{
 const counts={BR:27,US:51,PT:20,ES:19,IT:20,GB:4,DE:16,NL:15,IE:26,CH:26,AT:9};
 assert.deepEqual(Object.keys(REGIONS).sort(),Object.keys(COUNTRIES).sort());
 for(const [country,count] of Object.entries(counts)){assert.equal(REGIONS[country].length,count,country);assert.equal(new Set(REGIONS[country].map(r=>r.code)).size,count);for(const region of REGIONS[country]){assert.equal(resolveRegion(country,region.name),region.code);assert.equal(resolveRegion(country,`${country}-${region.code}`),region.code);}}
});
test('reconhece nomes locais, acentos e siglas sem adivinhar dados ausentes',()=>{
 for(const [country,value,code] of [['BR','sao paulo','SP'],['BR','SP','SP'],['PT','Distrito de Lisboa','11'],['ES','Catalunya','CT'],['DE','Bayern','BY'],['IE','County Dublin','D'],['US','California','CA'],['CH','Zürich','ZH']])assert.equal(resolveRegion(country,value),code);
 assert.equal(resolveRegion('PT','SP'),'');assert.equal(leadRegion({country_code:'BR',city:'São Paulo'}),'');assert.equal(resolveRegion('BR','São Paulo / desconhecido'),'');
});
test('filtra região junto com país, nicho e status sem perder leads não reconhecidos',()=>{
 const leads=[{name:'A',state:'SP',status:'new',niche:'restaurants'},{name:'B',state:'São Paulo',status:'contacted',niche:'restaurants'},{name:'C',state:'SP',status:'discarded'},{name:'D',country_code:'US',state:'CA',status:'new'},{name:'E',state:'desconhecido',status:'new'}];
 assert.deepEqual(filterLeads(leads,{country:'BR',region:'SP'},'all').map(l=>l.name),['A','B']);
 assert.deepEqual(filterLeads(leads,{country:'BR',region:'SP'},'contacted').map(l=>l.name),['B']);
 assert.equal(filterLeads(leads,{country:'BR',region:'SP'},'niche:restaurants').length,2);
 assert.deepEqual(filterLeads(leads,{country:'BR',region:'unassigned'},'all').map(l=>l.name),['E']);
 assert.equal(leads.filter(l=>regionMatches(l,'')).length,5);
});
test('importação normaliza região e só usa destino padrão se coluna estiver vazia',()=>{
 const plan=planImport([['A','California'],['B',''],['C','Unknown']],autoMap(['Name','State']),[],'US','NY');
 assert.deepEqual(plan.leads.map(l=>l.state),['CA','NY','Unknown']);assert.ok(plan.leads.every(l=>l.country_code==='US'));
 assert.equal(phoneNumber('(212) 555-1234','US'),'12125551234');assert.equal(phoneNumber('555','US'),'');
});
