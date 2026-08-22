/* RH v48 — estabilidade estrutural dos cards + popups sem dupla contagem */
(function(){
'use strict';

var V48={timer:0,observer:null};
function E48(id){return document.getElementById(id)}
function n48(v){var x=Number(v);return isFinite(x)?x:0}
function r248(v){return Math.round((n48(v)+Number.EPSILON)*100)/100}
function esc48(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function norm48(v){return String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim().toLowerCase()}
function money48(v){return new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(n48(v))}
function parse48(v){var s=String(v==null?'':v).trim(),neg=/^\(.*\)$/.test(s);s=s.replace(/[()]/g,'').replace(/R\$/g,'').replace(/\s/g,'').replace(/\./g,'').replace(',','.');var x=Number(s)||0;return neg?-x:x}
function sum48(a,key){return (a||[]).reduce(function(s,x){return s+n48(typeof key==='function'?key(x):x&&x[key])},0)}
function near48(a,b){return Math.abs(n48(a)-n48(b))<=.03}
function comp48(){var c=S&&S.competencia;if(!c)return '—';if(c._periodConsolidated)return 'Consolidado';try{return formatCompetence(c.competencia)}catch(e){return String(c.competencia||'—')}}

/* ───────────────────────── modal dedicado e estável ───────────────────────── */
function close48(){var x=E48('rh48-modal');if(x)x.remove()}
function table48(headers,rows,footer,widths){
  widths=widths&&widths.length===headers.length?widths:null;
  function moneyCell(i){return i>0&&/valor|total|saldo|provis|encargo|custo|inss|rat|terceiros|fgts|pis|dedu|bruto|líquido|liquido|multa|base|%/i.test(String(headers[i]||''))?' money':''}
  return '<div class="rh48-table-scroll"><table class="rh48-table" data-rh-authoritative-composition="1">'+(widths?'<colgroup>'+widths.map(function(w){return '<col style="width:'+w+'%">'}).join('')+'</colgroup>':'')+'<thead><tr>'+headers.map(function(h,i){return '<th class="'+moneyCell(i).trim()+'">'+esc48(h)+'</th>'}).join('')+'</tr></thead><tbody>'+rows.map(function(r){return '<tr>'+r.map(function(v,i){return '<td class="'+moneyCell(i).trim()+'">'+esc48(v==null?'—':v)+'</td>'}).join('')+'</tr>'}).join('')+'</tbody>'+(footer?'<tfoot data-rh-authoritative-total="1"><tr>'+footer.map(function(v,i){return '<td class="'+moneyCell(i).trim()+'"><b>'+esc48(v==null?'':v)+'</b></td>'}).join('')+'</tr></tfoot>':'')+'</table></div>'
}
function open48(title,kicker,body,subtitle,formula){
  close48();
  var html='<div class="rh48-overlay" id="rh48-modal" role="dialog" aria-modal="true"><section class="rh48-modal-card"><header class="rh48-modal-head"><div><span class="rh48-kicker">'+esc48(kicker||'COMPOSIÇÃO DO CARD')+'</span><h2>'+esc48(title||'Composição')+'</h2><div class="rh48-ref">Referência: '+esc48(comp48())+'</div></div><button type="button" class="rh48-close" aria-label="Fechar">×</button></header>'+(subtitle?'<p class="rh48-sub">'+esc48(subtitle)+'</p>':'')+(formula?'<div class="rh48-formula">'+formula+'</div>':'')+'<div class="rh48-modal-body">'+body+'</div></section></div>';
  document.body.insertAdjacentHTML('beforeend',html);
  var o=E48('rh48-modal');if(!o)return;
  var table=o.querySelector('.rh48-table'),cols=table?table.querySelectorAll('thead th').length:2,width=cols<=2?640:cols===3?760:cols===4?900:cols===5?1040:cols===6?1160:1240;
  o.style.setProperty('--rh48-modal-w',width+'px');
  if(table){var count=table.querySelectorAll('tbody tr').length,first=norm48((table.querySelector('thead th')||{}).textContent||''),unit=first==='colaborador'?(count===1?' colaborador':' colaboradores'):(count===1?' item':' itens'),counter=document.createElement('div');counter.className='rh48-count';counter.textContent=count+unit;o.querySelector('.rh48-modal-body').appendChild(counter)}
  o.querySelector('.rh48-close').onclick=close48;
  o.addEventListener('click',function(e){if(e.target===o)close48()});
  setTimeout(function(){var b=o.querySelector('.rh48-close');if(b)b.focus()},0)
}
function formula48(items){return items.map(function(x,i){return '<span class="'+(x[2]||'')+'">'+esc48(x[0])+' <b>'+esc48(x[1])+'</b></span>'+(i<items.length-1?'<i>'+esc48(x[3]||'+')+'</i>':'')}).join('')}

/* ───────────────────────── rescisão: memória sem somar derivados ──────────── */
function terminationModel48(){
  var x=window.rhV34TerminationResult||window.rhV31TerminationResult;if(!x)return null;
  var bruto=n48(x.bruto);
  var deductions=[
    ['INSS mensal',n48(x.inss)],['INSS 13º',n48(x.inss13)],['IRRF mensal',n48(x.irrf)],['IRRF 13º',n48(x.irrf13)],
    ['Descontos operacionais / benefícios',n48(x.operational)],['Aviso descontado',n48(x.noticeDisc)],['Outros descontos',n48(x.od)]
  ].filter(function(a){return Math.abs(a[1])>.004});
  var knownDed=sum48(deductions,function(a){return a[1]}),officialDed=n48(x.ded);
  if(officialDed>0&&!near48(knownDed,officialDed)){
    var residual=r248(officialDed-knownDed);if(Math.abs(residual)>.004)deductions.push(['Ajuste / outros descontos consolidados',residual]);
  }
  var ded=officialDed>0?officialDed:sum48(deductions,function(a){return a[1]});
  var liq=r248(bruto-ded);
  var fgNew=n48(x.fgNew||x.fgTotal);if(!fgNew)fgNew=n48(x.fgm)+n48(x.fg13)+n48(x.fgav);
  var patParts=[['INSS patronal',n48(x.patInss)],['RAT',n48(x.patRat)],['Terceiros',n48(x.patTerc)],['PIS folha',n48(x.patPis)]].filter(function(a){return Math.abs(a[1])>.004});
  var pat=sum48(patParts,function(a){return a[1]});if(!pat)pat=n48(x.patTotal);
  if(!patParts.length&&pat>0)patParts=[['Encargos patronais',pat]];
  var multa=n48(x.multa),custo=r248(bruto+fgNew+multa+pat);
  var proventos=[
    ['Saldo de salário',n48(x.saldo)],['13º proporcional',n48(x.v13)],['13º sobre aviso',n48(x.v13Aviso||x.av13)],
    ['Férias proporcionais',n48(x.vf)],['Férias sobre aviso',n48(x.vfAviso||x.avfut)],['Períodos adquiridos e não gozados',n48(x.feriasAdq||x.ven)],
    ['1/3 constitucional',n48(x.ter)],['Adicional férias fora do prazo',n48(x.dobroExtra)],['Aviso-prévio indenizado',n48(x.aviso)],
    ['Indenização CCT / outra verba',n48(x.cct)],['Outros créditos',n48(x.cred)]
  ].filter(function(a){return Math.abs(a[1])>.004});
  /* mantém o mesmo resultado em cards/PDF, mas pela equação auditável */
  x.ded=r248(ded);x.liq=liq;x.fgNew=r248(fgNew);x.patTotal=r248(pat);x.custo=custo;
  return{x:x,bruto:bruto,deductions:deductions,ded:r248(ded),liq:liq,fgNew:r248(fgNew),multa:r248(multa),patParts:patParts,pat:r248(pat),custo:custo,proventos:proventos}
}
function terminationPopup48(card){
  var m=terminationModel48();if(!m)return;
  var label=norm48((card.querySelector('span')||{}).textContent||''),title=(card.querySelector('span')||{}).textContent||'Rescisão',rows=[],foot=null,sub='',formula='';
  if(label.indexOf('total bruto')>=0){
    rows=m.proventos.map(function(a){return[a[0],money48(a[1])]});foot=['TOTAL BRUTO',money48(m.bruto)];sub='Somente verbas que formam o bruto da rescisão.';
  }else if(label.indexOf('dedu')>=0||label.indexOf('desconto')>=0){
    rows=m.deductions.map(function(a){return[a[0],money48(a[1])]});foot=['(−) TOTAL DE DEDUÇÕES',money48(m.ded)];sub='Valores descontados do colaborador. Não são custo adicional do empregador.';
  }else if(label.indexOf('liquido')>=0){
    rows=[['Total bruto',money48(m.bruto)],['(−) Deduções',money48(m.ded)],['Líquido estimado a pagar',money48(m.liq)]];foot=null;sub='O líquido é um resultado derivado; não deve ser somado novamente ao bruto ou às deduções.';
    formula=formula48([['Bruto',money48(m.bruto),'','−'],['Deduções',money48(m.ded),'minus','='],['Líquido',money48(m.liq),'result','']]);
  }else{
    rows=[['Verbas brutas',money48(m.bruto)],['FGTS novo',money48(m.fgNew)],['Multa do FGTS',money48(m.multa)]];
    m.patParts.forEach(function(a){rows.push([a[0],money48(a[1])])});
    foot=['CUSTO TOTAL DO EMPREGADOR',money48(m.custo)];sub='Custo = bruto + FGTS novo + multa do FGTS + encargos patronais. INSS/IRRF retidos do colaborador não são somados novamente.';
    formula=formula48([['Bruto',money48(m.bruto),'','+'],['FGTS',money48(m.fgNew),'','+'],['Multa',money48(m.multa),'','+'],['Patronais',money48(m.pat),'','='],['Custo',money48(m.custo),'result','']]);
  }
  open48(title,'RESCISÃO · MEMÓRIA DE CÁLCULO',table48(['Item','Valor'],rows,foot,[72,28]),sub,formula)
}
function syncTerminationCards48(){
  var pane=document.querySelector('[data-plan-pane="rescisao"]'),m=terminationModel48();if(!pane||!m)return;
  Array.from(pane.querySelectorAll('#rh26-result .kpi,.rh26-kpis .kpi')).forEach(function(card){
    var l=norm48((card.querySelector('span')||{}).textContent||''),s=card.querySelector('strong');if(!s)return;var v=null;
    if(l.indexOf('total bruto')>=0)v=m.bruto;else if(l.indexOf('dedu')>=0||l.indexOf('desconto')>=0)v=m.ded;else if(l.indexOf('liquido')>=0)v=m.liq;else if(l.indexOf('custo')>=0&&l.indexOf('empreg')>=0)v=m.custo;
    if(v!=null){var txt=money48(v);if(String(s.textContent||'').trim()!==txt)s.textContent=txt;s.dataset.rh48Stable='1'}
  })
}

/* ───────────────────────── provisões: popup específico por indicador ───────── */
function firstCell48(tr){
  var c=tr.cells&&tr.cells[0],name=c&&c.querySelector('b'),dep=c&&c.querySelector('small');
  return{name:String(name?name.textContent:c&&c.childNodes[0]&&c.childNodes[0].textContent||c&&c.textContent||'—').trim(),dep:String(dep?dep.textContent:'—').trim()}
}
function provisionRows48(kind){
  var pane=document.querySelector('[data-plan-pane="'+kind+'"]'),table=pane&&pane.querySelector('table.rh26-wide,table');if(!table)return[];
  return Array.from(table.querySelectorAll('tbody tr')).map(function(tr){
    var c=tr.cells||[],id=firstCell48(tr);if(kind==='13'&&c.length>=16){
      var parts=[parse48(c[10].textContent),parse48(c[11].textContent),parse48(c[12].textContent),parse48(c[13].textContent),parse48(c[14].textContent)];
      return{name:id.name,dep:id.dep,cc:String(c[1].textContent||'—').trim(),pm:parse48(c[5].textContent),saldo:parse48(c[9].textContent),inss:parts[0],rat:parts[1],terc:parts[2],fgts:parts[3],pis:parts[4],enc:sum48(parts),custo:parse48(c[15].textContent)}
    }
    if(kind==='ferias'&&c.length>=19){
      var pp=[parse48(c[13].textContent),parse48(c[14].textContent),parse48(c[15].textContent),parse48(c[16].textContent),parse48(c[17].textContent)];
      return{name:id.name,dep:id.dep,cc:String(c[1].textContent||'—').trim(),pm:parse48(c[6].textContent),saldo:parse48(c[12].textContent),inss:pp[0],rat:pp[1],terc:pp[2],fgts:pp[3],pis:pp[4],enc:sum48(pp),custo:parse48(c[18].textContent)}
    }
    return null
  }).filter(Boolean)
}
function provisionPopup48(card,kind){
  var labelText=String((card.querySelector('span')||{}).textContent||'Composição').trim(),label=norm48(labelText),rows=provisionRows48(kind);if(!rows.length)return;
  rows.sort(function(a,b){return String(a.name).localeCompare(String(b.name),'pt-BR',{sensitivity:'base'})});
  var h=[],body=[],foot=[],sub='';
  if(label.indexOf('saldo provisionado')>=0){
    h=['Colaborador','Departamento','Saldo atual'];body=rows.map(function(r){return[r.name,r.dep,money48(r.saldo)]});foot=['TOTAL','',money48(sum48(rows,'saldo'))];sub='Composição exclusiva do saldo provisionado. Encargos e custo total não são somados neste indicador.';
  }else if(label.indexOf('provisao do mes')>=0){
    h=['Colaborador','Departamento','Provisão do mês'];body=rows.map(function(r){return[r.name,r.dep,money48(r.pm)]});foot=['TOTAL','',money48(sum48(rows,'pm'))];sub='Composição da provisão reconhecida no mês.';
  }else if(label.indexOf('encargo')>=0){
    h=['Colaborador','INSS Empresa','RAT','Terceiros','FGTS','PIS','Total encargos'];body=rows.map(function(r){return[r.name,money48(r.inss),money48(r.rat),money48(r.terc),money48(r.fgts),money48(r.pis),money48(r.enc)]});foot=['TOTAL',money48(sum48(rows,'inss')),money48(sum48(rows,'rat')),money48(sum48(rows,'terc')),money48(sum48(rows,'fgts')),money48(sum48(rows,'pis')),money48(sum48(rows,'enc'))];sub='Somente encargos incidentes sobre o saldo da provisão.';
  }else if(label.indexOf('custo provisionado')>=0){
    h=['Colaborador','Departamento','Saldo atual','Encargos','Custo provisionado'];body=rows.map(function(r){return[r.name,r.dep,money48(r.saldo),money48(r.enc),money48(r.custo)]});foot=['TOTAL','',money48(sum48(rows,'saldo')),money48(sum48(rows,'enc')),money48(sum48(rows,'custo'))];sub='Custo provisionado = saldo atual + encargos. Não há soma de subtotais derivados.';
  }else return;
  var widths=h.length===3?[48,27,25]:h.length===5?[34,22,15,14,15]:h.length===7?[30,12,9,12,11,9,17]:null;
  open48(labelText,(kind==='13'?'13º SALÁRIO':'FÉRIAS')+' · COMPOSIÇÃO DO CARD',table48(h,body,foot,widths),sub,'')
}

/* ───────────────────────── estabilidade visual e roteamento ───────────────── */
function styles48(){
  if(E48('_rh48'))return;var s=document.createElement('style');s.id='_rh48';s.textContent=
  '#rh46-forecast-summary{display:none!important}'+
  '#page-planejamento .kpi,#page-planejamento .summary-card,#page-planejamento .stat-card,#page-planejamento .rh47-summary-card{min-width:0!important;backface-visibility:hidden!important;transform:none!important}'+
  '#page-planejamento .kpi strong,#page-planejamento .summary-card strong,#page-planejamento .stat-card strong,#page-planejamento .rh47-summary-card strong{display:block!important;font-size:28px!important;line-height:32px!important;letter-spacing:-.02em!important;white-space:nowrap!important;visibility:visible!important;opacity:1!important;min-height:32px!important;font-variant-numeric:tabular-nums!important;animation:none!important;transition:none!important}'+
  '#page-planejamento [data-plan-pane="13"] .kpi,#page-planejamento [data-plan-pane="ferias"] .kpi{height:138px!important;min-height:138px!important;box-sizing:border-box!important}#page-planejamento [data-plan-pane="rescisao"] .kpi{min-height:126px!important}'+
  '.rh48-overlay{position:fixed;inset:0;z-index:12000;background:rgba(2,12,23,.72);display:flex;align-items:center;justify-content:center;padding:22px;backdrop-filter:blur(4px)}'+
  '.rh48-modal-card{width:min(var(--rh48-modal-w,760px),calc(100vw - 44px));max-width:calc(100vw - 44px);max-height:calc(100vh - 44px);display:flex;flex-direction:column;overflow:hidden;border:1px solid var(--line);border-radius:18px;background:var(--surface);color:var(--text);box-shadow:0 30px 80px rgba(0,0,0,.42)}'+
  '.rh48-modal-head{display:flex;justify-content:space-between;align-items:flex-start;gap:18px;padding:20px 22px 15px;border-bottom:1px solid var(--line-soft);background:var(--surface)}.rh48-modal-head h2{margin:5px 0 7px;font-size:1.55rem;line-height:1.1}.rh48-kicker{color:var(--gold-2);font-size:.67rem;font-weight:900;letter-spacing:.12em}.rh48-ref{display:inline-flex;padding:4px 9px;border:1px solid var(--line-soft);border-radius:999px;color:var(--muted);font-size:.7rem;font-weight:800}.rh48-close{flex:0 0 auto;width:44px;height:44px;border:1px solid var(--line-soft);border-radius:12px;background:var(--surface-2);color:var(--text);font-size:1.7rem;line-height:1;cursor:pointer}'+
  '.rh48-sub{margin:0;padding:12px 22px 0;color:var(--muted);font-size:.78rem;line-height:1.45}.rh48-formula{display:flex;align-items:center;flex-wrap:wrap;gap:7px;margin:12px 22px 0;padding:10px 12px;border:1px solid var(--line-soft);border-radius:12px;background:var(--surface-2);font-size:.76rem}.rh48-formula span{display:inline-flex;gap:5px;align-items:center;white-space:nowrap}.rh48-formula span.result b{color:var(--gold-2)}.rh48-formula span.minus b{color:var(--red)}.rh48-formula i{font-style:normal;color:var(--muted);font-weight:900}'+
  '.rh48-modal-body{min-height:0;overflow:auto;padding:14px 22px 12px}.rh48-table-scroll{width:100%;overflow:auto;border:1px solid var(--line-soft);border-radius:12px}.rh48-table{width:100%!important;max-width:100%!important;min-width:0!important;table-layout:fixed!important;border-collapse:collapse!important}.rh48-table th,.rh48-table td{padding:10px 11px!important;border-bottom:1px solid var(--line-soft)!important;vertical-align:middle!important;overflow-wrap:break-word!important;word-break:normal!important;white-space:normal!important;transition:none!important;animation:none!important}.rh48-table th{background:var(--surface-2)!important;color:var(--muted)!important;font-size:.66rem!important;text-transform:uppercase!important;letter-spacing:.055em!important}.rh48-table td{font-size:.76rem!important}.rh48-table td.money,.rh48-table th.money{text-align:right!important;font-variant-numeric:tabular-nums!important}.rh48-table tfoot td{background:color-mix(in srgb,var(--surface-2) 82%,var(--gold) 8%)!important;border-top:2px solid var(--line)!important;border-bottom:0!important;font-weight:900!important}.rh48-table tbody tr:last-child td{border-bottom:0!important}.rh48-count{padding:8px 4px 0;color:var(--muted);font-size:10px;text-align:right}'+
  '@media(max-width:760px){.rh48-overlay{padding:8px}.rh48-modal-card{width:calc(100vw - 16px);max-height:calc(100vh - 16px)}.rh48-modal-head{padding:16px}.rh48-sub,.rh48-formula{margin-left:16px;margin-right:16px}.rh48-sub{padding-left:0;padding-right:0}.rh48-modal-body{padding:12px 16px 10px}.rh48-table{min-width:620px!important}}';
  document.head.appendChild(s)
}
function cardRoute48(card){
  if(!card)return false;var pane=card.closest('[data-plan-pane]');if(!pane)return false;var kind=String(pane.dataset.planPane||'');
  if(kind==='rescisao'&&card.closest('#rh26-result')){terminationPopup48(card);return true}
  if((kind==='13'||kind==='ferias')&&card.classList.contains('kpi')){var l=norm48((card.querySelector('span')||{}).textContent||'');if(/saldo provisionado|provisao do mes|encargo|custo provisionado/.test(l)){provisionPopup48(card,kind);return true}}
  return false
}
function installCapture48(){
  if(document.documentElement.dataset.rh48Capture==='1')return;document.documentElement.dataset.rh48Capture='1';
  document.addEventListener('click',function(e){var card=e.target&&e.target.closest?e.target.closest('#page-planejamento .kpi'):null;if(!card)return;if(cardRoute48(card)){e.preventDefault();e.stopPropagation();if(e.stopImmediatePropagation)e.stopImmediatePropagation()}},true);
  document.addEventListener('keydown',function(e){if(e.key==='Escape'&&E48('rh48-modal'))close48()},true)
}
function schedule48(ms){clearTimeout(V48.timer);V48.timer=setTimeout(function(){styles48();syncTerminationCards48()},ms==null?80:ms)}
function observe48(){
  if(V48.observer)return;var page=E48('page-planejamento');if(!page)return;
  V48.observer=new MutationObserver(function(ms){var relevant=ms.some(function(m){var t=m.target&&m.target.nodeType===1?m.target:null;return !!(t&&(t.closest&&t.closest('#rh26-result,#rh-plan-folha-kpis,[data-plan-pane="13"],[data-plan-pane="ferias"]')))});if(relevant)schedule48(70)});
  V48.observer.observe(page,{childList:true,subtree:true,characterData:true})
}
function init48(){
  styles48();installCapture48();observe48();syncTerminationCards48();
  [120,420,1000].forEach(function(ms){setTimeout(function(){schedule48(0)},ms)});
  document.addEventListener('click',function(e){if(e.target&&e.target.closest&&e.target.closest('#rh26-calc,[data-plan-tab],.nav-item'))schedule48(120)},true)
}
window.rhV48TerminationModel=terminationModel48;
window.rhV48SyncTerminationCards=syncTerminationCards48;
window.RH_STABILITY_V48=true;
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init48);else init48();
})();
