/* RH & Folha v61 — cadastro de DP, holerites, alertas de férias e integração segura. */
(function(){
'use strict';
window.RH_DP_V61=true;
var V61={roster:null,busy:false};
function e61(id){return document.getElementById(id)}
function x61(v){return esc57(v==null?'':v)}
function n61(v){var n=Number(v);return isFinite(n)?n:0}
function statusOff61(v){return /demit|deslig|rescis|rescind|inativ|transferid/i.test(String(v||''))}
function statusActive61(v){return !statusOff61(v)}
function personId61(p){return String(p&&p.colaborador_id||p&&p.id||'')}
function scoped61(){try{return rhScopePeople()}catch(e){return (S.pessoas||[]).slice()}}
function date61(v){if(!v)return '—';var p=String(v).slice(0,10).split('-');return p.length===3?p[2]+'/'+p[1]+'/'+p[0]:'—'}
function isoSafe61(v){return v?String(v).slice(0,10):null}
function alert61(m){try{warning57(m)}catch(e){alert(m)}}
function ok61(m){try{ok57(m)}catch(e){}}

function style61(){
  if(e61('rh61-style'))return;var s=document.createElement('style');s.id='rh61-style';s.textContent=
    '#employee-rows .status[data-rh61-status]{cursor:pointer;box-shadow:0 0 0 1px currentColor inset}'+
    '.rh61-actions{display:flex;gap:8px;flex-wrap:wrap;align-items:center}.rh61-form{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}'+
    '.rh61-form label{display:grid;gap:6px;font-size:12px;font-weight:800;color:var(--muted)}.rh61-form input,.rh61-form select,.rh61-form textarea{width:100%;box-sizing:border-box}'+
    '.rh61-checks{grid-column:1/-1;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.rh61-checks label{display:flex;align-items:center;gap:8px}'+
    '.rh61-checks input{width:auto}.rh61-full{grid-column:1/-1}.rh61-vac-summary{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:14px}'+
    '.rh61-vac-note{padding:12px;border-radius:10px;background:rgba(217,119,6,.10);margin-bottom:12px}.rh61-status-click{cursor:pointer}'+
    '@media(max-width:720px){.rh61-form{grid-template-columns:1fr}.rh61-full,.rh61-checks{grid-column:1}.rh61-checks{grid-template-columns:1fr}}';document.head.appendChild(s)
}

function ensureButtons61(){
  style61();
  var cp=e61('page-colaboradores'),ch=cp&&cp.querySelector('.page-head'),ca=ch&&ch.querySelector('.head-actions');
  if(ca&&!e61('rh61-new')){
    var box=document.createElement('div');box.className='rh61-actions admin-only';
    box.innerHTML='<button type="button" class="button primary" id="rh61-new">Novo colaborador</button><button type="button" class="button secondary" id="rh61-sync">Sincronizar cadastros</button><button type="button" class="button ghost" id="rh61-vacations">Alertas de férias</button>';ca.appendChild(box)
  }
  var fp=e61('page-folha'),fh=fp&&fp.querySelector('.page-head');
  if(fh&&!e61('rh61-payslips')){var fa=fh.querySelector('.head-actions');if(!fa){fa=document.createElement('div');fa.className='head-actions';fh.appendChild(fa)}var b=document.createElement('button');b.type='button';b.id='rh61-payslips';b.className='button primary export-only';b.textContent='Gerar holerites PDF';fa.appendChild(b)}
  try{setupPermissions()}catch(e){}
}

function decorateStatuses61(){
  document.querySelectorAll('#employee-rows tr').forEach(function(tr){var link=tr.querySelector('.link-name[data-person]'),st=tr.querySelector('.status');if(!link||!st)return;var p=(S.pessoas||[]).find(function(x){return String(x.id)===String(link.dataset.person)});st.dataset.rh61Status=personId61(p)||link.dataset.person;st.classList.add('rh61-status-click');st.title='Clique para alterar a situação deste colaborador';var off=statusOff61(st.textContent);st.classList.toggle('danger',off);st.classList.toggle('success',!off)})
}

function newModal61(){
  openModal57('Novo colaborador','Dados essenciais de RH, DP e opções de benefícios.',
    '<form class="rh61-form" id="rh61-new-form">'+
    '<label>Matrícula *<input id="rh61-matricula" maxlength="40" required></label><label>Nome completo *<input id="rh61-nome" maxlength="160" required></label>'+
    '<label>Data de admissão *<input id="rh61-admissao" type="date" required></label><label>Vínculo *<select id="rh61-vinculo"><option>Celetista</option><option>Estagiário</option><option>Aprendiz</option><option>PJ</option><option>Diretor</option><option>Outro</option></select></label>'+
    '<label>Cargo<input id="rh61-cargo" maxlength="120"></label><label>Departamento<input id="rh61-departamento" maxlength="120"></label>'+
    '<label>Centro de custo<input id="rh61-cc" maxlength="80"></label><label>Gestor responsável<input id="rh61-gestor" maxlength="120"></label>'+
    '<label>Nascimento<input id="rh61-nascimento" type="date"></label><label>E-mail corporativo<input id="rh61-email" type="email" maxlength="160"></label>'+
    '<label>Telefone<input id="rh61-telefone" maxlength="30"></label><label>Salário-base<input id="rh61-salario" inputmode="decimal" placeholder="0,00"></label>'+
    '<label>Jornada semanal<input id="rh61-jornada" type="number" min="1" max="60" step="0.5" value="40"></label><label>Observações<textarea id="rh61-observacoes" maxlength="500" rows="2"></textarea></label>'+
    '<div class="rh61-checks"><label><input id="rh61-vt" type="checkbox"> Optou por Vale Transporte</label><label><input id="rh61-vr" type="checkbox" checked> Optou por VR/VA</label><label><input id="rh61-med" type="checkbox"> Optou por Plano de Saúde</label><label><input id="rh61-seg" type="checkbox" checked> Optou por Seguro de Vida</label></div>'+
    '<div class="rh57-form-note rh61-full">O cadastro inicia como <b>Trabalhando</b>. A inclusão e as opções ficam registradas na auditoria.</div>'+
    '<button type="submit" class="button primary rh61-full" id="rh61-new-save">Salvar colaborador</button></form>',780)
}
function value61(id){return String((e61(id)||{}).value||'').trim()}
async function saveNew61(form){
  var b=e61('rh61-new-save'),salary=parseBr57(value61('rh61-salario'))||null;
  var body={p_matricula:value61('rh61-matricula'),p_nome:value61('rh61-nome'),p_admissao:isoSafe61(value61('rh61-admissao')),p_vinculo:value61('rh61-vinculo'),p_cargo:value61('rh61-cargo')||null,p_departamento:value61('rh61-departamento')||null,p_centro_custo:value61('rh61-cc')||null,p_data_nascimento:isoSafe61(value61('rh61-nascimento')),p_email:value61('rh61-email')||null,p_telefone:value61('rh61-telefone')||null,p_salario_base:salary,p_jornada_horas_semanais:n61(value61('rh61-jornada'))||null,p_gestor:value61('rh61-gestor')||null,p_opta_vale_transporte:!!e61('rh61-vt').checked,p_opta_vr_va:!!e61('rh61-vr').checked,p_opta_plano_saude:!!e61('rh61-med').checked,p_opta_seguro_vida:!!e61('rh61-seg').checked,p_observacoes:value61('rh61-observacoes')||null};
  if(!body.p_matricula||!body.p_nome||!body.p_admissao)return alert61('Preencha matrícula, nome e data de admissão.');
  b.disabled=true;try{await rpc('rh_criar_colaborador',body);closeModal57();ok61('Colaborador cadastrado e auditado.');if(S.competencia)await selectCompetence(S.competencia.id)}catch(e){alert61(e.message||String(e))}finally{b.disabled=false}
}

async function sync61(b){
  if(V61.busy)return;V61.busy=true;b.disabled=true;var old=b.textContent;b.textContent='Sincronizando…';
  try{var r=await rpc('rh_sincronizar_cadastros_beneficios',{});ok61((r.correspondencias_seguras||0)+' correspondência(s) de Benefícios e '+(r.mobilidade_atualizados||0)+' de Mobilidade; '+(r.pendentes_revisao||0)+' cadastro(s) pendente(s) de revisão.');if(S.competencia)await selectCompetence(S.competencia.id)}catch(e){alert61(e.message||String(e))}finally{V61.busy=false;b.disabled=false;b.textContent=old}
}

async function openDirectStatus61(id){
  try{V61.roster=await rpc('rh_quadro_atual',{});V57.roster=V61.roster||[];statusModal57(id)}catch(e){alert61(e.message||String(e))}
}

function vacationRows61(){
  var now=new Date(),all=(S.colaboradores||[]).filter(function(p){return p.admissao&&statusActive61(p.situacao)}),rows=[];
  all.forEach(function(p){var ad=new Date(String(p.admissao).slice(0,10)+'T12:00:00');if(isNaN(ad))return;var completed=now.getFullYear()-ad.getFullYear();if(now.getMonth()<ad.getMonth()||(now.getMonth()===ad.getMonth()&&now.getDate()<ad.getDate()))completed--;if(completed<1)return;var start=new Date(ad),end=new Date(ad);start.setFullYear(ad.getFullYear()+completed-1);end.setFullYear(ad.getFullYear()+completed);end.setDate(end.getDate()-1);var deadline=new Date(ad);deadline.setFullYear(ad.getFullYear()+completed+1);deadline.setDate(deadline.getDate()-1);var days=Math.ceil((deadline-now)/86400000),level=days<0?'vencida':(days<=90?'90_dias':'acompanhar');rows.push({p:p,start:start,end:end,deadline:deadline,days:days,level:level})});
  return rows.sort(function(a,b){return a.deadline-b.deadline})
}
function vacationModal61(){
  var rows=vacationRows61(),over=rows.filter(function(r){return r.level==='vencida'}).length,near=rows.filter(function(r){return r.level==='90_dias'}).length;
  var body='<div class="rh61-vac-note"><b>Controle preventivo.</b> Estes alertas são estimados pela data de admissão. Confirme recibos, períodos efetivamente gozados e afastamentos antes de qualquer decisão trabalhista.</div><div class="rh61-vac-summary"><span class="status danger">'+over+' vencida(s) para revisar</span><span class="status">'+near+' em até 90 dias</span></div><div class="rh57-scroll"><table><thead><tr><th>Colaborador</th><th>Período aquisitivo estimado</th><th>Limite estimado</th><th>Alerta</th></tr></thead><tbody>'+rows.map(function(r){var c=r.level==='vencida'?'danger':(r.level==='90_dias'?'':'success'),label=r.days<0?Math.abs(r.days)+' dia(s) após o limite':r.days+' dia(s) até o limite';return '<tr><td><b>'+x61(r.p.nome)+'</b><br><small>'+x61(r.p.departamento||'')+'</small></td><td>'+date61(r.start.toISOString())+' a '+date61(r.end.toISOString())+'</td><td>'+date61(r.deadline.toISOString())+'</td><td><span class="status '+c+'">'+x61(label)+'</span></td></tr>'}).join('')+'</tbody></table></div>';
  openModal57('Alertas de férias','Estimativa para conferência do RH/DP',body,980)
}

function payslipLines61(p){
  var ls=(p.lancamentos||[]).slice().sort(function(a,b){return String(a.tipo).localeCompare(String(b.tipo))||n61(b.valor)-n61(a.valor)});
  return ls.map(function(l){return [l.rubrica_codigo||'—',l.rubrica_nome||'Rubrica',l.referencia==null?'—':String(l.referencia).replace('.',','),l.tipo==='provento'?money57(l.valor):'',l.tipo==='desconto'?money57(l.valor):'']})
}
async function payslips61(b){
  var people=scoped61();if(!people.length)return alert61('Nenhum colaborador no filtro atual.');var old=b.textContent;b.disabled=true;b.textContent='Gerando…';
  try{await ensurePdf57();var doc=new window.jspdf.jsPDF({orientation:'portrait',unit:'mm',format:'a4',compress:true});people.forEach(function(p,i){if(i)doc.addPage();doc.setFillColor(7,26,44);doc.rect(0,0,210,27,'F');doc.setTextColor(255,255,255);doc.setFont('helvetica','bold');doc.setFontSize(15);doc.text('LNB — Demonstrativo de Pagamento',12,12);doc.setFontSize(8);doc.text('Competência '+formatCompetence(S.competencia.competencia)+' · documento gerado pelo RH & Folha',12,20);doc.setTextColor(20,35,50);doc.setFontSize(9);doc.text('Colaborador: '+String(p.nome||''),12,36);doc.text('Matrícula: '+String(p.matricula||'—')+'   Vínculo: '+String(p.vinculo||'—'),12,42);doc.text('Cargo: '+String(p.cargo||'—')+'   Departamento: '+String(p.departamento||'—'),12,48);doc.autoTable({startY:54,head:[['Cód.','Descrição','Referência','Proventos','Descontos']],body:payslipLines61(p),theme:'grid',styles:{fontSize:8,cellPadding:2},headStyles:{fillColor:[13,43,66]},columnStyles:{3:{halign:'right'},4:{halign:'right'}}});var y=Math.min(255,(doc.lastAutoTable&&doc.lastAutoTable.finalY||80)+8);doc.setFillColor(234,242,246);doc.roundedRect(12,y,186,25,2,2,'F');doc.setFontSize(9);doc.setFont('helvetica','bold');doc.text('Total de proventos: '+money57(p.proventos),16,y+8);doc.text('Total de descontos: '+money57(p.descontos),16,y+15);doc.setFontSize(12);doc.text('Líquido: '+money57(p.liquido),130,y+15);doc.setFontSize(7);doc.setFont('helvetica','normal');doc.text('Bases: INSS '+money57(p.base_inss)+' · FGTS '+money57(p.base_fgts)+' · IRRF '+money57(p.base_irrf)+' · FGTS do mês '+money57(p.valor_fgts),12,y+32);doc.text('Documento de conferência. Valide a competência fechada antes da entrega ao colaborador.',12,287)});doc.save('LNB_Holerites_'+formatCompetence(S.competencia.competencia).replace('/','-')+'.pdf');ok61(people.length+' holerite(s) gerado(s) conforme os filtros atuais.')}catch(e){alert61(e.message||String(e))}finally{b.disabled=false;b.textContent=old}
}

var baseRenderPeople61=renderPeople;
renderPeople=function(){var r=baseRenderPeople61.apply(this,arguments);ensureButtons61();decorateStatuses61();return r};
var baseRenderPayroll61=renderPayroll;
renderPayroll=function(){var r=baseRenderPayroll61.apply(this,arguments);ensureButtons61();return r};

document.addEventListener('click',function(ev){var t=ev.target.closest&&ev.target.closest('#rh61-new,#rh61-sync,#rh61-vacations,#rh61-payslips,[data-rh61-status]');if(!t)return;ev.preventDefault();ev.stopImmediatePropagation();if(t.id==='rh61-new')newModal61();else if(t.id==='rh61-sync')sync61(t);else if(t.id==='rh61-vacations')vacationModal61();else if(t.id==='rh61-payslips')payslips61(t);else openDirectStatus61(t.dataset.rh61Status)},true);
document.addEventListener('submit',function(ev){if(ev.target&&ev.target.id==='rh61-new-form'){ev.preventDefault();ev.stopImmediatePropagation();saveNew61(ev.target)}},true);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ensureButtons61);else ensureButtons61();
})();
