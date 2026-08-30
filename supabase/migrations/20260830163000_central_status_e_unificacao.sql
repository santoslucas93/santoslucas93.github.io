-- Central de Colaboradores como fonte de verdade dos módulos operacionais.
-- Não altera snapshots/históricos e não remove registros fisicamente.

create schema if not exists private;

alter table public.colaboradores_master
  add column if not exists merged_into_id uuid null
  references public.colaboradores_master(id) on delete restrict;

create index if not exists colaboradores_master_merged_into_idx
  on public.colaboradores_master(merged_into_id)
  where merged_into_id is not null;

create table if not exists private.colaborador_aliases (
  id bigint generated always as identity primary key,
  colaborador_master_id uuid not null references public.colaboradores_master(id) on delete restrict,
  alias text not null,
  alias_norm text not null unique,
  created_at timestamptz not null default now()
);

revoke all on table private.colaborador_aliases from public, anon, authenticated;
revoke all on sequence private.colaborador_aliases_id_seq from public, anon, authenticated;

create or replace function private.normalizar_nome_colaborador(p_nome text)
returns text
language sql
immutable
set search_path = ''
as $$
  select trim(regexp_replace(upper(translate(coalesce(p_nome,''),
    'ÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ',
    'AAAAAEEEEIIIIOOOOOUUUUC')), '[^A-Z0-9]+', ' ', 'g'));
$$;

revoke all on function private.normalizar_nome_colaborador(text) from public, anon, authenticated;

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
  v_total_itens integer := 0;
begin
  for v_master in
    select cm.id, cm.nome, cm.cpf, cm.status
    from public.colaboradores_master cm
    where cm.id = any(p_master_ids)
      and cm.merged_into_id is null
  loop
    v_ativo := v_master.status = 'Ativo';
    select array_agg(a.alias_norm)
      into v_aliases
    from private.colaborador_aliases a
    where a.colaborador_master_id = v_master.id;

    v_aliases := coalesce(v_aliases, array[]::text[]) || private.normalizar_nome_colaborador(v_master.nome);

    for v_state in
      select b.chave, b.valor
      from public.ben_state b
      where b.chave in (
        'liga_emp', 'liga_med_registros', 'liga_mestre',
        'liga_mob_colaboradores', 'liga_prud_registros', 'liga_vt_registros'
      )
        and jsonb_typeof(b.valor) = 'array'
    loop
      select coalesce(jsonb_agg(
        case
          when not (v_state.chave = 'liga_mestre' and e.item ? 'unificadoEmId') and ((
            nullif(regexp_replace(coalesce(e.item->>'cpf',''), '\\D', '', 'g'),'') is not null
            and regexp_replace(coalesce(e.item->>'cpf',''), '\\D', '', 'g') = regexp_replace(coalesce(v_master.cpf,''), '\\D', '', 'g')
          ) or private.normalizar_nome_colaborador(e.item->>'nome') = any(v_aliases))
          then case v_state.chave
            when 'liga_mestre' then e.item || jsonb_build_object(
              'vinculo', case when v_ativo then 'ATIVO' else 'DESLIGADO' end,
              'desligamento', case when v_ativo then '' else coalesce(nullif(e.item->>'desligamento',''), to_char(current_date,'DD/MM/YYYY')) end,
              'atualizadoEm', now()
            )
            when 'liga_vt_registros' then e.item || jsonb_build_object('ativoVT', v_ativo)
            when 'liga_mob_colaboradores' then e.item || jsonb_build_object(
              'situacao', case when v_ativo then 'ativo' else 'inativo' end,
              'dataDesligamento', case when v_ativo then '' else coalesce(nullif(e.item->>'dataDesligamento',''), to_char(current_date,'DD/MM/YYYY')) end
            )
            else e.item || jsonb_build_object(
              'ativo', v_ativo,
              'desligamento', case when v_ativo then coalesce(e.item->>'desligamento','') else coalesce(nullif(e.item->>'desligamento',''), to_char(current_date,'DD/MM/YYYY')) end
            )
          end
          else e.item
        end order by e.ord
      ), '[]'::jsonb),
      count(*) filter (where not (v_state.chave = 'liga_mestre' and e.item ? 'unificadoEmId') and (
        (nullif(regexp_replace(coalesce(e.item->>'cpf',''), '\\D', '', 'g'),'') is not null
          and regexp_replace(coalesce(e.item->>'cpf',''), '\\D', '', 'g') = regexp_replace(coalesce(v_master.cpf,''), '\\D', '', 'g'))
        or private.normalizar_nome_colaborador(e.item->>'nome') = any(v_aliases)
      ))
      into v_valor, v_total_itens
      from jsonb_array_elements(v_state.valor) with ordinality e(item, ord);

      update public.ben_state
      set valor = v_valor, updated_at = now()
      where chave = v_state.chave
        and valor is distinct from v_valor;
    end loop;
  end loop;

  return jsonb_build_object('sincronizado', coalesce(array_length(p_master_ids,1),0));
end;
$$;

revoke all on function private.sincronizar_status_beneficios_colaboradores(uuid[]) from public, anon, authenticated;

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
begin
  if p_uid is null then
    raise exception 'Sessão inválida.';
  end if;
  if p_status not in ('Ativo','Desligado') then
    raise exception 'Status inválido.';
  end if;
  if not (public.tem_permissao('beneficios','editar') or public.tem_permissao('beneficios','administrar')) then
    raise exception 'Sem permissão para alterar colaboradores.';
  end if;

  select array_agg(distinct coalesce(cm.merged_into_id, cm.id))
    into v_ids
  from public.colaboradores_master cm
  where cm.id = any(p_master_ids);

  if coalesce(array_length(v_ids,1),0) = 0 then
    raise exception 'Nenhum colaborador válido foi informado.';
  end if;

  update public.colaboradores_master
  set status = p_status, updated_by = p_uid, updated_at = now()
  where id = any(v_ids) and merged_into_id is null;
  get diagnostics v_qtd = row_count;

  perform private.sincronizar_status_beneficios_colaboradores(v_ids);
  return jsonb_build_object('atualizados', v_qtd, 'status', p_status);
end;
$$;

revoke all on function private.atualizar_status_colaboradores_lote_impl(uuid,uuid[],text) from public, anon, authenticated;

create or replace function public.atualizar_status_colaboradores_lote(
  p_master_ids uuid[],
  p_status text
)
returns jsonb
language sql
set search_path = ''
as $$
  select private.atualizar_status_colaboradores_lote_impl(auth.uid(), p_master_ids, p_status);
$$;

revoke all on function public.atualizar_status_colaboradores_lote(uuid[],text) from public, anon;
grant execute on function public.atualizar_status_colaboradores_lote(uuid[],text) to authenticated;

-- Luiz: mantém o registro completo (RH + CPF) como canônico e preserva o duplicado desligado.
insert into private.colaborador_aliases(colaborador_master_id, alias, alias_norm)
select id, 'LUIZ HENRIQUE XIMENES DA COSTRA', private.normalizar_nome_colaborador('LUIZ HENRIQUE XIMENES DA COSTRA')
from public.colaboradores_master where nome = 'LUIZ HENRIQUE XIMENES DA COSTA' and merged_into_id is null
on conflict (alias_norm) do update set colaborador_master_id = excluded.colaborador_master_id, alias = excluded.alias;

update public.colaboradores_master d
set status = 'Desligado', merged_into_id = c.id,
    observacoes = concat_ws(E'\n', nullif(d.observacoes,''), 'Cadastro unificado em LUIZ HENRIQUE XIMENES DA COSTA; registro preservado para auditoria.'),
    updated_at = now()
from public.colaboradores_master c
where d.nome = 'LUIZ HENRIQUE XIMENES DA COSTRA'
  and c.nome = 'LUIZ HENRIQUE XIMENES DA COSTA'
  and c.merged_into_id is null;

-- Maria Eduarda: grafia canônica FIGUEREDO, agora ligada ao mesmo registro do RH.
insert into private.colaborador_aliases(colaborador_master_id, alias, alias_norm)
select id, 'MARIA EDUARDA FIGUEIREDO MONTEIRO', private.normalizar_nome_colaborador('MARIA EDUARDA FIGUEIREDO MONTEIRO')
from public.colaboradores_master where nome = 'MARIA EDUARDA FIGUEREDO MONTEIRO' and merged_into_id is null
on conflict (alias_norm) do update set colaborador_master_id = excluded.colaborador_master_id, alias = excluded.alias;

update public.colaboradores_master
set rh_colaborador_id = null, updated_at = now()
where nome = 'MARIA EDUARDA FIGUEIREDO MONTEIRO';

update public.colaboradores_master c
set rh_colaborador_id = r.id, origem_fonte = 'ambos', updated_at = now()
from public.rh_colaboradores r
where c.nome = 'MARIA EDUARDA FIGUEREDO MONTEIRO'
  and r.nome = 'MARIA EDUARDA FIGUEIREDO MONTEIRO'
  and c.merged_into_id is null;

update public.colaboradores_master d
set status = 'Desligado', merged_into_id = c.id,
    observacoes = concat_ws(E'\n', nullif(d.observacoes,''), 'Cadastro unificado em MARIA EDUARDA FIGUEREDO MONTEIRO; registro preservado para auditoria.'),
    updated_at = now()
from public.colaboradores_master c
where d.nome = 'MARIA EDUARDA FIGUEIREDO MONTEIRO'
  and c.nome = 'MARIA EDUARDA FIGUEREDO MONTEIRO'
  and c.merged_into_id is null;

update public.rh_colaboradores
set nome = 'MARIA EDUARDA FIGUEREDO MONTEIRO', atualizado_em = now()
where nome = 'MARIA EDUARDA FIGUEIREDO MONTEIRO';

-- Corrige nomes nos cadastros operacionais atuais. Históricos não entram nesta lista.
update public.ben_state b
set valor = (
  select jsonb_agg(
    case
      when private.normalizar_nome_colaborador(e.item->>'nome') = private.normalizar_nome_colaborador('LUIZ HENRIQUE XIMENES DA COSTRA')
        then e.item || jsonb_build_object('nome','LUIZ HENRIQUE XIMENES DA COSTA','cpf','410.737.888-81')
      when private.normalizar_nome_colaborador(e.item->>'nome') = private.normalizar_nome_colaborador('MARIA EDUARDA FIGUEIREDO MONTEIRO')
        then e.item || jsonb_build_object('nome','MARIA EDUARDA FIGUEREDO MONTEIRO')
      else e.item
    end order by e.ord
  )
  from jsonb_array_elements(b.valor) with ordinality e(item,ord)
), updated_at = now()
where b.chave in ('liga_emp','liga_med_registros','liga_mestre','liga_mob_colaboradores','liga_prud_registros','liga_vt_registros')
  and jsonb_typeof(b.valor) = 'array';

-- Consolida o módulo do seguro do Luiz no cadastro mestre canônico; o item legado fica inativo e rastreável.
update public.ben_state b
set valor = (
  select jsonb_agg(
    case
      when b.chave = 'liga_mestre' and (e.item->>'id')::int = 27
        then jsonb_set(e.item, '{modulos}', coalesce(e.item->'modulos','{}'::jsonb) || jsonb_build_object('prud', jsonb_build_object('cadastradoEm', now())), true)
      when b.chave = 'liga_mestre' and (e.item->>'id')::int = 52
        then e.item || jsonb_build_object('vinculo','DESLIGADO','unificadoEmId',27,'desligamento',to_char(current_date,'DD/MM/YYYY'))
      when b.chave = 'liga_prud_registros' and private.normalizar_nome_colaborador(e.item->>'nome') = private.normalizar_nome_colaborador('LUIZ HENRIQUE XIMENES DA COSTA')
        then e.item || jsonb_build_object('employeeId',26,'cpf','410.737.888-81')
      else e.item
    end order by e.ord
  ) from jsonb_array_elements(b.valor) with ordinality e(item,ord)
), updated_at = now()
where b.chave in ('liga_mestre','liga_prud_registros');

-- Reaplica o status atual da Central aos módulos correntes (inclui Allana e Gustavo).
select private.sincronizar_status_beneficios_colaboradores(array_agg(id))
from public.colaboradores_master
where merged_into_id is null;
