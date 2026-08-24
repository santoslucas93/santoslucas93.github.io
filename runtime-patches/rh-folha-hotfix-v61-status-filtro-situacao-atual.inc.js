/* RH & Folha — hotfix v61: corrige o filtro global de Status (v59) para
   priorizar a situação ATUAL do colaborador (p.situacao) em vez do snapshot
   de uma competência específica (p.situacao_snapshot). Na consulta
   consolidada de Colaboradores ("Todos os anos"), o mesmo registro pode
   carregar os dois campos com valores diferentes — o crachá já usa
   p.situacao para exibir (corrigido no v60), mas o filtro v59 priorizava
   o snapshot, então um colaborador já Desligado podia continuar aparecendo
   ao filtrar "Trabalhando". Não mexe em nenhum cálculo de folha, rescisão
   ou nos snapshots históricos usados em Movimentações/Rescisão — só o
   critério do filtro global de Status muda. */
rhSituacaoCategory=function(p){
    var v=cleanSearch((p&&(p.situacao||p.situacao_snapshot))||'');
    if(/demit|deslig|rescis|rescind|inativ|transferid/.test(v))return 'desligado';
    if(/afast|licenca|ferias/.test(v))return 'afastado';
    return 'trabalhando';
};
