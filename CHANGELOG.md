# Registro de mudanças do Painel LNB

Este arquivo é o índice humano das mudanças. O detalhamento funcional e os critérios de aceite do RH ficam em `rh/RELEASE_CANDIDATE.md`; o histórico técnico completo fica nos commits e nas migrations de `supabase/migrations/`.

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
- Alteração restrita ao staging; produção permanece intacta.
