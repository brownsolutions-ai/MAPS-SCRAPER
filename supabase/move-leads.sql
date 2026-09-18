-- Move only location fields; preserve IDs, notes, statuses and existing history.
-- The function runs as the caller and uses the existing table permissions/RLS.
create or replace function public.move_crm_leads(p_ids uuid[], p_country text, p_state text)
returns jsonb
language plpgsql security invoker set search_path = public
as $$
declare
  lead public.companies;
  changed public.companies;
  moved jsonb := '[]'::jsonb;
  skipped jsonb := '[]'::jsonb;
  target_key text;
begin
  if p_country is null or p_country not in ('BR','PT','ES','IT','GB','DE','NL','IE','CH','AT','US') then
    raise exception 'País de destino inválido';
  end if;
  if coalesce(cardinality(p_ids),0) = 0 then raise exception 'Selecione pelo menos um lead'; end if;
  if (select count(*) from public.companies where id = any(p_ids)) <> (select count(distinct id) from unnest(p_ids) t(id)) then
    raise exception 'Um dos leads não está mais disponível. Atualize a página.';
  end if;
  for lead in select * from public.companies where id = any(p_ids) order by id for update loop
    target_key := case when p_country = 'BR' then '' else 'country:' || p_country || '|' end
      || regexp_replace(lead.business_key, '^country:[A-Z]{2}\|', '');
    begin
      update public.companies set country_code=p_country,state=nullif(trim(p_state),''),
        business_key=target_key,updated_at=now() where id=lead.id returning * into changed;
    exception when unique_violation then
      skipped := skipped || jsonb_build_array(jsonb_build_object('id',lead.id,'name',lead.name));
      continue;
    end;
    insert into public.lead_events(company_id,event_type,description)
      values(lead.id,'location_moved','Destino corrigido para ' || p_country || ' · ' || coalesce(nullif(trim(p_state),''),'Sem região definida'));
    moved := moved || jsonb_build_array(to_jsonb(changed));
  end loop;
  return jsonb_build_object('moved',moved,'skipped',skipped);
end;
$$;
grant execute on function public.move_crm_leads(uuid[],text,text) to anon, authenticated;
