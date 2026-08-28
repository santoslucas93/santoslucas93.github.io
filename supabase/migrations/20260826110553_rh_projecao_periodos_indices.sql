-- Índices de cobertura para as chaves de auditoria do período da Próxima Folha.
create index if not exists rh_projecao_periodos_encerrado_por_idx
  on public.rh_projecao_periodos(encerrado_por)
  where encerrado_por is not null;

create index if not exists rh_projecao_periodos_atualizado_por_idx
  on public.rh_projecao_periodos(atualizado_por)
  where atualizado_por is not null;
