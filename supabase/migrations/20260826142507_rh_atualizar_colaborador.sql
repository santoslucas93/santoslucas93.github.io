-- Migration já aplicada no Supabase em 2026-08-26; versionada aqui para eliminar drift.
create or replace function public.rh_atualizar_colaborador(
  p_colaborador_id uuid,
  p_nome text,
  p_admissao date,
  p_vinculo text,
  p_cargo text default null,
  p_cbo text default null,
  p_departamento text default null,
  p_centro_custo text default null,
  p_filial text default null,
  p_data_nascimento date default null,
  p_email text default null,
  p_telefone text default null,
  p_salario_base numeric default null,
  p_jornada_horas_semanais numeric default null,
  p_gestor text default null,
  p_opta_vale_transporte boolean default false,
  p_opta_vr_va boolean default true,
  p_opta_plano_saude boolean default false,
  p_opta_seguro_vida boolean default true,
  p_observacoes text default null
)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog', 'public'
as $function$
declare
  v_uid uuid := auth.uid();
  v_matricula text;
  v_nome_antes text;
begin
  if v_uid is null or not public.tem_permissao('rh', 'administrar', v_uid) then
    raise exception 'Acesso negado para alterar colaboradores.' using errcode = '42501';
  end if;

  if p_colaborador_id is null then
    raise exception 'Colaborador não informado.' using errcode = '22023';
  end if;

  if nullif(trim(p_nome), '') is null or p_admissao is null or nullif(trim(p_vinculo), '') is null then
    raise exception 'Nome, admissão e vínculo são obrigatórios.' using errcode = '22023';
  end if;

  if p_email is not null and nullif(trim(p_email), '') is not null
     and trim(p_email) !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'E-mail inválido.' using errcode = '22023';
  end if;

  if p_salario_base is not null and (p_salario_base < 0 or p_salario_base > 1000000) then
    raise exception 'Salário-base inválido.' using errcode = '22023';
  end if;

  if p_jornada_horas_semanais is not null and (p_jornada_horas_semanais <= 0 or p_jornada_horas_semanais > 60) then
    raise exception 'Jornada semanal inválida.' using errcode = '22023';
  end if;

  select matricula, nome into v_matricula, v_nome_antes
  from public.rh_colaboradores where id = p_colaborador_id;

  if not found then
    raise exception 'Colaborador não encontrado.' using errcode = 'P0002';
  end if;

  update public.rh_colaboradores set
    nome = trim(p_nome),
    admissao = p_admissao,
    vinculo = trim(p_vinculo),
    cargo = nullif(trim(p_cargo), ''),
    cbo = nullif(trim(p_cbo), ''),
    departamento = nullif(trim(p_departamento), ''),
    centro_custo = nullif(trim(p_centro_custo), ''),
    filial = nullif(trim(p_filial), ''),
    data_nascimento = p_data_nascimento,
    email = nullif(lower(trim(p_email)), ''),
    telefone = nullif(trim(p_telefone), ''),
    salario_base = round(p_salario_base, 2),
    jornada_horas_semanais = p_jornada_horas_semanais,
    gestor = nullif(trim(p_gestor), ''),
    opta_vale_transporte = coalesce(p_opta_vale_transporte, false),
    opta_vr_va = coalesce(p_opta_vr_va, true),
    opta_plano_saude = coalesce(p_opta_plano_saude, false),
    opta_seguro_vida = coalesce(p_opta_seguro_vida, true),
    observacoes = nullif(trim(p_observacoes), ''),
    atualizado_em = now()
  where id = p_colaborador_id;

  insert into public.rh_auditoria(evento, entidade, entidade_id, detalhes, usuario_id)
  values (
    'colaborador_atualizado',
    'rh_colaboradores',
    p_colaborador_id::text,
    jsonb_build_object('matricula', v_matricula, 'nome_antes', v_nome_antes, 'nome_depois', trim(p_nome)),
    v_uid
  );

  return jsonb_build_object('colaborador_id', p_colaborador_id, 'nome', trim(p_nome));
end;
$function$;

revoke all on function public.rh_atualizar_colaborador(uuid,text,date,text,text,text,text,text,text,date,text,text,numeric,numeric,text,boolean,boolean,boolean,boolean,text) from public, anon;
grant execute on function public.rh_atualizar_colaborador(uuid,text,date,text,text,text,text,text,text,date,text,text,numeric,numeric,text,boolean,boolean,boolean,boolean,text) to authenticated;
