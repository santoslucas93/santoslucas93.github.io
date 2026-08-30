-- Corrige a normalizacao para funcionar independentemente de
-- standard_conforming_strings. Nao altera dados existentes.

create or replace function private.colaborador_cpf_digitos(p_cpf text)
returns text
language sql
immutable
set search_path = ''
as $$
  select nullif(regexp_replace(coalesce(p_cpf, ''), '[^0-9]', '', 'g'), '');
$$;

revoke all on function private.colaborador_cpf_digitos(text)
  from public, anon, authenticated;

create or replace function private.colaborador_proximo_id(p_itens jsonb)
returns integer
language sql
immutable
set search_path = ''
as $$
  select coalesce(max(
    case when (item->>'id') ~ '^[0-9]+$' then (item->>'id')::integer end
  ), 0) + 1
  from jsonb_array_elements(
    case when jsonb_typeof(p_itens) = 'array' then p_itens else '[]'::jsonb end
  ) item;
$$;

revoke all on function private.colaborador_proximo_id(jsonb)
  from public, anon, authenticated;

notify pgrst, 'reload schema';
