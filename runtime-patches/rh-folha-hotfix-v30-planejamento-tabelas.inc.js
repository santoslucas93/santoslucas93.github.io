/* RH & Folha — hotfix v30: leitura organizada das tabelas de Planejamento & Provisões */
(function(){
  'use strict';
  function E(id){return document.getElementById(id);}
  function rhV30Kind(table){
    var t=String(table&&table.textContent||'').toLowerCase();
    if(t.indexOf('vencimento')>=0&&t.indexOf('férias')>=0)return 'ferias';
    if(t.indexOf('salário')>=0&&t.indexOf('adiant')>=0)return '13';
    return '';
  }
  function rhV30GroupRow(kind){
    var tr=document.createElement('tr');tr.className='rh30-group-head';
    if(kind==='ferias')tr.innerHTML='<th colspan="5">Colaborador e período</th><th colspan="8">Movimentação da provisão</th><th colspan="6">Encargos e custo</th>';
    else tr.innerHTML='<th colspan="4">Colaborador e base</th><th colspan="6">Movimentação da provisão</th><th colspan="6">Encargos e custo</th>';
    return tr;
  }
  function rhV30MarkColumns(table,kind){
    var starts=kind==='ferias'?[1,6,14]:[1,5,11];
    table.querySelectorAll('thead tr:not(.rh30-group-head),tbody tr,tfoot tr').forEach(function(tr){
      Array.from(tr.children).forEach(function(cell,i){
        cell.classList.toggle('rh30-group-start',starts.indexOf(i+1)>=0);
        if(i>0)cell.classList.add('rh30-no-wrap');
      });
    });
  }
  function rhV30DecorateTable(table){
    if(!table||!table.classList.contains('rh26-wide'))return;
    var kind=rhV30Kind(table);if(!kind)return;
    table.classList.add('rh30-readable','rh30-'+kind);
    table.dataset.rh30=kind;
    var thead=table.tHead;
    if(thead&&!thead.querySelector('.rh30-group-head'))thead.insertBefore(rhV30GroupRow(kind),thead.firstChild);
    rhV30MarkColumns(table,kind);
    var wrap=table.closest('.table-wrap');
    if(wrap){
      wrap.classList.add('rh30-scroll');
      if(!wrap.previousElementSibling||!wrap.previousElementSibling.classList.contains('rh30-scroll-note')){
        var note=document.createElement('div');note.className='rh30-scroll-note';
        note.innerHTML='<span>↔</span><b>Visualização detalhada</b><span>Role horizontalmente para consultar todas as colunas. Colaborador e CC permanecem fixos.</span>';
        wrap.parentNode.insertBefore(note,wrap);
      }
    }
  }
  function rhV30DecoratePlanningTables(root){
    root=root||E('page-planejamento');if(!root)return;
    root.querySelectorAll('table.rh26-wide').forEach(rhV30DecorateTable);
  }
  function rhV30Styles(){
    if(E('_rh30'))return;
    var s=document.createElement('style');s.id='_rh30';s.textContent='\
#page-planejamento .rh30-scroll-note{display:flex;align-items:center;gap:9px;margin:0 18px 10px;padding:8px 11px;border:1px solid var(--line-soft);border-radius:10px;background:color-mix(in srgb,var(--surface-2) 84%,transparent);font-size:.68rem;color:var(--muted)}\
#page-planejamento .rh30-scroll-note>b{color:var(--text);font-size:.7rem;white-space:nowrap}#page-planejamento .rh30-scroll-note>span:first-child{color:var(--gold);font-size:1rem;font-weight:900}\
#page-planejamento .rh30-scroll{overflow-x:auto!important;overflow-y:visible;scrollbar-gutter:stable;overscroll-behavior-x:contain;padding-bottom:8px}\
#page-planejamento table.rh30-readable{table-layout:fixed!important;border-collapse:separate!important;border-spacing:0!important;font-size:.76rem!important}\
#page-planejamento table.rh30-ferias{min-width:2380px!important}#page-planejamento table.rh30-13{min-width:2050px!important}\
#page-planejamento table.rh30-readable thead th{padding:10px 9px!important;line-height:1.15!important;white-space:normal!important;word-break:normal!important;overflow-wrap:normal!important;vertical-align:middle!important;background:var(--surface-2)!important}\
#page-planejamento table.rh30-readable thead tr:not(.rh30-group-head) th{border-bottom:1px solid var(--line-soft)!important}\
#page-planejamento table.rh30-readable .rh30-group-head th{height:34px!important;padding:7px 10px!important;text-align:left!important;color:var(--gold-2)!important;font-size:.64rem!important;font-weight:900!important;letter-spacing:.09em!important;text-transform:uppercase!important;border-bottom:1px solid color-mix(in srgb,var(--gold) 28%,var(--line-soft))!important;background:color-mix(in srgb,var(--gold) 6%,var(--surface-2))!important}\
#page-planejamento table.rh30-readable tbody td,#page-planejamento table.rh30-readable tfoot td{padding:12px 9px!important;vertical-align:middle!important;line-height:1.25!important;border-bottom:1px solid var(--line-soft)!important}\
#page-planejamento table.rh30-readable tbody tr:nth-child(even) td{background:color-mix(in srgb,var(--surface-2) 48%,transparent)}#page-planejamento table.rh30-readable tbody tr:hover td{background:color-mix(in srgb,var(--gold) 7%,var(--surface))!important}\
#page-planejamento table.rh30-readable td:first-child,#page-planejamento table.rh30-readable thead tr:not(.rh30-group-head) th:first-child{width:220px!important;min-width:220px!important;max-width:220px!important;white-space:normal!important;word-break:normal!important;overflow-wrap:break-word!important}\
#page-planejamento table.rh30-readable td:first-child b{display:block;line-height:1.2!important;font-size:.78rem!important}#page-planejamento table.rh30-readable td:first-child small{font-size:.67rem!important;line-height:1.2!important}\
#page-planejamento table.rh30-readable td:nth-child(2),#page-planejamento table.rh30-readable thead tr:not(.rh30-group-head) th:nth-child(2){width:86px!important;min-width:86px!important;max-width:86px!important}\
#page-planejamento table.rh30-ferias td:nth-child(3),#page-planejamento table.rh30-ferias thead tr:not(.rh30-group-head) th:nth-child(3){width:110px!important;min-width:110px!important}#page-planejamento table.rh30-ferias td:nth-child(4),#page-planejamento table.rh30-ferias th:nth-child(4){width:76px!important}#page-planejamento table.rh30-ferias td:nth-child(5),#page-planejamento table.rh30-ferias th:nth-child(5){width:68px!important}\
#page-planejamento table.rh30-readable .money,#page-planejamento table.rh30-readable .rh30-no-wrap{white-space:nowrap!important;word-break:normal!important;overflow-wrap:normal!important}#page-planejamento table.rh30-readable .money{text-align:right!important;font-variant-numeric:tabular-nums}\
#page-planejamento table.rh30-readable .rh30-group-start{border-left:2px solid color-mix(in srgb,var(--gold) 28%,var(--line-soft))!important}\
#page-planejamento table.rh30-readable tbody td:first-child,#page-planejamento table.rh30-readable tfoot td:first-child,#page-planejamento table.rh30-readable thead tr:not(.rh30-group-head) th:first-child{position:sticky;left:0;z-index:4;background:var(--surface)!important;box-shadow:8px 0 14px -14px rgba(0,0,0,.7)}\
#page-planejamento table.rh30-readable tbody td:nth-child(2),#page-planejamento table.rh30-readable tfoot td:nth-child(2),#page-planejamento table.rh30-readable thead tr:not(.rh30-group-head) th:nth-child(2){position:sticky;left:220px;z-index:3;background:var(--surface)!important;box-shadow:8px 0 14px -14px rgba(0,0,0,.7)}\
#page-planejamento table.rh30-readable tbody tr:nth-child(even) td:first-child,#page-planejamento table.rh30-readable tbody tr:nth-child(even) td:nth-child(2){background:color-mix(in srgb,var(--surface-2) 82%,var(--surface))!important}\
#page-planejamento table.rh30-readable tbody tr:hover td:first-child,#page-planejamento table.rh30-readable tbody tr:hover td:nth-child(2){background:color-mix(in srgb,var(--gold) 9%,var(--surface))!important}\
#page-planejamento table.rh30-readable tfoot td{position:sticky;bottom:0;z-index:5;background:var(--surface-2)!important;border-top:2px solid var(--gold)!important;font-weight:850!important}#page-planejamento table.rh30-readable tfoot td:first-child{z-index:7;background:var(--surface-2)!important}#page-planejamento table.rh30-readable tfoot td:nth-child(2){z-index:6;background:var(--surface-2)!important}\
#page-planejamento table.rh30-readable::-webkit-scrollbar{height:10px}\
@media(max-width:900px){#page-planejamento .rh30-scroll-note{margin-left:10px;margin-right:10px;align-items:flex-start;flex-wrap:wrap}#page-planejamento table.rh30-readable td:first-child,#page-planejamento table.rh30-readable thead tr:not(.rh30-group-head) th:first-child{width:190px!important;min-width:190px!important;max-width:190px!important}#page-planejamento table.rh30-readable tbody td:nth-child(2),#page-planejamento table.rh30-readable tfoot td:nth-child(2),#page-planejamento table.rh30-readable thead tr:not(.rh30-group-head) th:nth-child(2){left:190px}}';
    document.head.appendChild(s);
  }
  var oldSetup=typeof setupUI==='function'?setupUI:null;
  if(oldSetup)setupUI=function(){var r=oldSetup.apply(this,arguments);rhV30Styles();setTimeout(rhV30DecoratePlanningTables,0);return r;};
  var oldRender=typeof renderAll==='function'?renderAll:null;
  if(oldRender)renderAll=function(){var r=oldRender.apply(this,arguments);setTimeout(rhV30DecoratePlanningTables,0);return r;};
  rhV30Styles();
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){setTimeout(rhV30DecoratePlanningTables,400);});else setTimeout(rhV30DecoratePlanningTables,400);
  window.rhV30DecoratePlanningTables=rhV30DecoratePlanningTables;
})();
