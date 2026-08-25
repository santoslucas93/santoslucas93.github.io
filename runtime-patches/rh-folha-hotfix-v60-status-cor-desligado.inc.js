/* RH & Folha — hotfix v60: corrige a cor do status "Desligado" na lista de
   Colaboradores. O renderPeople() original só reconhecia a palavra "Demitido"
   (regex /demit/i) para colorir o badge de vermelho; como o texto real usado
   pelo sistema é "Desligado", o badge caía no else e saía verde. Aqui só
   recolorimos o badge depois que a lista é montada — não mexe em nenhum
   cálculo, nenhuma leitura de dado, nenhuma rubrica. */
(function(){
'use strict';
var _rhV60BaseRenderPeople=renderPeople;
function rhV60FixStatusColors(){
  document.querySelectorAll('#employee-rows .status').forEach(function(el){
    var dismissed=/demit|deslig|rescis|rescind|inativ|transferid/i.test(el.textContent||'');
    el.classList.toggle('danger',dismissed);
    el.classList.toggle('success',!dismissed);
  });
}
renderPeople=function(){
  var r=_rhV60BaseRenderPeople.apply(this,arguments);
  rhV60FixStatusColors();
  return r;
};
})();
