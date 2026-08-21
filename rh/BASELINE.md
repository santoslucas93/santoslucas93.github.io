# RH & Folha — Baseline de estabilidade

Este arquivo registra invariantes que não podem ser reintroduzidas por novos hotfixes sem revisão explícita.

## Planejamento & Provisões

- 13º salário considera somente colaboradores ativos na competência mais recente.
- Férias considera somente colaboradores ativos na competência mais recente.
- Próxima folha considera somente colaboradores ativos na competência mais recente.
- Rescisões permite selecionar somente colaboradores ativos no quadro atual.
- Colaboradores desligados continuam disponíveis no histórico das competências em que participaram, mas não no planejamento prospectivo.
- O quadro atual tem uma única fonte: `rhRosterLoad` / `rhRosterActiveIds`.

## Visual aprovado

- Não exibir resumo por centro de custo em 13º e Férias.
- Em 13º e Férias, abaixo dos cards exibir somente a relação de nomes dos colaboradores.
- A memória de cálculo completa fica no pop-up aberto ao clicar no colaborador.
- Não reintroduzir a tabela horizontal extensa como visão principal dessas duas provisões.
- Cards não podem usar animação/transição/reflow contínuo nos valores.

## Integridade

- Totais de 13º e Férias devem ser recalculados após a exclusão de colaboradores desligados.
- Totais da próxima folha devem corresponder somente às linhas ativas visíveis.
- O release candidate deve falhar se os patches obsoletos v30 ou v37 voltarem a ser carregados.
- O release candidate deve carregar a stability baseline antes da camada visual v38.
- A verificação automatizada é executada por `scripts/rh-regression-check.js`.

Baseline registrado em 21/08/2026.
