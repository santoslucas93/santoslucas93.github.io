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

## Custo Real e benefícios
- [x] Proventos + FGTS + INSS patronal + RAT + Terceiros + PIS + benefícios integrados.
- [x] Encargos patronais em vermelho no gráfico.
- [x] Cards clicáveis com composição.
- [x] Filtros de Departamento e Vínculo visíveis no topo.
- [x] Filtros recalculam cards, tabela e gráfico.
- [x] Seguro de Vida, Assistência Médica e Vale Transporte integrados pela Gestão de Benefícios.
- [x] Snapshot mensal de benefícios criado e vinculado ao fluxo de Conciliação/Fechamento.
- [x] Competências com snapshot passam a usar os benefícios históricos em vez da base atual.
- [ ] Confirmar a fonte mensal persistida de VR / VA / Cesta Básica antes de considerar benefícios 100% fechados.

## Auditoria e fechamento
- [x] Auditoria automática usa a competência inteira, sem ser afetada pelos filtros de Departamento/Vínculo.
- [x] Conferência de Proventos, Descontos, Líquido, Headcount, Base FGTS, FGTS, PIS, INSS patronal/RAT/Terceiros, IRRF, departamentos e benefícios.
- [x] Divergências financeiras bloqueantes impedem avanço do fechamento.
- [x] Status da competência: Importado → Conferido → Conciliado → Fechado.
- [x] Alteração de status restrita a administrador do RH e registrada em auditoria.
- [x] Competência fechada protegida contra nova importação ou exclusão.
- [x] Junho/2026 normalizado para status inicial `importado`.

## Histórico comparativo
- [x] Nova tela Histórico com filtro por ano.
- [x] Evolução mensal de Proventos, Descontos e Líquido.
- [x] Evolução de FGTS, Encargos Patronais, PIS e IRRF da folha.
- [x] Headcount e Custo folha + encargos por competência.
- [x] Variação mensal em R$ e percentual a partir da segunda competência.
- [x] Competências e pontos dos gráficos clicáveis com detalhamento e acesso à competência original.
- [x] Benefícios históricos não são replicados retroativamente; a tela só os considera quando houver snapshot mensal persistido.
- [x] Histórico individual por colaborador com departamento, vínculo, proventos, líquido, encargos, benefícios e custo.
- [x] Junho/2026 registrado como mês-base do histórico atual.

## Movimentações
- [x] Snapshot de departamento, vínculo, cargo, situação, centro de custo e admissão em cada competência.
- [x] Admissões e desligamentos identificados na competência.
- [x] Férias identificadas por situação/rubricas regulares, sem tratar verbas proporcionais de rescisão como férias gozadas.
- [x] Afastamentos identificados pela situação do colaborador.
- [x] Transferências/alterações de departamento, vínculo e cargo comparadas contra a competência anterior.
- [x] Filtros globais de Departamento e Vínculo respeitados.
- [x] Movimentações clicáveis com detalhamento.

## Indicadores executivos
- [x] Custo médio por pessoa.
- [x] Encargos como percentual dos proventos.
- [x] Benefícios como percentual do custo.
- [x] Custo médio CLT e Estagiário.
- [x] Custo Real por departamento e custo médio por vínculo em gráficos clicáveis.
- [x] Análise automática das principais variações contra a competência anterior.
- [x] Departamento com maior variação calculado a partir dos snapshots mensais quando houver duas competências.

## Dossiê Executivo
- [x] Nova tela Dossiê com resumo da competência e do escopo filtrado.
- [x] Resumo financeiro, encargos, benefícios, custo médio e Custo Real.
- [x] Rateio por departamento e movimentações da competência.
- [x] Exportação Excel com Resumo Executivo, Departamentos, Colaboradores e Movimentações.
- [x] Geração de versão para impressão/PDF em A4 paisagem.
- [x] Departamento e Vínculo respeitados no relatório e nas exportações.

## Interface
- [x] Tema claro com contraste reforçado.
- [x] Gráficos reconstruídos ao alternar tema.
- [x] Popups responsivos sem rolagem lateral desnecessária.
- [x] Todos os popups fecham com `Esc`.
- [x] Totais nas composições.

## Pendências para fechar a Fase 1
- [ ] Rodada final de regressão em tema claro/escuro, filtros, drill-downs, permissões e login.
- [ ] Reconciliar `staging` com os 11 commits exclusivos da `principal` antes da promoção.
- [ ] Congelar RC final e somente então promover para `principal`.
