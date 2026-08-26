# Registro de mudanças do Painel LNB

Este arquivo é o índice humano das mudanças. O detalhamento funcional e os critérios de aceite do RH ficam em `rh/RELEASE_CANDIDATE.md`; o histórico técnico completo fica nos commits e nas migrations de `supabase/migrations/`.

## Staging — v80 (26/08/2026)

- Provisões de férias e 13º da competência 07/2026 passam a usar os demonstrativos oficiais do Domínio como saldo de abertura conciliado.
- Cards exibem saldo provisionado, provisão do mês, encargos sobre saldo e custo total exatamente como nos relatórios contábeis.
- Composição individual separa base provisionada, INSS Empresa, RAT, Terceiros, FGTS, PIS e custo total; estagiários permanecem sem encargos patronais.
- Pop-ups mostram provisão regular, ajuste/diferença, provisionado no mês e saldo atual sem repetir o salário em cada imposto.
- PDF e Excel priorizam a tabela oficial e levam a base e todos os encargos individuais para os relatórios emitidos.
- Simulador de férias, barra de exportação e recibos são preservados; a camada oficial não substitui mais todo o conteúdo da aba.
- Planejamento continua limitado ao quadro atual, enquanto os registros históricos permanecem preservados na fonte oficial.
- Corrigido o agendamento tardio da coluna **Líquido no período**, evitando que ela só apareça após nova renderização.
- RPCs de edição foram endurecidas contra execução por `PUBLIC/anon`, mantendo acesso somente a usuários autenticados com permissão interna válida.
- Alteração restrita ao staging; produção permanece intacta.

## Staging — v79 (26/08/2026)

- Folha importada passa a permitir edição individual de salário, horas, rubricas, bases de INSS/FGTS/IRRF e valores de FGTS/IRRF para usuários autorizados.
- Próxima Folha passa a ter período próprio, com ajuste geral persistido, edição individual auditada e estados **Aberto** e **Encerrado**.
- Competências conferidas ou conciliadas voltam automaticamente para **Importado** após uma edição e exigem nova conferência.
- Períodos encerrados ficam bloqueados; a edição somente é liberada após reabertura explícita e justificada.
- Novas permissões granulares: **Editar folha importada**, **Editar Próxima Folha**, **Encerrar período** e **Reabrir período**.
- Toda edição, encerramento ou reabertura registra usuário, motivo e informações anteriores/novas na auditoria.
- Totais da competência importada são recalculados de forma transacional após a edição individual.
- Alteração restrita ao staging; produção permanece intacta.

## Staging — v78 (25/08/2026)

- Corrigida a sobreposição entre **Ver composição** e a coluna **Alíquota** nos pop-ups tributários.
- Tabelas de impostos passam a usar larguras explícitas e layout fixo, preservando alinhamento em diferentes resoluções.
- Cards consolidados passam a mostrar **uma única linha por colaborador**, sem repetir salário e formação para cada encargo que utiliza a mesma base.
- INSS patronal, RAT, Terceiros, PIS e FGTS continuam discriminados dentro da linha, com total individual conciliado ao total do card.
- A composição deixa de expandir dentro da célula e passa a abrir em uma janela de detalhe própria, sem aumentar ou deformar a linha da tabela.
- A nova janela separa componentes incidentes, verbas fora da base, equação, alíquota e valor do imposto.
- Correção exclusivamente visual e de interação; cálculos, totais, PDF e Excel permanecem inalterados.
- Alteração restrita ao staging; produção permanece intacta.

## Staging — v77 (25/08/2026)

- Cada base tributária individual passa a apresentar sua **formação completa**, sem alterar os valores calculados.
- INSS dos segurados, INSS patronal, RAT, Terceiros, PIS e FGTS discriminam salário proporcional, verbas salariais recorrentes, férias e 1/3 constitucional incidentes.
- IRRF separa remuneração regular, férias e as respectivas deduções legais ou simplificadas que formam a base final.
- Abono pecuniário e 1/3 do abono aparecem expressamente como verbas fora das bases quando existirem.
- Os pop-ups dos impostos recebem a ação **Ver composição** por colaborador.
- O PDF Executivo e a aba **Bases por Imposto** do Excel passam a registrar a formação da base e as exclusões individuais.
- Motor tributário, critérios de incidência, arredondamentos e totais da v76 permanecem inalterados.
- Alteração restrita ao staging; produção permanece intacta.

## Staging — v76 (25/08/2026)

- Pop-ups individuais da Próxima Folha passam a exibir **base de cálculo, alíquota aplicada/efetiva, regra e valor** para INSS dos segurados, IRRF, INSS patronal, RAT, Terceiros, PIS e FGTS.
- IRRF detalha também a dedução utilizada e a redução mensal de 2026; FGTS identifica a regra individual de 8% ou 2% para aprendiz.
- Cards consolidados de Impostos Retidos, Encargos da Empresa e Tributos/Recolhimentos recebem memória tributária completa por colaborador e imposto.
- PDF Executivo inclui base e alíquota no resumo das obrigações e uma nova seção de memória tributária individual.
- Excel Executivo inclui bases diretamente na aba de colaboradores, resumo tributário consolidado e a nova aba **Bases por Imposto**.
- Totais continuam originados do mesmo motor remuneratório aprovado; nenhuma fórmula da Próxima Folha foi alterada.
- Testes de regressão ampliados para impedir a remoção das bases individuais nos pop-ups e relatórios.
- Alteração restrita ao staging; produção permanece intacta.

## Staging — v75 (25/08/2026)

- A Central agora abre com um carregamento neutro e imediato enquanto valida ou renova a sessão já existente.
- O formulário de entrada permanece oculto durante essa validação, eliminando a impressão de logout ao voltar de qualquer módulo.
- A interface autenticada só é revelada depois da conferência de acesso; o login só aparece quando realmente não há uma sessão válida.
- Incluído teste de regressão específico para a transição de autenticação e acessibilidade do carregamento.
- O fluxo da branch principal foi alinhado ao staging para reconstruir e validar todo o release atual do RH antes do deploy, evitando regressão na promoção.

## Staging — v74 (25/08/2026)

- Permissões passa a abrir por **crachá**, com fluxo didático em três etapas: escolher, definir e revisar antes de salvar.
- **Acessos por Módulo** torna-se a tela principal; escopo do Orçado, permissões especiais e usuários do crachá permanecem como áreas complementares.
- Cada permissão pode ser marcada individualmente com estado visual de checkbox, sem perder a indicação Permitido/Bloqueado.
- Inclusão de comandos para liberar ou bloquear uma **coluna inteira**, uma **linha inteira** ou **todas as permissões do módulo**, incluindo permissões especiais quando o módulo inteiro é liberado.
- Filtro por módulo e contadores em tempo real mostram quantas permissões estão liberadas em cada módulo e coluna.
- Nova ação **Desfazer última ação** recupera uma seleção individual ou em massa; a troca de crachá avisa sobre alterações não salvas.
- Antes da gravação, uma revisão informa liberações, bloqueios, detalhes e todos os usuários impactados pelo crachá.
- O próprio crachá pode ser atribuído a um usuário na aba **Usuários deste Crachá**, com validade opcional.
- Testes automatizados cobrem seleção por módulo, coluna, linha, desfazer, revisão e preservação do CRUD de usuários e perfis.
- Alteração restrita à branch `staging`; produção permanece sem esta nova interface.

## Staging — v73 (25/08/2026)

- Gestão de **Usuários** ampliada com criação de conta, edição de nome/e-mail/status/validade, concessão de perfil inicial e exclusão confirmada pelo e-mail.
- Gestão de **Perfis de Acesso** ampliada com formulário uniforme para criar e editar, ativar/inativar e excluir perfis sem titulares.
- Perfis do sistema, perfis de acesso total e perfis ainda vinculados a usuários são protegidos contra exclusão acidental.
- Exclusão do próprio usuário conectado bloqueada na interface e no servidor; a proteção existente impede remover o último Administrador Mestre ativo.
- Operações sobre contas do Supabase executadas exclusivamente por função de servidor com JWT obrigatório; a chave de serviço não é exposta no navegador.
- Criação, edição e exclusão de usuários registradas no log de atividades sem armazenar senhas.
- Alteração restrita à interface da branch `staging`; produção permanece sem a nova tela.

## Staging — v72 (25/08/2026)

- Eliminada a reentrada que reiniciava continuamente o carregamento da remuneração ao selecionar um colaborador no simulador de férias.
- Seletores de Férias e Rescisões limitados à situação funcional **Trabalhando**; desligados, afastados, pessoas em férias e licenças não aparecem.
- Coluna **Salário atual** adicionada em Colaboradores, baseada na última folha mensal importada e carregada em uma única consulta com cache.
- Coluna **Bruto** renomeada para **Bruto no período**, com Encargos e Líquido também identificados como valores do período filtrado.
- Grade de Colaboradores protegida por largura mínima e rolagem horizontal responsiva, evitando compressão ou quebra das informações.
- Auditoria do ambiente confirmou que a geração de holerites está pronta, mas o envio externo permanece desativado enquanto o Worker não possuir um provedor/binding de e-mail configurado.
- Alteração restrita ao staging; produção permanece intacta.

## Staging — v69 (25/08/2026)

- Corrigida a ausência do botão **Recibo para assinatura** no layout atual de Rescisões.
- O botão passa a aparecer ao lado de **Gerar PDF** depois da geração do relatório analítico.
- Aplicado o mesmo fallback visual à aba **Férias**, com **Recibos para assinatura** no cabeçalho do painel atual.
- O recibo continua sendo apenas uma exportação em PDF: não altera o status, não salva a rescisão e não efetiva o desligamento.
- Alteração restrita ao staging; produção permanece intacta.

## Staging — v68 (24/08/2026)

- Novo **Simulador de salário e custo LNB** em Planejamento & Provisões, isolado do quadro real e da Próxima Folha.
- Cenários para CLT, aprendiz e estagiário, com salário-base, proventos adicionais, dependentes, deduções e descontos.
- INSS e IRRF calculados pelas tabelas oficiais de 2026, incluindo desconto simplificado, dependentes e redução mensal do imposto.
- Salário-família de 2026 incluído no líquido quando elegível, identificado como provento compensável e sem inflar o custo LNB.
- Encargos patronais detalhados: INSS, RAT, terceiros, PIS e FGTS de 8% ou 2% para aprendiz.
- Benefícios configuráveis: Vale-Transporte com limite de 6%, VR/VA/cesta, assistência médica, seguro de vida e outros.
- Provisões mensais de 13º, férias/recesso, 1/3 constitucional e respectivos encargos.
- Resultados de líquido estimado, custo da competência, custo mensal provisionado e custo anual, com exportação PDF e Excel identificada pelo logo da LNB.
- Alíquotas patronais editáveis e sugeridas a partir da última competência quando a base estiver disponível.
- Alteração restrita ao staging; produção permanece intacta.

## Staging — v67 (24/08/2026)

- Identidade institucional da Liga Nacional de Basquete ampliada para as exportações em PDF e Excel de todos os módulos do painel, incluindo arquivos gerados por jsPDF, ExcelJS e SheetJS.
- Documento individual de férias disponibilizado no Livro de Férias de cada colaborador, com período aquisitivo, gozo, proventos, descontos, líquido e campo para assinatura.
- Documento individual de rescisão preservado com somente verbas e descontos que alteram o líquido do colaborador; encargos patronais permanecem apenas nos relatórios gerenciais.
- Benefícios removidos integralmente da Próxima Folha: cards, tabela, total, custo previsto, PDF e Excel.
- Grade do PDF da Próxima Folha recalibrada para oito colunas, mantendo cabeçalho, corpo e total com as mesmas larguras e alinhamento.
- Alteração restrita ao staging; produção permanece intacta.

## Staging — v66 (24/08/2026)

- Corrigida a grade do PDF **Próxima Folha — Composição por colaborador**: cabeçalho, linhas e total agora usam exatamente as mesmas nove colunas.
- Larguras fixas somando 281 mm eliminam variações automáticas entre nomes, departamentos e valores.
- Títulos e valores financeiros compartilham alinhamento à direita, mantendo a leitura vertical perfeita.
- Logo oficial da LNB aplicado automaticamente a todas as exportações em PDF e a todas as planilhas Excel do RH & Folha.
- Novos recibos de férias e rescisão para assinatura do colaborador, sem FGTS, multa rescisória, INSS patronal, RAT, terceiros ou PIS patronal.
- Relatórios gerenciais completos foram preservados separadamente dos recibos destinados ao colaborador.
- Alteração restrita ao staging; produção permanece intacta.

## Staging — v65 (24/08/2026)

- Holerite executivo em duas vias na mesma folha A4: **Via do Colaborador** e **Via da Empresa**, com linha de corte.
- Logo oficial da Liga Nacional de Basquete carregado do ativo institucional `/rh/lnb-logo.png` e incorporado nas duas vias.
- Declaração, assinatura e data reorganizadas em rodapé horizontal, sem coluna lateral ou texto rotacionado.
- Tabela compacta comporta até 22 rubricas por página; acima disso, o sistema cria automaticamente páginas de continuação sem omitir lançamentos.
- Tela Colaboradores distribuída em três áreas: **Filtros e consulta**, **Cadastro e quadro** e **Holerites e controles**.
- Todas as funções anteriores foram preservadas; somente a hierarquia e a distribuição visual foram alteradas.
- Alteração restrita ao staging; produção permanece intacta.

## Staging — v64 (24/08/2026)

- Holerite ajustado para reservar uma faixa lateral mais larga: a declaração não invade mais a coluna de descontos e a assinatura ganhou área útil maior.
- Ações individuais de PDF, e-mail e Controles de DP removidas das linhas da tabela e concentradas no pop-up do colaborador.
- Barra de ações de Colaboradores organizada uniformemente em uma grade responsiva de seis funções, sempre na mesma ordem.
- Geração e envio em lote preservados na barra principal.
- Menu lateral compactado e com rolagem interna de segurança, permitindo acessar Relatórios & Documentos, Custo Real e Configurações sem F11.
- Remetente de staging preparado como `holerites@liganacionaldebasquete.com.br`; disparo continua bloqueado até a ativação do Email Sending e do binding `EMAIL` na Cloudflare.

## Staging — v63 (24/08/2026)

- Holerite redesenhado conforme o modelo da LNB: duas vias por página, identificação funcional, eventos, totais, bases e assinatura.
- Geração individual e em lote em Colaboradores, respeitando competência e filtros atuais.
- Envio individual e em lote por e-mail, com validação de destinatários, autorização no servidor e histórico auditável.
- Central de pendências de DP com Livro de Férias, alertas de limite concessivo, checklists de admissão/desligamento, experiência e documentos/exames com vencimento.
- Histórico de holerites enviados e confirmação manual de recebimento.
- Nova infraestrutura de dados protegida por RLS e RPCs administrativas auditadas.
- O disparo externo permanece desativado até a configuração segura do remetente e do provedor no Worker.

## Staging — v61 (24/08/2026)

- Status Desligado em vermelho e filtros por situação priorizando Trabalhando.
- Abertura na competência da última folha importada.
- Cadastro completo de colaborador com opções de benefícios, incluindo Vale Transporte.
- Alteração de status ao clicar no selo do colaborador, com auditoria.
- Sincronização segura entre RH, Benefícios e Mobilidade; correspondências ambíguas não são gravadas automaticamente.
- Sincronização do Quadro atual com a última folha, com salvamento automático e preservação de alterações manuais posteriores.
- Holerites em PDF e alertas preventivos de férias.
- Correção global de palavras coladas em conteúdo estático e dinâmico.
- Pente-fino de consistência documentado na Release Candidate.

Nenhuma alteração desta versão foi promovida para a branch `principal`.

## Staging — v62 (24/08/2026)

- Corrigido o erro `V57 is not defined` nos fluxos de cadastro e situação.
- Colaboradores agora representa o quadro cadastrado, incluindo admissões ainda sem folha.
- Popup funcional ao clicar no nome ou status, com admissão, desligamento e alteração auditada de situação.
- Datas históricas de desligamento inferidas pela ausência na folha seguinte.
- Holerites individuais e em lote concentrados em Colaboradores.
- Regra e limitações dos alertas de férias explicadas na própria tela.
## Staging — v70 (25/08/2026)

- Simulador individual de férias com salário-base, adicionais fixos, médias variáveis, período aquisitivo, gozo, abono pecuniário, adiantamento da primeira parcela do 13º, dependentes, pensão, deduções legais, créditos e descontos.
- Cálculo detalhado de proventos, INSS, IRRF, líquido, FGTS, encargos patronais e custo total estimado para a Liga.
- Pacote LNB de férias em três partes: Aviso de Férias, Demonstrativo Analítico e Recibo para Assinatura.
- Pacote LNB de rescisão em quatro partes: Resumo Executivo, Memória Analítica, TRCT detalhado e Recibo/Assinaturas.
- Todos os documentos recebem a identidade e o logo oficial da Liga Nacional de Basquete.
- Geração integralmente reversível: não salva férias, não efetiva rescisão e não altera o status do colaborador.
- Correção do seletor do simulador de férias para acompanhar o carregamento assíncrono da base e repopular automaticamente a lista de colaboradores.
- Ajuste da leitura do estado interno do RH: o simulador deixa de depender de `window.S`, que não existe no bundle isolado do módulo.
- Alteração restrita ao staging; produção permanece intacta.
## Staging — v71 (25/08/2026)

- Composição automática da base de férias a partir do salário vigente, adicionais salariais recorrentes e médias variáveis detectadas no histórico.
- Rubricas de dupla função, adicional de função, gratificação de função, insalubridade e periculosidade incorporadas automaticamente quando presentes na última folha.
- Origem e competência de cada base remuneratória exibidas na tela e no pacote PDF.
- Conferência entre valores importados e valores utilizados, com destaque para ajustes manuais.
- Checklist de dados obrigatórios e documentais antes da emissão do pacote completo.
- Histórico reversível das prévias na sessão, com estados Rascunho e Conferida, sem efetivar férias ou alterar cadastros.
- Teste específico confirma que o adicional de dupla função de 20% integra a base de férias.
- Alteração restrita ao staging; produção permanece intacta.
