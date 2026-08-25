# RH & Folha — Release Candidate da Fase 1

## Objetivo
Consolidar a Fase 1 de Folha e Administração de Pessoal no staging antes de qualquer publicação na branch `principal`.

## Incremento v64 — Holerite e organização da tela

- [x] Declaração de recebimento isolada da coluna de descontos no PDF.
- [x] Área lateral de assinatura ampliada e campo de data reorganizado.
- [x] Ações individuais de holerite, e-mail e DP disponíveis somente no pop-up do colaborador.
- [x] Ações em lote preservadas no cabeçalho de Colaboradores.
- [x] Seis ações principais ordenadas em grade uniforme e responsiva.
- [x] Navegação lateral compacta e rolável, sem depender de F11.
- [x] Remetente preparado no domínio `liganacionaldebasquete.com.br`.
- [ ] Ativar o Email Sending da Cloudflare, concluir os registros SPF/DKIM/DMARC e adicionar o binding `EMAIL` ao Worker.

## Incremento v63 — Holerites e controles de DP

- [x] Holerite no modelo operacional fornecido pela LNB, com duas vias por A4.
- [x] PDF individual e em lote na tela de Colaboradores.
- [x] Disparo individual e em lote por e-mail, com autorização no Worker e histórico.
- [x] Separação prévia entre destinatários prontos e colaboradores sem e-mail.
- [x] Livro de Férias com período aquisitivo, limite concessivo, programação e status.
- [x] Checklists de admissão e desligamento.
- [x] Alertas de experiência, ASO/documentos e vencimentos configuráveis.
- [x] Histórico de envio e confirmação de recebimento de holerites.
- [ ] Ativar o provedor de e-mail no ambiente após cadastrar remetente e credencial secreta.

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

## Conciliação (motor de conferência)
- [x] Motor de folha (`LNBPayroll`) reconstruído do zero a partir do extrato real, batendo centavo a centavo com INSS, IRRF, FGTS e encargos patronais.
- [x] Painel somente leitura na aba Conciliação: recalcula a competência carregada e compara com o que veio do PDF importado.
- [x] Zero escrita no banco, zero alteração de rubrica importada, zero alteração de patch existente — carregado via `worker.js` depois do release candidate, com try/catch (se faltar ou falhar, o RH segue funcionando normalmente).
- [ ] Rodar ao vivo por um mês antes de decidir se vira fonte de verdade.

## Correções visuais
- [x] v58 — espaçamento entre rótulo, etiqueta e valor nos popups de "Custo para a empresa" e detalhamento de INSS (`.ep-row`/`.ep-tag` não tinham nenhuma regra de CSS, e o texto ficava colado: "FGTSexato", "INSS patronal20% base patronal").
- [x] v61 — correção defensiva em todo o sistema para separar elementos inline adjacentes sem espaço, inclusive conteúdo criado dinamicamente.

## Filtros e navegação
- [x] v59 — filtro global de Status (Trabalhando/Afastado/Desligado) em Colaboradores, Folha Mensal, Custo Real e demais telas, no mesmo padrão dos filtros de Departamento/Vínculo já existentes. Abre priorizando "Trabalhando".
- [x] v59 — período padrão ao abrir o sistema passa a ser a última folha importada, em vez de consolidar todos os anos.
- [x] v61 — clique direto no status em Colaboradores para definir Trabalhando, Férias, Afastado ou Desligado, com motivo e auditoria.
- [x] v61 — sincronização com a última folha salva automaticamente e preserva uma alteração manual feita depois da importação; uma folha mais nova volta a ser a fonte automática.

## Administração de Pessoal — v61
- [x] Cadastro de colaborador com matrícula, admissão, vínculo, cargo, departamento, centro de custo, gestor, contato, salário-base, jornada e observações.
- [x] Opções explícitas de Vale Transporte, VR/VA, Plano de Saúde e Seguro de Vida.
- [x] Sincronização segura com cadastros de Benefícios e Mobilidade somente quando há correspondência única por nome normalizado; casos ambíguos ficam pendentes de revisão.
- [x] Geração de holerites em PDF por competência, respeitando os filtros atuais.
- [x] Alertas preventivos de férias vencidas e próximas de 90 dias, claramente marcados como estimativa a conferir com recibos e períodos gozados.
- [x] Pente-fino financeiro: última folha mensal confere em proventos, descontos, líquido e FGTS entre total oficial e soma individual.
- [ ] Persistir os snapshots mensais de benefícios (a tabela histórica ainda está vazia); sem isso, benefícios retroativos do Custo Real não podem ser considerados fechados.
- [ ] Revisar manualmente cadastros sem correspondência única entre os módulos e preencher datas de desligamento históricas ausentes.

## Holerites e organização de Colaboradores — v65

- [x] Duas vias completas por folha A4, identificadas como Via do Colaborador e Via da Empresa.
- [x] Logo oficial da LNB incorporado no cabeçalho de ambas as vias.
- [x] Declaração, assinatura e data em rodapé horizontal independente dos lançamentos e totais.
- [x] Até 22 rubricas por página e paginação automática para competências com volume superior.
- [x] Valores, bases, competência e dados funcionais preservados nas páginas de continuação.
- [x] Filtros agrupados separadamente das ações operacionais.
- [x] Ações divididas entre Cadastro e quadro e Holerites e controles, sem excluir permissões ou funcionalidades.

## Correções funcionais — v62
- [x] Removida a dependência indevida do escopo privado do v57 que causava `V57 is not defined` e impedia o cadastro.
- [x] Novo colaborador passa a aparecer imediatamente em Colaboradores, mesmo antes da primeira folha.
- [x] Clique no nome ou na situação abre o cadastro funcional com admissão, desligamento, última folha e seletor de situação.
- [x] Data automática de desligamento definida como o primeiro dia da competência seguinte à última folha em que o colaborador apareceu; alterações manuais posteriores permanecem soberanas.
- [x] Holerite individual disponível em cada colaborador com folha na competência e geração em lote no cabeçalho de Colaboradores.
- [x] Alerta de férias recalculado ao abrir Colaboradores: atenção a 90 dias e vermelho após o limite, ainda identificado como estimativa até existir um livro de férias efetivamente gozadas.

## Pendências para fechar a Fase 1
- [ ] Rodada final de regressão em tema claro/escuro, filtros, drill-downs, permissões e login.
- [ ] Reconciliar `staging` com os 11 commits exclusivos da `principal` antes da promoção.
- [ ] Congelar RC final e somente então promover para `principal`.
