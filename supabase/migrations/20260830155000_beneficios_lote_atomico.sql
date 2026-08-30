-- Corrige a alteração de benefícios em massa com uma única transação.
-- Não altera snapshots nem executa exclusão física.

create or replace function private.atualizar_beneficios_colaboradores_lote_impl(
  p_actor uuid,
  p_master_ids uuid[],
  p_cesta boolean default null,
  p_vt boolean default null,
  p_vrva boolean default null,
  p_saude boolean default null,
  p_seguro boolean default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_solicitados integer;
  v_distintos integer;
  v_encontrados integer;
  v_com_rh integer := 0;
  v_master_atualizados integer := 0;
  v_rh_atualizados integer := 0;
  v_actor_text text;
  v_campos text[];
begin
  if p_actor is null or auth.uid() is null or auth.uid() is distinct from p_actor then
    raise exception 'Sessão inválida para alteração de benefícios.'
      using errcode = '42501';
  end if;

  if not (
    public.tem_permissao('beneficios', 'editar')
    or public.tem_permissao('beneficios', 'administrar')
  ) then
    raise exception 'Usuário sem permissão para editar benefícios.'
      using errcode = '42501';
  end if;

  v_solicitados := coalesce(cardinality(p_master_ids), 0);
  if v_solicitados = 0 then
    raise exception 'Selecione ao menos um colaborador.'
      using errcode = '22023';
  end if;
  if v_solicitados > 500 then
    raise exception 'O lote excede o limite de 500 colaboradores.'
      using errcode = '22023';
  end if;

  select count(distinct u.id)
    into v_distintos
  from unnest(p_master_ids) as u(id);

  if v_distintos <> v_solicitados then
    raise exception 'O lote contém colaboradores duplicados.'
      using errcode = '22023';
  end if;

  if p_cesta is null and p_vt is null and p_vrva is null
     and p_saude is null and p_seguro is null then
    raise exception 'Informe ao menos um benefício para alterar.'
      using errcode = '22023';
  end if;

  select count(*), count(rh_colaborador_id)
    into v_encontrados, v_com_rh
  from public.colaboradores_master
  where id = any(p_master_ids);

  if v_encontrados <> v_solicitados then
    raise exception 'Um ou mais colaboradores do lote não foram encontrados.'
      using errcode = 'P0002';
  end if;

  if p_cesta is not null then
    update public.colaboradores_master
       set is_cesta_basica_elegivel = p_cesta,
           updated_by = p_actor
     where id = any(p_master_ids);
    get diagnostics v_master_atualizados = row_count;
    v_campos := array_append(v_campos, 'Cesta Básica=' || case when p_cesta then 'Sim' else 'Não' end);
  end if;

  if p_vt is not null or p_vrva is not null or p_saude is not null or p_seguro is not null then
    update public.rh_colaboradores as rh
       set opta_vale_transporte = coalesce(p_vt, rh.opta_vale_transporte),
           opta_vr_va = coalesce(p_vrva, rh.opta_vr_va),
           opta_plano_saude = coalesce(p_saude, rh.opta_plano_saude),
           opta_seguro_vida = coalesce(p_seguro, rh.opta_seguro_vida),
           beneficios_sincronizados_em = now(),
           atualizado_em = now()
      from public.colaboradores_master as cm
     where cm.id = any(p_master_ids)
       and cm.rh_colaborador_id = rh.id;
    get diagnostics v_rh_atualizados = row_count;

    if p_vt is not null then
      v_campos := array_append(v_campos, 'Vale Transporte=' || case when p_vt then 'Sim' else 'Não' end);
    end if;
    if p_vrva is not null then
      v_campos := array_append(v_campos, 'VR/VA=' || case when p_vrva then 'Sim' else 'Não' end);
    end if;
    if p_saude is not null then
      v_campos := array_append(v_campos, 'Assistência Médica=' || case when p_saude then 'Sim' else 'Não' end);
    end if;
    if p_seguro is not null then
      v_campos := array_append(v_campos, 'Seguro de Vida=' || case when p_seguro then 'Sim' else 'Não' end);
    end if;
  end if;

  select coalesce(nome, email, p_actor::text)
    into v_actor_text
  from public.profiles
  where id = p_actor;

  insert into public.activity_log(actor, action, details)
  values (
    coalesce(v_actor_text, p_actor::text),
    'beneficios_lote_colaboradores',
    array_to_string(v_campos, '; ')
      || ' — selecionados: ' || v_solicitados
      || '; vinculados ao RH: ' || v_com_rh
  );

  return jsonb_build_object(
    'selecionados', v_solicitados,
    'cesta_atualizados', v_master_atualizados,
    'beneficios_rh_atualizados', v_rh_atualizados,
    'sem_vinculo_rh', v_solicitados - v_com_rh
  );
end;
$$;

revoke all on function private.atualizar_beneficios_colaboradores_lote_impl(
  uuid, uuid[], boolean, boolean, boolean, boolean, boolean
) from public, anon;
grant usage on schema private to authenticated;
grant execute on function private.atualizar_beneficios_colaboradores_lote_impl(
  uuid, uuid[], boolean, boolean, boolean, boolean, boolean
) to authenticated;

create or replace function public.atualizar_beneficios_colaboradores_lote(
  p_master_ids uuid[],
  p_cesta boolean default null,
  p_vt boolean default null,
  p_vrva boolean default null,
  p_saude boolean default null,
  p_seguro boolean default null
)
returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select private.atualizar_beneficios_colaboradores_lote_impl(
    auth.uid(),
    p_master_ids,
    p_cesta,
    p_vt,
    p_vrva,
    p_saude,
    p_seguro
  );
$$;

revoke all on function public.atualizar_beneficios_colaboradores_lote(
  uuid[], boolean, boolean, boolean, boolean, boolean
) from public, anon;
grant execute on function public.atualizar_beneficios_colaboradores_lote(
  uuid[], boolean, boolean, boolean, boolean, boolean
) to authenticated;

comment on function public.atualizar_beneficios_colaboradores_lote(
  uuid[], boolean, boolean, boolean, boolean, boolean
) is 'Atualiza benefícios em lote de forma atômica, com permissão beneficios.editar/administrar e sem alterar históricos.';

-- Defesa adicional: a Central trabalha exclusivamente com soft delete.
revoke delete, truncate on table public.colaboradores_master from anon, authenticated;
