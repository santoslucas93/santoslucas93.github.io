# Painel LNB — mapa funcional da experiência móvel

## Princípio de arquitetura

A visão móvel é uma camada independente, entregue somente para iPhone, Android, a rota `/mobile/` ou o parâmetro de teste `?lnb_mobile=1`. O desktop não carrega o CSS nem o JavaScript móvel. A camada não recria autenticação, permissões, cálculos ou persistência: ela descobre os controles originais e encaminha o toque para eles. Assim, Supabase, RPC `meu_acesso`, regras de bloqueio, escopos e ações continuam sendo a única fonte de verdade.

O aplicativo móvel oferece cabeçalho compacto, navegação inferior, busca de funções, seletor de módulos conforme o retrato de acesso, gavetas inferiores, alvos de toque de pelo menos 44 px, safe areas do iPhone e transformação de tabelas em fichas rotuladas.

## Central de Colaboradores

- Resumo da base e métricas.
- Busca e filtros por status, origem, departamento, tipo, centro de custo, cesta e consistência.
- Limpeza de filtros, novo colaborador, importação e exportação CSV e regras.
- Consulta da ficha do colaborador, status, origem e benefícios.
- Seleção e ações em lote: centro de custo, departamento, tipo, benefícios, cesta, ativação e desligamento.
- Formulários, detalhes e regras apresentados como folhas inferiores no celular.

## Administração Mestre

- Visão geral.
- Usuários.
- Perfis de acesso.
- Permissões por módulo, tela e ação.
- Departamentos, grupos e linhas.
- Logs de ações.
- Configurações.
- Ações rápidas: novo perfil e exportação de permissões.

## Benefícios

- VR/VA: colaboradores, cálculo mensal, rateio, pedidos avulsos, painel e histórico, importação, dossiê, consolidado e configurações.
- Vale-transporte: colaboradores, cálculo, rateio, pedidos avulsos, painel e histórico, importação, dossiê, consolidado e configurações.
- Assistência médica: colaboradores, cálculo, rateio, painel e histórico, importação, dossiê, consolidado e configurações.
- Prudential: colaboradores, cálculo, rateio, painel e histórico, importação, dossiê, consolidado e configurações.
- Mobilidade: painel, colaboradores e departamentos, importação, relatórios e dossiê.
- Troca do tipo de benefício e preservação de todas as ações, exportações e controles já existentes.

## Orçado x Realizado

- Home e Receitas.
- Superintendência, Comunicação, Marketing, Técnico Operacional, Administrativo & Financeiro e Equipes.
- Competições, Créditos dos Clubes, Transporte e Hospedagem e Reembolso de Funcionários.
- Gráficos, Realizado, Conciliação e Conciliação Bancária.
- Revisão de IDs, Novo Orçado e Editar Estrutura.
- Guia, Regras, Integridade, Exportar e Lixeira.

## RH & Folha

- Visão geral e Colaboradores.
- Folha mensal, Rubricas e Encargos.
- Movimentações, Planejamento & Provisões e Rateio.
- Histórico, Indicadores e Dossiê.
- Importação e Conciliação.
- Relatórios & Documentos e Custo Real.
- Configurações.
- Funções adicionais injetadas pelo release do RH são descobertas automaticamente pelo observador do menu.
- Chat IA disponível pela navegação inferior quando a função original estiver presente.

## Contrato para novos módulos

Qualquer nova rota HTML atendida pelo Worker herda automaticamente o shell móvel. Para uma integração ideal, o módulo deve usar elementos semânticos de navegação (`nav a` ou `nav button`), títulos em `h1`/`h2`, tabelas com `thead` e botões com texto ou `aria-label`. Módulos com estrutura especializada podem ganhar somente um bloco CSS identificado por `data-lnb-mobile-module`, sem alterar o desktop ou duplicar a lógica funcional.

## Garantias de não regressão

- Requisições desktop retornam o ativo original sem injeção do shell móvel.
- Nenhuma tabela, função, sessão ou chamada ao Supabase é recriada pela camada móvel.
- Respostas autenticadas e páginas transformadas permanecem com `Cache-Control: no-store`.
- A automação de staging valida o desktop intacto, os cinco módulos atuais e a herança de uma rota futura antes da publicação.
