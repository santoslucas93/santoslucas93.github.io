-- RH & DP v62 — datas de admissão/desligamento no quadro atual e inferência
-- rastreável pela primeira competência posterior à última folha do colaborador.

alter table public.rh_colaboradores
  add column if not exists desligamento_origem text;

with mensais as (
  select id, competencia
  from public.rh_competencias
  where lower(tipo_calculo) like '%folha mensal%'
), ultima as (
  select max(competencia) competencia from mensais
), historico as (
  select c.id, max(m.competencia) ultima_presenca
  from public.rh_colaboradores c
  left join public.rh_folha_colaboradores f on f.colaborador_id = c.id
  left join mensais m on m.id = f.competencia_id
  group by c.id
)
update public.rh_colaboradores c
set desligamento = (date_trunc('month', h.ultima_presenca) + interval '1 month')::date,
    desligamento_origem = 'ultima_folha',
    atualizado_em = now()
from historico h cross join ultima u
where c.id = h.id
  and c.situacao = 'Desligado'
  and c.desligamento is null
  and h.ultima_presenca is not null
  and h.ultima_presenca < u.competencia;

update public.rh_colaboradores
set desligamento_origem = coalesce(desligamento_origem, 'historico')
where desligamento is not null;

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
      desligamento_origem = case when v_nova = 'Desligado' then 'manual' else null end,
      status_origem = 'manual',
      atualizado_em = now()
  where id = p_colaborador_id;

  insert into public.rh_auditoria(evento, entidade, entidade_id, detalhes, usuario_id)
  values ('status_colaborador_atualizado', 'rh_colaboradores', p_colaborador_id::text,
    jsonb_build_object('situacao_anterior', v_anterior, 'situacao_nova', v_nova,
      'desligamento', p_desligamento, 'motivo', nullif(trim(p_motivo), '')), v_uid);

  return jsonb_build_object('colaborador_id', p_colaborador_id, 'situacao', v_nova,
    'desligamento', case when v_nova = 'Desligado' then p_desligamento else null end,
    'status_origem', 'manual');
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
  v_competencia_data date;
  v_folha_em timestamptz;
  v_total integer := 0;
begin
  select id, competencia, atualizado_em
  into v_competencia_id, v_competencia_data, v_folha_em
  from public.rh_competencias
  where lower(tipo_calculo) like '%folha mensal%'
  order by competencia desc, atualizado_em desc
  limit 1;
  if v_competencia_id is null then return 0; end if;

  with estado as (
    select c.id,
      f.id is not null presente,
      lower(coalesce(f.situacao_snapshot, '')) snapshot,
      (select max(cp.competencia)
       from public.rh_folha_colaboradores fh
       join public.rh_competencias cp on cp.id = fh.competencia_id
       where fh.colaborador_id = c.id
         and lower(cp.tipo_calculo) like '%folha mensal%') ultima_presenca
    from public.rh_colaboradores c
    left join public.rh_folha_colaboradores f
      on f.colaborador_id = c.id and f.competencia_id = v_competencia_id
    where not (c.status_origem = 'manual' and c.atualizado_em > v_folha_em)
  ), calculado as (
    select e.*,
      case
        when not e.presente and e.ultima_presenca is not null
          then (date_trunc('month', e.ultima_presenca) + interval '1 month')::date
        when e.snapshot ~ '(demit|deslig|rescind|inativ|transferid)'
          then v_competencia_data
        else null
      end data_desligamento
    from estado e
  ), upd as (
    update public.rh_colaboradores c
    set situacao = case
          when not e.presente or e.snapshot ~ '(demit|deslig|rescind|inativ|transferid)' then 'Desligado'
          when e.snapshot like '%ferias%' or e.snapshot like '%férias%' then 'Férias'
          when e.snapshot like '%afast%' then 'Afastado'
          else 'Trabalhando'
        end,
        desligamento = case
          when not e.presente or e.snapshot ~ '(demit|deslig|rescind|inativ|transferid)'
            then coalesce(c.desligamento, e.data_desligamento)
          else null
        end,
        desligamento_origem = case
          when not e.presente or e.snapshot ~ '(demit|deslig|rescind|inativ|transferid)'
            then coalesce(c.desligamento_origem, case when e.data_desligamento is not null then 'ultima_folha' end)
          else null
        end,
        status_origem = 'ultima_folha',
        atualizado_em = now()
    from calculado e
    where c.id = e.id
      and (c.situacao is distinct from case
            when not e.presente or e.snapshot ~ '(demit|deslig|rescind|inativ|transferid)' then 'Desligado'
            when e.snapshot like '%ferias%' or e.snapshot like '%férias%' then 'Férias'
            when e.snapshot like '%afast%' then 'Afastado'
            else 'Trabalhando' end
        or c.status_origem is distinct from 'ultima_folha'
        or c.desligamento is distinct from case
            when not e.presente or e.snapshot ~ '(demit|deslig|rescind|inativ|transferid)'
              then coalesce(c.desligamento, e.data_desligamento)
            else null end)
    returning c.id
  )
  select count(*) into v_total from upd;
  return v_total;
end;
$$;

drop function if exists public.rh_quadro_atual();
create function public.rh_quadro_atual()
returns table (
  colaborador_id uuid,
  matricula text,
  nome text,
  vinculo text,
  departamento text,
  admissao date,
  situacao text,
  status_origem text,
  desligamento date,
  desligamento_origem text,
  ultima_competencia date,
  presente_ultima_folha boolean
)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare v_uid uuid := auth.uid(); v_ultima_id uuid;
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
  order by competencia desc, atualizado_em desc limit 1;

  return query
  select c.id, c.matricula, c.nome, c.vinculo, c.departamento, c.admissao,
    c.situacao, c.status_origem, c.desligamento, c.desligamento_origem,
    max(cp.competencia), coalesce(bool_or(f.competencia_id = v_ultima_id), false)
  from public.rh_colaboradores c
  left join public.rh_folha_colaboradores f on f.colaborador_id = c.id
  left join public.rh_competencias cp on cp.id = f.competencia_id
  group by c.id
  order by case when c.situacao = 'Trabalhando' then 0 when c.situacao in ('Férias','Afastado') then 1 else 2 end, c.nome;
end;
$$;

revoke all on function public.rh_atualizar_status_colaborador(uuid,text,date,text) from public, anon, authenticated;
revoke all on function public.rh_reconciliar_quadro_atual_interno() from public, anon, authenticated;
revoke all on function public.rh_quadro_atual() from public, anon, authenticated;
grant execute on function public.rh_atualizar_status_colaborador(uuid,text,date,text) to authenticated;
grant execute on function public.rh_quadro_atual() to authenticated;
notify pgrst, 'reload schema';
