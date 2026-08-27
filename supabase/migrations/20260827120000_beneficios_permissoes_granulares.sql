-- Beneficios: substitui a autorizacao de escrita vinculada a um e-mail
-- legado pelas permissoes granulares ja administradas no Painel Central.

create or replace function public.beneficios_recurso_estado(p_chave text)
returns text
language sql
immutable
set search_path = pg_catalog, public
as $$
  select case
    when p_chave like 'liga_med_%' then 'beneficios.med'
    when p_chave like 'liga_prud_%' then 'beneficios.prud'
    when p_chave like 'liga_vt_%' then 'beneficios.vt'
    when p_chave like 'liga_mob_%' then 'beneficios.mob'
    when p_chave in ('liga_cfg','liga_avulsos','liga_hist') then 'beneficios.vr'
    else 'beneficios'
  end
$$;

revoke all on function public.beneficios_recurso_estado(text) from public;
grant execute on function public.beneficios_recurso_estado(text) to authenticated, service_role;

drop policy if exists "escrita admin insert" on public.ben_state;
drop policy if exists "escrita admin update" on public.ben_state;
drop policy if exists "escrita admin delete" on public.ben_state;

create policy "escrita granular insert"
on public.ben_state for insert to authenticated
with check (
  (select auth.email()) = 'admin-beneficios@painel-lnb.local'
  or (select public.tem_permissao(public.beneficios_recurso_estado(chave), 'criar'))
  or (select public.tem_permissao(public.beneficios_recurso_estado(chave), 'importar'))
  or (select public.tem_permissao(public.beneficios_recurso_estado(chave), 'administrar'))
);

create policy "escrita granular update"
on public.ben_state for update to authenticated
using (
  (select auth.email()) = 'admin-beneficios@painel-lnb.local'
  or (select public.tem_permissao(public.beneficios_recurso_estado(chave), 'editar'))
  or (select public.tem_permissao(public.beneficios_recurso_estado(chave), 'administrar'))
)
with check (
  (select auth.email()) = 'admin-beneficios@painel-lnb.local'
  or (select public.tem_permissao(public.beneficios_recurso_estado(chave), 'editar'))
  or (select public.tem_permissao(public.beneficios_recurso_estado(chave), 'administrar'))
);

create policy "escrita granular delete"
on public.ben_state for delete to authenticated
using (
  (select auth.email()) = 'admin-beneficios@painel-lnb.local'
  or (select public.tem_permissao(public.beneficios_recurso_estado(chave), 'excluir'))
  or (select public.tem_permissao(public.beneficios_recurso_estado(chave), 'administrar'))
);

drop policy if exists "escrita admin insert" on public.mob_corridas;
drop policy if exists "escrita admin update" on public.mob_corridas;
drop policy if exists "escrita admin delete" on public.mob_corridas;

create policy "escrita granular insert"
on public.mob_corridas for insert to authenticated
with check (
  (select auth.email()) = 'admin-beneficios@painel-lnb.local'
  or (select public.tem_permissao('beneficios.mob', 'criar'))
  or (select public.tem_permissao('beneficios.mob', 'importar'))
  or (select public.tem_permissao('beneficios.mob', 'administrar'))
);

create policy "escrita granular update"
on public.mob_corridas for update to authenticated
using (
  (select auth.email()) = 'admin-beneficios@painel-lnb.local'
  or (select public.tem_permissao('beneficios.mob', 'editar'))
  or (select public.tem_permissao('beneficios.mob', 'administrar'))
)
with check (
  (select auth.email()) = 'admin-beneficios@painel-lnb.local'
  or (select public.tem_permissao('beneficios.mob', 'editar'))
  or (select public.tem_permissao('beneficios.mob', 'administrar'))
);

create policy "escrita granular delete"
on public.mob_corridas for delete to authenticated
using (
  (select auth.email()) = 'admin-beneficios@painel-lnb.local'
  or (select public.tem_permissao('beneficios.mob', 'excluir'))
  or (select public.tem_permissao('beneficios.mob', 'administrar'))
);
