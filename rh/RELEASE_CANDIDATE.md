# RH & Folha — Release Candidate da Fase 1

## Objetivo
Consolidar a Fase 1 de Folha e Administração de Pessoal no staging antes de qualquer publicação na branch `principal`.

## Estrutura e estabilidade
- [x] Login único e validação de permissões funcionando no módulo.
- [x] Staging separado de produção.
- [x] Bundle único de runtime do RH gerado no CI a partir dos hotfixes aprovados.
- [x] `node --check` no bundle e no JavaScript efetivamente injetado antes do deploy.
- [x] Worker passa a carregar um único bundle da Release Candidate.
- [x] Preview só é registrado após o deploy terminar.
- [ ] Reconciliar os 11 commits existentes em `principal` que não estão em `staging` antes da promoção final.

## Visão Geral
- [x] Cards de Proventos, Descontos, Líquido e Pessoas na Folha clicáveis.
- [x] Quadro de vínculos com totais de CLT, Estagiários e Outros.
- [x] Gráficos clicáveis com composição.
- [x] Departamentos recalculados pelos colaboradores da competência.
- [x] Mario em Técnica/Projetos, Geiseane em Financeiro, Patricia e Isabel em Superintendência.
- [x] Padronização visual de Superintendência.
- [x] Filtros globais de Departamento e Vínculo alteram cards e gráficos.

## Colaboradores e Folha Mensal
- [x] Folha Mensal em ordem alfabética.
- [x] Filtros de Departamento e Vínculo.
- [x] Composição individual separa encargos de benefícios.
- [x] PIS incluído nos encargos patronais individuais.
- [x] Kaua de Campos Rufino uniformizado.
- [x] Maria Eduarda Figueredo Monteiro uniformizada.

## Rubricas
- [x] Filtros de Departamento e Vínculo.
- [x] Tabela e gráfico respeitam o escopo filtrado.
- [x] Rubricas clicáveis com composição por colaborador.
- [x] Total no rodapé das composições.

## Encargos
- [x] INSS, FGTS, PIS e IRRF com drill-down.
- [x] PIS distribuído por colaborador preservando o total oficial.
- [x] Total de recolhimentos.
- [x] Cinco cards em uma linha no desktop.
- [x] Filtros de Departamento e Vínculo recalculam cards, gráfico e popups.
- [x] Correção de caracteres especiais.

## Rateio
- [x] Departamento clicável com composição por colaborador.
- [x] Filtros globais respeitados.
- [x] Popups e tabelas sem rolagem lateral desnecessária.
- [x] Totais ao final das colunas numéricas.

## Custo Real
- [x] Proventos + FGTS + INSS patronal + RAT + Terceiros + PIS + benefícios integrados.
- [x] Encargos patronais em vermelho no gráfico.
- [x] Cards clicáveis com composição.
- [x] Filtros de Departamento e Vínculo visíveis no topo.
- [x] Filtros recalculam cards, tabela e gráfico.
- [x] Seguro de Vida, Assistência Médica e Vale Transporte integrados pela Gestão de Benefícios.
- [ ] Confirmar a fonte mensal persistida de VR / VA / Cesta Básica antes de considerar benefícios 100% fechados.

## Interface
- [x] Tema claro com contraste reforçado.
- [x] Gráficos reconstruídos ao alternar tema.
- [x] Popups responsivos sem rolagem lateral desnecessária.
- [x] Todos os popups fecham com `Esc`.
- [x] Totais nas composições.

## Pendências para fechar a Fase 1
- [ ] Auditoria de fechamento da competência: folha, FGTS, PIS, INSS/RAT/Terceiros, benefícios e departamentos.
- [ ] Status da competência: Importado → Conferido → Conciliado → Fechado.
- [ ] Consolidar histórico comparativo entre competências.
- [ ] Revisar Movimentações: admissões, desligamentos, férias e afastamentos.
- [ ] Dossiê/relatório executivo em PDF/Excel.
- [ ] Rodada final de regressão em tema claro/escuro, filtros, drill-downs, permissões e login.
- [ ] Congelar RC final e somente então promover para `principal`.
