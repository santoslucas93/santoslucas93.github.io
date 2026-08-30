-- Mantém o RPC público como SECURITY INVOKER.
-- O executor privilegiado fica no schema privado e valida auth.uid + permissões.

create or replace function private.atualizar_status_colaboradores_lote_seguro(
  p_master_ids uuid[],
  p_status text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid:=auth.uid();
begin
  if v_uid is null then
    raise exception 'Sessão inválida.';
  end if;
  if not (
    public.tem_permissao('beneficios','editar',v_uid)
    or public.tem_permissao('beneficios','administrar',v_uid)
  ) then
    raise exception 'Sem permissão para alterar colaboradores.';
  end if;
  return private.atualizar_status_colaboradores_lote_impl(v_uid,p_master_ids,p_status);
end;
$$;

revoke all on function private.atualizar_status_colaboradores_lote_seguro(uuid[],text)
  from public,anon,authenticated;
grant usage on schema private to authenticated;
grant execute on function private.atualizar_status_colaboradores_lote_seguro(uuid[],text)
  to authenticated;

create or replace function public.atualizar_status_colaboradores_lote(
  p_master_ids uuid[],
  p_status text
)
returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select private.atualizar_status_colaboradores_lote_seguro(p_master_ids,p_status);
$$;

revoke all on function public.atualizar_status_colaboradores_lote(uuid[],text)
  from public,anon,authenticated;
grant execute on function public.atualizar_status_colaboradores_lote(uuid[],text)
  to authenticated;
