-- RH & Folha — edição auditada da folha importada e da Próxima Folha.
-- Mantém períodos encerrados imutáveis e separa as permissões operacionais.

begin;

insert into public.recurso_acoes (recurso_id, acao, rotulo, ordem) values
  ('rh', 'editar_folha_importada', 'Editar folha importada', 31),
  ('rh', 'editar_proxima_folha', 'Editar Próxima Folha', 32),
  ('rh', 'encerrar_periodo', 'Conferir e encerrar períodos', 33),
  ('rh', 'reabrir_periodo', 'Reabrir períodos encerrados', 34)
on conflict (recurso_id, acao) do update
set rotulo = excluded.rotulo,
    ordem = excluded.ordem;

-- Preserva o acesso dos perfis/usuários que já administravam o RH. Depois da
-- implantação, o Administrador Mestre pode conceder ou retirar cada ação
-- separadamente pela tela de Permissões.
insert into public.perfil_permissoes (perfil_id, recurso_id, acao, permitido)
select p.perfil_id, 'rh', a.acao, true
from public.perfil_permissoes p
cross join (values
  ('editar_folha_importada'),
  ('editar_proxima_folha'),
  ('encerrar_periodo'),
  ('reabrir_periodo')
) as a(acao)
where p.recurso_id = 'rh'
  and p.acao = 'administrar'
  and p.permitido
on conflict (perfil_id, recurso_id, acao) do nothing;

insert into public.usuario_permissoes (
  usuario_id, recurso_id, acao, permitido, valido_ate,
  justificativa, concedido_por, concedido_em
)
select p.usuario_id, 'rh', a.acao, true, p.valido_ate,
       'Permissão específica herdada da administração do RH',
       p.concedido_por, now()
from public.usuario_permissoes p
cross join (values
  ('editar_folha_importada'),
  ('editar_proxima_folha'),
  ('encerrar_periodo'),
  ('reabrir_periodo')
) as a(acao)
where p.recurso_id = 'rh'
  and p.acao = 'administrar'
  and p.permitido
on conflict (usuario_id, recurso_id, acao) do nothing;

create table if not exists public.rh_projecao_periodos (
  competencia date primary key,
  status text not null default 'aberto' check (status in ('aberto', 'encerrado')),
  ajuste_geral_percentual numeric(8,4) not null default 0
    check (ajuste_geral_percentual between -100 and 100),
  encerrado_por uuid references public.profiles(id),
  encerrado_em timestamptz,
  atualizado_por uuid references public.profiles(id),
  atualizado_em timestamptz not null default now(),
  check (competencia = date_trunc('month', competencia)::date)
);

alter table public.rh_projecao_periodos enable row level security;

drop policy if exists "rh periodos de projecao leitura autorizada" on public.rh_projecao_periodos;
create policy "rh periodos de projecao leitura autorizada"
on public.rh_projecao_periodos
for select
to authenticated
using (
  (select public.tem_permissao('rh', 'visualizar'))
  or (select public.tem_permissao('rh', 'administrar'))
);

revoke all on public.rh_projecao_periodos from public, anon, authenticated;
grant select on public.rh_projecao_periodos to authenticated;

create or replace function public.rh_projecao_periodo(p_competencia date)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_uid uuid := auth.uid();
  v_competencia date := date_trunc('month', p_competencia)::date;
  v_periodo public.rh_projecao_periodos%rowtype;
begin
  if v_uid is null or not (
    public.tem_permissao('rh', 'visualizar', v_uid)
    or public.tem_permissao('rh', 'administrar', v_uid)
  ) then
    raise exception 'Acesso negado à Próxima Folha.' using errcode = '42501';
  end if;

  select * into v_periodo
  from public.rh_projecao_periodos
  where competencia = v_competencia;

  return jsonb_build_object(
    'competencia', v_competencia,
    'status', coalesce(v_periodo.status, 'aberto'),
    'ajuste_geral_percentual', coalesce(v_periodo.ajuste_geral_percentual, 0),
    'encerrado_em', v_periodo.encerrado_em,
    'pode_editar', public.tem_permissao('rh', 'editar_proxima_folha', v_uid),
    'pode_encerrar', public.tem_permissao('rh', 'encerrar_periodo', v_uid),
    'pode_reabrir', public.tem_permissao('rh', 'reabrir_periodo', v_uid)
  );
end;
$$;

create or replace function public.rh_atualizar_status_projecao(
  p_competencia date,
  p_status text,
  p_motivo text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_uid uuid := auth.uid();
  v_competencia date := date_trunc('month', p_competencia)::date;
  v_atual text;
  v_novo text := lower(trim(coalesce(p_status, '')));
  v_motivo text := nullif(trim(p_motivo), '');
begin
  if v_uid is null then
    raise exception 'Sessão inválida.' using errcode = '42501';
  end if;
  if v_novo not in ('aberto', 'encerrado') then
    raise exception 'Status da Próxima Folha inválido.' using errcode = '22023';
  end if;
  if v_motivo is null then
    raise exception 'Informe o motivo da alteração do período.' using errcode = '22023';
  end if;
  if v_novo = 'encerrado' and not public.tem_permissao('rh', 'encerrar_periodo', v_uid) then
    raise exception 'Acesso negado para encerrar o período.' using errcode = '42501';
  end if;
  if v_novo = 'aberto' and not public.tem_permissao('rh', 'reabrir_periodo', v_uid) then
    raise exception 'Acesso negado para reabrir o período.' using errcode = '42501';
  end if;

  select status into v_atual
  from public.rh_projecao_periodos
  where competencia = v_competencia
  for update;
  v_atual := coalesce(v_atual, 'aberto');

  if v_atual = v_novo then
    return public.rh_projecao_periodo(v_competencia);
  end if;

  insert into public.rh_projecao_periodos (
    competencia, status, encerrado_por, encerrado_em, atualizado_por, atualizado_em
  ) values (
    v_competencia, v_novo,
    case when v_novo = 'encerrado' then v_uid else null end,
    case when v_novo = 'encerrado' then now() else null end,
    v_uid, now()
  )
  on conflict (competencia) do update set
    status = excluded.status,
    encerrado_por = excluded.encerrado_por,
    encerrado_em = excluded.encerrado_em,
    atualizado_por = excluded.atualizado_por,
    atualizado_em = excluded.atualizado_em;

  insert into public.rh_auditoria(evento, entidade, entidade_id, detalhes, usuario_id)
  values (
    case when v_novo = 'encerrado' then 'projecao_periodo_encerrado' else 'projecao_periodo_reaberto' end,
    'rh_projecao_periodos', v_competencia::text,
    jsonb_build_object('de', v_atual, 'para', v_novo, 'motivo', v_motivo),
    v_uid
  );

  return public.rh_projecao_periodo(v_competencia);
end;
$$;

create or replace function public.rh_salvar_ajuste_projecao(
  p_competencia date,
  p_percentual numeric,
  p_motivo text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_uid uuid := auth.uid();
  v_competencia date := date_trunc('month', p_competencia)::date;
  v_status text;
  v_anterior numeric(8,4) := 0;
  v_novo numeric(8,4) := round(coalesce(p_percentual, 0), 4);
  v_motivo text := nullif(trim(p_motivo), '');
begin
  if v_uid is null or not public.tem_permissao('rh', 'editar_proxima_folha', v_uid) then
    raise exception 'Acesso negado para editar a Próxima Folha.' using errcode = '42501';
  end if;
  if v_novo not between -100 and 100 then
    raise exception 'O ajuste geral deve ficar entre -100%% e 100%%.' using errcode = '22023';
  end if;
  if v_motivo is null then
    raise exception 'Informe o motivo do ajuste.' using errcode = '22023';
  end if;

  select status, ajuste_geral_percentual into v_status, v_anterior
  from public.rh_projecao_periodos
  where competencia = v_competencia
  for update;

  if coalesce(v_status, 'aberto') = 'encerrado' then
    raise exception 'O período da Próxima Folha está encerrado. Reabra-o antes de editar.' using errcode = '55000';
  end if;

  insert into public.rh_projecao_periodos (
    competencia, status, ajuste_geral_percentual, atualizado_por, atualizado_em
  ) values (v_competencia, 'aberto', v_novo, v_uid, now())
  on conflict (competencia) do update set
    ajuste_geral_percentual = excluded.ajuste_geral_percentual,
    atualizado_por = excluded.atualizado_por,
    atualizado_em = excluded.atualizado_em;

  insert into public.rh_auditoria(evento, entidade, entidade_id, detalhes, usuario_id)
  values (
    'projecao_ajuste_geral_atualizado', 'rh_projecao_periodos', v_competencia::text,
    jsonb_build_object('percentual_anterior', coalesce(v_anterior, 0), 'percentual_novo', v_novo, 'motivo', v_motivo),
    v_uid
  );

  return public.rh_projecao_periodo(v_competencia);
end;
$$;

create or replace function public.rh_salvar_parametros_projecao_v2(
  p_colaborador_id uuid,
  p_competencia date,
  p_dependentes_irrf integer default 0,
  p_pensao_alimenticia numeric default 0,
  p_outras_deducoes_irrf numeric default 0,
  p_outros_descontos numeric default 0,
  p_dias_ferias_proxima integer default 0,
  p_dias_abono_proxima integer default 0,
  p_observacao text default null,
  p_motivo text default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_uid uuid := auth.uid();
  v_competencia date := date_trunc('month', p_competencia)::date;
  v_status text;
  v_anterior jsonb;
  v_motivo text := nullif(trim(p_motivo), '');
begin
  if v_uid is null or not public.tem_permissao('rh', 'editar_proxima_folha', v_uid) then
    raise exception 'Acesso negado para editar a Próxima Folha.' using errcode = '42501';
  end if;
  if v_motivo is null then
    raise exception 'Informe o motivo da alteração.' using errcode = '22023';
  end if;
  if p_dependentes_irrf not between 0 and 20
     or p_dias_ferias_proxima not between 0 and 30
     or p_dias_abono_proxima not between 0 and 10
     or coalesce(p_pensao_alimenticia, 0) < 0
     or coalesce(p_outras_deducoes_irrf, 0) < 0
     or coalesce(p_outros_descontos, 0) < 0 then
    raise exception 'Parâmetros da projeção inválidos.' using errcode = '22023';
  end if;
  if not exists (select 1 from public.rh_colaboradores where id = p_colaborador_id) then
    raise exception 'Colaborador não encontrado.' using errcode = 'P0002';
  end if;

  select status into v_status
  from public.rh_projecao_periodos
  where competencia = v_competencia
  for update;
  if coalesce(v_status, 'aberto') = 'encerrado' then
    raise exception 'O período da Próxima Folha está encerrado. Reabra-o antes de editar.' using errcode = '55000';
  end if;

  select to_jsonb(p) into v_anterior
  from public.rh_projecao_parametros p
  where p.colaborador_id = p_colaborador_id
    and p.competencia = v_competencia;

  insert into public.rh_projecao_parametros (
    colaborador_id, competencia, dependentes_irrf, pensao_alimenticia,
    outras_deducoes_irrf, outros_descontos, dias_ferias_proxima, dias_abono_proxima,
    observacao, atualizado_por, atualizado_em
  ) values (
    p_colaborador_id, v_competencia, p_dependentes_irrf,
    round(coalesce(p_pensao_alimenticia, 0), 2),
    round(coalesce(p_outras_deducoes_irrf, 0), 2),
    round(coalesce(p_outros_descontos, 0), 2),
    p_dias_ferias_proxima, p_dias_abono_proxima,
    nullif(trim(p_observacao), ''), v_uid, now()
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
  select 'parametros_projecao_atualizados', 'rh_projecao_parametros',
         p_colaborador_id::text || ':' || v_competencia::text,
         jsonb_build_object(
           'antes', v_anterior,
           'depois', to_jsonb(p),
           'motivo', v_motivo
         ),
         v_uid
  from public.rh_projecao_parametros p
  where p.colaborador_id = p_colaborador_id
    and p.competencia = v_competencia;

  return jsonb_build_object('colaborador_id', p_colaborador_id, 'competencia', v_competencia);
end;
$$;

-- Compatibilidade com a interface anterior: mantém a assinatura, mas passa a
-- respeitar a permissão específica e o bloqueio do período.
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
language sql
security definer
set search_path = pg_catalog, public
as $$
  select public.rh_salvar_parametros_projecao_v2(
    p_colaborador_id, p_competencia, p_dependentes_irrf,
    p_pensao_alimenticia, p_outras_deducoes_irrf, p_outros_descontos,
    p_dias_ferias_proxima, p_dias_abono_proxima, p_observacao,
    coalesce(nullif(trim(p_observacao), ''), 'Ajuste de parâmetros da Próxima Folha')
  );
$$;

create or replace function public.rh_recalcular_competencia_interno(p_competencia_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_comp public.rh_competencias%rowtype;
  v_proventos numeric(14,2);
  v_descontos numeric(14,2);
  v_liquido numeric(14,2);
  v_base_inss numeric(14,2);
  v_excedente numeric(14,2);
  v_base_fgts numeric(14,2);
  v_valor_fgts numeric(14,2);
  v_base_irrf numeric(14,2);
  v_valor_irrf numeric(14,2);
  v_segurados numeric(14,2);
  v_pessoas integer;
  v_empregados integer;
  v_estagiarios integer;
  v_trabalhando integer;
  v_ferias integer;
  v_afastados integer;
  v_demitidos integer;
  v_departamentos jsonb;
  v_centros jsonb;
  v_rubricas jsonb;
  v_old_base numeric;
  v_rat_rate numeric;
  v_terc_rate numeric;
  v_pis_rate numeric;
  v_rat numeric(14,2);
  v_terceiros numeric(14,2);
  v_pis numeric(14,2);
  v_total_inss numeric(14,2);
begin
  select * into v_comp
  from public.rh_competencias
  where id = p_competencia_id
  for update;
  if not found then
    raise exception 'Competência não encontrada.' using errcode = 'P0002';
  end if;

  select
    round(coalesce(sum(proventos), 0), 2),
    round(coalesce(sum(descontos), 0), 2),
    round(coalesce(sum(liquido), 0), 2),
    round(coalesce(sum(base_inss), 0), 2),
    round(coalesce(sum(excedente_inss), 0), 2),
    round(coalesce(sum(base_fgts), 0), 2),
    round(coalesce(sum(valor_fgts), 0), 2),
    round(coalesce(sum(base_irrf), 0), 2),
    round(coalesce(sum(valor_irrf), 0), 2),
    count(*)::integer,
    count(*) filter (where lower(coalesce(vinculo_snapshot, '')) like '%celet%')::integer,
    count(*) filter (where lower(coalesce(vinculo_snapshot, '')) like '%estag%')::integer,
    count(*) filter (where lower(coalesce(situacao_snapshot, '')) like '%trabalh%')::integer,
    count(*) filter (where lower(coalesce(situacao_snapshot, '')) like '%férias%' or lower(coalesce(situacao_snapshot, '')) like '%ferias%')::integer,
    count(*) filter (where lower(coalesce(situacao_snapshot, '')) like '%afast%')::integer,
    count(*) filter (where lower(coalesce(situacao_snapshot, '')) ~ '(demit|deslig|rescind|inativ)')::integer
  into v_proventos, v_descontos, v_liquido, v_base_inss, v_excedente,
       v_base_fgts, v_valor_fgts, v_base_irrf, v_valor_irrf, v_pessoas,
       v_empregados, v_estagiarios, v_trabalhando, v_ferias, v_afastados, v_demitidos
  from public.rh_folha_colaboradores
  where competencia_id = p_competencia_id;

  select round(coalesce(sum(l.valor), 0), 2) into v_segurados
  from public.rh_lancamentos l
  where l.competencia_id = p_competencia_id
    and l.tipo = 'desconto'
    and upper(coalesce(l.rubrica_codigo, '') || ' ' || l.rubrica_nome) ~ '(^|[^A-Z])I\\.?N\\.?S\\.?S\\.?([^A-Z]|$)|INSS';

  select coalesce(jsonb_agg(jsonb_build_object(
    'codigo', d.codigo,
    'nome', coalesce(
      (select x->>'nome' from jsonb_array_elements(coalesce(v_comp.resumo->'departamentos', '[]'::jsonb)) x where x->>'codigo' = d.codigo limit 1),
      case d.codigo when '1' then 'ADMINISTRATIVA' when '2' then 'COMUNICAÇÃO'
        when '3' then 'FINANCEIRA' when '4' then 'MARKETING' when '5' then 'TÉCNICA'
        when '6' then 'TÉCNICA/PROJETOS' else coalesce(d.codigo, 'SEM DEPARTAMENTO') end
    ),
    'proventos', d.proventos, 'descontos', d.descontos, 'liquido', d.liquido
  ) order by d.codigo), '[]'::jsonb) into v_departamentos
  from (
    select coalesce(departamento_snapshot, '') codigo,
           round(sum(proventos), 2) proventos,
           round(sum(descontos), 2) descontos,
           round(sum(liquido), 2) liquido
    from public.rh_folha_colaboradores
    where competencia_id = p_competencia_id
    group by coalesce(departamento_snapshot, '')
  ) d;

  select coalesce(jsonb_agg(jsonb_build_object(
    'codigo', d.codigo,
    'nome', coalesce(
      (select x->>'nome' from jsonb_array_elements(coalesce(v_comp.resumo->'centros_custo', '[]'::jsonb)) x where x->>'codigo' = d.codigo limit 1),
      coalesce(d.codigo, 'SEM CENTRO DE CUSTO')
    ),
    'proventos', d.proventos, 'descontos', d.descontos, 'liquido', d.liquido
  ) order by d.codigo), '[]'::jsonb) into v_centros
  from (
    select coalesce(centro_custo_snapshot, '') codigo,
           round(sum(proventos), 2) proventos,
           round(sum(descontos), 2) descontos,
           round(sum(liquido), 2) liquido
    from public.rh_folha_colaboradores
    where competencia_id = p_competencia_id
    group by coalesce(centro_custo_snapshot, '')
  ) d;

  select coalesce(jsonb_agg(jsonb_build_object(
    'codigo', r.codigo, 'nome', r.nome, 'tipo', r.tipo,
    'referencia', r.referencia, 'valor', r.valor
  ) order by r.valor desc, r.nome), '[]'::jsonb) into v_rubricas
  from (
    select coalesce(rubrica_codigo, '') codigo, rubrica_nome nome, tipo,
           round(coalesce(sum(referencia), 0), 4) referencia,
           round(coalesce(sum(valor), 0), 2) valor
    from public.rh_lancamentos
    where competencia_id = p_competencia_id
    group by coalesce(rubrica_codigo, ''), rubrica_nome, tipo
  ) r;

  v_old_base := nullif(coalesce((v_comp.encargos->>'base_total_inss')::numeric, v_comp.base_inss), 0);
  v_rat_rate := case when v_old_base is null then 0.01 else coalesce((v_comp.encargos->>'rat')::numeric, 0) / v_old_base end;
  v_terc_rate := case when v_old_base is null then 0.058 else coalesce((v_comp.encargos->>'terceiros')::numeric, 0) / v_old_base end;
  v_pis_rate := case when v_old_base is null then 0.01 else coalesce((v_comp.encargos->>'valor_pis')::numeric, 0) / v_old_base end;
  v_rat := round(v_base_inss * v_rat_rate, 2);
  v_terceiros := round(v_base_inss * v_terc_rate, 2);
  v_pis := round(v_base_inss * v_pis_rate, 2);
  v_total_inss := round(v_segurados + (v_base_inss * 0.20) + v_rat + v_terceiros, 2);

  update public.rh_competencias
  set proventos = v_proventos,
      descontos = v_descontos,
      liquido = v_liquido,
      base_inss = v_base_inss,
      base_fgts = v_base_fgts,
      valor_fgts = v_valor_fgts,
      base_irrf = v_base_irrf,
      resumo = coalesce(resumo, '{}'::jsonb) || jsonb_build_object(
        'pessoas', v_pessoas, 'empregados', v_empregados, 'estagiarios', v_estagiarios,
        'trabalhando', v_trabalhando, 'ferias', v_ferias, 'afastado', v_afastados,
        'demitidos', v_demitidos, 'proventos', v_proventos, 'descontos', v_descontos,
        'liquido', v_liquido, 'base_inss', v_base_inss, 'base_fgts', v_base_fgts,
        'valor_fgts', v_valor_fgts, 'base_irrf', v_base_irrf,
        'departamentos', v_departamentos, 'centros_custo', v_centros, 'rubricas', v_rubricas
      ),
      encargos = coalesce(encargos, '{}'::jsonb) || jsonb_build_object(
        'base_total_inss', v_base_inss,
        'sal_contrib_empregados', greatest(0, v_base_inss - v_excedente),
        'excedente_inss', v_excedente,
        'segurados', v_segurados,
        'rat', v_rat,
        'terceiros', v_terceiros,
        'total_inss', v_total_inss,
        'base_pis', v_base_inss,
        'valor_pis', v_pis,
        'base_fgts', v_base_fgts,
        'valor_fgts', v_valor_fgts,
        'base_irrf_mensal', v_base_irrf,
        'valor_irrf', v_valor_irrf,
        'valor_irrf_mensal', v_valor_irrf,
        'valor_total_irrf', v_valor_irrf,
        'situacoes', jsonb_build_object(
          'empregados', v_empregados, 'estagiarios', v_estagiarios,
          'trabalhando', v_trabalhando, 'ferias', v_ferias,
          'afastado', v_afastados, 'demitido', v_demitidos
        )
      ),
      atualizado_em = now()
  where id = p_competencia_id;

  return jsonb_build_object(
    'competencia_id', p_competencia_id,
    'proventos', v_proventos, 'descontos', v_descontos,
    'liquido', v_liquido, 'pessoas', v_pessoas
  );
end;
$$;

create or replace function public.rh_editar_folha_colaborador(
  p_folha_id uuid,
  p_payload jsonb,
  p_motivo text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_uid uuid := auth.uid();
  v_competencia_id uuid;
  v_colaborador_id uuid;
  v_status text;
  v_item jsonb;
  v_antes jsonb;
  v_rubricas_antes jsonb;
  v_rubricas_depois jsonb;
  v_proventos numeric(14,2);
  v_descontos numeric(14,2);
  v_informativa numeric(14,2);
  v_liquido numeric(14,2);
  v_motivo text := nullif(trim(p_motivo), '');
  v_resultado jsonb;
begin
  if v_uid is null or not public.tem_permissao('rh', 'editar_folha_importada', v_uid) then
    raise exception 'Acesso negado para editar a folha importada.' using errcode = '42501';
  end if;
  if v_motivo is null then
    raise exception 'Informe o motivo da edição.' using errcode = '22023';
  end if;
  if jsonb_typeof(coalesce(p_payload->'lancamentos', '[]'::jsonb)) <> 'array' then
    raise exception 'A composição de rubricas é inválida.' using errcode = '22023';
  end if;
  if jsonb_array_length(coalesce(p_payload->'lancamentos', '[]'::jsonb)) > 300 then
    raise exception 'A edição excede o limite de 300 rubricas por colaborador.' using errcode = '22023';
  end if;

  select f.competencia_id, f.colaborador_id, c.status, to_jsonb(f)
  into v_competencia_id, v_colaborador_id, v_status, v_antes
  from public.rh_folha_colaboradores f
  join public.rh_competencias c on c.id = f.competencia_id
  where f.id = p_folha_id
  for update of f, c;

  if v_competencia_id is null then
    raise exception 'Registro individual da folha não encontrado.' using errcode = 'P0002';
  end if;
  if v_status in ('fechado', 'arquivado') then
    raise exception 'A competência está fechada. Reabra-a antes de editar.' using errcode = '55000';
  end if;

  if coalesce((p_payload->>'salario')::numeric, 0) < 0
     or coalesce((p_payload->>'base_inss')::numeric, 0) < 0
     or coalesce((p_payload->>'excedente_inss')::numeric, 0) < 0
     or coalesce((p_payload->>'base_fgts')::numeric, 0) < 0
     or coalesce((p_payload->>'valor_fgts')::numeric, 0) < 0
     or coalesce((p_payload->>'base_irrf')::numeric, 0) < 0
     or coalesce((p_payload->>'valor_irrf')::numeric, 0) < 0 then
    raise exception 'Salário, bases e impostos não podem ser negativos.' using errcode = '22023';
  end if;

  select coalesce(jsonb_agg(to_jsonb(l) order by l.id), '[]'::jsonb)
  into v_rubricas_antes
  from public.rh_lancamentos l
  where l.folha_colaborador_id = p_folha_id;

  delete from public.rh_lancamentos where folha_colaborador_id = p_folha_id;

  for v_item in select value from jsonb_array_elements(coalesce(p_payload->'lancamentos', '[]'::jsonb)) loop
    if nullif(trim(v_item->>'nome'), '') is null then
      raise exception 'Toda rubrica precisa ter uma descrição.' using errcode = '22023';
    end if;
    if lower(coalesce(v_item->>'tipo', '')) not in ('provento', 'desconto', 'informativa') then
      raise exception 'Tipo de rubrica inválido.' using errcode = '22023';
    end if;
    if coalesce((v_item->>'valor')::numeric, 0) < 0 then
      raise exception 'O valor da rubrica não pode ser negativo.' using errcode = '22023';
    end if;

    insert into public.rh_lancamentos (
      competencia_id, folha_colaborador_id, rubrica_codigo,
      rubrica_nome, referencia, valor, tipo
    ) values (
      v_competencia_id, p_folha_id, nullif(trim(v_item->>'codigo'), ''),
      trim(v_item->>'nome'), nullif(v_item->>'referencia', '')::numeric,
      round(coalesce((v_item->>'valor')::numeric, 0), 2), lower(v_item->>'tipo')
    );
  end loop;

  select
    round(coalesce(sum(valor) filter (where tipo = 'provento'), 0), 2),
    round(coalesce(sum(valor) filter (where tipo = 'desconto'), 0), 2),
    round(coalesce(sum(valor) filter (where tipo = 'informativa'), 0), 2)
  into v_proventos, v_descontos, v_informativa
  from public.rh_lancamentos
  where folha_colaborador_id = p_folha_id;
  v_liquido := round(v_proventos - v_descontos, 2);

  update public.rh_folha_colaboradores
  set horas_mes = nullif(p_payload->>'horas_mes', '')::numeric,
      salario = round(coalesce((p_payload->>'salario')::numeric, 0), 2),
      proventos = v_proventos,
      descontos = v_descontos,
      liquido = v_liquido,
      informativa = v_informativa,
      base_inss = round(coalesce((p_payload->>'base_inss')::numeric, 0), 2),
      excedente_inss = round(coalesce((p_payload->>'excedente_inss')::numeric, 0), 2),
      base_fgts = round(coalesce((p_payload->>'base_fgts')::numeric, 0), 2),
      valor_fgts = round(coalesce((p_payload->>'valor_fgts')::numeric, 0), 2),
      base_irrf = round(coalesce((p_payload->>'base_irrf')::numeric, 0), 2),
      valor_irrf = round(coalesce((p_payload->>'valor_irrf')::numeric, 0), 2),
      observacao = nullif(trim(p_payload->>'observacao'), '')
  where id = p_folha_id;

  if v_status in ('conferido', 'conciliado') then
    update public.rh_competencias set status = 'importado' where id = v_competencia_id;
  end if;

  v_resultado := public.rh_recalcular_competencia_interno(v_competencia_id);

  select coalesce(jsonb_agg(to_jsonb(l) order by l.id), '[]'::jsonb)
  into v_rubricas_depois
  from public.rh_lancamentos l
  where l.folha_colaborador_id = p_folha_id;

  insert into public.rh_auditoria(evento, entidade, entidade_id, detalhes, usuario_id)
  select 'folha_importada_editada', 'rh_folha_colaboradores', p_folha_id::text,
         jsonb_build_object(
           'competencia_id', v_competencia_id,
           'colaborador_id', v_colaborador_id,
           'status_anterior', v_status,
           'status_atual', case when v_status in ('conferido', 'conciliado') then 'importado' else v_status end,
           'antes', v_antes,
           'depois', to_jsonb(f),
           'rubricas_antes', v_rubricas_antes,
           'rubricas_depois', v_rubricas_depois,
           'motivo', v_motivo
         ),
         v_uid
  from public.rh_folha_colaboradores f
  where f.id = p_folha_id;

  return v_resultado || jsonb_build_object(
    'folha_id', p_folha_id,
    'colaborador_id', v_colaborador_id,
    'status', case when v_status in ('conferido', 'conciliado') then 'importado' else v_status end
  );
end;
$$;

-- A correção salarial legada continua disponível, agora protegida pela ação
-- específica e invalidando uma conferência anterior.
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
  if v_uid is null or not public.tem_permissao('rh', 'editar_folha_importada', v_uid) then
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
  for update of f, c;

  if v_competencia is null then
    raise exception 'Registro da folha não encontrado.' using errcode = 'P0002';
  end if;
  if v_status in ('fechado', 'arquivado') then
    raise exception 'A competência está fechada. Reabra-a antes de corrigir o salário-base.' using errcode = '55000';
  end if;

  update public.rh_folha_colaboradores
  set salario = round(p_salario, 2),
      observacao = concat_ws(' | ', nullif(observacao, ''), 'Salário corrigido: ' || trim(p_motivo))
  where id = p_folha_id;

  if v_status in ('conferido', 'conciliado') then
    update public.rh_competencias set status = 'importado' where id = v_competencia;
  end if;

  insert into public.rh_auditoria(evento, entidade, entidade_id, detalhes, usuario_id)
  values (
    'salario_base_atualizado', 'rh_folha_colaboradores', p_folha_id::text,
    jsonb_build_object(
      'competencia_id', v_competencia, 'colaborador_id', v_colaborador,
      'salario_anterior', v_anterior, 'salario_novo', round(p_salario, 2),
      'status_anterior', v_status,
      'status_atual', case when v_status in ('conferido', 'conciliado') then 'importado' else v_status end,
      'motivo', trim(p_motivo)
    ), v_uid
  );

  return jsonb_build_object(
    'folha_id', p_folha_id, 'colaborador_id', v_colaborador,
    'salario_anterior', v_anterior, 'salario', round(p_salario, 2)
  );
end;
$$;

-- O gatilho continua sendo a última barreira contra mudanças acidentais, mas
-- permite a transição fechada -> importada apenas para quem possui a ação de
-- reabertura. As tabelas não concedem UPDATE direto ao navegador.
create or replace function public.rh_competencia_status_guard()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
begin
  if tg_op in ('UPDATE', 'DELETE') and old.status = 'fechado' then
    if tg_op = 'DELETE' then
      raise exception 'Competência fechada. Reabra a competência antes de alterá-la.' using errcode = '55000';
    end if;
    if new.status <> 'importado'
       or auth.uid() is null
       or not public.tem_permissao('rh', 'reabrir_periodo', auth.uid()) then
      raise exception 'Competência fechada. Reabra a competência antes de alterá-la.' using errcode = '55000';
    end if;
  end if;
  if tg_op <> 'DELETE' then
    if new.status = 'processado' then new.status := 'importado'; end if;
    if new.status = 'arquivado' then new.status := 'fechado'; end if;
    new.atualizado_em := now();
    return new;
  end if;
  return old;
end;
$$;

create or replace function public.rh_atualizar_status_competencia(p_competencia_id uuid, p_status text)
returns text
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_uid uuid := auth.uid();
  v_atual text;
  v_novo text := lower(trim(coalesce(p_status, '')));
  v_permitido boolean := false;
begin
  if v_uid is null or not public.tem_permissao('rh', 'encerrar_periodo', v_uid) then
    raise exception 'Acesso negado para alterar o status da competência.' using errcode = '42501';
  end if;
  if v_novo not in ('importado', 'conferido', 'conciliado', 'fechado') then
    raise exception 'Status de competência inválido.' using errcode = '22023';
  end if;

  select case status when 'processado' then 'importado' when 'arquivado' then 'fechado' else status end
  into v_atual
  from public.rh_competencias
  where id = p_competencia_id
  for update;

  if v_atual is null then
    raise exception 'Competência não encontrada.' using errcode = 'P0002';
  end if;
  if v_atual = v_novo then return v_atual; end if;

  v_permitido := (v_atual = 'importado' and v_novo = 'conferido')
             or (v_atual = 'conferido' and v_novo = 'conciliado')
             or (v_atual = 'conciliado' and v_novo = 'fechado');
  if not v_permitido then
    raise exception 'Transição de status não permitida: % -> %.', v_atual, v_novo using errcode = '22023';
  end if;

  update public.rh_competencias set status = v_novo where id = p_competencia_id;
  insert into public.rh_auditoria(evento, entidade, entidade_id, detalhes, usuario_id)
  values (
    'status_competencia_alterado', 'rh_competencias', p_competencia_id::text,
    jsonb_build_object('de', v_atual, 'para', v_novo), v_uid
  );
  return v_novo;
end;
$$;

create or replace function public.rh_reabrir_competencia(p_competencia_id uuid, p_motivo text)
returns text
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_uid uuid := auth.uid();
  v_status text;
  v_motivo text := nullif(trim(p_motivo), '');
begin
  if v_uid is null or not public.tem_permissao('rh', 'reabrir_periodo', v_uid) then
    raise exception 'Acesso negado para reabrir a competência.' using errcode = '42501';
  end if;
  if v_motivo is null then
    raise exception 'Informe o motivo da reabertura.' using errcode = '22023';
  end if;

  select status into v_status
  from public.rh_competencias
  where id = p_competencia_id
  for update;
  if v_status is null then
    raise exception 'Competência não encontrada.' using errcode = 'P0002';
  end if;
  if v_status <> 'fechado' then
    raise exception 'Somente uma competência fechada pode ser reaberta.' using errcode = '22023';
  end if;

  update public.rh_competencias set status = 'importado' where id = p_competencia_id;
  insert into public.rh_auditoria(evento, entidade, entidade_id, detalhes, usuario_id)
  values (
    'competencia_reaberta', 'rh_competencias', p_competencia_id::text,
    jsonb_build_object('de', 'fechado', 'para', 'importado', 'motivo', v_motivo), v_uid
  );
  return 'importado';
end;
$$;

revoke all on function public.rh_projecao_periodo(date) from public, anon;
revoke all on function public.rh_atualizar_status_projecao(date,text,text) from public, anon;
revoke all on function public.rh_salvar_ajuste_projecao(date,numeric,text) from public, anon;
revoke all on function public.rh_salvar_parametros_projecao_v2(uuid,date,integer,numeric,numeric,numeric,integer,integer,text,text) from public, anon;
revoke all on function public.rh_salvar_parametros_projecao(uuid,date,integer,numeric,numeric,numeric,integer,integer,text) from public, anon;
revoke all on function public.rh_recalcular_competencia_interno(uuid) from public, anon, authenticated;
revoke all on function public.rh_editar_folha_colaborador(uuid,jsonb,text) from public, anon;
revoke all on function public.rh_atualizar_salario_folha(uuid,numeric,text) from public, anon;
revoke all on function public.rh_atualizar_status_competencia(uuid,text) from public, anon;
revoke all on function public.rh_reabrir_competencia(uuid,text) from public, anon;

grant execute on function public.rh_projecao_periodo(date) to authenticated;
grant execute on function public.rh_atualizar_status_projecao(date,text,text) to authenticated;
grant execute on function public.rh_salvar_ajuste_projecao(date,numeric,text) to authenticated;
grant execute on function public.rh_salvar_parametros_projecao_v2(uuid,date,integer,numeric,numeric,numeric,integer,integer,text,text) to authenticated;
grant execute on function public.rh_salvar_parametros_projecao(uuid,date,integer,numeric,numeric,numeric,integer,integer,text) to authenticated;
grant execute on function public.rh_editar_folha_colaborador(uuid,jsonb,text) to authenticated;
grant execute on function public.rh_atualizar_salario_folha(uuid,numeric,text) to authenticated;
grant execute on function public.rh_atualizar_status_competencia(uuid,text) to authenticated;
grant execute on function public.rh_reabrir_competencia(uuid,text) to authenticated;

comment on table public.rh_projecao_periodos is
  'Estado auditado da Próxima Folha por competência, incluindo bloqueio e ajuste geral.';
comment on function public.rh_editar_folha_colaborador(uuid,jsonb,text) is
  'Edita uma folha individual aberta, recompõe totais e invalida conferências anteriores.';
comment on function public.rh_reabrir_competencia(uuid,text) is
  'Reabre uma competência fechada para o estado Importado, mediante permissão e justificativa.';

notify pgrst, 'reload schema';

commit;
