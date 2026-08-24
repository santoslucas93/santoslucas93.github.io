-- RH & DP v61 — cadastro funcional, benefícios integrados e reconciliação segura.
-- Alterações aditivas; a folha histórica importada permanece imutável.

alter table public.rh_colaboradores
  add column if not exists data_nascimento date,
  add column if not exists email text,
  add column if not exists telefone text,
  add column if not exists salario_base numeric(14,2),
  add column if not exists jornada_horas_semanais numeric(5,2),
  add column if not exists gestor text,
  add column if not exists opta_vale_transporte boolean not null default false,
  add column if not exists opta_vr_va boolean not null default false,
  add column if not exists opta_plano_saude boolean not null default false,
  add column if not exists opta_seguro_vida boolean not null default false,
  add column if not exists observacoes text,
  add column if not exists beneficios_sincronizados_em timestamptz;

create or replace function public.rh_normalizar_nome(p_nome text)
returns text
language sql
immutable
strict
set search_path = pg_catalog
as $$
  select trim(regexp_replace(
    translate(upper(p_nome),
      'ÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑ',
      'AAAAAEEEEIIIIOOOOOUUUUCN'),
    '[^A-Z0-9]+', ' ', 'g'));
$$;

create or replace function public.rh_criar_colaborador(
  p_matricula text,
  p_nome text,
  p_admissao date,
  p_vinculo text,
  p_cargo text default null,
  p_departamento text default null,
  p_centro_custo text default null,
  p_data_nascimento date default null,
  p_email text default null,
  p_telefone text default null,
  p_salario_base numeric default null,
  p_jornada_horas_semanais numeric default null,
  p_gestor text default null,
  p_opta_vale_transporte boolean default false,
  p_opta_vr_va boolean default true,
  p_opta_plano_saude boolean default false,
  p_opta_seguro_vida boolean default true,
  p_observacoes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_uid uuid := auth.uid();
  v_id uuid;
begin
  if v_uid is null or not public.tem_permissao('rh', 'administrar', v_uid) then
    raise exception 'Acesso negado para cadastrar colaboradores.' using errcode = '42501';
  end if;
  if nullif(trim(p_matricula), '') is null or nullif(trim(p_nome), '') is null
     or p_admissao is null or nullif(trim(p_vinculo), '') is null then
    raise exception 'Matrícula, nome, admissão e vínculo são obrigatórios.' using errcode = '22023';
  end if;
  if p_salario_base is not null and (p_salario_base < 0 or p_salario_base > 1000000) then
    raise exception 'Salário-base inválido.' using errcode = '22023';
  end if;
  if p_jornada_horas_semanais is not null and (p_jornada_horas_semanais <= 0 or p_jornada_horas_semanais > 60) then
    raise exception 'Jornada semanal inválida.' using errcode = '22023';
  end if;

  insert into public.rh_colaboradores (
    matricula, nome, admissao, vinculo, cargo, departamento, centro_custo,
    data_nascimento, email, telefone, salario_base, jornada_horas_semanais,
    gestor, opta_vale_transporte, opta_vr_va, opta_plano_saude,
    opta_seguro_vida, observacoes, situacao, status_origem, atualizado_em
  ) values (
    trim(p_matricula), trim(p_nome), p_admissao, trim(p_vinculo),
    nullif(trim(p_cargo), ''), nullif(trim(p_departamento), ''),
    nullif(trim(p_centro_custo), ''), p_data_nascimento,
    nullif(lower(trim(p_email)), ''), nullif(trim(p_telefone), ''),
    round(p_salario_base, 2), p_jornada_horas_semanais, nullif(trim(p_gestor), ''),
    coalesce(p_opta_vale_transporte, false), coalesce(p_opta_vr_va, true),
    coalesce(p_opta_plano_saude, false), coalesce(p_opta_seguro_vida, true),
    nullif(trim(p_observacoes), ''), 'Trabalhando', 'cadastro_manual', now()
  ) returning id into v_id;

  insert into public.rh_auditoria(evento, entidade, entidade_id, detalhes, usuario_id)
  values ('colaborador_cadastrado', 'rh_colaboradores', v_id::text,
    jsonb_build_object('matricula', trim(p_matricula), 'nome', trim(p_nome),
      'opta_vale_transporte', coalesce(p_opta_vale_transporte, false)), v_uid);

  return jsonb_build_object('colaborador_id', v_id, 'situacao', 'Trabalhando');
exception when unique_violation then
  raise exception 'Já existe um colaborador com esta matrícula.' using errcode = '23505';
end;
$$;

-- Atualiza somente correspondências únicas por nome. Cadastros sem correspondência
-- permanecem intocados e são contabilizados para revisão humana.
create or replace function public.rh_sincronizar_cadastros_beneficios_interno()
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_atualizados integer := 0;
  v_correspondencias integer := 0;
  v_pendentes integer := 0;
begin
  with mestre as (
    select e, public.rh_normalizar_nome(e->>'nome') nome_norm
    from public.ben_state s
    cross join lateral jsonb_array_elements(s.valor::jsonb) e
    where s.chave = 'liga_mestre'
  ), unicos as (
    select nome_norm, (array_agg(e))[1] e from mestre group by nome_norm having count(*) = 1
  ), rh_unicos as (
    select public.rh_normalizar_nome(nome) nome_norm, (array_agg(id))[1] id
    from public.rh_colaboradores group by public.rh_normalizar_nome(nome) having count(*) = 1
  ), pares as (
    select r.id, u.e from rh_unicos r join unicos u using (nome_norm)
  ), upd as (
    update public.rh_colaboradores c set
      data_nascimento = coalesce(c.data_nascimento,
        case when (p.e->>'nascimento') ~ '^\d{2}/\d{2}/\d{4}$'
          then to_date(p.e->>'nascimento', 'DD/MM/YYYY') end),
      admissao = coalesce(c.admissao,
        case when (p.e->>'admissao') ~ '^\d{2}/\d{2}/\d{4}$'
          then to_date(p.e->>'admissao', 'DD/MM/YYYY') end),
      centro_custo = coalesce(nullif(c.centro_custo, ''), nullif(p.e->>'cc', '')),
      beneficios_sincronizados_em = now(), atualizado_em = now()
    from pares p where c.id = p.id returning c.id
  ) select count(*) into v_correspondencias from upd;

  with fonte as (
    select 'vt' modulo, e, public.rh_normalizar_nome(e->>'nome') nome_norm
      from public.ben_state s cross join lateral jsonb_array_elements(s.valor::jsonb) e where s.chave='liga_vt_registros'
    union all
    select 'med', e, public.rh_normalizar_nome(e->>'nome') from public.ben_state s cross join lateral jsonb_array_elements(s.valor::jsonb) e where s.chave='liga_med_registros'
    union all
    select 'prud', e, public.rh_normalizar_nome(e->>'nome') from public.ben_state s cross join lateral jsonb_array_elements(s.valor::jsonb) e where s.chave='liga_prud_registros'
  ), agregada as (
    select nome_norm,
      bool_or(modulo='vt' and coalesce((e->>'ativoVT')::boolean, false)) as vt,
      bool_or(modulo='med' and coalesce((e->>'ativo')::boolean, false)) as med,
      bool_or(modulo='prud' and coalesce((e->>'ativo')::boolean, false)) as prud,
      bool_or(modulo='vt') tem_vt, bool_or(modulo='med') tem_med, bool_or(modulo='prud') tem_prud
    from fonte group by nome_norm
  ), rh_unicos as (
    select public.rh_normalizar_nome(nome) nome_norm, (array_agg(id))[1] id
    from public.rh_colaboradores group by public.rh_normalizar_nome(nome) having count(*)=1
  ), upd as (
    update public.rh_colaboradores c set
      opta_vale_transporte = case when a.tem_vt then a.vt else c.opta_vale_transporte end,
      opta_plano_saude = case when a.tem_med then a.med else c.opta_plano_saude end,
      opta_seguro_vida = case when a.tem_prud then a.prud else c.opta_seguro_vida end,
      beneficios_sincronizados_em = now(), atualizado_em = now()
    from agregada a join rh_unicos r using (nome_norm) where c.id=r.id returning c.id
  ) select count(*) into v_atualizados from upd;

  with fontes as (
    select distinct public.rh_normalizar_nome(e->>'nome') n
    from public.ben_state s cross join lateral jsonb_array_elements(s.valor::jsonb) e
    where s.chave in ('liga_mestre','liga_emp','liga_mob_colaboradores')
  ) select count(*) into v_pendentes from fontes f
    where not exists (select 1 from public.rh_colaboradores c where public.rh_normalizar_nome(c.nome)=f.n);

  return jsonb_build_object('correspondencias_seguras', v_correspondencias,
    'beneficios_atualizados', v_atualizados, 'pendentes_revisao', v_pendentes,
    'sincronizado_em', now());
end;
$$;

create or replace function public.rh_sincronizar_cadastros_beneficios()
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare v_uid uuid := auth.uid(); v_result jsonb;
begin
  if v_uid is null or not public.tem_permissao('rh', 'administrar', v_uid) then
    raise exception 'Acesso negado para sincronizar cadastros.' using errcode = '42501';
  end if;
  v_result := public.rh_sincronizar_cadastros_beneficios_interno();
  insert into public.rh_auditoria(evento, entidade, detalhes, usuario_id)
  values ('cadastros_beneficios_sincronizados', 'rh_colaboradores', v_result, v_uid);
  return v_result;
end;
$$;

-- Uma alteração manual posterior à importação é preservada. Uma folha nova pode
-- voltar a ser a fonte automática, inclusive pelo gatilho já existente no import.
create or replace function public.rh_reconciliar_quadro_atual_interno()
returns integer
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare v_competencia_id uuid; v_folha_em timestamptz; v_total integer := 0;
begin
  select id, atualizado_em into v_competencia_id, v_folha_em
  from public.rh_competencias where lower(tipo_calculo) like '%folha mensal%'
  order by competencia desc, atualizado_em desc limit 1;
  if v_competencia_id is null then return 0; end if;

  with estado as (
    select c.id, f.id is not null presente, lower(coalesce(f.situacao_snapshot,'')) snapshot
    from public.rh_colaboradores c left join public.rh_folha_colaboradores f
      on f.colaborador_id=c.id and f.competencia_id=v_competencia_id
    where not (c.status_origem='manual' and c.atualizado_em > v_folha_em)
  ), upd as (
    update public.rh_colaboradores c set
      situacao=case when not e.presente or e.snapshot ~ '(demit|deslig|rescind|inativ|transferid)' then 'Desligado'
        when e.snapshot like '%ferias%' or e.snapshot like '%férias%' then 'Férias'
        when e.snapshot like '%afast%' then 'Afastado' else 'Trabalhando' end,
      desligamento=case when not e.presente or e.snapshot ~ '(demit|deslig|rescind|inativ|transferid)' then c.desligamento else null end,
      status_origem='ultima_folha', atualizado_em=now()
    from estado e where c.id=e.id and (c.situacao is distinct from case
      when not e.presente or e.snapshot ~ '(demit|deslig|rescind|inativ|transferid)' then 'Desligado'
      when e.snapshot like '%ferias%' or e.snapshot like '%férias%' then 'Férias'
      when e.snapshot like '%afast%' then 'Afastado' else 'Trabalhando' end
      or c.status_origem is distinct from 'ultima_folha') returning c.id
  ) select count(*) into v_total from upd;
  return v_total;
end;
$$;

revoke all on function public.rh_normalizar_nome(text) from public, anon;
revoke all on function public.rh_criar_colaborador(text,text,date,text,text,text,text,date,text,text,numeric,numeric,text,boolean,boolean,boolean,boolean,text) from public, anon, authenticated;
revoke all on function public.rh_sincronizar_cadastros_beneficios_interno() from public, anon, authenticated;
revoke all on function public.rh_sincronizar_cadastros_beneficios() from public, anon, authenticated;
grant execute on function public.rh_normalizar_nome(text) to authenticated;
grant execute on function public.rh_criar_colaborador(text,text,date,text,text,text,text,date,text,text,numeric,numeric,text,boolean,boolean,boolean,boolean,text) to authenticated;
grant execute on function public.rh_sincronizar_cadastros_beneficios() to authenticated;

-- Primeira sincronização idempotente no deploy; somente pares inequívocos são alterados.
select public.rh_sincronizar_cadastros_beneficios_interno();
notify pgrst, 'reload schema';
