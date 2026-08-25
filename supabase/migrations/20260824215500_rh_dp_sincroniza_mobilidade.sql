-- Complementa a integração com o cadastro de Mobilidade, sem criar pessoas novas
-- e sem substituir dados já preenchidos no RH.
create or replace function public.rh_sincronizar_mobilidade_interno()
returns integer
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare v_total integer := 0;
begin
  with fonte as (
    select e, public.rh_normalizar_nome(e->>'nome') nome_norm
    from public.ben_state s cross join lateral jsonb_array_elements(s.valor::jsonb) e
    where s.chave='liga_mob_colaboradores'
  ), fonte_unica as (
    select nome_norm, (array_agg(e))[1] e from fonte group by nome_norm having count(*)=1
  ), rh_unico as (
    select public.rh_normalizar_nome(nome) nome_norm, (array_agg(id))[1] id
    from public.rh_colaboradores group by public.rh_normalizar_nome(nome) having count(*)=1
  ), upd as (
    update public.rh_colaboradores c set
      cargo=coalesce(nullif(c.cargo,''),nullif(f.e->>'cargo','')),
      email=coalesce(nullif(c.email,''),nullif(lower(trim(f.e->>'email')),'')),
      centro_custo=coalesce(nullif(c.centro_custo,''),nullif(f.e->>'cc','')),
      admissao=coalesce(c.admissao,case when (f.e->>'dataAdmissao') ~ '^\d{2}/\d{2}/\d{4}$' then to_date(f.e->>'dataAdmissao','DD/MM/YYYY') when (f.e->>'dataAdmissao') ~ '^\d{4}-\d{2}-\d{2}' then left(f.e->>'dataAdmissao',10)::date end),
      desligamento=coalesce(c.desligamento,case when (f.e->>'dataDesligamento') ~ '^\d{2}/\d{2}/\d{4}$' then to_date(f.e->>'dataDesligamento','DD/MM/YYYY') when (f.e->>'dataDesligamento') ~ '^\d{4}-\d{2}-\d{2}' then left(f.e->>'dataDesligamento',10)::date end),
      atualizado_em=now()
    from fonte_unica f join rh_unico r using(nome_norm) where c.id=r.id returning c.id
  ) select count(*) into v_total from upd;
  return v_total;
end;
$$;

create or replace function public.rh_sincronizar_cadastros_beneficios()
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare v_uid uuid := auth.uid(); v_result jsonb; v_mob integer;
begin
  if v_uid is null or not public.tem_permissao('rh', 'administrar', v_uid) then
    raise exception 'Acesso negado para sincronizar cadastros.' using errcode = '42501';
  end if;
  v_result := public.rh_sincronizar_cadastros_beneficios_interno();
  v_mob := public.rh_sincronizar_mobilidade_interno();
  v_result := v_result || jsonb_build_object('mobilidade_atualizados', v_mob);
  insert into public.rh_auditoria(evento, entidade, detalhes, usuario_id)
  values ('cadastros_beneficios_sincronizados', 'rh_colaboradores', v_result, v_uid);
  return v_result;
end;
$$;

revoke all on function public.rh_sincronizar_mobilidade_interno() from public, anon, authenticated;
select public.rh_sincronizar_mobilidade_interno();
notify pgrst, 'reload schema';
