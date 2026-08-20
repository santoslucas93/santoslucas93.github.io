-- Índices para as chaves estrangeiras apontadas pelo advisor de desempenho.
create index if not exists rh_competencias_importado_por_idx
  on public.rh_competencias (importado_por);

create index if not exists rh_auditoria_usuario_idx
  on public.rh_auditoria (usuario_id);
