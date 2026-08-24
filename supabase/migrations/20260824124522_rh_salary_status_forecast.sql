-- RH & Folha — salário editável, quadro atual e parâmetros da próxima folha.
-- A competência importada permanece como documento histórico: somente o salário-base
-- pode ser corrigido por RPC auditada; proventos, descontos e líquido oficiais não mudam.

alter table public.rh_colaboradores
  add column if not exists desligamento date,
  add column if not exists status_origem text not null default 'importacao';

create table if not exists public.rh_projecao_parametros (
  colaborador_id uuid not null references public.rh_colaboradores(id) on delete cascade,
  competencia date not null,
  dependentes_irrf integer not null default 0 check (dependentes_irrf between 0 and 20),
  pensao_alimenticia numeric(14,2) not null default 0 check (pensao_alimenticia >= 0),
  outras_deducoes_irrf numeric(14,2) not null default 0 check (outras_deducoes_irrf >= 0),
  outros_descontos numeric(14,2) not null default 0 check (outros_descontos >= 0),
  dias_ferias_proxima integer not null default 0 check (dias_ferias_proxima between 0 and 30),
  dias_abono_proxima integer not null default 0 check (dias_abono_proxima between 0 and 10),
  observacao text,
  atualizado_por uuid references public.profiles(id),
  atualizado_em timestamptz not null default now(),
  primary key (colaborador_id, competencia),
  check (competencia = date_trunc('month', competencia)::date)
);

create index if not exists rh_projecao_parametros_competencia_idx
  on public.rh_projecao_parametros (competencia, colaborador_id);

alter table public.rh_projecao_parametros enable row level security;

drop policy if exists "rh parametros projecao leitura autorizada" on public.rh_projecao_parametros;
create policy "rh parametros projecao leitura autorizada"
  on public.rh_projecao_parametros
  for select
  to authenticated
  using (
    (select public.tem_permissao('rh', 'ver_valores_individuais'))
    or (select public.tem_permissao('rh', 'administrar'))
  );

revoke all on public.rh_projecao_parametros from public, anon, authenticated;
grant select on public.rh_projecao_parametros to authenticated;

create or replace function public.rh_atualizar_salario_folha(
  p_folha_id uuid,
  p_salario numeric,
  p_motivo text default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_uid uuid := auth.uid();
  v_anterior numeric(14,2);
  v_competencia uuid;
  v_colaborador uuid;
  v_status text;
begin
  if v_uid is null or not public.tem_permissao('rh', 'administrar', v_uid) then
    raise exception 'Acesso negado para alterar o salário-base.' using errcode = '42501';
  end if;
  if p_salario is null or p_salario <= 0 or p_salario > 1000000 then
    raise exception 'Informe um salário bruto válido.' using errcode = '22023';
  end if;
  if nullif(trim(p_motivo), '') is null then
    raise exception 'Informe o motivo da correção salarial.' using errcode = '22023';
  end if;

  select f.salario, f.competencia_id, f.colaborador_id, c.status
    into v_anterior, v_competencia, v_colaborador, v_status
  from public.rh_folha_colaboradores f
  join public.rh_competencias c on c.id = f.competencia_id
  where f.id = p_folha_id
  for update of f;

  if v_competencia is null then
    raise exception 'Registro da folha não encontrado.' using errcode = 'P0002';
  end if;
  if v_status in ('fechado', 'arquivado') then
    raise exception 'A competência está fechada. Reabra-a antes de corrigir o salário-base.' using errcode = '55000';
  end if;

  update public.rh_folha_colaboradores
     set salario = round(p_salario, 2),
         observacao = case
           when nullif(trim(p_motivo), '') is null then observacao
           else concat_ws(' | ', nullif(observacao, ''), 'Salário corrigido: ' || trim(p_motivo))
         end
   where id = p_folha_id;

  insert into public.rh_auditoria(evento, entidade, entidade_id, detalhes, usuario_id)
  values (
    'salario_base_atualizado',
    'rh_folha_colaboradores',
    p_folha_id::text,
    jsonb_build_object(
      'competencia_id', v_competencia,
      'colaborador_id', v_colaborador,
      'salario_anterior', v_anterior,
      'salario_novo', round(p_salario, 2),
      'motivo', nullif(trim(p_motivo), '')
    ),
    v_uid
  );

  return jsonb_build_object(
    'folha_id', p_folha_id,
    'colaborador_id', v_colaborador,
    'salario_anterior', v_anterior,
    'salario', round(p_salario, 2)
  );
end;
$$;

create or replace function public.rh_atualizar_status_colaborador(
  p_colaborador_id uuid,
  p_situacao text,
  p_desligamento date default null,
  p_motivo text default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_uid uuid := auth.uid();
  v_anterior text;
  v_nova text := initcap(lower(trim(coalesce(p_situacao, ''))));
begin
  if v_uid is null or not public.tem_permissao('rh', 'administrar', v_uid) then
    raise exception 'Acesso negado para atualizar o quadro de colaboradores.' using errcode = '42501';
  end if;
  if v_nova not in ('Trabalhando', 'Férias', 'Afastado', 'Desligado') then
    raise exception 'Situação inválida.' using errcode = '22023';
  end if;
  if v_nova = 'Desligado' and p_desligamento is null then
    raise exception 'Informe a data do desligamento.' using errcode = '22023';
  end if;
  if nullif(trim(p_motivo), '') is null then
    raise exception 'Informe o motivo da alteração de situação.' using errcode = '22023';
  end if;

  select situacao into v_anterior
  from public.rh_colaboradores
  where id = p_colaborador_id
  for update;
  if not found then
    raise exception 'Colaborador não encontrado.' using errcode = 'P0002';
  end if;

  update public.rh_colaboradores
     set situacao = v_nova,
         desligamento = case when v_nova = 'Desligado' then p_desligamento else null end,
         status_origem = 'manual',
         atualizado_em = now()
   where id = p_colaborador_id;

  insert into public.rh_auditoria(evento, entidade, entidade_id, detalhes, usuario_id)
  values (
    'status_colaborador_atualizado',
    'rh_colaboradores',
    p_colaborador_id::text,
    jsonb_build_object(
      'situacao_anterior', v_anterior,
      'situacao_nova', v_nova,
      'desligamento', p_desligamento,
      'motivo', nullif(trim(p_motivo), '')
    ),
    v_uid
  );

  return jsonb_build_object(
    'colaborador_id', p_colaborador_id,
    'situacao', v_nova,
    'desligamento', case when v_nova = 'Desligado' then p_desligamento else null end,
    'status_origem', 'manual'
  );
end;
$$;

create or replace function public.rh_reconciliar_quadro_atual_interno()
returns integer
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_competencia_id uuid;
  v_total integer := 0;
begin
  select id into v_competencia_id
  from public.rh_competencias
  where lower(tipo_calculo) like '%folha mensal%'
  order by competencia desc, atualizado_em desc
  limit 1;

  if v_competencia_id is null then
    return 0;
  end if;

  with estado as (
    select
      c.id,
      f.id is not null as presente,
      lower(coalesce(f.situacao_snapshot, '')) as situacao_snapshot
    from public.rh_colaboradores c
    left join public.rh_folha_colaboradores f
      on f.colaborador_id = c.id
     and f.competencia_id = v_competencia_id
  ), atualizado as (
    update public.rh_colaboradores c
       set situacao = case
           when not e.presente then 'Desligado'
           when e.situacao_snapshot ~ '(demit|deslig|rescind|inativ|transferid)' then 'Desligado'
           when e.situacao_snapshot like '%ferias%' or e.situacao_snapshot like '%férias%' then 'Férias'
           when e.situacao_snapshot like '%afast%' then 'Afastado'
           else 'Trabalhando'
         end,
         desligamento = case
           when not e.presente or e.situacao_snapshot ~ '(demit|deslig|rescind|inativ|transferid)'
             then c.desligamento
           else null
         end,
         status_origem = 'ultima_folha',
         atualizado_em = now()
      from estado e
     where c.id = e.id
       and (
         c.situacao is distinct from case
           when not e.presente then 'Desligado'
           when e.situacao_snapshot ~ '(demit|deslig|rescind|inativ|transferid)' then 'Desligado'
           when e.situacao_snapshot like '%ferias%' or e.situacao_snapshot like '%férias%' then 'Férias'
           when e.situacao_snapshot like '%afast%' then 'Afastado'
           else 'Trabalhando'
         end
         or c.status_origem is distinct from 'ultima_folha'
       )
    returning c.id
  )
  select count(*) into v_total from atualizado;

  return v_total;
end;
$$;

create or replace function public.rh_reconciliar_quadro_atual()
returns integer
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_uid uuid := auth.uid();
  v_total integer;
begin
  if v_uid is null or not public.tem_permissao('rh', 'administrar', v_uid) then
    raise exception 'Acesso negado para reconciliar o quadro atual.' using errcode = '42501';
  end if;
  v_total := public.rh_reconciliar_quadro_atual_interno();
  insert into public.rh_auditoria(evento, entidade, detalhes, usuario_id)
  values ('quadro_atual_reconciliado', 'rh_colaboradores', jsonb_build_object('atualizados', v_total), v_uid);
  return v_total;
end;
$$;

create or replace function public.rh_quadro_atual()
returns table (
  colaborador_id uuid,
  matricula text,
  nome text,
  vinculo text,
  departamento text,
  situacao text,
  status_origem text,
  desligamento date,
  ultima_competencia date,
  presente_ultima_folha boolean
)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_uid uuid := auth.uid();
  v_ultima_id uuid;
begin
  if v_uid is null or not (
    public.tem_permissao('rh', 'ver_nomes', v_uid)
    or public.tem_permissao('rh', 'administrar', v_uid)
  ) then
    raise exception 'Acesso negado ao quadro atual.' using errcode = '42501';
  end if;

  select id into v_ultima_id
  from public.rh_competencias
  where lower(tipo_calculo) like '%folha mensal%'
  order by competencia desc, atualizado_em desc
  limit 1;

  return query
  select
    c.id,
    c.matricula,
    c.nome,
    c.vinculo,
    c.departamento,
    c.situacao,
    c.status_origem,
    c.desligamento,
    max(cp.competencia) as ultima_competencia,
    coalesce(bool_or(f.competencia_id = v_ultima_id), false) as presente_ultima_folha
  from public.rh_colaboradores c
  left join public.rh_folha_colaboradores f on f.colaborador_id = c.id
  left join public.rh_competencias cp on cp.id = f.competencia_id
  group by c.id, c.matricula, c.nome, c.vinculo, c.departamento,
           c.situacao, c.status_origem, c.desligamento
  order by c.nome;
end;
$$;

create or replace function public.rh_salvar_parametros_projecao(
  p_colaborador_id uuid,
  p_competencia date,
  p_dependentes_irrf integer default 0,
  p_pensao_alimenticia numeric default 0,
  p_outras_deducoes_irrf numeric default 0,
  p_outros_descontos numeric default 0,
  p_dias_ferias_proxima integer default 0,
  p_dias_abono_proxima integer default 0,
  p_observacao text default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_uid uuid := auth.uid();
  v_competencia date := date_trunc('month', p_competencia)::date;
begin
  if v_uid is null or not public.tem_permissao('rh', 'administrar', v_uid) then
    raise exception 'Acesso negado para alterar parâmetros da projeção.' using errcode = '42501';
  end if;
  if p_dependentes_irrf not between 0 and 20
     or p_dias_ferias_proxima not between 0 and 30
     or p_dias_abono_proxima not between 0 and 10
     or p_pensao_alimenticia < 0
     or p_outras_deducoes_irrf < 0
     or p_outros_descontos < 0 then
    raise exception 'Parâmetros de projeção inválidos.' using errcode = '22023';
  end if;
  if not exists (select 1 from public.rh_colaboradores where id = p_colaborador_id) then
    raise exception 'Colaborador não encontrado.' using errcode = 'P0002';
  end if;

  insert into public.rh_projecao_parametros (
    colaborador_id, competencia, dependentes_irrf, pensao_alimenticia,
    outras_deducoes_irrf, outros_descontos, dias_ferias_proxima, dias_abono_proxima,
    observacao, atualizado_por, atualizado_em
  ) values (
    p_colaborador_id, v_competencia, p_dependentes_irrf,
    round(coalesce(p_pensao_alimenticia, 0), 2),
    round(coalesce(p_outras_deducoes_irrf, 0), 2),
    round(coalesce(p_outros_descontos, 0), 2),
    p_dias_ferias_proxima, p_dias_abono_proxima, nullif(trim(p_observacao), ''), v_uid, now()
  )
  on conflict (colaborador_id, competencia) do update set
    dependentes_irrf = excluded.dependentes_irrf,
    pensao_alimenticia = excluded.pensao_alimenticia,
    outras_deducoes_irrf = excluded.outras_deducoes_irrf,
    outros_descontos = excluded.outros_descontos,
    dias_ferias_proxima = excluded.dias_ferias_proxima,
    dias_abono_proxima = excluded.dias_abono_proxima,
    observacao = excluded.observacao,
    atualizado_por = excluded.atualizado_por,
    atualizado_em = excluded.atualizado_em;

  insert into public.rh_auditoria(evento, entidade, entidade_id, detalhes, usuario_id)
  values (
    'parametros_projecao_atualizados',
    'rh_projecao_parametros',
    p_colaborador_id::text || ':' || v_competencia::text,
    jsonb_build_object(
      'colaborador_id', p_colaborador_id,
      'competencia', v_competencia,
      'dependentes_irrf', p_dependentes_irrf,
      'pensao_alimenticia', round(coalesce(p_pensao_alimenticia, 0), 2),
      'outras_deducoes_irrf', round(coalesce(p_outras_deducoes_irrf, 0), 2),
      'outros_descontos', round(coalesce(p_outros_descontos, 0), 2),
      'dias_ferias_proxima', p_dias_ferias_proxima,
      'dias_abono_proxima', p_dias_abono_proxima
    ),
    v_uid
  );

  return jsonb_build_object('colaborador_id', p_colaborador_id, 'competencia', v_competencia);
end;
$$;

create or replace function public.rh_reconciliar_quadro_apos_importacao()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if new.evento = 'importacao_concluida' then
    perform public.rh_reconciliar_quadro_atual_interno();
  end if;
  return new;
end;
$$;

drop trigger if exists rh_reconciliar_quadro_apos_importacao on public.rh_auditoria;
create trigger rh_reconciliar_quadro_apos_importacao
after insert on public.rh_auditoria
for each row execute function public.rh_reconciliar_quadro_apos_importacao();

revoke all on function public.rh_atualizar_salario_folha(uuid,numeric,text) from public, anon;
revoke all on function public.rh_atualizar_status_colaborador(uuid,text,date,text) from public, anon;
revoke all on function public.rh_reconciliar_quadro_atual() from public, anon;
revoke all on function public.rh_quadro_atual() from public, anon;
revoke all on function public.rh_salvar_parametros_projecao(uuid,date,integer,numeric,numeric,numeric,integer,integer,text) from public, anon;
revoke all on function public.rh_reconciliar_quadro_atual_interno() from public, anon, authenticated;
revoke all on function public.rh_reconciliar_quadro_apos_importacao() from public, anon, authenticated;

grant execute on function public.rh_atualizar_salario_folha(uuid,numeric,text) to authenticated;
grant execute on function public.rh_atualizar_status_colaborador(uuid,text,date,text) to authenticated;
grant execute on function public.rh_reconciliar_quadro_atual() to authenticated;
grant execute on function public.rh_quadro_atual() to authenticated;
grant execute on function public.rh_salvar_parametros_projecao(uuid,date,integer,numeric,numeric,numeric,integer,integer,text) to authenticated;

comment on table public.rh_projecao_parametros is
  'Parâmetros por colaborador e competência usados somente na Próxima Folha; não alteram a folha oficial importada.';
comment on function public.rh_atualizar_salario_folha(uuid,numeric,text) is
  'Corrige somente o salário-base da linha mensal, com permissão administrativa e auditoria.';

notify pgrst, 'reload schema';
