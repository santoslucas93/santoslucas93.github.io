/* RH & Folha — hotfix v23: competência por rubrica nos popups de Colaboradores e Folha Mensal */
(function(){
  'use strict';
  function compById(id){return (S.competencias||[]).find(function(c){return String(c.id)===String(id);})||null;}
  function activeComps(){return (window.RH_PERIOD&&RH_PERIOD.active&&RH_PERIOD.active.length?RH_PERIOD.active:(typeof rhPeriodSelectedCompetences==='function'?rhPeriodSelectedCompetences():[])).slice();}
  function compLabel(id){
    var c=compById(id),a=activeComps();if(!c&&a.length===1)c=a[0];
    if(!c)return a.length>1?'Consolidado':'—';
    try{return _rhPeriodBaseFormatCompetence?_rhPeriodBaseFormatCompetence(c.competencia):formatCompetence(c.competencia);}catch(e){return String(c.competencia||'').slice(0,7);}
  }
  function detailView(){return S.view==='colaboradores'||S.view==='folha';}
  function rowType(x,t){var v=String(x&&x.tipo||'').toLowerCase();return t==='P'?(v==='p'||v==='provento'):(v==='d'||v==='desconto');}
  function rubrRow(x){
    return '<tr class="rh-v23-rubric-row"><td><b>'+esc((x.rubrica_codigo||x.codigo||'')+' '+(x.rubrica_nome||x.nome||''))+'</b></td>'
      +'<td class="rh-v23-comp"><span>'+esc(compLabel(x.competencia_id))+'</span></td>'
      +'<td class="money">'+nfmt(x.referencia)+'</td><td>'+esc(x.nota||x.observacao||'')+'</td><td class="money">'+fmt(x.valor)+'</td></tr>';
  }
  function rebuild(id){
    if(!detailView())return;var p=(S.pessoas||[]).find(function(x){return String(x.id)===String(id)||String(x.colaborador_id)===String(id);});if(!p)return;
    var tbody=$('employee-modal-rows'),modal=$('employee-modal');if(!tbody||!modal||modal.hidden)return;var table=tbody.closest('table'),thead=table&&table.querySelector('thead tr');if(!thead)return;
    thead.innerHTML='<th>Rubrica</th><th>Competência</th><th class="money">Ref.</th><th>Nota</th><th class="money">Valor</th>';
    var lancs=(p.lancamentos||[]).slice(),provs=lancs.filter(function(x){return rowType(x,'P');}),descs=lancs.filter(function(x){return rowType(x,'D');});
    var sumProv=provs.reduce(function(a,x){return a+(Number(x.valor)||0);},0),sumDesc=descs.reduce(function(a,x){return a+(Number(x.valor)||0);},0),liquido=Number(p.liquido)||0,enc=typeof rhEmployerCharges==='function'?rhEmployerCharges(p):{itens:[],total:0};
    var ref=activeComps().length===1?compLabel(activeComps()[0].id):'Consolidado',html='';
    if(lancs.length){
      html+='<tr class="group-head"><td colspan="5">Proventos</td></tr>'+provs.map(rubrRow).join('')
        +'<tr class="group-total"><td colspan="4"><b>Subtotal proventos</b></td><td class="money"><b>'+fmt(sumProv)+'</b></td></tr>';
      html+='<tr class="group-head"><td colspan="5">Descontos</td></tr>'+descs.map(rubrRow).join('')
        +'<tr class="group-total"><td colspan="4"><b>Subtotal descontos</b></td><td class="money"><b>'+fmt(sumDesc)+'</b></td></tr>';
      html+='<tr class="group-total destaque"><td colspan="4"><b>Líquido a receber</b></td><td class="money"><b>'+fmt(liquido)+'</b></td></tr>';
      html+='<tr class="group-head"><td colspan="5">Encargos patronais</td></tr>';
      (enc.itens||[]).forEach(function(it){html+='<tr><td>'+esc(it[0])+'</td><td class="rh-v23-comp"><span>'+esc(ref)+'</span></td><td></td><td><small>'+esc(it[2]||'')+'</small></td><td class="money">'+fmt(it[1])+'</td></tr>';});
      html+='<tr class="group-total"><td colspan="4"><b>Total encargos patronais</b></td><td class="money"><b>'+fmt(enc.total||0)+'</b></td></tr>';
    }else html=emptyRow(5,'Sem rubricas individuais disponíveis.');
    tbody.innerHTML=html;
    if(typeof window.rhV20FixAllPopupTotals==='function')window.rhV20FixAllPopupTotals(modal);
    if(typeof window.rhV21ApplyPopupPeriodReferences==='function')window.rhV21ApplyPopupPeriodReferences(modal);
  }
  var previous=window.openPerson;if(typeof previous==='function')window.openPerson=function(id){var r=previous.apply(this,arguments);setTimeout(function(){rebuild(id);},0);return r;};
  if(!document.getElementById('_rh_v23_comp_popup')){var st=document.createElement('style');st.id='_rh_v23_comp_popup';st.textContent='.rh-v23-comp span{display:inline-flex;padding:3px 7px;border:1px solid var(--line-soft);border-radius:999px;color:var(--muted);font-size:10px;font-weight:800;white-space:nowrap}#employee-modal table{min-width:920px!important}';document.head.appendChild(st);}
})();
