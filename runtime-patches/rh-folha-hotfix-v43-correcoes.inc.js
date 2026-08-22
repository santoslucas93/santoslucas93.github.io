/* RH v43 — correcoes: aviso previo, cards, PDF rescisao agrupado, Joel duplicado */
(function(){
'use strict';
function E(id){return document.getElementById(id)}
function n(v){var x=Number(v);return isFinite(x)?x:0}
function r2(v){return Math.round((n(v)+Number.EPSILON)*100)/100}
function money(v){return new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(n(v))}
function norm(v){return String(v||'').normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/\s+/g,' ').trim().toLowerCase()}
function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function rgb(hex){hex=String(hex).replace('#','');return[parseInt(hex.slice(0,2),16),parseInt(hex.slice(2,4),16),parseInt(hex.slice(4,6),16)]}
function dl(blob,name){var a=document.createElement('a'),u=URL.createObjectURL(blob);a.href=u;a.download=name;document.body.appendChild(a);a.click();setTimeout(function(){URL.revokeObjectURL(u);a.remove()},1000)}
function parseMoney(v){return Number(String(v||'').replace(/R\$|\s/g,'').replace(/\./g,'').replace(',','.'))||0}
function allowed(){try{return !!(canAdmin()||can('exportar'))}catch(e){return false}}
function guard(){if(allowed())return true;try{toast('Seu perfil não possui permissão para exportar relatórios.',true)}catch(e){}return false}

/* ─── BUG 1: aviso previo – filtro de selects destruindo opcoes de tipo/aviso ─── */
/* filterTerminationSelect (v38) removia opcoes cujo value nao estava no set de IDs
   ativos — mas os selects rh26-type e rh26-notice tambem ficam dentro do mesmo <label>
   "Colaborador" no form e tinham suas opcoes ('empregador','indenizado',...) removidas.
   Correcao: so remover opcoes cujo value parece um UUID / ID de colaborador. */
function isCollaboratorId(val){
  return Boolean(val) && val.length >= 20 && /^[0-9a-f\-]{20,}$/i.test(val)
}
function safeFilterSelect(sel,activeSet){
  if(!sel)return;
  var selected=sel.value;
  Array.from(sel.options).forEach(function(o){
    if(isCollaboratorId(o.value) && !activeSet.has(String(o.value)))o.remove()
  });
  if(selected && isCollaboratorId(selected) && !activeSet.has(String(selected)) && sel.options.length)sel.selectedIndex=0
}
function patchFilterTermination(){
  /* sobrescreve a logica da funcao interna de v38 */
  var ids=typeof window.rhRosterActiveIds==='function'?window.rhRosterActiveIds():(window.RH_CURRENT_ACTIVE_IDS||new Set());
  if(!ids||!ids.size)return;
  ['rh26-person','rh-res-person'].forEach(function(id){safeFilterSelect(E(id),ids)});
  document.querySelectorAll('[data-plan-pane="rescisao"] select').forEach(function(sel){
    var labelText=String(((sel.closest('label')||{}).textContent)||'');
    if(!/colaborador/i.test(labelText))return;
    safeFilterSelect(sel,ids);
  });
}
/* Instala novo filterTerminationSelect seguro e substitui chamadas do v38 */
window.rhV43SafeFilterTermination=patchFilterTermination;

/* Tambem reforcar no calc: ler tipo com deteccao por texto para robustez */
function readType(){
  var s=E('rh26-type');if(!s)return 'pedido';
  var val=String(s.value||'').toLowerCase();
  if(val)return val;
  var txt=norm((s.selectedOptions&&s.selectedOptions[0]&&s.selectedOptions[0].textContent)||'');
  if(/empregador|dispens|sem.*causa/.test(txt))return 'empregador';
  return 'pedido'
}
function readNotice(){
  var s=E('rh26-notice');if(!s)return 'na';
  var val=String(s.value||'').toLowerCase();
  if(val)return val;
  var txt=norm((s.selectedOptions&&s.selectedOptions[0]&&s.selectedOptions[0].textContent)||'');
  if(/indenizado/.test(txt))return 'indenizado';
  if(/desconto|trabalhado/.test(txt))return 'desconto';
  return 'na'
}

/* Intercepta o botao Calcular para validar/logar o aviso */
function installAvisoGuard(){
  var btn=E('rh26-calc');
  if(!btn||btn.dataset.v43)return;
  btn.dataset.v43='1';
  btn.addEventListener('click',function(){
    setTimeout(function(){
      var x=window.rhV31TerminationResult;
      if(!x)return;
      var type=readType(),notice=readNotice();
      /* se o tipo indica empregador mas o aviso saiu 0, recalcular e corrigir */
      if((type==='empregador'||type.indexOf('empregador')>=0)&&notice==='indenizado'&&x.aviso===0){
        var salary=n(x.salary),nd=n(x.noticeDays)||30;
        x.aviso=r2(salary/30*nd);
        x.av13=r2(salary/12);
        x.avfut=r2(salary/12);
        x.bruto=r2(n(x.saldo)+n(x.v13)+n(x.vf)+n(x.ven)+n(x.ter)+x.aviso+x.av13+x.avfut+n(x.cct)+n(x.cred));
        x.fgav=r2(x.aviso*.08);
        x.fgTotal=r2(n(x.fgm)+n(x.fg13)+x.fgav);
        x.multa=r2(n(x.fg)*.4);
        x.ded=r2(n(x.inss)+n(x.inss13)+n(x.irrf)+n(x.irrf13)+n(x.operational)+n(x.noticeDisc));
        x.liq=r2(x.bruto-x.ded);
        x.custo=r2(x.bruto+x.fgTotal+x.multa);
        window.rhV31TerminationResult=x;
        /* patchar os cards */
        var box=E('rh26-result');if(!box)return;
        ['Total bruto','Deduções','Líquido','Custo empregador'].forEach(function(label){
          Array.from(box.querySelectorAll('.kpi')).forEach(function(k){
            var s=k.querySelector('span'),b=k.querySelector('strong');
            if(s&&b&&String(s.textContent||'').trim()===label){
              var vals={'Total bruto':x.bruto,'Deduções':x.ded,'Líquido':x.liq,'Custo empregador':x.custo};
              b.textContent=money(vals[label]||0)
            }
          })
        });
        /* inserir linha do aviso se nao existe */
        var blocks=box.querySelectorAll('.rh26-term .rh-res-lines');
        if(blocks[0]){
          var hasAviso=Array.from(blocks[0].children).some(function(row){
            return norm((row.querySelector('span')||{}).textContent).indexOf('aviso')>=0
          });
          if(!hasAviso){
            var div=document.createElement('div');
            div.innerHTML='<span>Aviso-prévio indenizado '+n(x.noticeDays||30)+' dias</span><b>'+money(x.aviso)+'</b>';
            blocks[0].appendChild(div);
            var div2=document.createElement('div');div2.innerHTML='<span>13º sobre aviso</span><b>'+money(x.av13)+'</b>';blocks[0].appendChild(div2);
            var div3=document.createElement('div');div3.innerHTML='<span>Férias sobre aviso</span><b>'+money(x.avfut)+'</b>';blocks[0].appendChild(div3)
          }
        }
        /* atualizar formula v42 se existir */
        var f=E('rh42-term-formula');
        if(f)f.innerHTML='<b>Como chegamos ao líquido</b><span>'+money(x.bruto)+' de proventos − '+money(x.ded)+' de descontos = <strong>'+money(x.liq)+'</strong></span>';
        try{toast('Aviso indenizado corrigido: '+money(x.aviso),false)}catch(e){}
      }
    },300)
  },false)
}

/* ─── BUG 2: cards – melhorar fit com delays maiores e dedup de chamadas ─── */
var FIT_SEL='.kpi strong,.rh40-guide-card strong,.rh41-report-card strong,.rh-close-stat strong,.rh-history-metric strong,.metric-row strong,.preview-summary strong,.summary-card strong,.stat-card strong,#charges-kpis strong,#payroll-kpis strong,#movement-kpis strong,#custo-real-kpis strong,#rh-dossier-kpis strong,#rh-insight-kpis strong';
var _fitTimer=0;
function fitOneV43(el){
  if(!el||!el.isConnected||el.closest('#page-planejamento')||!String(el.textContent||'').trim())return;
  var box=el.closest('.kpi,.rh40-guide-card,.rh41-report-card,.rh-close-stat,.rh-history-metric,.metric-row,.preview-summary,.summary-card,.stat-card')||el.parentElement;
  if(!box)return;
  /* se a caixa nao tem largura ainda (escondida), tentar via parentElement */
  var bw=box.clientWidth;
  if(bw===0){var pb=box.parentElement;bw=pb?pb.clientWidth:0}
  if(bw===0)return;
  var bcs=getComputedStyle(box),av=bw-(parseFloat(bcs.paddingLeft)||0)-(parseFloat(bcs.paddingRight)||0)-8;
  if(av<32)return;
  var isGuide=el.closest('.rh40-guide-card'),isReport=el.closest('.rh41-report-card');
  var max=isGuide?24:isReport?26:36,min=9,size=max;
  el.style.setProperty('font-size',size+'px','important');
  el.style.setProperty('white-space','nowrap','important');
  el.style.setProperty('max-width','100%','important');
  el.style.setProperty('display','block','important');
  el.style.setProperty('overflow','hidden','important');
  el.style.setProperty('text-overflow','ellipsis','important');
  for(var i=0;i<10;i++){
    var r=document.createRange();
    try{r.selectNodeContents(el)}catch(e){break}
    var w=r.getBoundingClientRect().width;
    if(w<=av||size<=min)break;
    size=Math.max(min,Math.floor(size*(av/w)*.95*10)/10);
    el.style.setProperty('font-size',size+'px','important')
  }
  el.style.setProperty('letter-spacing',size<16?'-.07em':size<22?'-.04em':'-.015em','important')
}
function fitAllV43(){
  Array.prototype.forEach.call(document.querySelectorAll(FIT_SEL),fitOneV43)
}
function scheduleFitV43(d){
  clearTimeout(_fitTimer);
  _fitTimer=setTimeout(function(){requestAnimationFrame(fitAllV43)},d==null?40:d)
}
/* sobrescreve as funcoes globais de fit */
window.rhFitAllCardValues=fitAllV43;
window.rhV42FitCards=fitAllV43;
window.rhV43FitAll=fitAllV43;

/* ─── BUG 3: PDF rescisao agrupado por PROVENTOS / DESCONTOS / ENCARGOS / LIQUIDO / CUSTO ─── */
var NAVY='#071a2c',NAVY2='#0d2b42',GOLD='#f2c94c';
async function ensurePdfV43(){
  if(!window.LIBRARIES)return;
  if(!window.LIBRARIES.jspdf)window.LIBRARIES.jspdf={url:'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',ready:function(){return !!(window.jspdf&&window.jspdf.jsPDF)}};
  if(!window.LIBRARIES.autotable)window.LIBRARIES.autotable={url:'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.4/jspdf.plugin.autotable.min.js',ready:function(){return !!(window.jspdf&&window.jspdf.jsPDF&&window.jspdf.jsPDF.API&&window.jspdf.jsPDF.API.autoTable)}};
  if(typeof loadLibrary==='function'){await loadLibrary('jspdf');await loadLibrary('autotable')}
}
function pdfHeadV43(doc,title,sub){
  var w=doc.internal.pageSize.getWidth();
  doc.setFillColor.apply(doc,rgb(NAVY));doc.rect(0,0,w,31,'F');
  doc.setTextColor(255,255,255);doc.setFont('helvetica','bold');doc.setFontSize(16);doc.text(title,12,13);
  doc.setFont('helvetica','normal');doc.setFontSize(8.5);doc.text(sub||'',12,20);
  doc.setTextColor.apply(doc,rgb(GOLD));doc.setFont('helvetica','bold');doc.setFontSize(8);doc.text('LIGA NACIONAL DE BASQUETE · RH & FOLHA',12,26)
}
function pdfFootV43(doc,nome){
  for(var i=1;i<=doc.internal.getNumberOfPages();i++){
    doc.setPage(i);var w=doc.internal.pageSize.getWidth(),h=doc.internal.pageSize.getHeight();
    doc.setTextColor.apply(doc,rgb('#8899aa'));doc.setFontSize(7);doc.setFont('helvetica','normal');
    doc.text('Uso restrito — RH & Folha | '+nome,12,h-7);doc.text('Página '+i+' de '+doc.internal.getNumberOfPages(),w-12,h-7,{align:'right'})
  }
}
function sectionTable(doc,y,title,rows,subtotal,isMinus){
  var w=doc.internal.pageSize.getWidth();
  doc.setFillColor.apply(doc,rgb(NAVY2));doc.rect(12,y,w-24,8,'F');
  doc.setTextColor(255,255,255);doc.setFont('helvetica','bold');doc.setFontSize(9);
  doc.text(title,14,y+5.5);
  doc.autoTable({
    startY:y+8,
    body:rows,
    theme:'striped',
    styles:{font:'helvetica',fontSize:8.5,cellPadding:[2,3,2,3],textColor:rgb(NAVY)},
    alternateRowStyles:{fillColor:[247,250,253]},
    columnStyles:{1:{halign:'right',fontStyle:'bold'}},
    margin:{left:12,right:12}
  });
  var fy=doc.lastAutoTable.finalY;
  /* linha de total da secao */
  doc.setFillColor.apply(doc,rgb('#f0f4f8'));doc.rect(12,fy,w-24,9,'F');
  doc.setTextColor.apply(doc,rgb(NAVY));doc.setFont('helvetica','bold');doc.setFontSize(8.5);
  doc.text(isMinus?'(−) Total de descontos':'Subtotal',14,fy+6);
  doc.text(money(subtotal),w-12,fy+6,{align:'right'});
  return fy+9+6
}

async function exportTerminationPdfV43(){
  if(!guard())return;
  var x=window.rhV31TerminationResult;
  if(!x||!x.p)throw new Error('Gere o relatório analítico da rescisão antes de exportar.');
  await ensurePdfV43();
  if(!window.jspdf||!window.jspdf.jsPDF)throw new Error('Biblioteca de PDF não carregou. Tente novamente.');
  var doc=new window.jspdf.jsPDF({orientation:'portrait',unit:'mm',format:'a4',compress:true});
  var w=doc.internal.pageSize.getWidth(),nome=String(x.p.nome||'Colaborador');
  var tipoLabel=n(x.type||'').indexOf('empregador')>=0?'Dispensa sem justa causa':'Pedido de demissão';
  var dt=x.date instanceof Date?x.date:new Date();
  var dtBR=String(dt.getDate()).padStart(2,'0')+'/'+String(dt.getMonth()+1).padStart(2,'0')+'/'+dt.getFullYear();
  pdfHeadV43(doc,'Rescisão — Relatório Executivo',nome+' | '+tipoLabel+' | '+dtBR);

  /* ── KPIs resumo ── */
  var y=38;
  var kpiW=(w-24)/4,kpiH=22;
  [['Proventos',x.bruto,NAVY2],['Descontos',x.ded,'#c0392b'],['Líquido',x.liq,'#0d6e4e'],['Custo total',x.custo,NAVY]].forEach(function(k,i){
    var kx=12+i*kpiW;
    doc.setFillColor.apply(doc,rgb(k[2]));doc.roundedRect(kx,y,kpiW-3,kpiH,2,2,'F');
    doc.setTextColor(255,255,255);doc.setFont('helvetica','normal');doc.setFontSize(6.5);doc.text(k[0],kx+3,y+4);
    doc.setFont('helvetica','bold');doc.setFontSize(11);doc.text(money(k[1]),kx+kpiW/2-1.5,y+14,{align:'center'})
  });
  y+=kpiH+6;

  /* ── PROVENTOS ── */
  var provRows=[];
  function addProv(label,val){if(Math.abs(n(val))>.004)provRows.push([label,money(val)])}
  addProv('Saldo de salário ('+Math.min(30,dt.getDate())+' dias)',x.saldo);
  addProv('13º proporcional '+n(x.a13)+'/12',x.v13);
  addProv('Férias proporcionais '+n(x.avf)+'/12',x.vf);
  addProv('Férias vencidas',x.ven);
  addProv('1/3 constitucional',x.ter);
  if(n(x.aviso)>.004){
    addProv('Aviso-prévio indenizado '+n(x.noticeDays||30)+' dias',x.aviso);
    addProv('13º sobre aviso prévio',x.av13);
    addProv('Férias sobre aviso prévio',x.avfut)
  }
  addProv('Indenização CCT',x.cct);addProv('Outros créditos',x.cred);
  y=sectionTable(doc,y,'PROVENTOS',provRows,x.bruto,false);

  /* ── DESCONTOS ── */
  var dedRows=[];
  function addDed(label,val){if(Math.abs(n(val))>.004)dedRows.push([label,money(val)])}
  var taxLabel=x.hist?'histórico importado':'estimado';
  addDed('INSS sobre rescisão ('+taxLabel+')',x.inss);
  addDed('INSS sobre 13º ('+taxLabel+')',x.inss13);
  addDed('IRRF sobre rescisão ('+taxLabel+')',x.irrf);
  addDed('IRRF sobre 13º ('+taxLabel+')',x.irrf13);
  addDed('Descontos operacionais / benefícios',x.operational);
  addDed('Aviso descontado (pedido)',x.noticeDisc);
  y=sectionTable(doc,y,'DESCONTOS',dedRows,x.ded,true);

  /* ── VALOR LÍQUIDO ── */
  doc.setFillColor.apply(doc,rgb('#0d6e4e'));doc.rect(12,y,w-24,14,'F');
  doc.setTextColor(255,255,255);doc.setFont('helvetica','bold');doc.setFontSize(10);
  doc.text('VALOR LÍQUIDO',14,y+5.5);
  doc.text(money(x.liq),w-12,y+5.5,{align:'right'});
  doc.setFont('helvetica','normal');doc.setFontSize(7.5);
  doc.text(money(x.bruto)+' proventos  −  '+money(x.ded)+' descontos',14,y+11);
  y+=14+8;

  /* ── ENCARGOS / FGTS ── */
  var encRows=[];
  function addEnc(label,val){if(Math.abs(n(val))>.004)encRows.push([label,money(val)])}
  addEnc('Saldo FGTS (informado)',x.fg);
  addEnc('FGTS sobre saldo mensal',x.fgm);
  addEnc('FGTS sobre 13º',x.fg13);
  addEnc('FGTS sobre aviso prévio',x.fgav);
  if(n(x.multa)>.004)addEnc('Multa de 40% do FGTS (ônus do empregador)',x.multa);
  if(encRows.length){
    var encTotal=n(x.fgm)+n(x.fg13)+n(x.fgav)+n(x.multa);
    y=sectionTable(doc,y,'ENCARGOS — FGTS E MULTA (fora do líquido do colaborador)',encRows,encTotal,false)
  }

  /* ── CUSTO TOTAL ESTIMADO ── */
  doc.setFillColor.apply(doc,rgb(NAVY));doc.rect(12,y,w-24,16,'F');
  doc.setTextColor(255,255,255);doc.setFont('helvetica','bold');doc.setFontSize(10);
  doc.text('CUSTO TOTAL ESTIMADO PARA O EMPREGADOR',14,y+6);
  doc.text(money(x.custo),w-12,y+6,{align:'right'});
  doc.setFont('helvetica','normal');doc.setFontSize(7.5);
  doc.text(money(x.bruto)+' proventos  +  '+money(n(x.fgTotal))+'FGTS  +  '+money(n(x.multa))+' multa',14,y+12);
  y+=16+6;

  /* ── NOTA DE RODAPÉ ── */
  doc.setTextColor.apply(doc,rgb('#8899aa'));doc.setFont('helvetica','normal');doc.setFontSize(7);
  var nota=x.hist?'Impostos e descontos com base em histórico importado da competência de desligamento.':'Estimativa gerencial: INSS/IRRF calculados pelas tabelas da competência. Benefícios, médias e outras deduções devem ser informados antes do cálculo oficial.';
  doc.text(nota,12,y,{maxWidth:w-24});
  pdfFootV43(doc,nome);

  var slug=nome.replace(/[^A-Za-z0-9]+/g,'_');
  doc.save('LNB_Rescisao_'+slug+'_'+dtBR.replace(/\//g,'-')+'.pdf')
}
window.rhV43ExportTerminationPdf=exportTerminationPdfV43;
/* Substituir referências do v41 e v42 */
window.rhV41ExportTerminationPdf=exportTerminationPdfV43;

/* ─── BUG 4: Joel duas vezes – deduplicar filterForecast ─── */
function deduplicateForecast(){
  var pane=document.querySelector('[data-plan-pane="folha"]');if(!pane)return;
  var table=pane.querySelector('table');if(!table)return;
  var seen=new Set();
  Array.from(table.querySelectorAll('tbody tr')).forEach(function(tr){
    var id=String(tr.dataset.id||tr.dataset.colaboradorId||'');
    if(!id){
      /* sem id: tentar pelo nome */
      var nm=String((tr.cells&&tr.cells[0]&&tr.cells[0].textContent)||'').replace(/\s+/g,' ').trim();
      if(!nm)return;
      if(seen.has('name:'+nm))tr.remove();else seen.add('name:'+nm);
    }else{
      if(seen.has(id))tr.remove();else seen.add(id)
    }
  })
}
window.rhV43DeduplicateForecast=deduplicateForecast;

/* Reaplica filterForecast com dedup toda vez que enforceNow rodar */
var _origEnforceNow=null;
function patchEnforceNow(){
  if(typeof window.rhV38EnforcePlanningUI==='function'&&!window.rhV38EnforcePlanningUI._v43){
    var origTrigger=window.rhV38EnforcePlanningUI;
    window.rhV38EnforcePlanningUI=function(){
      var result=origTrigger.apply(this,arguments);
      setTimeout(deduplicateForecast,120);
      return result
    };
    window.rhV38EnforcePlanningUI._v43=true
  }
}

/* ─── CSS: fallback overflow para cards, garantia de corte ─── */
function injectStyles(){
  if(E('_rh43'))return;
  var s=document.createElement('style');s.id='_rh43';
  s.textContent=[
    /* Cards: garantia de clip quando font fit nao roda a tempo */
    '.kpi strong,.rh40-guide-card strong,.rh41-report-card strong,.stat-card strong,.summary-card strong{',
    '  display:block!important;overflow:hidden!important;text-overflow:ellipsis!important;',
    '  white-space:nowrap!important;max-width:100%!important;min-width:0!important;',
    '  font-variant-numeric:tabular-nums!important}',
    /* Containers não deixam vazar */
    '.kpi,.rh40-guide-card,.rh41-report-card,.stat-card,.summary-card{min-width:0!important;overflow:hidden!important}'
  ].join('');
  document.head.appendChild(s)
}

/* ─── Inicialização ─── */
function init(){
  injectStyles();
  installAvisoGuard();
  patchEnforceNow();
  /* fit inicial com delays escalonados para garantir layout */
  [60,250,600,1200].forEach(function(ms){setTimeout(fitAllV43,ms)});
  /* dedup inicial */
  setTimeout(deduplicateForecast,400);
  /* refit em toda interacao de navegacao */
  document.addEventListener('click',function(e){
    if(!e.target||!e.target.closest)return;
    if(e.target.closest('[data-plan-tab],[data-go],.nav-item')){
      setTimeout(fitAllV43,80);setTimeout(fitAllV43,280)
    }
  },true);
  /* dedup ao abrir proxima folha */
  document.addEventListener('click',function(e){
    if(!e.target||!e.target.closest)return;
    var tab=e.target.closest('[data-plan-tab]');
    if(tab&&String(tab.dataset.planTab||'').indexOf('folha')>=0){
      setTimeout(deduplicateForecast,200);setTimeout(deduplicateForecast,600)
    }
  },true);
  /* wrapper do renderAll para refit e dedup */
  if(typeof window.renderAll==='function'&&!window.renderAll._rh43){
    var base=window.renderAll;
    window.renderAll=function(){
      var r=base.apply(this,arguments);
      setTimeout(fitAllV43,80);
      setTimeout(deduplicateForecast,150);
      return r
    };
    window.renderAll._rh43=true
  }
  /* reaplica filterTermination seguro em cada chamada do v38 */
  var _v38Enforce=window.rhV38EnforcePlanningUI;
  if(typeof _v38Enforce==='function'&&!_v38Enforce._v43safe){
    window.rhV38EnforcePlanningUI=function(){
      patchFilterTermination();
      var r=_v38Enforce.apply(this,arguments);
      setTimeout(deduplicateForecast,120);
      return r
    };
    window.rhV38EnforcePlanningUI._v43safe=true
  }
  /* ResizeObserver em cards novos */
  if(window.ResizeObserver){
    var ro=new ResizeObserver(function(){scheduleFitV43(50)});
    function observeCards(){document.querySelectorAll('.kpi,.rh40-guide-card,.rh41-report-card').forEach(function(el){if(el.closest('#page-planejamento'))return;try{ro.observe(el)}catch(e){}})}
    observeCards();setTimeout(observeCards,800)
  }
}
window.RH_CORRECOES_V43=true;
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
