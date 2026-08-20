-- RH & Folha — Administração de Pessoal
-- Dados sensíveis: somente CPF mascarado é persistido. O arquivo original não é armazenado.

create table if not exists public.rh_competencias (
  id uuid primary key default gen_random_uuid(),
  competencia date not null,
  empresa_codigo text not null,
  empresa_nome text not null,
  cnpj_mascarado text,
  tipo_calculo text not null default 'Folha mensal',
  fonte text not null check (fonte in ('pdf', 'excel', 'manual')),
  arquivo_nome text,
  arquivo_hash text,
  status text not null default 'processado' check (status in ('rascunho', 'processado', 'conciliado', 'arquivado')),
  proventos numeric(14,2) not null default 0,
  descontos numeric(14,2) not null default 0,
  liquido numeric(14,2) not null default 0,
  base_inss numeric(14,2) not null default 0,
  base_fgts numeric(14,2) not null default 0,
  valor_fgts numeric(14,2) not null default 0,
  base_irrf numeric(14,2) not null default 0,
  encargos jsonb not null default '{}'::jsonb,
  resumo jsonb not null default '{}'::jsonb,
  validacoes jsonb not null default '[]'::jsonb,
  importado_por uuid references public.profiles(id),
  importado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (empresa_codigo, competencia, tipo_calculo)
);

create table if not exists public.rh_colaboradores (
  id uuid primary key default gen_random_uuid(),
  matricula text not null unique,
  nome text not null,
  cpf_mascarado text,
  admissao date,
  vinculo text,
  cargo text,
  cbo text,
  centro_custo text,
  departamento text,
  filial text,
  situacao text,
  atualizado_em timestamptz not null default now()
);

create table if not exists public.rh_folha_colaboradores (
  id uuid primary key default gen_random_uuid(),
  competencia_id uuid not null references public.rh_competencias(id) on delete cascade,
  colaborador_id uuid not null references public.rh_colaboradores(id),
  horas_mes numeric(10,2),
  salario numeric(14,2) not null default 0,
  proventos numeric(14,2) not null default 0,
  descontos numeric(14,2) not null default 0,
  liquido numeric(14,2) not null default 0,
  informativa numeric(14,2) not null default 0,
  base_inss numeric(14,2) not null default 0,
  excedente_inss numeric(14,2) not null default 0,
  base_fgts numeric(14,2) not null default 0,
  valor_fgts numeric(14,2) not null default 0,
  base_irrf numeric(14,2) not null default 0,
  observacao text,
  unique (competencia_id, colaborador_id)
);

create table if not exists public.rh_lancamentos (
  id bigint generated always as identity primary key,
  competencia_id uuid not null references public.rh_competencias(id) on delete cascade,
  folha_colaborador_id uuid not null references public.rh_folha_colaboradores(id) on delete cascade,
  rubrica_codigo text,
  rubrica_nome text not null,
  referencia numeric(12,4),
  valor numeric(14,2) not null default 0,
  tipo text not null check (tipo in ('provento', 'desconto', 'informativa'))
);

create table if not exists public.rh_auditoria (
  id bigint generated always as identity primary key,
  evento text not null,
  entidade text not null,
  entidade_id text,
  detalhes jsonb not null default '{}'::jsonb,
  usuario_id uuid references public.profiles(id),
  criado_em timestamptz not null default now()
);

create index if not exists rh_competencias_competencia_idx on public.rh_competencias (competencia desc);
create index if not exists rh_colaboradores_nome_idx on public.rh_colaboradores (nome);
create index if not exists rh_folha_competencia_idx on public.rh_folha_colaboradores (competencia_id);
create index if not exists rh_folha_colaborador_idx on public.rh_folha_colaboradores (colaborador_id);
create index if not exists rh_lancamentos_competencia_idx on public.rh_lancamentos (competencia_id);
create index if not exists rh_lancamentos_folha_idx on public.rh_lancamentos (folha_colaborador_id);
create index if not exists rh_lancamentos_rubrica_idx on public.rh_lancamentos (rubrica_codigo);
create index if not exists rh_auditoria_criado_idx on public.rh_auditoria (criado_em desc);

alter table public.rh_competencias enable row level security;
alter table public.rh_colaboradores enable row level security;
alter table public.rh_folha_colaboradores enable row level security;
alter table public.rh_lancamentos enable row level security;
alter table public.rh_auditoria enable row level security;

drop policy if exists "rh competencias leitura autorizada" on public.rh_competencias;
create policy "rh competencias leitura autorizada" on public.rh_competencias
  for select to authenticated
  using ((select public.tem_permissao('rh', 'visualizar')));

drop policy if exists "rh colaboradores nomes autorizados" on public.rh_colaboradores;
create policy "rh colaboradores nomes autorizados" on public.rh_colaboradores
  for select to authenticated
  using ((select public.tem_permissao('rh', 'ver_nomes')));

drop policy if exists "rh folha individual autorizada" on public.rh_folha_colaboradores;
create policy "rh folha individual autorizada" on public.rh_folha_colaboradores
  for select to authenticated
  using ((select public.tem_permissao('rh', 'ver_valores_individuais')));

drop policy if exists "rh lancamentos individuais autorizados" on public.rh_lancamentos;
create policy "rh lancamentos individuais autorizados" on public.rh_lancamentos
  for select to authenticated
  using ((select public.tem_permissao('rh', 'ver_valores_individuais')));

drop policy if exists "rh auditoria administradores" on public.rh_auditoria;
create policy "rh auditoria administradores" on public.rh_auditoria
  for select to authenticated
  using ((select public.tem_permissao('rh', 'administrar')));

revoke all on public.rh_competencias, public.rh_colaboradores, public.rh_folha_colaboradores, public.rh_lancamentos, public.rh_auditoria from public, anon, authenticated;
grant select on public.rh_competencias, public.rh_colaboradores, public.rh_folha_colaboradores, public.rh_lancamentos to authenticated;
grant select on public.rh_auditoria to authenticated;

insert into public.recursos (id, nome, descricao, icone, categoria, tipo, ordem, ativo)
values ('rh', 'RH & Folha', 'Folha e Administracao de Pessoal', '👥', 'pessoas', 'modulo', 3, true)
on conflict (id) do update set
  nome = excluded.nome,
  descricao = excluded.descricao,
  icone = excluded.icone,
  categoria = excluded.categoria,
  tipo = excluded.tipo,
  ordem = excluded.ordem,
  ativo = true;

insert into public.recurso_acoes (recurso_id, acao, rotulo, ordem) values
  ('rh', 'visualizar', 'Visualizar o modulo', 1),
  ('rh', 'importar', 'Importar folha', 2),
  ('rh', 'exportar', 'Exportar relatorios', 3),
  ('rh', 'ver_valores', 'Ver valores consolidados', 20),
  ('rh', 'ver_nomes', 'Ver nomes de colaboradores', 21),
  ('rh', 'ver_valores_individuais', 'Ver valores individuais', 22),
  ('rh', 'administrar', 'Administrar o modulo', 30)
on conflict (recurso_id, acao) do update set rotulo = excluded.rotulo, ordem = excluded.ordem;

-- O perfil Administrativo & Financeiro recebe somente leitura/exportacao.
insert into public.perfil_permissoes (perfil_id, recurso_id, acao, permitido) values
  ('supervisor-af', 'rh', 'visualizar', true),
  ('supervisor-af', 'rh', 'exportar', true),
  ('supervisor-af', 'rh', 'ver_valores', true),
  ('supervisor-af', 'rh', 'ver_nomes', true),
  ('supervisor-af', 'rh', 'ver_valores_individuais', true)
on conflict (perfil_id, recurso_id, acao) do update set permitido = excluded.permitido;

create or replace function public.rh_importar_folha(p_payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_uid uuid := auth.uid();
  v_meta jsonb := coalesce(p_payload -> 'meta', '{}'::jsonb);
  v_resumo jsonb := coalesce(p_payload -> 'resumo', '{}'::jsonb);
  v_item jsonb;
  v_lanc jsonb;
  v_competencia_id uuid;
  v_colaborador_id uuid;
  v_folha_id uuid;
  v_competencia date;
  v_empresa_codigo text;
  v_tipo_calculo text;
  v_cpf_digitos text;
  v_cpf_mascarado text;
  v_qtd integer := 0;
begin
  if v_uid is null or not (
    public.tem_permissao('rh', 'importar', v_uid)
    or public.tem_permissao('rh', 'administrar', v_uid)
  ) then
    raise exception 'Acesso negado para importar folha.' using errcode = '42501';
  end if;

  if jsonb_typeof(p_payload -> 'colaboradores') <> 'array' then
    raise exception 'O arquivo nao possui uma lista valida de colaboradores.' using errcode = '22023';
  end if;

  v_competencia := nullif(v_meta ->> 'competencia', '')::date;
  v_empresa_codigo := nullif(trim(v_meta ->> 'empresa_codigo'), '');
  v_tipo_calculo := coalesce(nullif(trim(v_meta ->> 'tipo_calculo'), ''), 'Folha mensal');
  if v_competencia is null or v_empresa_codigo is null then
    raise exception 'Competencia e codigo da empresa sao obrigatorios.' using errcode = '22023';
  end if;

  insert into public.rh_competencias (
    competencia, empresa_codigo, empresa_nome, cnpj_mascarado, tipo_calculo,
    fonte, arquivo_nome, arquivo_hash, status,
    proventos, descontos, liquido, base_inss, base_fgts, valor_fgts, base_irrf,
    encargos, resumo, validacoes, importado_por, importado_em, atualizado_em
  ) values (
    v_competencia,
    v_empresa_codigo,
    coalesce(nullif(trim(v_meta ->> 'empresa_nome'), ''), 'Empresa nao identificada'),
    nullif(v_meta ->> 'cnpj_mascarado', ''),
    v_tipo_calculo,
    coalesce(nullif(v_meta ->> 'fonte', ''), 'manual'),
    nullif(v_meta ->> 'arquivo_nome', ''),
    nullif(v_meta ->> 'arquivo_hash', ''),
    'processado',
    coalesce((v_resumo ->> 'proventos')::numeric, 0),
    coalesce((v_resumo ->> 'descontos')::numeric, 0),
    coalesce((v_resumo ->> 'liquido')::numeric, 0),
    coalesce((v_resumo ->> 'base_inss')::numeric, 0),
    coalesce((v_resumo ->> 'base_fgts')::numeric, 0),
    coalesce((v_resumo ->> 'valor_fgts')::numeric, 0),
    coalesce((v_resumo ->> 'base_irrf')::numeric, 0),
    coalesce(p_payload -> 'encargos', '{}'::jsonb),
    v_resumo,
    coalesce(p_payload -> 'validacoes', '[]'::jsonb),
    v_uid, now(), now()
  )
  on conflict (empresa_codigo, competencia, tipo_calculo) do update set
    empresa_nome = excluded.empresa_nome,
    cnpj_mascarado = excluded.cnpj_mascarado,
    fonte = excluded.fonte,
    arquivo_nome = excluded.arquivo_nome,
    arquivo_hash = excluded.arquivo_hash,
    status = excluded.status,
    proventos = excluded.proventos,
    descontos = excluded.descontos,
    liquido = excluded.liquido,
    base_inss = excluded.base_inss,
    base_fgts = excluded.base_fgts,
    valor_fgts = excluded.valor_fgts,
    base_irrf = excluded.base_irrf,
    encargos = excluded.encargos,
    resumo = excluded.resumo,
    validacoes = excluded.validacoes,
    importado_por = excluded.importado_por,
    importado_em = excluded.importado_em,
    atualizado_em = excluded.atualizado_em
  returning id into v_competencia_id;

  delete from public.rh_folha_colaboradores where competencia_id = v_competencia_id;

  for v_item in select value from jsonb_array_elements(p_payload -> 'colaboradores') loop
    if nullif(trim(v_item ->> 'matricula'), '') is null or nullif(trim(v_item ->> 'nome'), '') is null then
      raise exception 'Colaborador sem matricula ou nome.' using errcode = '22023';
    end if;

    v_cpf_digitos := regexp_replace(coalesce(v_item ->> 'cpf', v_item ->> 'cpf_mascarado', ''), '[^0-9]', '', 'g');
    v_cpf_mascarado := case when length(v_cpf_digitos) = 11 then '***.***.***-' || right(v_cpf_digitos, 2) else null end;

    insert into public.rh_colaboradores (
      matricula, nome, cpf_mascarado, admissao, vinculo, cargo, cbo,
      centro_custo, departamento, filial, situacao, atualizado_em
    ) values (
      trim(v_item ->> 'matricula'), trim(v_item ->> 'nome'), v_cpf_mascarado,
      nullif(v_item ->> 'admissao', '')::date, nullif(v_item ->> 'vinculo', ''),
      nullif(v_item ->> 'cargo', ''), nullif(v_item ->> 'cbo', ''),
      nullif(v_item ->> 'centro_custo', ''), nullif(v_item ->> 'departamento', ''),
      nullif(v_item ->> 'filial', ''), nullif(v_item ->> 'situacao', ''), now()
    )
    on conflict (matricula) do update set
      nome = excluded.nome,
      cpf_mascarado = excluded.cpf_mascarado,
      admissao = excluded.admissao,
      vinculo = excluded.vinculo,
      cargo = excluded.cargo,
      cbo = excluded.cbo,
      centro_custo = excluded.centro_custo,
      departamento = excluded.departamento,
      filial = excluded.filial,
      situacao = excluded.situacao,
      atualizado_em = now()
    returning id into v_colaborador_id;

    insert into public.rh_folha_colaboradores (
      competencia_id, colaborador_id, horas_mes, salario, proventos, descontos,
      liquido, informativa, base_inss, excedente_inss, base_fgts, valor_fgts,
      base_irrf, observacao
    ) values (
      v_competencia_id, v_colaborador_id,
      nullif(v_item ->> 'horas_mes', '')::numeric,
      coalesce((v_item ->> 'salario')::numeric, 0),
      coalesce((v_item ->> 'proventos')::numeric, 0),
      coalesce((v_item ->> 'descontos')::numeric, 0),
      coalesce((v_item ->> 'liquido')::numeric, 0),
      coalesce((v_item ->> 'informativa')::numeric, 0),
      coalesce((v_item ->> 'base_inss')::numeric, 0),
      coalesce((v_item ->> 'excedente_inss')::numeric, 0),
      coalesce((v_item ->> 'base_fgts')::numeric, 0),
      coalesce((v_item ->> 'valor_fgts')::numeric, 0),
      coalesce((v_item ->> 'base_irrf')::numeric, 0),
      nullif(v_item ->> 'observacao', '')
    ) returning id into v_folha_id;

    for v_lanc in select value from jsonb_array_elements(coalesce(v_item -> 'lancamentos', '[]'::jsonb)) loop
      insert into public.rh_lancamentos (
        competencia_id, folha_colaborador_id, rubrica_codigo, rubrica_nome, referencia, valor, tipo
      ) values (
        v_competencia_id, v_folha_id,
        nullif(trim(v_lanc ->> 'codigo'), ''),
        coalesce(nullif(trim(v_lanc ->> 'nome'), ''), 'Rubrica nao identificada'),
        nullif(v_lanc ->> 'referencia', '')::numeric,
        coalesce((v_lanc ->> 'valor')::numeric, 0),
        case upper(coalesce(v_lanc ->> 'tipo', 'I'))
          when 'P' then 'provento'
          when 'D' then 'desconto'
          else 'informativa'
        end
      );
    end loop;

    v_qtd := v_qtd + 1;
  end loop;

  insert into public.rh_auditoria (evento, entidade, entidade_id, detalhes, usuario_id)
  values (
    'importacao_concluida', 'rh_competencias', v_competencia_id::text,
    jsonb_build_object('competencia', v_competencia, 'fonte', v_meta ->> 'fonte', 'colaboradores', v_qtd),
    v_uid
  );

  return v_competencia_id;
end;
$$;

revoke all on function public.rh_importar_folha(jsonb) from public, anon;
grant execute on function public.rh_importar_folha(jsonb) to authenticated;

create or replace function public.rh_excluir_competencia(p_competencia_id uuid)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null or not public.tem_permissao('rh', 'administrar', v_uid) then
    raise exception 'Acesso negado para excluir competencia.' using errcode = '42501';
  end if;
  insert into public.rh_auditoria (evento, entidade, entidade_id, usuario_id)
  values ('competencia_excluida', 'rh_competencias', p_competencia_id::text, v_uid);
  delete from public.rh_competencias where id = p_competencia_id;
  return found;
end;
$$;

revoke all on function public.rh_excluir_competencia(uuid) from public, anon;
grant execute on function public.rh_excluir_competencia(uuid) to authenticated;

comment on table public.rh_competencias is 'Cabecalho e totais consolidados de cada competencia de folha.';
comment on table public.rh_colaboradores is 'Cadastro historico de colaboradores. CPF completo nunca e persistido.';
comment on table public.rh_folha_colaboradores is 'Composicao individual por colaborador e competencia.';
comment on table public.rh_lancamentos is 'Rubricas da folha vinculadas ao colaborador e a competencia.';
comment on function public.rh_importar_folha(jsonb) is 'Importacao atomica de PDF/Excel validada por permissao do modulo RH.';
