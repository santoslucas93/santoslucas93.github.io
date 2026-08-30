-- Corrige a ponte de permissão do RPC e sincroniza o quadro atual do RH/Folha.
-- Folhas fechadas, snapshots, históricos e rateios permanecem intocados.

create or replace function private.atualizar_status_colaboradores_lote_impl(
  p_uid uuid,
  p_master_ids uuid[],
  p_status text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ids uuid[];
  v_qtd integer;
  v_rh_qtd integer;
begin
  if p_uid is null then
    raise exception 'Sessão inválida.';
  end if;
  if p_status not in ('Ativo','Desligado') then
    raise exception 'Status inválido.';
  end if;
  if not (
    public.tem_permissao('beneficios','editar',p_uid)
    or public.tem_permissao('beneficios','administrar',p_uid)
  ) then
    raise exception 'Sem permissão para alterar colaboradores.';
  end if;

  select array_agg(distinct coalesce(cm.merged_into_id,cm.id))
    into v_ids
  from public.colaboradores_master cm
  where cm.id = any(p_master_ids);

  if coalesce(array_length(v_ids,1),0)=0 then
    raise exception 'Nenhum colaborador válido foi informado.';
  end if;

  update public.colaboradores_master
  set status=p_status,updated_by=p_uid,updated_at=now()
  where id=any(v_ids) and merged_into_id is null;
  get diagnostics v_qtd=row_count;

  update public.rh_colaboradores rc
  set
    situacao=case when p_status='Ativo' then 'Trabalhando' else 'Desligado' end,
    desligamento=case when p_status='Ativo' then null else coalesce(rc.desligamento,current_date) end,
    desligamento_origem=case when p_status='Ativo' then null else 'central_colaboradores' end,
    atualizado_em=now()
  from public.colaboradores_master cm
  where cm.id=any(v_ids)
    and cm.rh_colaborador_id=rc.id
    and cm.merged_into_id is null;
  get diagnostics v_rh_qtd=row_count;

  perform private.sincronizar_status_beneficios_colaboradores(v_ids);

  return jsonb_build_object(
    'atualizados',v_qtd,
    'rh_atualizados',v_rh_qtd,
    'status',p_status
  );
end;
$$;

revoke all on function private.atualizar_status_colaboradores_lote_impl(uuid,uuid[],text)
  from public,anon,authenticated;

create or replace function public.atualizar_status_colaboradores_lote(
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

revoke all on function public.atualizar_status_colaboradores_lote(uuid[],text)
  from public,anon,authenticated;
grant execute on function public.atualizar_status_colaboradores_lote(uuid[],text)
  to authenticated;
