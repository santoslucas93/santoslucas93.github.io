-- Fecha a execução anônima das RPCs de RH e preserva somente as rotas públicas
-- necessárias à interface autenticada. As próprias RPCs continuam validando
-- as permissões granulares antes de ler ou alterar qualquer dado.

begin;

revoke all on function public.rh_atualizar_colaborador(uuid,text,date,text,text,text,text,text,text,date,text,text,numeric,numeric,text,boolean,boolean,boolean,boolean,text) from public, anon;
grant execute on function public.rh_atualizar_colaborador(uuid,text,date,text,text,text,text,text,text,date,text,text,numeric,numeric,text,boolean,boolean,boolean,boolean,text) to authenticated;

revoke all on function public.rh_salvar_parametros_projecao(uuid,date,integer,numeric,numeric,numeric,integer,integer,text) from public, anon;
revoke all on function public.rh_atualizar_salario_folha(uuid,numeric,text) from public, anon;
revoke all on function public.rh_atualizar_status_competencia(uuid,text) from public, anon;

grant execute on function public.rh_salvar_parametros_projecao(uuid,date,integer,numeric,numeric,numeric,integer,integer,text) to authenticated;
grant execute on function public.rh_atualizar_salario_folha(uuid,numeric,text) to authenticated;
grant execute on function public.rh_atualizar_status_competencia(uuid,text) to authenticated;

notify pgrst, 'reload schema';

commit;
