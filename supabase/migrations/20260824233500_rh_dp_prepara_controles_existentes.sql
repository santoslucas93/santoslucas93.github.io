-- Prepara os controles dos colaboradores já existentes sem presumir que férias históricas foram gozadas.
-- O último período completo é marcado como "a conferir" até validação humana do RH.

insert into public.rh_checklist_itens(colaborador_id,tipo,codigo,descricao,obrigatorio)
select c.id,x.tipo,x.codigo,x.descricao,x.obrigatorio
from public.rh_colaboradores c
cross join (values
  ('admissao','documentos_pessoais','Documentos pessoais conferidos',true),
  ('admissao','contrato','Contrato de trabalho assinado',true),
  ('admissao','esocial','Admissão transmitida ao eSocial',true),
  ('admissao','aso_admissional','ASO admissional válido',true),
  ('admissao','beneficios','Opções de benefícios registradas',true),
  ('admissao','conta_bancaria','Dados bancários conferidos',true),
  ('admissao','acessos','Acessos e equipamentos entregues',false),
  ('desligamento','aviso','Aviso / comunicação de desligamento',true),
  ('desligamento','exame_demissional','Exame demissional concluído',true),
  ('desligamento','calculo_rescisao','Cálculo rescisório conferido',true),
  ('desligamento','esocial','Desligamento transmitido ao eSocial',true),
  ('desligamento','pagamento','Pagamento rescisório confirmado',true),
  ('desligamento','beneficios','Benefícios encerrados',true),
  ('desligamento','acessos','Acessos e equipamentos devolvidos',true)
) as x(tipo,codigo,descricao,obrigatorio)
on conflict (colaborador_id,tipo,codigo) do nothing;

with elegiveis as (
  select c.id,c.admissao,extract(year from age(current_date,c.admissao))::integer anos
  from public.rh_colaboradores c
  where c.admissao is not null
    and current_date >= c.admissao + interval '1 year'
    and lower(coalesce(c.situacao,'')) not in ('desligado','demitido')
), periodos as (
  select id,(admissao + make_interval(years => greatest(anos-1,0)))::date inicio
  from elegiveis
)
insert into public.rh_ferias_periodos(colaborador_id,periodo_aquisitivo_inicio,
  periodo_aquisitivo_fim,limite_concessivo,status,observacao)
select id,inicio,(inicio+interval '1 year - 1 day')::date,
  (inicio+interval '2 years - 1 day')::date,'a_conferir',
  'Período criado automaticamente pela admissão; conferir férias históricas.'
from periodos
on conflict (colaborador_id,periodo_aquisitivo_inicio) do nothing;

insert into public.rh_auditoria(evento,entidade,detalhes,usuario_id)
values ('controles_dp_preparados_em_lote','rh_colaboradores',
  jsonb_build_object('origem','migration_v63','regra_ferias','ultimo_periodo_completo_a_conferir'),null);
