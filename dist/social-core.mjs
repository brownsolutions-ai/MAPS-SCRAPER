import {phoneNumber,businessKey,norm,leadCountry} from './core.mjs';
import {REGIONS,regionMatches} from './regions.mjs';

export const STAGES={new:'Novo',contacted:'Contatado',retry:'Tentar novamente',discarded:'Descartado',negotiation:'Negociação / Call',won:'Fechado'};
export const SOURCES={spreadsheet:'Planilha',whatsapp:'WhatsApp',instagram:'Instagram'};
export const boardStatus=status=>({replied:'negotiation',followup:'retry'})[status]||status||'new';
export const isBoard=view=>['whatsapp','instagram','queue'].includes(view);
export function boardLeads(leads,view,filters={}){
  const query=norm(filters.q);
  return leads.filter(l=>(view==='queue'?l.contact_queue:l.source===view)&&
    (view==='queue'||leadCountry(l)==='BR')&&(!filters.region||leadCountry(l)==='BR')&&regionMatches(l,filters.region)&&
    (!filters.category||l.lead_category_id===filters.category)&&
    (!query||norm([l.name,l.phone,l.instagram].join(' ')).includes(query)));
}
export function prepareManualLead(input){
  const name=String(input.name||'').trim(),source=input.source||'whatsapp';
  const phone=phoneNumber(input.phone,'BR');
  if(!name||name.length>160)throw new Error('Informe um nome com até 160 caracteres.');
  if(!['whatsapp','instagram'].includes(source))throw new Error('Origem inválida.');
  if((source==='whatsapp'||input.phone)&&!phone)throw new Error('Informe um WhatsApp válido com DDD.');
  if(!REGIONS.BR.some(r=>r.code===input.state))throw new Error('Escolha um estado brasileiro.');
  if(!Object.hasOwn(STAGES,input.status))throw new Error('Escolha uma etapa válida.');
  const lead={name,phone:phone||null,state:input.state,country_code:'BR',source,status:input.status,
    lead_category_id:input.lead_category_id||null,instagram:String(input.instagram||'').trim().slice(0,200),contact_queue:!!input.contact_queue};
  return {...lead,business_key:businessKey(lead)};
}
