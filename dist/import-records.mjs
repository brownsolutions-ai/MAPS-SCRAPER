import {businessKey,mergeCompany,sameCompany,classifyNiche} from './core.mjs';

// Existing companies keep both their database ID and their original unique key.
// A newly discovered place_id or address can enrich the lead without replacing
// the identity referenced by lead_events.
export function prepareImportRecords(leads,existingLeads,country,now){
  const updates=[],inserts=[];
  for(const incoming of leads){
    const existing=existingLeads.find(l=>sameCompany(l,incoming));
    const merged=existing?mergeCompany(existing,incoming):incoming;
    const record={country_code:country,business_key:existing?.business_key||businessKey({...merged,country_code:country}),name:merged.name,city:merged.city||null,state:merged.state||null,address:merged.address||null,phone:merged.phone||null,website:merged.website||null,rating:merged.rating??null,reviews:merged.reviews??null,category:merged.category||null,niche:existing?.niche||merged.niche||classifyNiche(merged),maps_url:merged.maps_url||null,place_id:merged.place_id||null,instagram:merged.instagram||null,email:merged.email||null,status:existing?.status||'new',notes:existing?.notes||'',favorite:existing?.favorite||false,follow_up_at:existing?.follow_up_at||null,updated_at:now};
    if(existing)updates.push({...record,id:existing.id});
    else inserts.push(record);
  }
  return {updates,inserts};
}
