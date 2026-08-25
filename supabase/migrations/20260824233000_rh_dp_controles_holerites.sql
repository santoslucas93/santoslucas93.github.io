-- RH & DP v63 — livro de férias, checklists, documentos e rastreio de holerites.
-- Escritas são feitas apenas por RPCs auditadas; as tabelas permanecem protegidas por RLS.

create table if not exists public.rh_ferias_periodos (
  id uuid primary key default gen_random_uuid(),
  colaborador_id uuid not null references public.rh_colaboradores(id) on delete cascade,
  periodo_aquisitivo_inicio date not null,
  periodo_aquisitivo_fim date not null,
  limite_concessivo date not null,
  dias_direito integer not null default 30 check (dias_direito between 0 and 30),
  dias_gozados integer not null default 0 check (dias_gozados between 0 and 30),
  dias_abono integer not null default 0 check (dias_abono between 0 and 10),
  inicio_gozo date,
  fim_gozo date,
  status text not null default 'a_conferir'
    check (status in ('a_conferir','pendente','programada','gozada','cancelada')),
  observacao text,
  atualizado_por uuid references public.profiles(id),
  atualizado_em timestamptz not null default now(),
  unique (colaborador_id, periodo_aquisitivo_inicio)
);

create table if not exists public.rh_checklist_itens (
  id uuid primary key default gen_random_uuid(),
  colaborador_id uuid not null references public.rh_colaboradores(id) on delete cascade,
  tipo text not null check (tipo in ('admissao','desligamento')),
  codigo text not null,
  descricao text not null,
  obrigatorio boolean not null default true,
  concluido boolean not null default false,
  concluido_em timestamptz,
  concluido_por uuid references public.profiles(id),
  observacao text,
  atualizado_em timestamptz not null default now(),
  unique (colaborador_id, tipo, codigo)
);

create table if not exists public.rh_documentos_controle (
  id uuid primary key default gen_random_uuid(),
  colaborador_id uuid not null references public.rh_colaboradores(id) on delete cascade,
  categoria text not null check (categoria in ('aso','experiencia','documento','certificado','outro')),
  descricao text not null,
  data_emissao date,
  data_vencimento date,
  alertar_dias_antes integer not null default 30 check (alertar_dias_antes between 0 and 365),
  status text not null default 'vigente' check (status in ('vigente','vencido','renovado','dispensado')),
  observacao text,
  atualizado_por uuid references public.profiles(id),
  atualizado_em timestamptz not null default now()
);

create table if not exists public.rh_holerites_envios (
  id uuid primary key default gen_random_uuid(),
  competencia_id uuid not null references public.rh_competencias(id) on delete cascade,
  colaborador_id uuid not null references public.rh_colaboradores(id) on delete cascade,
  destinatario_email text not null,
  status text not null check (status in ('enviado','erro','confirmado')),
  provedor text,
  provedor_id text,
  detalhe text,
  enviado_por uuid references public.profiles(id),
  enviado_em timestamptz not null default now(),
  confirmado_em timestamptz,
  atualizado_em timestamptz not null default now()
);

create index if not exists rh_ferias_limite_idx on public.rh_ferias_periodos(limite_concessivo, status);
create index if not exists rh_checklist_colab_idx on public.rh_checklist_itens(colaborador_id, tipo);
create index if not exists rh_documentos_vencimento_idx on public.rh_documentos_controle(data_vencimento, status);
create index if not exists rh_holerites_envios_comp_idx on public.rh_holerites_envios(competencia_id, colaborador_id, enviado_em desc);

create or replace function public.rh_preparar_checklists_novo_colaborador()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  insert into public.rh_checklist_itens(colaborador_id,tipo,codigo,descricao,obrigatorio)
  select new.id,x.tipo,x.codigo,x.descricao,x.obrigatorio
  from (values
    ('admissao','documentos_pessoais','Documentos pessoais conferidos',true),
    ('admissao','contrato','Contrato de trabalho assinado',true),
    ('admissao','esocial','Admissão transmitida ao eSocial',true),
    ('admissao','aso_admissional','ASO admissional válido',true),
    ('admissao','beneficios','Opções de benefícios registradas',true),
    ('admissao','conta_bancaria','Dados bancários conferidos',true),
    ('admissao','acessos','Acessos e equipamentos entregues',false),
    ('desligamento','aviso','Aviso / comunicação de desligamento',true),
    ('desligamento','exame_demissional','Exame demissional concluído',true),
    ('desligamento','calculo_rescisao','Cálculo rescisório conferido',true),
    ('desligamento','esocial','Desligamento transmitido ao eSocial',true),
    ('desligamento','pagamento','Pagamento rescisório confirmado',true),
    ('desligamento','beneficios','Benefícios encerrados',true),
    ('desligamento','acessos','Acessos e equipamentos devolvidos',true)
  ) as x(tipo,codigo,descricao,obrigatorio);
  return new;
end;
$$;

drop trigger if exists rh_colaborador_preparar_checklists on public.rh_colaboradores;
create trigger rh_colaborador_preparar_checklists
after insert on public.rh_colaboradores
for each row execute function public.rh_preparar_checklists_novo_colaborador();

revoke all on function public.rh_preparar_checklists_novo_colaborador() from public,anon,authenticated;

alter table public.rh_ferias_periodos enable row level security;
alter table public.rh_checklist_itens enable row level security;
alter table public.rh_documentos_controle enable row level security;
alter table public.rh_holerites_envios enable row level security;

drop policy if exists "rh ferias leitura autorizada" on public.rh_ferias_periodos;
create policy "rh ferias leitura autorizada" on public.rh_ferias_periodos for select to authenticated
  using ((select public.tem_permissao('rh','ver_nomes')) or (select public.tem_permissao('rh','administrar')));
drop policy if exists "rh checklist leitura autorizada" on public.rh_checklist_itens;
create policy "rh checklist leitura autorizada" on public.rh_checklist_itens for select to authenticated
  using ((select public.tem_permissao('rh','ver_nomes')) or (select public.tem_permissao('rh','administrar')));
drop policy if exists "rh documentos leitura autorizada" on public.rh_documentos_controle;
create policy "rh documentos leitura autorizada" on public.rh_documentos_controle for select to authenticated
  using ((select public.tem_permissao('rh','ver_nomes')) or (select public.tem_permissao('rh','administrar')));
drop policy if exists "rh holerites leitura autorizada" on public.rh_holerites_envios;
create policy "rh holerites leitura autorizada" on public.rh_holerites_envios for select to authenticated
  using ((select public.tem_permissao('rh','ver_valores_individuais')) or (select public.tem_permissao('rh','administrar')));

revoke all on public.rh_ferias_periodos, public.rh_checklist_itens,
  public.rh_documentos_controle, public.rh_holerites_envios from public, anon, authenticated;
grant select on public.rh_ferias_periodos, public.rh_checklist_itens,
  public.rh_documentos_controle, public.rh_holerites_envios to authenticated;

create or replace function public.rh_inicializar_controles_colaborador(p_colaborador_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_uid uuid := auth.uid();
  v_admissao date;
  v_situacao text;
  v_anos integer;
  v_inicio date;
  v_ferias integer := 0;
  v_checklists integer := 0;
begin
  if v_uid is null or not public.tem_permissao('rh','administrar',v_uid) then
    raise exception 'Acesso negado para inicializar controles de DP.' using errcode='42501';
  end if;
  select admissao, situacao into v_admissao, v_situacao
  from public.rh_colaboradores where id=p_colaborador_id;
  if not found then raise exception 'Colaborador não encontrado.' using errcode='P0002'; end if;

  if v_admissao is not null and current_date >= v_admissao + interval '1 year' then
    v_anos := extract(year from age(current_date, v_admissao))::integer;
    v_inicio := (v_admissao + make_interval(years => greatest(v_anos-1,0)))::date;
    insert into public.rh_ferias_periodos(
      colaborador_id, periodo_aquisitivo_inicio, periodo_aquisitivo_fim,
      limite_concessivo, status, observacao, atualizado_por)
    values (p_colaborador_id, v_inicio, (v_inicio + interval '1 year - 1 day')::date,
      (v_inicio + interval '2 years - 1 day')::date, 'a_conferir',
      'Período criado automaticamente pela admissão; conferir férias históricas.', v_uid)
    on conflict (colaborador_id, periodo_aquisitivo_inicio) do nothing;
    get diagnostics v_ferias = row_count;
  end if;

  insert into public.rh_checklist_itens(colaborador_id,tipo,codigo,descricao,obrigatorio)
  select p_colaborador_id, x.tipo, x.codigo, x.descricao, x.obrigatorio
  from (values
    ('admissao','documentos_pessoais','Documentos pessoais conferidos',true),
    ('admissao','contrato','Contrato de trabalho assinado',true),
    ('admissao','esocial','Admissão transmitida ao eSocial',true),
    ('admissao','aso_admissional','ASO admissional válido',true),
    ('admissao','beneficios','Opções de benefícios registradas',true),
    ('admissao','conta_bancaria','Dados bancários conferidos',true),
    ('admissao','acessos','Acessos e equipamentos entregues',false),
    ('desligamento','aviso','Aviso / comunicação de desligamento',true),
    ('desligamento','exame_demissional','Exame demissional concluído',true),
    ('desligamento','calculo_rescisao','Cálculo rescisório conferido',true),
    ('desligamento','esocial','Desligamento transmitido ao eSocial',true),
    ('desligamento','pagamento','Pagamento rescisório confirmado',true),
    ('desligamento','beneficios','Benefícios encerrados',true),
    ('desligamento','acessos','Acessos e equipamentos devolvidos',true)
  ) as x(tipo,codigo,descricao,obrigatorio)
  on conflict (colaborador_id,tipo,codigo) do nothing;
  get diagnostics v_checklists = row_count;

  insert into public.rh_auditoria(evento,entidade,entidade_id,detalhes,usuario_id)
  values ('controles_dp_inicializados','rh_colaboradores',p_colaborador_id::text,
    jsonb_build_object('ferias_criadas',v_ferias,'checklists_criados',v_checklists),v_uid);
  return jsonb_build_object('ferias_criadas',v_ferias,'checklists_criados',v_checklists);
end;
$$;

create or replace function public.rh_ferias_salvar(
  p_id uuid,
  p_colaborador_id uuid,
  p_periodo_inicio date,
  p_periodo_fim date,
  p_limite_concessivo date,
  p_status text,
  p_inicio_gozo date default null,
  p_fim_gozo date default null,
  p_dias_gozados integer default 0,
  p_dias_abono integer default 0,
  p_observacao text default null
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare v_uid uuid:=auth.uid(); v_id uuid;
begin
  if v_uid is null or not public.tem_permissao('rh','administrar',v_uid) then
    raise exception 'Acesso negado para atualizar férias.' using errcode='42501';
  end if;
  if p_status not in ('a_conferir','pendente','programada','gozada','cancelada')
     or p_periodo_inicio is null or p_periodo_fim < p_periodo_inicio
     or p_limite_concessivo < p_periodo_fim then
    raise exception 'Dados do período de férias inválidos.' using errcode='22023';
  end if;
  insert into public.rh_ferias_periodos(id,colaborador_id,periodo_aquisitivo_inicio,
    periodo_aquisitivo_fim,limite_concessivo,status,inicio_gozo,fim_gozo,dias_gozados,
    dias_abono,observacao,atualizado_por,atualizado_em)
  values(coalesce(p_id,gen_random_uuid()),p_colaborador_id,p_periodo_inicio,p_periodo_fim,
    p_limite_concessivo,p_status,p_inicio_gozo,p_fim_gozo,coalesce(p_dias_gozados,0),
    coalesce(p_dias_abono,0),nullif(trim(p_observacao),''),v_uid,now())
  on conflict (id) do update set status=excluded.status,inicio_gozo=excluded.inicio_gozo,
    fim_gozo=excluded.fim_gozo,dias_gozados=excluded.dias_gozados,
    dias_abono=excluded.dias_abono,observacao=excluded.observacao,
    limite_concessivo=excluded.limite_concessivo,atualizado_por=v_uid,atualizado_em=now()
  returning id into v_id;
  insert into public.rh_auditoria(evento,entidade,entidade_id,detalhes,usuario_id)
  values('ferias_atualizadas','rh_ferias_periodos',v_id::text,jsonb_build_object('status',p_status),v_uid);
  return v_id;
end;
$$;

create or replace function public.rh_checklist_atualizar(p_id uuid,p_concluido boolean,p_observacao text default null)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare v_uid uuid:=auth.uid();
begin
  if v_uid is null or not public.tem_permissao('rh','administrar',v_uid) then
    raise exception 'Acesso negado para atualizar checklist.' using errcode='42501';
  end if;
  update public.rh_checklist_itens set concluido=coalesce(p_concluido,false),
    concluido_em=case when p_concluido then now() else null end,
    concluido_por=case when p_concluido then v_uid else null end,
    observacao=nullif(trim(p_observacao),''),atualizado_em=now()
  where id=p_id;
  if not found then raise exception 'Item de checklist não encontrado.' using errcode='P0002'; end if;
  return true;
end;
$$;

create or replace function public.rh_documento_salvar(
  p_id uuid,p_colaborador_id uuid,p_categoria text,p_descricao text,
  p_data_emissao date default null,p_data_vencimento date default null,
  p_alertar_dias_antes integer default 30,p_status text default 'vigente',p_observacao text default null
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare v_uid uuid:=auth.uid(); v_id uuid;
begin
  if v_uid is null or not public.tem_permissao('rh','administrar',v_uid) then
    raise exception 'Acesso negado para atualizar documentos.' using errcode='42501';
  end if;
  if p_categoria not in ('aso','experiencia','documento','certificado','outro')
     or nullif(trim(p_descricao),'') is null
     or p_status not in ('vigente','vencido','renovado','dispensado') then
    raise exception 'Dados do documento inválidos.' using errcode='22023';
  end if;
  insert into public.rh_documentos_controle(id,colaborador_id,categoria,descricao,data_emissao,
    data_vencimento,alertar_dias_antes,status,observacao,atualizado_por,atualizado_em)
  values(coalesce(p_id,gen_random_uuid()),p_colaborador_id,p_categoria,trim(p_descricao),p_data_emissao,
    p_data_vencimento,least(greatest(coalesce(p_alertar_dias_antes,30),0),365),p_status,
    nullif(trim(p_observacao),''),v_uid,now())
  on conflict (id) do update set categoria=excluded.categoria,descricao=excluded.descricao,
    data_emissao=excluded.data_emissao,data_vencimento=excluded.data_vencimento,
    alertar_dias_antes=excluded.alertar_dias_antes,status=excluded.status,
    observacao=excluded.observacao,atualizado_por=v_uid,atualizado_em=now()
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.rh_dp_painel(p_colaborador_id uuid default null)
returns jsonb
language plpgsql
security definer
stable
set search_path = pg_catalog, public
as $$
declare v_uid uuid:=auth.uid(); v_result jsonb;
begin
  if v_uid is null or not (public.tem_permissao('rh','ver_nomes',v_uid) or public.tem_permissao('rh','administrar',v_uid)) then
    raise exception 'Acesso negado aos controles de DP.' using errcode='42501';
  end if;
  select jsonb_build_object(
    'ferias',coalesce((select jsonb_agg(to_jsonb(q) order by q.limite_concessivo,q.nome) from (
      select f.*,c.nome,c.departamento,c.situacao,(f.limite_concessivo-current_date) dias_para_limite
      from public.rh_ferias_periodos f join public.rh_colaboradores c on c.id=f.colaborador_id
      where p_colaborador_id is null or c.id=p_colaborador_id) q),'[]'::jsonb),
    'checklists',coalesce((select jsonb_agg(to_jsonb(q) order by q.tipo,q.descricao) from (
      select i.*,c.nome from public.rh_checklist_itens i join public.rh_colaboradores c on c.id=i.colaborador_id
      where p_colaborador_id is null or c.id=p_colaborador_id) q),'[]'::jsonb),
    'documentos',coalesce((select jsonb_agg(to_jsonb(q) order by q.data_vencimento nulls last,q.nome) from (
      select d.*,c.nome,c.departamento,
        case when d.data_vencimento is null then null else d.data_vencimento-current_date end dias_para_vencer
      from public.rh_documentos_controle d join public.rh_colaboradores c on c.id=d.colaborador_id
      where p_colaborador_id is null or c.id=p_colaborador_id) q),'[]'::jsonb),
    'experiencia',coalesce((select jsonb_agg(to_jsonb(q) order by q.fim_experiencia) from (
      select c.id colaborador_id,c.nome,c.departamento,c.admissao,
        (c.admissao+89) fim_experiencia,(c.admissao+89-current_date) dias_para_fim
      from public.rh_colaboradores c where c.admissao is not null
        and lower(coalesce(c.situacao,'')) not in ('desligado','demitido')
        and (c.admissao+89) >= current_date-30
        and (p_colaborador_id is null or c.id=p_colaborador_id)) q),'[]'::jsonb),
    'envios',coalesce((select jsonb_agg(to_jsonb(q) order by q.enviado_em desc) from (
      select e.*,c.nome,cp.competencia from public.rh_holerites_envios e
      join public.rh_colaboradores c on c.id=e.colaborador_id
      join public.rh_competencias cp on cp.id=e.competencia_id
      where p_colaborador_id is null or c.id=p_colaborador_id limit 200) q),'[]'::jsonb)
  ) into v_result;
  return v_result;
end;
$$;

create or replace function public.rh_pode_enviar_holerite()
returns boolean
language sql
security definer
stable
set search_path = pg_catalog, public
as $$
  select auth.uid() is not null and (
    public.tem_permissao('rh','exportar',auth.uid()) or public.tem_permissao('rh','administrar',auth.uid()));
$$;

create or replace function public.rh_registrar_envio_holerite(
  p_competencia_id uuid,p_colaborador_id uuid,p_destinatario_email text,
  p_status text,p_provedor text default null,p_provedor_id text default null,p_detalhe text default null
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare v_uid uuid:=auth.uid(); v_id uuid;
begin
  if v_uid is null or not (public.tem_permissao('rh','exportar',v_uid) or public.tem_permissao('rh','administrar',v_uid)) then
    raise exception 'Acesso negado para registrar envio de holerite.' using errcode='42501';
  end if;
  if p_status not in ('enviado','erro') or nullif(lower(trim(p_destinatario_email)),'') is null then
    raise exception 'Dados do envio inválidos.' using errcode='22023';
  end if;
  if not exists(select 1 from public.rh_folha_colaboradores where competencia_id=p_competencia_id and colaborador_id=p_colaborador_id) then
    raise exception 'Folha individual não encontrada na competência.' using errcode='P0002';
  end if;
  insert into public.rh_holerites_envios(competencia_id,colaborador_id,destinatario_email,status,
    provedor,provedor_id,detalhe,enviado_por)
  values(p_competencia_id,p_colaborador_id,lower(trim(p_destinatario_email)),p_status,
    nullif(trim(p_provedor),''),nullif(trim(p_provedor_id),''),left(nullif(trim(p_detalhe),''),500),v_uid)
  returning id into v_id;
  insert into public.rh_auditoria(evento,entidade,entidade_id,detalhes,usuario_id)
  values('holerite_'||p_status,'rh_holerites_envios',v_id::text,
    jsonb_build_object('competencia_id',p_competencia_id,'colaborador_id',p_colaborador_id,
      'destinatario',lower(trim(p_destinatario_email)),'provedor_id',p_provedor_id),v_uid);
  return v_id;
end;
$$;

create or replace function public.rh_confirmar_recebimento_holerite(p_envio_id uuid)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare v_uid uuid:=auth.uid();
begin
  if v_uid is null or not public.tem_permissao('rh','administrar',v_uid) then
    raise exception 'Acesso negado para confirmar recebimento.' using errcode='42501';
  end if;
  update public.rh_holerites_envios set status='confirmado',confirmado_em=now(),atualizado_em=now()
  where id=p_envio_id and status='enviado';
  if not found then raise exception 'Envio não encontrado ou já confirmado.' using errcode='P0002'; end if;
  return true;
end;
$$;

revoke all on function public.rh_inicializar_controles_colaborador(uuid) from public,anon,authenticated;
revoke all on function public.rh_ferias_salvar(uuid,uuid,date,date,date,text,date,date,integer,integer,text) from public,anon,authenticated;
revoke all on function public.rh_checklist_atualizar(uuid,boolean,text) from public,anon,authenticated;
revoke all on function public.rh_documento_salvar(uuid,uuid,text,text,date,date,integer,text,text) from public,anon,authenticated;
revoke all on function public.rh_dp_painel(uuid) from public,anon,authenticated;
revoke all on function public.rh_pode_enviar_holerite() from public,anon,authenticated;
revoke all on function public.rh_registrar_envio_holerite(uuid,uuid,text,text,text,text,text) from public,anon,authenticated;
revoke all on function public.rh_confirmar_recebimento_holerite(uuid) from public,anon,authenticated;
grant execute on function public.rh_inicializar_controles_colaborador(uuid) to authenticated;
grant execute on function public.rh_ferias_salvar(uuid,uuid,date,date,date,text,date,date,integer,integer,text) to authenticated;
grant execute on function public.rh_checklist_atualizar(uuid,boolean,text) to authenticated;
grant execute on function public.rh_documento_salvar(uuid,uuid,text,text,date,date,integer,text,text) to authenticated;
grant execute on function public.rh_dp_painel(uuid) to authenticated;
grant execute on function public.rh_pode_enviar_holerite() to authenticated;
grant execute on function public.rh_registrar_envio_holerite(uuid,uuid,text,text,text,text,text) to authenticated;
grant execute on function public.rh_confirmar_recebimento_holerite(uuid) to authenticated;

comment on table public.rh_ferias_periodos is 'Livro de férias por período aquisitivo; registros automáticos iniciam como a conferir.';
comment on table public.rh_holerites_envios is 'Histórico auditável de envio e confirmação de holerites.';
