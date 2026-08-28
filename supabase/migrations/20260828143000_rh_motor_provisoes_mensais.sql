-- RH & Folha v92 — motor mensal persistente de provisões.
-- Julho/2026 permanece como abertura oficial; competências posteriores são
-- calculadas automaticamente ao término da importação da folha mensal.

create schema if not exists private;

alter table public.rh_provisoes_oficiais
  add column if not exists folha_competencia_id uuid references public.rh_competencias(id) on delete set null,
  add column if not exists status text not null default 'oficial'
    check (status in ('oficial','calculado','revisao')),
  add column if not exists versao_calculo text,
  add column if not exists alertas jsonb not null default '[]'::jsonb,
  add column if not exists recalculado_em timestamptz;

create table if not exists public.rh_provisoes_parametros (
  vigencia date primary key,
  inss_empresa numeric(7,6) not null check (inss_empresa between 0 and 1),
  rat numeric(7,6) not null check (rat between 0 and 1),
  terceiros numeric(7,6) not null check (terceiros between 0 and 1),
  fgts numeric(7,6) not null check (fgts between 0 and 1),
  pis numeric(7,6) not null check (pis between 0 and 1),
  estagiario_provisiona_decimo boolean not null default true,
  estagiario_provisiona_ferias boolean not null default true,
  atualizado_em timestamptz not null default now()
);

insert into public.rh_provisoes_parametros
  (vigencia,inss_empresa,rat,terceiros,fgts,pis,estagiario_provisiona_decimo,estagiario_provisiona_ferias)
values ('2026-01-01',0.20,0.01,0.058,0.08,0.01,true,true)
on conflict (vigencia) do nothing;

create table if not exists public.rh_provisoes_fechamentos (
  id uuid primary key default gen_random_uuid(),
  competencia_id uuid not null references public.rh_competencias(id) on delete cascade,
  competencia date not null,
  tipo text not null check (tipo in ('ferias','decimo_terceiro')),
  status text not null check (status in ('oficial','calculado','revisao')),
  origem text not null,
  versao_calculo text not null,
  competencia_anterior date,
  totais jsonb not null default '{}'::jsonb,
  alertas jsonb not null default '[]'::jsonb,
  calculado_por uuid references public.profiles(id),
  calculado_em timestamptz not null default now(),
  unique (competencia_id,tipo)
);

create index if not exists rh_provisoes_fechamentos_competencia_idx
  on public.rh_provisoes_fechamentos (competencia desc,tipo);

create table if not exists public.rh_provisoes_colaboradores (
  id uuid primary key default gen_random_uuid(),
  fechamento_id uuid not null references public.rh_provisoes_fechamentos(id) on delete cascade,
  colaborador_id uuid not null references public.rh_colaboradores(id),
  folha_colaborador_id uuid references public.rh_folha_colaboradores(id) on delete set null,
  matricula text not null,
  nome text not null,
  departamento text,
  vinculo text,
  admissao date,
  base_remuneratoria numeric(14,2) not null default 0,
  avos integer not null default 0,
  periodos_adquiridos integer not null default 0,
  vencimento_estimado date,
  saldo_anterior numeric(14,2) not null default 0,
  provisao_regular numeric(14,2) not null default 0,
  ajuste numeric(14,2) not null default 0,
  pagamentos numeric(14,2) not null default 0,
  adiantamentos numeric(14,2) not null default 0,
  gozadas numeric(14,2) not null default 0,
  indenizadas numeric(14,2) not null default 0,
  estornos numeric(14,2) not null default 0,
  saldo_atual numeric(14,2) not null default 0,
  inss_empresa numeric(14,2) not null default 0,
  rat numeric(14,2) not null default 0,
  terceiros numeric(14,2) not null default 0,
  fgts numeric(14,2) not null default 0,
  pis numeric(14,2) not null default 0,
  total_encargos numeric(14,2) not null default 0,
  custo_provisionado numeric(14,2) not null default 0,
  detalhes jsonb not null default '{}'::jsonb,
  unique (fechamento_id,colaborador_id)
);

create index if not exists rh_provisoes_colaboradores_colaborador_idx
  on public.rh_provisoes_colaboradores (colaborador_id,fechamento_id);

alter table public.rh_provisoes_parametros enable row level security;
alter table public.rh_provisoes_fechamentos enable row level security;
alter table public.rh_provisoes_colaboradores enable row level security;

drop policy if exists "rh parametros provisao leitura autorizada" on public.rh_provisoes_parametros;
create policy "rh parametros provisao leitura autorizada"
on public.rh_provisoes_parametros for select to authenticated
using ((select public.tem_permissao('rh','ver_valores')) or (select public.tem_permissao('rh','administrar')));

drop policy if exists "rh fechamentos provisao leitura autorizada" on public.rh_provisoes_fechamentos;
create policy "rh fechamentos provisao leitura autorizada"
on public.rh_provisoes_fechamentos for select to authenticated
using ((select public.tem_permissao('rh','ver_valores_individuais')) or (select public.tem_permissao('rh','administrar')));

drop policy if exists "rh colaboradores provisao leitura autorizada" on public.rh_provisoes_colaboradores;
create policy "rh colaboradores provisao leitura autorizada"
on public.rh_provisoes_colaboradores for select to authenticated
using ((select public.tem_permissao('rh','ver_valores_individuais')) or (select public.tem_permissao('rh','administrar')));

revoke all on public.rh_provisoes_parametros,public.rh_provisoes_fechamentos,public.rh_provisoes_colaboradores
  from public,anon,authenticated;
grant select on public.rh_provisoes_parametros,public.rh_provisoes_fechamentos,public.rh_provisoes_colaboradores
  to authenticated;

create or replace function private.rh_provisoes_normalizar(p_texto text)
returns text
language sql
immutable
security invoker
set search_path = pg_catalog
as $$
  select lower(translate(coalesce(p_texto,''),
    'ÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑáàâãäéèêëíìîïóòôõöúùûüçñ',
    'AAAAAEEEEIIIIOOOOOUUUUCNaaaaaeeeeiiiiooooouuuucn'));
$$;

create or replace function private.rh_provisoes_serie(
  p_base numeric,p_inss numeric,p_rat numeric,p_terceiros numeric,p_fgts numeric,p_pis numeric,p_incide boolean
)
returns jsonb
language sql
immutable
security invoker
set search_path = pg_catalog
as $$
  select jsonb_build_array(
    round(coalesce(p_base,0),2),
    case when p_incide then round(coalesce(p_base,0)*p_inss,2) else 0 end,
    case when p_incide then round(coalesce(p_base,0)*p_rat,2) else 0 end,
    case when p_incide then round(coalesce(p_base,0)*p_terceiros,2) else 0 end,
    case when p_incide then round(coalesce(p_base,0)*p_fgts,2) else 0 end,
    case when p_incide then round(coalesce(p_base,0)*p_pis,2) else 0 end,
    round(coalesce(p_base,0) + case when p_incide then coalesce(p_base,0)*(p_inss+p_rat+p_terceiros+p_fgts+p_pis) else 0 end,2)
  );
$$;

create or replace function private.rh_provisoes_avos_decimo(p_admissao date,p_competencia date)
returns integer
language sql
immutable
security invoker
set search_path = pg_catalog
as $$
  select case
    when p_admissao is null or p_admissao > (date_trunc('month',p_competencia)+interval '1 month - 1 day')::date then 0
    else greatest(0,least(12,
      extract(month from p_competencia)::integer -
      case when extract(year from p_admissao)=extract(year from p_competencia)
        then extract(month from p_admissao)::integer + case when extract(day from p_admissao)>15 then 1 else 0 end
        else 1 end + 1
    ))
  end;
$$;

create or replace function private.rh_provisoes_meses_ferias(p_admissao date,p_competencia date)
returns integer
language sql
immutable
security invoker
set search_path = pg_catalog
as $$
  select case when p_admissao is null then 0 else greatest(0,
    ((extract(year from p_competencia)::integer-extract(year from p_admissao)::integer)*12
      + extract(month from p_competencia)::integer-extract(month from p_admissao)::integer + 1)
    - case when extract(day from p_admissao)>15 then 1 else 0 end
  ) end;
$$;

revoke all on function private.rh_provisoes_normalizar(text) from public,anon,authenticated;
revoke all on function private.rh_provisoes_serie(numeric,numeric,numeric,numeric,numeric,numeric,boolean) from public,anon,authenticated;
revoke all on function private.rh_provisoes_avos_decimo(date,date) from public,anon,authenticated;
revoke all on function private.rh_provisoes_meses_ferias(date,date) from public,anon,authenticated;

-- Converte o demonstrativo oficial de julho/2026 em abertura normalizada.
do $$
declare
  v_comp_id uuid;
  v_source record;
  v_close_id uuid;
begin
  select id into v_comp_id from public.rh_competencias
  where competencia='2026-07-01' order by importado_em desc limit 1;
  if v_comp_id is null then return; end if;

  for v_source in
    select * from public.rh_provisoes_oficiais where competencia='2026-07-01'
  loop
    insert into public.rh_provisoes_fechamentos
      (competencia_id,competencia,tipo,status,origem,versao_calculo,totais,alertas,calculado_por,calculado_em)
    values (v_comp_id,v_source.competencia,v_source.tipo,'oficial',v_source.origem,'oficial-dominio-2026-07',
            v_source.totais,'[]'::jsonb,v_source.importado_por,v_source.importado_em)
    on conflict (competencia_id,tipo) do update set
      status='oficial',origem=excluded.origem,versao_calculo=excluded.versao_calculo,
      totais=excluded.totais,alertas='[]'::jsonb,calculado_em=excluded.calculado_em
    returning id into v_close_id;

    delete from public.rh_provisoes_colaboradores where fechamento_id=v_close_id;
    insert into public.rh_provisoes_colaboradores (
      fechamento_id,colaborador_id,folha_colaborador_id,matricula,nome,departamento,vinculo,admissao,
      base_remuneratoria,avos,periodos_adquiridos,vencimento_estimado,saldo_anterior,
      provisao_regular,ajuste,saldo_atual,inss_empresa,rat,terceiros,fgts,pis,total_encargos,custo_provisionado,detalhes
    )
    select v_close_id,c.id,fc.id,c.matricula,c.nome,coalesce(fc.departamento_snapshot,c.departamento),
      coalesce(fc.vinculo_snapshot,c.vinculo),coalesce(fc.admissao_snapshot,c.admissao),
      case when v_source.tipo='ferias' then round(coalesce((j->'pm'->>0)::numeric,0)*9,2)
           else round(coalesce((j->'pm'->>0)::numeric,0)*12,2) end,
      case when v_source.tipo='ferias' then coalesce((j->'d'->>'fp')::integer,0)
           else private.rh_provisoes_avos_decimo(coalesce(fc.admissao_snapshot,c.admissao),v_source.competencia) end,
      case when v_source.tipo='ferias' then coalesce((j->'d'->>'fv')::integer,0) else 0 end,
      nullif(j->'d'->>'v','')::date,
      case when v_source.tipo='ferias' then coalesce((j->'d'->>'sa')::numeric,0)
           else greatest(0,round(coalesce((j->'s'->>0)::numeric,0)-coalesce((j->'p'->>0)::numeric,0),2)) end,
      coalesce((j->'pm'->>0)::numeric,0),
      round(coalesce((j->'p'->>0)::numeric,0)-coalesce((j->'pm'->>0)::numeric,0),2),
      coalesce((j->'s'->>0)::numeric,0),coalesce((j->'s'->>1)::numeric,0),
      coalesce((j->'s'->>2)::numeric,0),coalesce((j->'s'->>3)::numeric,0),
      coalesce((j->'s'->>4)::numeric,0),coalesce((j->'s'->>5)::numeric,0),
      round(coalesce((j->'s'->>1)::numeric,0)+coalesce((j->'s'->>2)::numeric,0)+coalesce((j->'s'->>3)::numeric,0)+coalesce((j->'s'->>4)::numeric,0)+coalesce((j->'s'->>5)::numeric,0),2),
      coalesce((j->'s'->>6)::numeric,0),coalesce(j->'d','{}'::jsonb)
    from jsonb_array_elements(v_source.colaboradores) j
    join public.rh_colaboradores c on c.matricula=j->>'m'
    left join public.rh_folha_colaboradores fc on fc.competencia_id=v_comp_id and fc.colaborador_id=c.id;
  end loop;

  update public.rh_provisoes_oficiais
  set folha_competencia_id=v_comp_id,status='oficial',versao_calculo='oficial-dominio-2026-07',
      alertas='[]'::jsonb,recalculado_em=importado_em
  where competencia='2026-07-01';
end $$;

create or replace function private.rh_calcular_provisoes_competencia(
  p_competencia_id uuid,p_usuario_id uuid default null,p_forcar boolean default false
)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog,public,private
as $$
declare
  v_comp record;
  v_param public.rh_provisoes_parametros%rowtype;
  v_tipo text;
  v_close_id uuid;
  v_prev_close_id uuid;
  v_prev_comp date;
  v_status text;
  v_alertas jsonb := '[]'::jsonb;
  v_gap integer;
  v_row record;
  v_prev record;
  v_norm text;
  v_estagiario boolean;
  v_incide boolean;
  v_base numeric;
  v_avos integer;
  v_periodos integer;
  v_periodos_calculo integer;
  v_vencimento date;
  v_regular numeric;
  v_anterior numeric;
  v_ajuste numeric;
  v_pago numeric;
  v_adiantado numeric;
  v_gozadas numeric;
  v_indenizadas numeric;
  v_estornos numeric;
  v_saldo numeric;
  v_inss numeric;
  v_rat numeric;
  v_terc numeric;
  v_fgts numeric;
  v_pis numeric;
  v_enc numeric;
  v_custo numeric;
  v_total_meses integer;
  v_dias_gozados numeric;
  v_totais jsonb;
  v_compact jsonb;
begin
  select * into v_comp from public.rh_competencias where id=p_competencia_id for update;
  if not found then raise exception 'Competência da folha não encontrada.' using errcode='P0002'; end if;
  if private.rh_provisoes_normalizar(v_comp.tipo_calculo) not like '%folha mensal%' then
    return jsonb_build_object('competencia_id',p_competencia_id,'status','ignorado','motivo','tipo de cálculo não mensal');
  end if;

  select * into v_param from public.rh_provisoes_parametros
  where vigencia<=v_comp.competencia order by vigencia desc limit 1;
  if not found then raise exception 'Parâmetros de provisão não configurados para %.',v_comp.competencia using errcode='22023'; end if;

  if exists(select 1 from public.rh_provisoes_oficiais where competencia=v_comp.competencia and origem like 'dominio%') and not p_forcar then
    return jsonb_build_object('competencia_id',p_competencia_id,'status','oficial','competencia',v_comp.competencia);
  end if;

  foreach v_tipo in array array['decimo_terceiro','ferias'] loop
    v_alertas := '[]'::jsonb;
    select id,competencia into v_prev_close_id,v_prev_comp
    from public.rh_provisoes_fechamentos
    where tipo=v_tipo and competencia<v_comp.competencia
    order by competencia desc limit 1;

    if v_prev_close_id is null then
      v_status := 'revisao';
      v_alertas := v_alertas || jsonb_build_array(jsonb_build_object('codigo','SEM_ABERTURA','mensagem','Não existe fechamento anterior; os saldos foram iniciados pela admissão.'));
      v_gap := 1;
    else
      v_gap := (extract(year from age(v_comp.competencia,v_prev_comp))::integer*12 + extract(month from age(v_comp.competencia,v_prev_comp))::integer);
      v_gap := greatest(1,v_gap);
      v_status := case when v_gap=1 then 'calculado' else 'revisao' end;
      if v_gap>1 then
        v_alertas := v_alertas || jsonb_build_array(jsonb_build_object('codigo','LACUNA_COMPETENCIA','mensagem','Há competências sem folha entre a abertura e este cálculo.','meses',v_gap-1));
      end if;
    end if;

    insert into public.rh_provisoes_fechamentos
      (competencia_id,competencia,tipo,status,origem,versao_calculo,competencia_anterior,totais,alertas,calculado_por,calculado_em)
    values (p_competencia_id,v_comp.competencia,v_tipo,v_status,'calculo_automatico_folha','rh-prov-1.0.0',v_prev_comp,'{}'::jsonb,v_alertas,p_usuario_id,now())
    on conflict (competencia_id,tipo) do update set
      status=excluded.status,origem=excluded.origem,versao_calculo=excluded.versao_calculo,
      competencia_anterior=excluded.competencia_anterior,totais='{}'::jsonb,alertas=excluded.alertas,
      calculado_por=excluded.calculado_por,calculado_em=excluded.calculado_em
    returning id into v_close_id;
    delete from public.rh_provisoes_colaboradores where fechamento_id=v_close_id;

    for v_row in
      select fc.*,c.matricula,c.nome,c.admissao,
             coalesce(fc.departamento_snapshot,c.departamento) departamento,
             coalesce(fc.vinculo_snapshot,c.vinculo) vinculo,
             coalesce(fc.admissao_snapshot,c.admissao) admissao_base
      from public.rh_folha_colaboradores fc
      join public.rh_colaboradores c on c.id=fc.colaborador_id
      where fc.competencia_id=p_competencia_id
      order by c.nome,c.matricula
    loop
      select * into v_prev from public.rh_provisoes_colaboradores
      where fechamento_id=v_prev_close_id and colaborador_id=v_row.colaborador_id;
      v_norm := private.rh_provisoes_normalizar(v_row.vinculo);
      v_estagiario := v_norm like '%estagi%';
      v_incide := not v_estagiario;
      v_base := round(greatest(coalesce(v_row.salario,0),coalesce(v_row.base_fgts,0),coalesce(v_row.base_inss,0)),2);
      if v_base=0 then
        v_status := 'revisao';
        v_alertas := v_alertas || jsonb_build_array(jsonb_build_object('codigo','BASE_ZERADA','matricula',v_row.matricula,'mensagem','Base remuneratória zerada; confira a folha do colaborador.'));
      end if;
      v_anterior := round(coalesce(v_prev.saldo_atual,0),2);
      v_pago:=0;v_adiantado:=0;v_gozadas:=0;v_indenizadas:=0;v_estornos:=0;v_dias_gozados:=0;

      if v_tipo='decimo_terceiro' then
        v_avos := private.rh_provisoes_avos_decimo(v_row.admissao_base,v_comp.competencia);
        if v_estagiario and not v_param.estagiario_provisiona_decimo then v_avos:=0; end if;
        v_regular := case when v_avos>0 then round(v_base/12,2) else 0 end;
        select
          round(coalesce(sum(l.valor) filter(where l.tipo='provento' and private.rh_provisoes_normalizar(l.rubrica_nome) ~ '(13|decimo)' and private.rh_provisoes_normalizar(l.rubrica_nome) !~ '(inss|irrf|adiant)'),0),2),
          round(coalesce(sum(l.valor) filter(where private.rh_provisoes_normalizar(l.rubrica_nome) ~ '(13|decimo)' and private.rh_provisoes_normalizar(l.rubrica_nome) like '%adiant%'),0),2),
          round(coalesce(sum(l.valor) filter(where private.rh_provisoes_normalizar(l.rubrica_nome) ~ '(13|decimo)' and private.rh_provisoes_normalizar(l.rubrica_nome) like '%estorno%'),0),2)
        into v_pago,v_adiantado,v_estornos
        from public.rh_lancamentos l where l.folha_colaborador_id=v_row.id;
        v_ajuste := round((v_base*v_avos/12)-v_anterior-v_regular,2);
        v_saldo := greatest(0,round(v_anterior+v_regular+v_ajuste-v_pago-v_adiantado-v_estornos,2));
        v_periodos:=0;v_vencimento:=null;
      else
        if v_prev.id is not null then
          v_total_meses := greatest(0,v_prev.avos)+v_gap;
          v_periodos_calculo := greatest(0,v_prev.periodos_adquiridos)+(v_total_meses/12);
          v_avos := mod(v_total_meses,12);
          v_vencimento := case when v_prev.vencimento_estimado is null then null else (v_prev.vencimento_estimado + make_interval(years=>(v_total_meses/12)))::date end;
        else
          v_total_meses := private.rh_provisoes_meses_ferias(v_row.admissao_base,v_comp.competencia);
          v_periodos_calculo := v_total_meses/12;
          v_avos := mod(v_total_meses,12);
          v_vencimento := case when v_row.admissao_base is null then null else (v_row.admissao_base + make_interval(years=>(v_total_meses/12)+1) - interval '1 day')::date end;
        end if;
        if v_estagiario and not v_param.estagiario_provisiona_ferias then v_avos:=0;v_periodos_calculo:=0; end if;
        v_regular := case when v_base>0 then round(v_base/9,2) else 0 end;
        select
          round(coalesce(sum(l.valor) filter(where l.tipo='provento' and private.rh_provisoes_normalizar(l.rubrica_nome) like '%ferias%'
            and private.rh_provisoes_normalizar(l.rubrica_nome) !~ '(rescis|indeniz|proporcion|abono|dobro)'),0),2),
          round(coalesce(sum(l.valor) filter(where l.tipo='provento' and private.rh_provisoes_normalizar(l.rubrica_nome) like '%ferias%'
            and private.rh_provisoes_normalizar(l.rubrica_nome) ~ '(rescis|indeniz)'),0),2),
          round(coalesce(sum(l.valor) filter(where private.rh_provisoes_normalizar(l.rubrica_nome) like '%ferias%' and private.rh_provisoes_normalizar(l.rubrica_nome) like '%estorno%'),0),2),
          coalesce(sum(l.referencia) filter(where l.tipo='provento' and private.rh_provisoes_normalizar(l.rubrica_nome) like '%dias ferias%'
            and private.rh_provisoes_normalizar(l.rubrica_nome) !~ '(rescis|indeniz|abono)'),0)
        into v_gozadas,v_indenizadas,v_estornos,v_dias_gozados
        from public.rh_lancamentos l where l.folha_colaborador_id=v_row.id;
        v_ajuste := round((v_base*(v_periodos_calculo+v_avos/12.0)*4/3)-v_anterior-v_regular,2);
        v_saldo := greatest(0,round(v_anterior+v_regular+v_ajuste-v_gozadas-v_indenizadas-v_estornos,2));
        v_periodos := greatest(0,v_periodos_calculo-floor(v_dias_gozados/30)::integer);
      end if;

      v_inss:=case when v_incide then round(v_saldo*v_param.inss_empresa,2) else 0 end;
      v_rat:=case when v_incide then round(v_saldo*v_param.rat,2) else 0 end;
      v_terc:=case when v_incide then round(v_saldo*v_param.terceiros,2) else 0 end;
      v_fgts:=case when v_incide then round(v_saldo*v_param.fgts,2) else 0 end;
      v_pis:=case when v_incide then round(v_saldo*v_param.pis,2) else 0 end;
      v_enc:=round(v_inss+v_rat+v_terc+v_fgts+v_pis,2);v_custo:=round(v_saldo+v_enc,2);

      insert into public.rh_provisoes_colaboradores (
        fechamento_id,colaborador_id,folha_colaborador_id,matricula,nome,departamento,vinculo,admissao,
        base_remuneratoria,avos,periodos_adquiridos,vencimento_estimado,saldo_anterior,provisao_regular,
        ajuste,pagamentos,adiantamentos,gozadas,indenizadas,estornos,saldo_atual,
        inss_empresa,rat,terceiros,fgts,pis,total_encargos,custo_provisionado,detalhes
      ) values (
        v_close_id,v_row.colaborador_id,v_row.id,v_row.matricula,v_row.nome,v_row.departamento,v_row.vinculo,v_row.admissao_base,
        v_base,v_avos,v_periodos,v_vencimento,v_anterior,v_regular,v_ajuste,v_pago,v_adiantado,v_gozadas,v_indenizadas,v_estornos,v_saldo,
        v_inss,v_rat,v_terc,v_fgts,v_pis,v_enc,v_custo,
        jsonb_build_object('fonte_base','maior entre salário, base FGTS e base INSS','incidencia_encargos',v_incide,'dias_gozados_identificados',v_dias_gozados)
      );
    end loop;

    select jsonb_build_object(
      'anterior',jsonb_build_array(round(sum(saldo_anterior),2),round(sum(case when private.rh_provisoes_normalizar(vinculo) not like '%estagi%' then saldo_anterior*v_param.inss_empresa else 0 end),2),round(sum(case when private.rh_provisoes_normalizar(vinculo) not like '%estagi%' then saldo_anterior*v_param.rat else 0 end),2),round(sum(case when private.rh_provisoes_normalizar(vinculo) not like '%estagi%' then saldo_anterior*v_param.terceiros else 0 end),2),round(sum(case when private.rh_provisoes_normalizar(vinculo) not like '%estagi%' then saldo_anterior*v_param.fgts else 0 end),2),round(sum(case when private.rh_provisoes_normalizar(vinculo) not like '%estagi%' then saldo_anterior*v_param.pis else 0 end),2),0),
      'mes',jsonb_build_array(round(sum(provisao_regular),2),round(sum(case when private.rh_provisoes_normalizar(vinculo) not like '%estagi%' then provisao_regular*v_param.inss_empresa else 0 end),2),round(sum(case when private.rh_provisoes_normalizar(vinculo) not like '%estagi%' then provisao_regular*v_param.rat else 0 end),2),round(sum(case when private.rh_provisoes_normalizar(vinculo) not like '%estagi%' then provisao_regular*v_param.terceiros else 0 end),2),round(sum(case when private.rh_provisoes_normalizar(vinculo) not like '%estagi%' then provisao_regular*v_param.fgts else 0 end),2),round(sum(case when private.rh_provisoes_normalizar(vinculo) not like '%estagi%' then provisao_regular*v_param.pis else 0 end),2),0),
      'ajuste',jsonb_build_array(round(sum(ajuste),2),round(sum(case when private.rh_provisoes_normalizar(vinculo) not like '%estagi%' then ajuste*v_param.inss_empresa else 0 end),2),round(sum(case when private.rh_provisoes_normalizar(vinculo) not like '%estagi%' then ajuste*v_param.rat else 0 end),2),round(sum(case when private.rh_provisoes_normalizar(vinculo) not like '%estagi%' then ajuste*v_param.terceiros else 0 end),2),round(sum(case when private.rh_provisoes_normalizar(vinculo) not like '%estagi%' then ajuste*v_param.fgts else 0 end),2),round(sum(case when private.rh_provisoes_normalizar(vinculo) not like '%estagi%' then ajuste*v_param.pis else 0 end),2),0),
      'provisionado',jsonb_build_array(round(sum(provisao_regular+ajuste),2),round(sum(case when private.rh_provisoes_normalizar(vinculo) not like '%estagi%' then (provisao_regular+ajuste)*v_param.inss_empresa else 0 end),2),round(sum(case when private.rh_provisoes_normalizar(vinculo) not like '%estagi%' then (provisao_regular+ajuste)*v_param.rat else 0 end),2),round(sum(case when private.rh_provisoes_normalizar(vinculo) not like '%estagi%' then (provisao_regular+ajuste)*v_param.terceiros else 0 end),2),round(sum(case when private.rh_provisoes_normalizar(vinculo) not like '%estagi%' then (provisao_regular+ajuste)*v_param.fgts else 0 end),2),round(sum(case when private.rh_provisoes_normalizar(vinculo) not like '%estagi%' then (provisao_regular+ajuste)*v_param.pis else 0 end),2),0),
      'pago',private.rh_provisoes_serie(sum(pagamentos),v_param.inss_empresa,v_param.rat,v_param.terceiros,v_param.fgts,v_param.pis,true),
      'adiantado',private.rh_provisoes_serie(sum(adiantamentos),v_param.inss_empresa,v_param.rat,v_param.terceiros,v_param.fgts,v_param.pis,true),
      'gozadas',private.rh_provisoes_serie(sum(gozadas),v_param.inss_empresa,v_param.rat,v_param.terceiros,v_param.fgts,v_param.pis,true),
      'indenizadas',private.rh_provisoes_serie(sum(indenizadas),0,0,0,0,0,false),
      'estorno',private.rh_provisoes_serie(sum(estornos),v_param.inss_empresa,v_param.rat,v_param.terceiros,v_param.fgts,v_param.pis,true),
      'saldo',jsonb_build_array(round(sum(saldo_atual),2),round(sum(inss_empresa),2),round(sum(rat),2),round(sum(terceiros),2),round(sum(fgts),2),round(sum(pis),2),round(sum(custo_provisionado),2))
    ) into v_totais
    from public.rh_provisoes_colaboradores where fechamento_id=v_close_id;

    -- Completa o custo total (posição 6) de cada série com a soma das posições 0 a 5.
    v_totais := (select jsonb_object_agg(k,
      case when jsonb_typeof(v)='array' and jsonb_array_length(v)=7
        then jsonb_set(v,'{6}',to_jsonb(round(coalesce((v->>0)::numeric,0)+coalesce((v->>1)::numeric,0)+coalesce((v->>2)::numeric,0)+coalesce((v->>3)::numeric,0)+coalesce((v->>4)::numeric,0)+coalesce((v->>5)::numeric,0),2)))
        else v end)
      from jsonb_each(v_totais) e(k,v));

    select coalesce(jsonb_agg(jsonb_build_object(
      'm',matricula,
      'pm',private.rh_provisoes_serie(provisao_regular,v_param.inss_empresa,v_param.rat,v_param.terceiros,v_param.fgts,v_param.pis,private.rh_provisoes_normalizar(vinculo) not like '%estagi%'),
      'p',private.rh_provisoes_serie(provisao_regular+ajuste,v_param.inss_empresa,v_param.rat,v_param.terceiros,v_param.fgts,v_param.pis,private.rh_provisoes_normalizar(vinculo) not like '%estagi%'),
      's',jsonb_build_array(saldo_atual,inss_empresa,rat,terceiros,fgts,pis,custo_provisionado),
      'd',case when v_tipo='ferias' then jsonb_build_object('a',admissao,'v',vencimento_estimado,'fv',periodos_adquiridos,'fp',avos,'sa',saldo_anterior,'b',base_remuneratoria,'aj',ajuste,'gz',gozadas,'in',indenizadas,'es',estornos)
               else jsonb_build_object('a',admissao,'av',avos,'sa',saldo_anterior,'b',base_remuneratoria,'aj',ajuste,'pg',pagamentos,'ad',adiantamentos,'es',estornos) end
    ) order by nome,matricula),'[]'::jsonb) into v_compact
    from public.rh_provisoes_colaboradores where fechamento_id=v_close_id;

    update public.rh_provisoes_fechamentos set status=v_status,totais=v_totais,alertas=v_alertas where id=v_close_id;
    insert into public.rh_provisoes_oficiais
      (competencia,tipo,arquivo_nome,totais,colaboradores,origem,importado_por,importado_em,
       folha_competencia_id,status,versao_calculo,alertas,recalculado_em)
    values (v_comp.competencia,v_tipo,'Cálculo automático da folha · '||to_char(v_comp.competencia,'MM/YYYY'),v_totais,v_compact,
            'calculo_automatico_folha',p_usuario_id,now(),p_competencia_id,v_status,'rh-prov-1.0.0',v_alertas,now())
    on conflict (competencia,tipo) do update set
      arquivo_nome=excluded.arquivo_nome,totais=excluded.totais,colaboradores=excluded.colaboradores,
      origem=excluded.origem,importado_por=excluded.importado_por,importado_em=excluded.importado_em,
      folha_competencia_id=excluded.folha_competencia_id,status=excluded.status,
      versao_calculo=excluded.versao_calculo,alertas=excluded.alertas,recalculado_em=excluded.recalculado_em
    where public.rh_provisoes_oficiais.origem not like 'dominio%';
  end loop;

  insert into public.rh_auditoria(evento,entidade,entidade_id,detalhes,usuario_id)
  values ('provisoes_recalculadas','rh_competencias',p_competencia_id::text,
    jsonb_build_object('competencia',v_comp.competencia,'versao','rh-prov-1.0.0','origem','folha_mensal'),p_usuario_id);
  return jsonb_build_object('competencia_id',p_competencia_id,'competencia',v_comp.competencia,'status','calculado','versao','rh-prov-1.0.0');
end;
$$;

revoke all on function private.rh_calcular_provisoes_competencia(uuid,uuid,boolean) from public,anon,authenticated;

create or replace function public.rh_reprocessar_provisoes(p_competencia_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog,public,private
as $$
declare v_uid uuid:=auth.uid();
begin
  if v_uid is null or not (public.tem_permissao('rh','importar',v_uid) or public.tem_permissao('rh','administrar',v_uid)) then
    raise exception 'Acesso negado para reprocessar provisões.' using errcode='42501';
  end if;
  if exists(select 1 from public.rh_provisoes_oficiais p join public.rh_competencias c on c.competencia=p.competencia
            where c.id=p_competencia_id and p.origem like 'dominio%') then
    raise exception 'O fechamento oficial desta competência é imutável.' using errcode='55000';
  end if;
  return private.rh_calcular_provisoes_competencia(p_competencia_id,v_uid,true);
end;
$$;

revoke all on function public.rh_reprocessar_provisoes(uuid) from public,anon;
grant execute on function public.rh_reprocessar_provisoes(uuid) to authenticated;

create or replace function private.rh_provisoes_apos_auditoria()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog,public,private
as $$
declare v_competencia_id uuid;
begin
  if new.evento='importacao_concluida' and new.entidade='rh_competencias' then
    v_competencia_id:=new.entidade_id::uuid;
  elsif new.evento='folha_importada_editada' then
    v_competencia_id:=nullif(new.detalhes->>'competencia_id','')::uuid;
  else
    return new;
  end if;
  if v_competencia_id is not null then
    perform private.rh_calcular_provisoes_competencia(v_competencia_id,new.usuario_id,false);
  end if;
  return new;
end;
$$;

revoke all on function private.rh_provisoes_apos_auditoria() from public,anon,authenticated;
drop trigger if exists rh_provisoes_apos_auditoria_trigger on public.rh_auditoria;
create trigger rh_provisoes_apos_auditoria_trigger
after insert on public.rh_auditoria
for each row execute function private.rh_provisoes_apos_auditoria();

comment on table public.rh_provisoes_fechamentos is 'Fechamento mensal persistente e auditável das provisões de 13º e férias.';
comment on table public.rh_provisoes_colaboradores is 'Memória de cálculo por colaborador vinculada ao fechamento mensal de provisões.';
comment on function public.rh_reprocessar_provisoes(uuid) is 'Reprocessa de forma idempotente as provisões da competência importada, preservando fechamentos oficiais.';
