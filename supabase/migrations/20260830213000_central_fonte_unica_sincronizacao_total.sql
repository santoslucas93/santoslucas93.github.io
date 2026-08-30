-- Central de Colaboradores como fonte unica operacional.
-- Sincroniza somente cadastros atuais. Folhas, snapshots, rateios e historicos
-- mensais permanecem imutaveis.

create schema if not exists private;

create or replace function private.colaborador_cpf_digitos(p_cpf text)
returns text
language sql
immutable
set search_path = ''
as $$
  select nullif(regexp_replace(coalesce(p_cpf, ''), '\\D', '', 'g'), '');
$$;

revoke all on function private.colaborador_cpf_digitos(text)
  from public, anon, authenticated;

create or replace function private.colaborador_data_br(p_data date)
returns text
language sql
immutable
set search_path = ''
as $$
  select case when p_data is null then '' else to_char(p_data, 'DD/MM/YYYY') end;
$$;

revoke all on function private.colaborador_data_br(date)
  from public, anon, authenticated;

create or replace function private.colaborador_proximo_id(p_itens jsonb)
returns integer
language sql
immutable
set search_path = ''
as $$
  select coalesce(max(
    case when (item->>'id') ~ '^\\d+$' then (item->>'id')::integer end
  ), 0) + 1
  from jsonb_array_elements(
    case when jsonb_typeof(p_itens) = 'array' then p_itens else '[]'::jsonb end
  ) item;
$$;

revoke all on function private.colaborador_proximo_id(jsonb)
  from public, anon, authenticated;

create or replace function private.colaborador_modulos_emp(
  p_atual jsonb,
  p_tem_rh boolean,
  p_vt boolean,
  p_vrva boolean,
  p_saude boolean,
  p_seguro boolean
)
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select case
    when not p_tem_rh then coalesce(p_atual, '{}'::jsonb)
    else coalesce(p_atual, '{}'::jsonb) || jsonb_build_object(
      'vt', coalesce(p_vt, false),
      'vr', coalesce(p_vrva, false),
      'med', coalesce(p_saude, false),
      'prud', coalesce(p_seguro, false)
    )
  end;
$$;

revoke all on function private.colaborador_modulos_emp(
  jsonb, boolean, boolean, boolean, boolean, boolean
) from public, anon, authenticated;

create or replace function private.colaborador_modulos_mestre(
  p_atual jsonb,
  p_tem_rh boolean,
  p_vt boolean,
  p_vrva boolean,
  p_saude boolean,
  p_seguro boolean
)
returns jsonb
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_result jsonb := coalesce(p_atual, '{}'::jsonb);
begin
  if not p_tem_rh then
    return v_result;
  end if;

  if coalesce(p_vt, false) then
    v_result := v_result || jsonb_build_object(
      'vt', coalesce(v_result->'vt', jsonb_build_object('cadastradoEm', now()))
    );
  else
    v_result := v_result - 'vt';
  end if;

  if coalesce(p_vrva, false) then
    v_result := v_result || jsonb_build_object(
      'vr', coalesce(v_result->'vr', jsonb_build_object('cadastradoEm', now()))
    );
  else
    v_result := v_result - 'vr';
  end if;

  if coalesce(p_saude, false) then
    v_result := v_result || jsonb_build_object(
      'med', coalesce(v_result->'med', jsonb_build_object('cadastradoEm', now()))
    );
  else
    v_result := v_result - 'med';
  end if;

  if coalesce(p_seguro, false) then
    v_result := v_result || jsonb_build_object(
      'prud', coalesce(v_result->'prud', jsonb_build_object('cadastradoEm', now()))
    );
  else
    v_result := v_result - 'prud';
  end if;

  return v_result;
end;
$$;

revoke all on function private.colaborador_modulos_mestre(
  jsonb, boolean, boolean, boolean, boolean, boolean
) from public, anon, authenticated;

create or replace function private.sincronizar_colaborador_central_operacional(
  p_master_id uuid,
  p_nome_anterior text default null,
  p_cpf_anterior text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_master public.colaboradores_master%rowtype;
  v_rh public.rh_colaboradores%rowtype;
  v_tem_rh boolean := false;
  v_aliases text[];
  v_cpfs text[];
  v_state record;
  v_valor jsonb;
  v_encontrados integer;
  v_emp_id integer;
  v_novo_id integer;
  v_ativo boolean;
  v_ativo_modulo boolean;
  v_data text;
  v_conta text;
  v_cfg_vt jsonb := '{}'::jsonb;
  v_total integer := 0;
  v_item_novo jsonb;
begin
  select * into v_master
  from public.colaboradores_master
  where id = p_master_id and merged_into_id is null;

  if not found then
    return jsonb_build_object('sincronizado', false, 'motivo', 'cadastro_nao_canonico');
  end if;

  if v_master.rh_colaborador_id is not null then
    select * into v_rh
    from public.rh_colaboradores
    where id = v_master.rh_colaborador_id;
    v_tem_rh := found;
  end if;

  v_ativo := v_master.status = 'Ativo';
  v_data := private.colaborador_data_br(v_master.data_nascimento);
  v_aliases := array[
    private.normalizar_nome_colaborador(v_master.nome),
    private.normalizar_nome_colaborador(p_nome_anterior)
  ];

  select v_aliases || coalesce(array_agg(a.alias_norm), array[]::text[])
    into v_aliases
  from private.colaborador_aliases a
  where a.colaborador_master_id = v_master.id;

  v_cpfs := array[
    private.colaborador_cpf_digitos(v_master.cpf),
    private.colaborador_cpf_digitos(p_cpf_anterior)
  ];

  if upper(coalesce(v_master.tipo_contratacao, '')) like '%ARBITR%'
     or private.colaborador_cpf_digitos(v_master.centro_custo) = '400213' then
    v_conta := '053917';
  elsif upper(coalesce(v_master.tipo_contratacao, '')) like '%CLT%'
     or upper(coalesce(v_master.tipo_contratacao, '')) like '%ESTAGI%' then
    v_conta := '057061';
  else
    v_conta := '053671';
  end if;

  select valor into v_cfg_vt
  from public.ben_state
  where chave = 'liga_vt_cfg';
  v_cfg_vt := coalesce(v_cfg_vt, '{}'::jsonb);

  for v_state in
    select chave, valor
    from public.ben_state
    where chave in (
      'liga_emp', 'liga_med_registros', 'liga_mestre',
      'liga_mob_colaboradores', 'liga_prud_registros', 'liga_vt_registros'
    )
      and jsonb_typeof(valor) = 'array'
    order by case chave
      when 'liga_emp' then 1
      when 'liga_mestre' then 2
      when 'liga_med_registros' then 3
      when 'liga_prud_registros' then 4
      when 'liga_vt_registros' then 5
      when 'liga_mob_colaboradores' then 6
      else 99
    end
    for update
  loop
    select count(*) into v_encontrados
    from jsonb_array_elements(v_state.valor) e(item)
    where not (v_state.chave = 'liga_mestre' and e.item ? 'unificadoEmId')
      and (
        private.colaborador_cpf_digitos(e.item->>'cpf') = any(v_cpfs)
        or private.normalizar_nome_colaborador(e.item->>'nome') = any(v_aliases)
      );

    if v_state.chave = 'liga_emp' then
      if v_encontrados > 0 then
        select coalesce(jsonb_agg(
          case when (
            private.colaborador_cpf_digitos(e.item->>'cpf') = any(v_cpfs)
            or private.normalizar_nome_colaborador(e.item->>'nome') = any(v_aliases)
          ) then e.item || jsonb_build_object(
            'nome', upper(trim(v_master.nome)),
            'cpf', coalesce(v_master.cpf, ''),
            'nascimento', v_data,
            'cc', coalesce(v_master.centro_custo, ''),
            'tipo', coalesce(v_master.tipo_contratacao, ''),
            'ativo', v_ativo,
            'desligamento', case when v_ativo then '' else coalesce(nullif(e.item->>'desligamento', ''), to_char(current_date, 'DD/MM/YYYY')) end,
            'modulos', private.colaborador_modulos_emp(
              e.item->'modulos', v_tem_rh,
              v_rh.opta_vale_transporte, v_rh.opta_vr_va,
              v_rh.opta_plano_saude, v_rh.opta_seguro_vida
            )
          ) else e.item end order by e.ord
        ), '[]'::jsonb) into v_valor
        from jsonb_array_elements(v_state.valor) with ordinality e(item, ord);
      else
        v_emp_id := private.colaborador_proximo_id(v_state.valor);
        v_item_novo := jsonb_build_object(
          'id', v_emp_id,
          'nome', upper(trim(v_master.nome)),
          'cpf', coalesce(v_master.cpf, ''),
          'nascimento', v_data,
          'cc', coalesce(v_master.centro_custo, ''),
          'tipo', coalesce(v_master.tipo_contratacao, ''),
          'ativo', v_ativo,
          'desligamento', case when v_ativo then '' else to_char(current_date, 'DD/MM/YYYY') end,
          'modulos', private.colaborador_modulos_emp(
            '{}'::jsonb, v_tem_rh,
            v_rh.opta_vale_transporte, v_rh.opta_vr_va,
            v_rh.opta_plano_saude, v_rh.opta_seguro_vida
          )
        );
        v_valor := v_state.valor || jsonb_build_array(v_item_novo);
      end if;

      select (e.item->>'id')::integer into v_emp_id
      from jsonb_array_elements(v_valor) e(item)
      where private.colaborador_cpf_digitos(e.item->>'cpf') = private.colaborador_cpf_digitos(v_master.cpf)
         or private.normalizar_nome_colaborador(e.item->>'nome') = private.normalizar_nome_colaborador(v_master.nome)
      limit 1;

    elsif v_state.chave = 'liga_mestre' then
      if v_emp_id is null then
        select (e.item->>'id')::integer into v_emp_id
        from jsonb_array_elements(v_state.valor) e(item)
        where (e.item->>'id') ~ '^\\d+$'
          and (
            private.colaborador_cpf_digitos(e.item->>'cpf') = any(v_cpfs)
            or private.normalizar_nome_colaborador(e.item->>'nome') = any(v_aliases)
          )
        limit 1;
        v_emp_id := coalesce(v_emp_id, private.colaborador_proximo_id(v_state.valor));
      end if;

      if v_encontrados > 0 then
        select coalesce(jsonb_agg(
          case when not (e.item ? 'unificadoEmId') and (
            private.colaborador_cpf_digitos(e.item->>'cpf') = any(v_cpfs)
            or private.normalizar_nome_colaborador(e.item->>'nome') = any(v_aliases)
          ) then e.item || jsonb_build_object(
            'nome', upper(trim(v_master.nome)),
            'nomeNorm', private.normalizar_nome_colaborador(v_master.nome),
            'cpf', coalesce(v_master.cpf, ''),
            'cpfDigits', coalesce(private.colaborador_cpf_digitos(v_master.cpf), ''),
            'nascimento', v_data,
            'cc', coalesce(v_master.centro_custo, ''),
            'departamento', coalesce(v_master.departamento, ''),
            'tipo', coalesce(v_master.tipo_contratacao, ''),
            'vinculo', case when v_ativo then 'ATIVO' else 'DESLIGADO' end,
            'desligamento', case when v_ativo then '' else coalesce(nullif(e.item->>'desligamento', ''), to_char(current_date, 'DD/MM/YYYY')) end,
            'atualizadoEm', now(),
            'modulos', private.colaborador_modulos_mestre(
              e.item->'modulos', v_tem_rh,
              v_rh.opta_vale_transporte, v_rh.opta_vr_va,
              v_rh.opta_plano_saude, v_rh.opta_seguro_vida
            )
          ) else e.item end order by e.ord
        ), '[]'::jsonb) into v_valor
        from jsonb_array_elements(v_state.valor) with ordinality e(item, ord);
      else
        v_valor := v_state.valor || jsonb_build_array(jsonb_build_object(
          'id', v_emp_id,
          'nome', upper(trim(v_master.nome)),
          'nomeNorm', private.normalizar_nome_colaborador(v_master.nome),
          'cpf', coalesce(v_master.cpf, ''),
          'cpfDigits', coalesce(private.colaborador_cpf_digitos(v_master.cpf), ''),
          'nascimento', v_data,
          'cc', coalesce(v_master.centro_custo, ''),
          'departamento', coalesce(v_master.departamento, ''),
          'tipo', coalesce(v_master.tipo_contratacao, ''),
          'vinculo', case when v_ativo then 'ATIVO' else 'DESLIGADO' end,
          'admissao', case when v_tem_rh then private.colaborador_data_br(v_rh.admissao) else '' end,
          'desligamento', case when v_ativo then '' else to_char(current_date, 'DD/MM/YYYY') end,
          'criadoEm', now(),
          'atualizadoEm', now(),
          'modulos', private.colaborador_modulos_mestre(
            '{}'::jsonb, v_tem_rh,
            v_rh.opta_vale_transporte, v_rh.opta_vr_va,
            v_rh.opta_plano_saude, v_rh.opta_seguro_vida
          )
        ));
      end if;

    elsif v_state.chave = 'liga_mob_colaboradores' then
      if v_encontrados = 0 then
        continue;
      end if;
      select coalesce(jsonb_agg(
        case when (
          private.colaborador_cpf_digitos(e.item->>'cpf') = any(v_cpfs)
          or private.normalizar_nome_colaborador(e.item->>'nome') = any(v_aliases)
        ) then e.item || jsonb_build_object(
          'nome', trim(v_master.nome),
          'nomePlanilha', trim(v_master.nome),
          'cpf', coalesce(v_master.cpf, ''),
          'cc', coalesce(v_master.centro_custo, ''),
          'email', case when v_tem_rh then coalesce(v_rh.email, '') else coalesce(e.item->>'email', '') end,
          'cargo', case when v_tem_rh then coalesce(v_rh.cargo, '') else coalesce(e.item->>'cargo', '') end,
          'situacao', case when v_ativo then 'ativo' else 'inativo' end,
          'dataAdmissao', case when v_tem_rh then private.colaborador_data_br(v_rh.admissao) else coalesce(e.item->>'dataAdmissao', '') end,
          'dataDesligamento', case when v_ativo then '' else coalesce(nullif(e.item->>'dataDesligamento', ''), to_char(current_date, 'DD/MM/YYYY')) end
        ) else e.item end order by e.ord
      ), '[]'::jsonb) into v_valor
      from jsonb_array_elements(v_state.valor) with ordinality e(item, ord);

    elsif v_state.chave = 'liga_med_registros' then
      v_ativo_modulo := v_ativo and (not v_tem_rh or v_rh.opta_plano_saude);
      if v_encontrados > 0 then
        select coalesce(jsonb_agg(
          case when (
            private.colaborador_cpf_digitos(e.item->>'cpf') = any(v_cpfs)
            or private.normalizar_nome_colaborador(e.item->>'nome') = any(v_aliases)
          ) then e.item || jsonb_build_object(
            'employeeId', v_emp_id,
            'nome', upper(trim(v_master.nome)),
            'cpf', coalesce(v_master.cpf, ''),
            'nascimento', v_data,
            'cc', coalesce(v_master.centro_custo, ''),
            'tipo', coalesce(v_master.tipo_contratacao, ''),
            'ativo', v_ativo_modulo
          ) else e.item end order by e.ord
        ), '[]'::jsonb) into v_valor
        from jsonb_array_elements(v_state.valor) with ordinality e(item, ord);
      elsif v_tem_rh and v_rh.opta_plano_saude then
        v_novo_id := private.colaborador_proximo_id(v_state.valor);
        v_valor := v_state.valor || jsonb_build_array(jsonb_build_object(
          'id', v_novo_id, 'employeeId', v_emp_id,
          'nome', upper(trim(v_master.nome)), 'cpf', coalesce(v_master.cpf, ''),
          'nascimento', v_data, 'cc', coalesce(v_master.centro_custo, ''),
          'tipo', coalesce(v_master.tipo_contratacao, ''), 'ativo', v_ativo,
          'valor', 0, 'iof', 0, 'origem', 'central_colaboradores'
        ));
      else
        continue;
      end if;

    elsif v_state.chave = 'liga_prud_registros' then
      v_ativo_modulo := v_ativo and (not v_tem_rh or v_rh.opta_seguro_vida);
      if v_encontrados > 0 then
        select coalesce(jsonb_agg(
          case when (
            private.colaborador_cpf_digitos(e.item->>'cpf') = any(v_cpfs)
            or private.normalizar_nome_colaborador(e.item->>'nome') = any(v_aliases)
          ) then e.item || jsonb_build_object(
            'employeeId', v_emp_id,
            'nome', upper(trim(v_master.nome)),
            'cpf', coalesce(v_master.cpf, ''),
            'nascimento', v_data,
            'cc', coalesce(v_master.centro_custo, ''),
            'tipo', coalesce(v_master.tipo_contratacao, ''),
            'conta', v_conta,
            'ativo', v_ativo_modulo
          ) else e.item end order by e.ord
        ), '[]'::jsonb) into v_valor
        from jsonb_array_elements(v_state.valor) with ordinality e(item, ord);
      elsif v_tem_rh and v_rh.opta_seguro_vida then
        v_novo_id := private.colaborador_proximo_id(v_state.valor);
        v_valor := v_state.valor || jsonb_build_array(jsonb_build_object(
          'id', v_novo_id, 'employeeId', v_emp_id,
          'nome', upper(trim(v_master.nome)), 'cpf', coalesce(v_master.cpf, ''),
          'nascimento', v_data, 'cc', coalesce(v_master.centro_custo, ''),
          'tipo', coalesce(v_master.tipo_contratacao, ''), 'ativo', v_ativo,
          'conta', v_conta, 'valor', 0, 'origem', 'central_colaboradores'
        ));
      else
        continue;
      end if;

    elsif v_state.chave = 'liga_vt_registros' then
      v_ativo_modulo := v_ativo and (not v_tem_rh or v_rh.opta_vale_transporte);
      if v_encontrados > 0 then
        select coalesce(jsonb_agg(
          case when (
            private.colaborador_cpf_digitos(e.item->>'cpf') = any(v_cpfs)
            or private.normalizar_nome_colaborador(e.item->>'nome') = any(v_aliases)
          ) then e.item || jsonb_build_object(
            'employeeId', v_emp_id,
            'nome', upper(trim(v_master.nome)),
            'cpf', coalesce(v_master.cpf, ''),
            'nascimento', v_data,
            'cc', coalesce(v_master.centro_custo, ''),
            'tipo', coalesce(v_master.tipo_contratacao, ''),
            'ativoVT', v_ativo_modulo
          ) else e.item end order by e.ord
        ), '[]'::jsonb) into v_valor
        from jsonb_array_elements(v_state.valor) with ordinality e(item, ord);
      elsif v_tem_rh and v_rh.opta_vale_transporte then
        v_valor := v_state.valor || jsonb_build_array(jsonb_build_object(
          'employeeId', v_emp_id,
          'nome', upper(trim(v_master.nome)), 'cpf', coalesce(v_master.cpf, ''),
          'nascimento', v_data, 'cc', coalesce(v_master.centro_custo, ''),
          'tipo', coalesce(v_master.tipo_contratacao, ''), 'ativoVT', v_ativo,
          'competencia', coalesce(v_cfg_vt->>'competencia', to_char(current_date, 'YYYY-MM')),
          'tarifaTipo', 'sptransOnibus',
          'tarifa', coalesce((v_cfg_vt->'tarifas'->>'sptransOnibus')::numeric, 0),
          'dias', coalesce((v_cfg_vt->>'diasPadrao')::integer, 22),
          'obs', '', 'origem', 'CADASTRO'
        ));
      else
        continue;
      end if;
    end if;

    update public.ben_state
       set valor = v_valor,
           updated_at = now(),
           updated_by = 'central_colaboradores'
     where chave = v_state.chave
       and valor is distinct from v_valor;
    if found then
      v_total := v_total + 1;
    end if;
  end loop;

  if v_master.rh_colaborador_id is not null then
    update public.rh_colaboradores
       set nome = trim(v_master.nome),
           cpf_mascarado = nullif(trim(v_master.cpf), ''),
           data_nascimento = v_master.data_nascimento,
           centro_custo = nullif(trim(v_master.centro_custo), ''),
           departamento = nullif(trim(v_master.departamento), ''),
           vinculo = nullif(trim(v_master.tipo_contratacao), ''),
           situacao = case when v_ativo then 'Trabalhando' else 'Desligado' end,
           desligamento = case when v_ativo then null else coalesce(desligamento, current_date) end,
           desligamento_origem = case when v_ativo then null else 'central_colaboradores' end,
           status_origem = 'central_colaboradores',
           atualizado_em = now()
     where id = v_master.rh_colaborador_id;
  end if;

  return jsonb_build_object(
    'sincronizado', true,
    'estados_beneficios_atualizados', v_total,
    'rh_vinculado', v_tem_rh,
    'employee_id', v_emp_id
  );
end;
$$;

revoke all on function private.sincronizar_colaborador_central_operacional(uuid, text, text)
  from public, anon, authenticated;

create or replace function private.colaboradores_master_propagar()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.sincronizar_colaborador_central_operacional(
    new.id,
    case when tg_op = 'UPDATE' then old.nome else null end,
    case when tg_op = 'UPDATE' then old.cpf else null end
  );
  return new;
end;
$$;

revoke all on function private.colaboradores_master_propagar()
  from public, anon, authenticated;

do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgname = 'trg_colaboradores_master_propagar'
      and tgrelid = 'public.colaboradores_master'::regclass
  ) then
    execute 'create trigger trg_colaboradores_master_propagar
      after insert or update on public.colaboradores_master
      for each row execute function private.colaboradores_master_propagar()';
  end if;
end;
$$;

create or replace function private.salvar_colaborador_central_impl(
  p_uid uuid,
  p_payload jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_rh_id uuid;
  v_existente public.colaboradores_master%rowtype;
  v_novo boolean;
  v_nome text;
  v_cpf text;
  v_cpf_digits text;
  v_nascimento date;
  v_cc text;
  v_departamento text;
  v_tipo text;
  v_status text;
  v_cesta boolean;
  v_observacoes text;
  v_email text;
  v_telefone text;
  v_matricula text;
  v_admissao date;
  v_cargo text;
  v_gestor text;
  v_salario numeric;
  v_vt boolean;
  v_vrva boolean;
  v_saude boolean;
  v_seguro boolean;
  v_sync jsonb;
  v_actor text;
begin
  if p_uid is null or auth.uid() is null or auth.uid() is distinct from p_uid then
    raise exception 'Sessao invalida para salvar colaborador.' using errcode = '42501';
  end if;
  if p_payload is null or jsonb_typeof(p_payload) <> 'object' then
    raise exception 'Dados do colaborador invalidos.' using errcode = '22023';
  end if;

  v_id := nullif(p_payload->>'id', '')::uuid;
  v_novo := v_id is null;

  if v_novo then
    if not (
      public.tem_permissao('colaboradores', 'criar', p_uid)
      or public.tem_permissao('beneficios', 'criar', p_uid)
      or public.tem_permissao('beneficios', 'administrar', p_uid)
    ) then
      raise exception 'Sem permissao para cadastrar colaboradores.' using errcode = '42501';
    end if;
    v_id := gen_random_uuid();
  else
    if not (
      public.tem_permissao('colaboradores', 'editar', p_uid)
      or public.tem_permissao('beneficios', 'editar', p_uid)
      or public.tem_permissao('beneficios', 'administrar', p_uid)
    ) then
      raise exception 'Sem permissao para editar colaboradores.' using errcode = '42501';
    end if;
    select * into v_existente
    from public.colaboradores_master
    where id = v_id and merged_into_id is null
    for update;
    if not found then
      raise exception 'Colaborador nao encontrado ou cadastro ja unificado.' using errcode = 'P0002';
    end if;
  end if;

  v_nome := trim(coalesce(p_payload->>'nome', v_existente.nome));
  v_cpf := nullif(trim(case when p_payload ? 'cpf' then p_payload->>'cpf' else v_existente.cpf end), '');
  v_cpf_digits := private.colaborador_cpf_digitos(v_cpf);
  v_nascimento := case when p_payload ? 'data_nascimento' and nullif(p_payload->>'data_nascimento', '') is not null
    then (p_payload->>'data_nascimento')::date else v_existente.data_nascimento end;
  v_cc := nullif(trim(case when p_payload ? 'centro_custo' then p_payload->>'centro_custo' else v_existente.centro_custo end), '');
  v_departamento := nullif(trim(case when p_payload ? 'departamento' then p_payload->>'departamento' else v_existente.departamento end), '');
  v_tipo := nullif(trim(case when p_payload ? 'tipo_contratacao' then p_payload->>'tipo_contratacao' else v_existente.tipo_contratacao end), '');
  v_status := coalesce(nullif(trim(p_payload->>'status'), ''), v_existente.status, 'Ativo');
  v_cesta := case when p_payload ? 'is_cesta_basica_elegivel'
    then (p_payload->>'is_cesta_basica_elegivel')::boolean
    else coalesce(v_existente.is_cesta_basica_elegivel, false) end;
  v_observacoes := nullif(trim(case when p_payload ? 'observacoes' then p_payload->>'observacoes' else v_existente.observacoes end), '');

  if nullif(v_nome, '') is null then
    raise exception 'Nome e obrigatorio.' using errcode = '22023';
  end if;
  if v_status not in ('Ativo', 'Desligado') then
    raise exception 'Status invalido.' using errcode = '22023';
  end if;
  if v_cpf_digits is not null and length(v_cpf_digits) <> 11 then
    raise exception 'CPF deve conter 11 digitos.' using errcode = '22023';
  end if;
  if v_cpf_digits is not null and exists (
    select 1 from public.colaboradores_master cm
    where cm.id <> v_id
      and cm.merged_into_id is null
      and private.colaborador_cpf_digitos(cm.cpf) = v_cpf_digits
  ) then
    raise exception 'CPF ja cadastrado para outro colaborador.' using errcode = '23505';
  end if;

  if v_novo then
    v_email := nullif(lower(trim(p_payload->>'email')), '');
    v_telefone := nullif(trim(p_payload->>'telefone'), '');
    v_matricula := nullif(trim(p_payload->>'matricula'), '');
    v_admissao := nullif(p_payload->>'admissao', '')::date;
    v_cargo := nullif(trim(p_payload->>'cargo'), '');
    v_gestor := nullif(trim(p_payload->>'gestor'), '');
    v_salario := nullif(p_payload->>'salario_base', '')::numeric;
    v_vt := coalesce((p_payload->>'opta_vale_transporte')::boolean, false);
    v_vrva := coalesce((p_payload->>'opta_vr_va')::boolean, false);
    v_saude := coalesce((p_payload->>'opta_plano_saude')::boolean, false);
    v_seguro := coalesce((p_payload->>'opta_seguro_vida')::boolean, false);
    v_rh_id := gen_random_uuid();
    v_matricula := coalesce(v_matricula, 'CENTRAL-' || upper(substr(replace(v_id::text, '-', ''), 1, 10)));

    insert into public.rh_colaboradores(
      id, matricula, nome, cpf_mascarado, admissao, vinculo, cargo,
      centro_custo, departamento, situacao, desligamento, status_origem,
      data_nascimento, email, telefone, salario_base, gestor,
      opta_vale_transporte, opta_vr_va, opta_plano_saude, opta_seguro_vida,
      observacoes, beneficios_sincronizados_em, desligamento_origem, atualizado_em
    ) values (
      v_rh_id, v_matricula, v_nome, v_cpf, v_admissao, v_tipo, v_cargo,
      v_cc, v_departamento, case when v_status = 'Ativo' then 'Trabalhando' else 'Desligado' end,
      case when v_status = 'Desligado' then current_date else null end,
      'central_colaboradores', v_nascimento, v_email, v_telefone, v_salario, v_gestor,
      v_vt, v_vrva, v_saude, v_seguro, v_observacoes, now(),
      case when v_status = 'Desligado' then 'central_colaboradores' else null end, now()
    );

    insert into public.colaboradores_master(
      id, nome, cpf, data_nascimento, centro_custo, departamento,
      tipo_contratacao, status, is_cesta_basica_elegivel, origem_fonte,
      rh_colaborador_id, observacoes, created_by, updated_by
    ) values (
      v_id, v_nome, v_cpf, v_nascimento, v_cc, v_departamento,
      v_tipo, v_status, v_cesta, 'ambos', v_rh_id, v_observacoes, p_uid, p_uid
    );
  else
    v_rh_id := v_existente.rh_colaborador_id;
    if v_rh_id is null then
      v_rh_id := gen_random_uuid();
      v_matricula := coalesce(nullif(trim(p_payload->>'matricula'), ''), 'CENTRAL-' || upper(substr(replace(v_id::text, '-', ''), 1, 10)));
      insert into public.rh_colaboradores(
        id, matricula, nome, cpf_mascarado, admissao, vinculo, cargo,
        centro_custo, departamento, situacao, status_origem, data_nascimento,
        email, telefone, gestor, opta_vale_transporte, opta_vr_va,
        opta_plano_saude, opta_seguro_vida, observacoes, atualizado_em
      ) values (
        v_rh_id, v_matricula, v_nome, v_cpf, nullif(p_payload->>'admissao', '')::date,
        v_tipo, nullif(trim(p_payload->>'cargo'), ''), v_cc, v_departamento,
        case when v_status = 'Ativo' then 'Trabalhando' else 'Desligado' end,
        'central_colaboradores', v_nascimento, nullif(lower(trim(p_payload->>'email')), ''),
        nullif(trim(p_payload->>'telefone'), ''), nullif(trim(p_payload->>'gestor'), ''),
        coalesce((p_payload->>'opta_vale_transporte')::boolean, false),
        coalesce((p_payload->>'opta_vr_va')::boolean, false),
        coalesce((p_payload->>'opta_plano_saude')::boolean, false),
        coalesce((p_payload->>'opta_seguro_vida')::boolean, false),
        v_observacoes, now()
      );
    else
      update public.rh_colaboradores
         set email = case when p_payload ? 'email' then nullif(lower(trim(p_payload->>'email')), '') else email end,
             telefone = case when p_payload ? 'telefone' then nullif(trim(p_payload->>'telefone'), '') else telefone end,
             matricula = case when p_payload ? 'matricula' then coalesce(nullif(trim(p_payload->>'matricula'), ''), matricula) else matricula end,
             admissao = case when p_payload ? 'admissao' and nullif(p_payload->>'admissao', '') is not null then (p_payload->>'admissao')::date else admissao end,
             cargo = case when p_payload ? 'cargo' then nullif(trim(p_payload->>'cargo'), '') else cargo end,
             gestor = case when p_payload ? 'gestor' then nullif(trim(p_payload->>'gestor'), '') else gestor end,
             salario_base = case when p_payload ? 'salario_base' and nullif(p_payload->>'salario_base', '') is not null then (p_payload->>'salario_base')::numeric else salario_base end,
             opta_vale_transporte = case when p_payload ? 'opta_vale_transporte' then (p_payload->>'opta_vale_transporte')::boolean else opta_vale_transporte end,
             opta_vr_va = case when p_payload ? 'opta_vr_va' then (p_payload->>'opta_vr_va')::boolean else opta_vr_va end,
             opta_plano_saude = case when p_payload ? 'opta_plano_saude' then (p_payload->>'opta_plano_saude')::boolean else opta_plano_saude end,
             opta_seguro_vida = case when p_payload ? 'opta_seguro_vida' then (p_payload->>'opta_seguro_vida')::boolean else opta_seguro_vida end,
             beneficios_sincronizados_em = now(),
             atualizado_em = now()
       where id = v_rh_id;
    end if;

    update public.colaboradores_master
       set nome = v_nome,
           cpf = v_cpf,
           data_nascimento = v_nascimento,
           centro_custo = v_cc,
           departamento = v_departamento,
           tipo_contratacao = v_tipo,
           status = v_status,
           is_cesta_basica_elegivel = v_cesta,
           origem_fonte = case when v_rh_id is not null then 'ambos' else origem_fonte end,
           rh_colaborador_id = v_rh_id,
           observacoes = v_observacoes,
           updated_by = p_uid,
           updated_at = now()
     where id = v_id;
  end if;

  v_sync := private.sincronizar_colaborador_central_operacional(
    v_id, v_existente.nome, v_existente.cpf
  );

  select coalesce(nome, email, p_uid::text) into v_actor
  from public.profiles where id = p_uid;

  insert into public.activity_log(actor, action, details)
  values (
    coalesce(v_actor, p_uid::text),
    case when v_novo then 'criar_colaborador_central' else 'editar_colaborador_central' end,
    v_nome || ' — Central, Beneficios e RH sincronizados'
  );

  insert into public.rh_auditoria(evento, entidade, entidade_id, detalhes, usuario_id)
  values (
    case when v_novo then 'central_colaborador_cadastrado' else 'central_colaborador_atualizado' end,
    'colaboradores_master', v_id::text,
    jsonb_build_object('nome', v_nome, 'status', v_status, 'sincronizacao', v_sync),
    p_uid
  );

  return jsonb_build_object(
    'id', v_id,
    'rh_colaborador_id', v_rh_id,
    'criado', v_novo,
    'sincronizacao', v_sync
  );
end;
$$;

revoke all on function private.salvar_colaborador_central_impl(uuid, jsonb)
  from public, anon, authenticated;

create or replace function public.salvar_colaborador_central(p_payload jsonb)
returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select private.salvar_colaborador_central_impl(auth.uid(), p_payload);
$$;

revoke all on function public.salvar_colaborador_central(jsonb)
  from public, anon, authenticated;
grant usage on schema private to authenticated;
grant execute on function private.salvar_colaborador_central_impl(uuid, jsonb)
  to authenticated;
grant execute on function public.salvar_colaborador_central(jsonb)
  to authenticated;

create or replace function public.salvar_colaboradores_central_lote(p_itens jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_item jsonb;
  v_resultado jsonb;
  v_resultados jsonb := '[]'::jsonb;
  v_total integer;
begin
  if jsonb_typeof(p_itens) <> 'array' then
    raise exception 'O lote deve ser uma lista de colaboradores.' using errcode = '22023';
  end if;
  v_total := jsonb_array_length(p_itens);
  if v_total = 0 or v_total > 500 then
    raise exception 'O lote deve conter entre 1 e 500 colaboradores.' using errcode = '22023';
  end if;

  for v_item in select value from jsonb_array_elements(p_itens)
  loop
    v_resultado := private.salvar_colaborador_central_impl(auth.uid(), v_item);
    v_resultados := v_resultados || jsonb_build_array(v_resultado);
  end loop;

  return jsonb_build_object('processados', v_total, 'resultados', v_resultados);
end;
$$;

revoke all on function public.salvar_colaboradores_central_lote(jsonb)
  from public, anon, authenticated;
grant execute on function public.salvar_colaboradores_central_lote(jsonb)
  to authenticated;

comment on function public.salvar_colaborador_central(jsonb) is
  'Salva um colaborador na fonte unica e sincroniza, na mesma transacao, RH e cadastros operacionais atuais de Beneficios.';
comment on function public.salvar_colaboradores_central_lote(jsonb) is
  'Cria ou atualiza ate 500 colaboradores de forma atomica, sem alterar snapshots ou historicos mensais.';

notify pgrst, 'reload schema';
