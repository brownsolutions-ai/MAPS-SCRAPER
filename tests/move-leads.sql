-- Run against a database with schema.sql installed. Fixtures are rolled back.
begin;
set local role anon;
do $$
declare a uuid:=gen_random_uuid(); b uuid:=gen_random_uuid(); c uuid:=gen_random_uuid(); result jsonb; suffix text:=gen_random_uuid()::text;
begin
  insert into public.companies(id,business_key,name,country_code,status,notes,favorite)
  values(a,'place:'||suffix||'a','Teste transferência A','BR','replied','Preservar nota',true),
        (b,'place:'||suffix||'b','Teste duplicado','BR','contacted','Nota original',false),
        (c,'country:PT|place:'||suffix||'b','Teste destino','PT','new','Nota destino',false);
  result:=public.move_crm_leads(array[a,b],'PT','11');
  assert jsonb_array_length(result->'moved')=1,'Deve mover apenas o lead sem duplicata';
  assert jsonb_array_length(result->'skipped')=1,'Deve informar a duplicata';
  assert (result->'skipped'->0->>'id')=b::text,'Deve ignorar o lead correto';
  assert exists(select 1 from public.companies where id=a and country_code='PT' and state='11' and notes='Preservar nota' and status='replied' and favorite),'Deve preservar acompanhamento';
  assert exists(select 1 from public.companies where id=b and country_code='BR' and notes='Nota original'),'Duplicado permanece na origem';
  assert exists(select 1 from public.companies where id=c and notes='Nota destino'),'Destino não é sobrescrito';
  assert (select count(*) from public.lead_events where company_id=any(array[a,b]))=1,'Só movimentações geram histórico';
  result:=public.move_crm_leads(array[b],'PT','11');
  assert jsonb_array_length(result->'moved')=0 and jsonb_array_length(result->'skipped')=1,'Todos duplicados';
  result:=public.move_crm_leads(array[a],'BR','SP');
  assert exists(select 1 from public.companies where id=a and country_code='BR' and state='SP' and business_key='place:'||suffix||'a'),'Reverter país atualiza chave';
  result:=public.move_crm_leads(array[a],'BR','RJ');
  assert exists(select 1 from public.companies where id=a and state='RJ'),'Mover estado no mesmo país';
end;
$$;
rollback;
select 'OK: duplicatas ignoradas, demais movidos, histórico e dados preservados' as resultado;
