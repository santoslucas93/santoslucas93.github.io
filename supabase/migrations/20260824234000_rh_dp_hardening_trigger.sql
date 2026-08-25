-- Função usada somente por trigger: não deve ser chamável pela API REST.
revoke all on function public.rh_preparar_checklists_novo_colaborador() from public,anon,authenticated;
