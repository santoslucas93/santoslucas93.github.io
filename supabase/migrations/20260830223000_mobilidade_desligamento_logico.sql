-- Mobilidade preserva o cadastro e as corridas no desligamento.
-- Também normaliza o estado produzido pela Central para o valor já usado pela UI.
do $$
declare
  v_definicao text;
begin
  select pg_get_functiondef(
    'private.sincronizar_colaborador_central_operacional(uuid,text,text)'::regprocedure
  ) into v_definicao;

  if position('''situacao'', case when v_ativo then ''ativo'' else ''inativo'' end' in v_definicao) > 0 then
    v_definicao := replace(
      v_definicao,
      '''situacao'', case when v_ativo then ''ativo'' else ''inativo'' end',
      '''situacao'', case when v_ativo then ''ativo'' else ''desligado'' end'
    );
    execute v_definicao;
  end if;
end;
$$;

update public.ben_state
set valor = (
      select coalesce(jsonb_agg(
        case
          when e.item->>'situacao' = 'inativo'
            then e.item || jsonb_build_object('situacao', 'desligado')
          else e.item
        end
        order by e.ord
      ), '[]'::jsonb)
      from jsonb_array_elements(valor) with ordinality e(item, ord)
    ),
    updated_at = now(),
    updated_by = 'migration:mobilidade_desligamento_logico'
where chave = 'liga_mob_colaboradores'
  and jsonb_typeof(valor) = 'array'
  and exists (
    select 1
    from jsonb_array_elements(valor) e(item)
    where e.item->>'situacao' = 'inativo'
  );
