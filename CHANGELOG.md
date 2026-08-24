# Registro de mudanças do Painel LNB

Este arquivo é o índice humano das mudanças. O detalhamento funcional e os critérios de aceite do RH ficam em `rh/RELEASE_CANDIDATE.md`; o histórico técnico completo fica nos commits e nas migrations de `supabase/migrations/`.

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
