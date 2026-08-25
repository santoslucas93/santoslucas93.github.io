/* RH v58 — corrige separacao visual nos popups de Custo para a Empresa e
   detalhamento de INSS: o rotulo (<span>), a etiqueta (<small class="ep-tag">)
   e o valor (<strong>) de cada linha (.ep-row) nao tinham nenhuma regra de
   CSS propria, entao o navegador encostava o texto de elementos inline
   adjacentes sem espaco nenhum (ex.: "FGTSexato", "INSS patronal20% base
   patronal"). Aqui so adicionamos espacamento via CSS: nao mexe em nenhum
   calculo, nenhuma leitura de dado, nenhuma rubrica. */
(function(){
'use strict';
if(document.getElementById('_rh_v58_styles'))return;
var st=document.createElement('style');
st.id='_rh_v58_styles';
st.textContent=
  '.ep-row{display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--line-soft)}'+
  '.ep-row:last-child{border-bottom:0}'+
  '.ep-row>span{flex:1 1 auto;min-width:0;color:var(--muted);font-size:12px;overflow-wrap:anywhere}'+
  '.ep-row>span b{color:var(--text)}'+
  '.ep-tag{flex:none;display:inline-block;color:var(--muted);font-size:10px;font-weight:700;background:var(--surface-2);border:1px solid var(--line-soft);border-radius:999px;padding:2px 9px;white-space:nowrap}'+
  '.ep-row>strong{flex:none;font-size:13px;font-variant-numeric:tabular-nums}'+
  '.ep-row.ep-total{border-bottom:0;border-top:1px solid var(--line-soft);margin-top:4px;padding-top:14px}';
document.head.appendChild(st);
})();
