-- Índices de suporte às chaves estrangeiras do motor de provisões.
create index if not exists rh_provisoes_colaboradores_folha_idx
  on public.rh_provisoes_colaboradores (folha_colaborador_id)
  where folha_colaborador_id is not null;

create index if not exists rh_provisoes_fechamentos_calculado_por_idx
  on public.rh_provisoes_fechamentos (calculado_por)
  where calculado_por is not null;

create index if not exists rh_provisoes_oficiais_folha_competencia_idx
  on public.rh_provisoes_oficiais (folha_competencia_id)
  where folha_competencia_id is not null;

create index if not exists rh_provisoes_oficiais_importado_por_idx
  on public.rh_provisoes_oficiais (importado_por)
  where importado_por is not null;
