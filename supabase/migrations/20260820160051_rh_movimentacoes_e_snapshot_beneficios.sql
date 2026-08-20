alter table public.rh_folha_colaboradores
  add column if not exists departamento_snapshot text,
  add column if not exists vinculo_snapshot text,
  add column if not exists cargo_snapshot text,
  add column if not exists situacao_snapshot text,
  add column if not exists centro_custo_snapshot text,
  add column if not exists admissao_snapshot date;

update public.rh_folha_colaboradores f
set departamento_snapshot = coalesce(f.departamento_snapshot,c.departamento),
    vinculo_snapshot = coalesce(f.vinculo_snapshot,c.vinculo),
    cargo_snapshot = coalesce(f.cargo_snapshot,c.cargo),
    situacao_snapshot = coalesce(f.situacao_snapshot,c.situacao),
    centro_custo_snapshot = coalesce(f.centro_custo_snapshot,c.centro_custo),
    admissao_snapshot = coalesce(f.admissao_snapshot,c.admissao)
from public.rh_colaboradores c
where c.id=f.colaborador_id;

create or replace function public.rh_preencher_snapshot_folha()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare v public.rh_colaboradores%rowtype;
begin
  select * into v from public.rh_colaboradores where id=new.colaborador_id;
  if found then
    new.departamento_snapshot := coalesce(new.departamento_snapshot,v.departamento);
    new.vinculo_snapshot := coalesce(new.vinculo_snapshot,v.vinculo);
    new.cargo_snapshot := coalesce(new.cargo_snapshot,v.cargo);
    new.situacao_snapshot := coalesce(new.situacao_snapshot,v.situacao);
    new.centro_custo_snapshot := coalesce(new.centro_custo_snapshot,v.centro_custo);
    new.admissao_snapshot := coalesce(new.admissao_snapshot,v.admissao);
  end if;
  return new;
end;
$$;

drop trigger if exists rh_folha_snapshot_biu on public.rh_folha_colaboradores;
create trigger rh_folha_snapshot_biu
before insert or update of colaborador_id on public.rh_folha_colaboradores
for each row execute function public.rh_preencher_snapshot_folha();

create table if not exists public.rh_beneficios_snapshots (
  id uuid primary key default gen_random_uuid(),
  competencia_id uuid not null references public.rh_competencias(id) on delete cascade,
  colaborador_id uuid references public.rh_colaboradores(id),
  matricula text not null,
  nome text not null,
  seguro_vida numeric(14,2) not null default 0,
  assistencia_medica numeric(14,2) not null default 0,
  vr_va_cesta numeric(14,2) not null default 0,
  vale_transporte numeric(14,2) not null default 0,
  total numeric(14,2) not null default 0,
  completo boolean not null default false,
  detalhes jsonb not null default '{}'::jsonb,
  snapshot_por uuid references public.profiles(id),
  snapshot_em timestamptz not null default now(),
  unique (competencia_id, matricula)
);

create index if not exists rh_beneficios_snapshots_comp_idx on public.rh_beneficios_snapshots(competencia_id);
alter table public.rh_beneficios_snapshots enable row level security;
revoke all on public.rh_beneficios_snapshots from public, anon, authenticated;
grant select on public.rh_beneficios_snapshots to authenticated;

drop policy if exists "rh beneficios snapshot leitura autorizada" on public.rh_beneficios_snapshots;
create policy "rh beneficios snapshot leitura autorizada" on public.rh_beneficios_snapshots
for select to authenticated
using ((select public.tem_permissao('rh','visualizar')));

create or replace function public.rh_salvar_snapshot_beneficios(p_competencia_id uuid,p_itens jsonb,p_completo boolean default false)
returns numeric
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_uid uuid:=auth.uid();
  v_item jsonb;
  v_total numeric(14,2):=0;
  v_colaborador uuid;
  v_status text;
begin
  if v_uid is null or not public.tem_permissao('rh','administrar',v_uid) then
    raise exception 'Acesso negado para salvar snapshot de beneficios.' using errcode='42501';
  end if;
  select status into v_status from public.rh_competencias where id=p_competencia_id for update;
  if not found then raise exception 'Competencia nao encontrada.' using errcode='P0002'; end if;
  if v_status='fechado' then raise exception 'Competencia fechada nao pode ter beneficios alterados.' using errcode='55000'; end if;
  if jsonb_typeof(p_itens)<>'array' then raise exception 'Itens de beneficios invalidos.' using errcode='22023'; end if;

  delete from public.rh_beneficios_snapshots where competencia_id=p_competencia_id;
  for v_item in select value from jsonb_array_elements(p_itens) loop
    select id into v_colaborador from public.rh_colaboradores where matricula=nullif(trim(v_item->>'matricula'),'') limit 1;
    insert into public.rh_beneficios_snapshots(
      competencia_id,colaborador_id,matricula,nome,seguro_vida,assistencia_medica,vr_va_cesta,vale_transporte,total,completo,detalhes,snapshot_por
    ) values (
      p_competencia_id,v_colaborador,coalesce(nullif(trim(v_item->>'matricula'),''),'SEM-MATRICULA'),coalesce(nullif(trim(v_item->>'nome'),''),'Nao identificado'),
      coalesce((v_item->>'seguro_vida')::numeric,0),coalesce((v_item->>'assistencia_medica')::numeric,0),coalesce((v_item->>'vr_va_cesta')::numeric,0),coalesce((v_item->>'vale_transporte')::numeric,0),
      coalesce((v_item->>'total')::numeric,0),p_completo,coalesce(v_item->'detalhes','{}'::jsonb),v_uid
    );
    v_total:=v_total+coalesce((v_item->>'total')::numeric,0);
  end loop;

  update public.rh_competencias
  set resumo=jsonb_set(
        jsonb_set(coalesce(resumo,'{}'::jsonb),'{beneficios_total}',to_jsonb(v_total),true),
        '{beneficios}',jsonb_build_object('total',v_total,'completo',p_completo,'snapshot_em',now()),true
      ), atualizado_em=now()
  where id=p_competencia_id;

  insert into public.rh_auditoria(evento,entidade,entidade_id,detalhes,usuario_id)
  values('beneficios_snapshot_salvo','rh_competencias',p_competencia_id::text,jsonb_build_object('total',v_total,'completo',p_completo,'itens',jsonb_array_length(p_itens)),v_uid);
  return v_total;
end;
$$;
revoke all on function public.rh_salvar_snapshot_beneficios(uuid,jsonb,boolean) from public,anon;
grant execute on function public.rh_salvar_snapshot_beneficios(uuid,jsonb,boolean) to authenticated;

comment on table public.rh_beneficios_snapshots is 'Fotografia mensal dos beneficios usada no Custo Real historico.';