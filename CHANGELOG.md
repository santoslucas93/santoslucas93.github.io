# Registro de mudanças do Painel LNB

Este arquivo é o índice humano das mudanças. O detalhamento funcional e os critérios de aceite do RH ficam em `rh/RELEASE_CANDIDATE.md`; o histórico técnico completo fica nos commits e nas migrations de `supabase/migrations/`.

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
