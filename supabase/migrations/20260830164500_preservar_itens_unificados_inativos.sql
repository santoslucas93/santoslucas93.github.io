-- Itens mestres já unificados permanecem inativos nas sincronizações futuras.
create or replace function private.sincronizar_status_beneficios_colaboradores(p_master_ids uuid[])
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_master record;
  v_state record;
  v_aliases text[];
  v_ativo boolean;
  v_valor jsonb;
  v_itens integer;
  v_total_itens integer := 0;
begin
  for v_master in
    select cm.id, cm.nome, cm.cpf, cm.status
    from public.colaboradores_master cm
    where cm.id = any(p_master_ids) and cm.merged_into_id is null
  loop
    v_ativo := v_master.status = 'Ativo';
    select array_agg(a.alias_norm) into v_aliases
    from private.colaborador_aliases a
    where a.colaborador_master_id = v_master.id;
    v_aliases := coalesce(v_aliases, array[]::text[]) || private.normalizar_nome_colaborador(v_master.nome);

    for v_state in
      select b.chave, b.valor from public.ben_state b
      where b.chave in ('liga_emp','liga_med_registros','liga_mestre','liga_mob_colaboradores','liga_prud_registros','liga_vt_registros')
        and jsonb_typeof(b.valor) = 'array'
    loop
      select coalesce(jsonb_agg(
        case when not (v_state.chave = 'liga_mestre' and e.item ? 'unificadoEmId') and (
          (nullif(regexp_replace(coalesce(e.item->>'cpf',''), '\\D','','g'),'') is not null
            and regexp_replace(coalesce(e.item->>'cpf',''), '\\D','','g') = regexp_replace(coalesce(v_master.cpf,''), '\\D','','g'))
          or private.normalizar_nome_colaborador(e.item->>'nome') = any(v_aliases)
        ) then case v_state.chave
          when 'liga_mestre' then e.item || jsonb_build_object(
            'vinculo',case when v_ativo then 'ATIVO' else 'DESLIGADO' end,
            'desligamento',case when v_ativo then '' else coalesce(nullif(e.item->>'desligamento',''),to_char(current_date,'DD/MM/YYYY')) end,
            'atualizadoEm',now())
          when 'liga_vt_registros' then e.item || jsonb_build_object('ativoVT',v_ativo)
          when 'liga_mob_colaboradores' then e.item || jsonb_build_object(
            'situacao',case when v_ativo then 'ativo' else 'inativo' end,
            'dataDesligamento',case when v_ativo then '' else coalesce(nullif(e.item->>'dataDesligamento',''),to_char(current_date,'DD/MM/YYYY')) end)
          else e.item || jsonb_build_object(
            'ativo',v_ativo,
            'desligamento',case when v_ativo then coalesce(e.item->>'desligamento','') else coalesce(nullif(e.item->>'desligamento',''),to_char(current_date,'DD/MM/YYYY')) end)
        end else e.item end order by e.ord
      ),'[]'::jsonb),
      count(*) filter (where not (v_state.chave = 'liga_mestre' and e.item ? 'unificadoEmId') and (
        (nullif(regexp_replace(coalesce(e.item->>'cpf',''), '\\D','','g'),'') is not null
          and regexp_replace(coalesce(e.item->>'cpf',''), '\\D','','g') = regexp_replace(coalesce(v_master.cpf,''), '\\D','','g'))
        or private.normalizar_nome_colaborador(e.item->>'nome') = any(v_aliases)
      ))
      into v_valor,v_itens
      from jsonb_array_elements(v_state.valor) with ordinality e(item,ord);
      v_total_itens := v_total_itens + coalesce(v_itens,0);
      update public.ben_state set valor=v_valor,updated_at=now()
      where chave=v_state.chave and valor is distinct from v_valor;
    end loop;
  end loop;
  return jsonb_build_object('sincronizado',coalesce(array_length(p_master_ids,1),0),'itens',v_total_itens);
end;
$$;

revoke all on function private.sincronizar_status_beneficios_colaboradores(uuid[]) from public,anon,authenticated;

update public.ben_state b
set valor=(
  select jsonb_agg(
    case when e.item->>'unificadoEmId'='27'
      then e.item || jsonb_build_object('vinculo','DESLIGADO','desligamento',coalesce(nullif(e.item->>'desligamento',''),to_char(current_date,'DD/MM/YYYY')))
      else e.item end order by e.ord)
  from jsonb_array_elements(b.valor) with ordinality e(item,ord)
),updated_at=now()
where b.chave='liga_mestre';
