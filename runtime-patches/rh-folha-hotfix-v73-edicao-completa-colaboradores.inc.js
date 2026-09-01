/* RH & Folha v73 — abre edição completa do cadastro de colaboradores (todos os campos, não só situação/e-mail). */
(function(){
'use strict';
window.RH_EDIT_V73=true;

function el73(id){return document.getElementById(id)}
function esc73(v){return esc(String(v==null?'':v))}
function value73(id){return String((el73(id)||{}).value||'').trim()}
function iso73(v){return v?String(v).slice(0,10):null}
function num73(v){var n=Number(v);return isFinite(n)?n:0}
function parseMoney73(v){return Number(String(v||'').replace(/R\$|\s/g,'').replace(/\./g,'').replace(',','.'))||0}
function money73(v){return v==null?'':Number(v).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})}
function notify73(msg,error){try{toast(msg,!!error)}catch(e){if(error)console.error(msg)}}
function colaborador73(id){return (S.colaboradores||[]).find(function(c){return String(c.id)===String(id)})||null}

function style73(){
  if(el73('rh73-style'))return;var s=document.createElement('style');s.id='rh73-style';s.textContent=
    '#rh73-modal{position:fixed;inset:0;z-index:15100;display:grid;place-items:center;padding:18px;background:rgba(2,10,19,.80);backdrop-filter:blur(9px)}'+
    '.rh73-card{width:min(860px,calc(100vw - 36px));max-height:calc(100vh - 36px);display:flex;flex-direction:column;overflow:hidden;border:1px solid var(--line);border-radius:19px;background:var(--surface);color:var(--text);box-shadow:0 28px 80px rgba(0,0,0,.55)}'+
    '.rh73-head{display:flex;justify-content:space-between;gap:16px;padding:19px 22px 15px;border-bottom:1px solid var(--line-soft)}.rh73-head span{color:var(--gold-2);font-size:9px;font-weight:900;letter-spacing:.13em}.rh73-head h2{margin:5px 0 3px;font-size:23px}.rh73-head p{margin:0;color:var(--muted);font-size:11px}.rh73-close{width:38px;height:38px;border:1px solid var(--line-soft);border-radius:10px;background:var(--surface-2);color:var(--text);font-size:22px;cursor:pointer}'+
    '.rh73-body{min-height:0;overflow:auto;padding:18px 22px 22px}.rh73-form{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.rh73-form label{display:grid;gap:5px;color:var(--muted);font-size:10px;font-weight:800;text-transform:uppercase}.rh73-form input,.rh73-form select,.rh73-form textarea{width:100%;box-sizing:border-box;padding:9px 10px;border:1px solid var(--line-soft);border-radius:9px;background:var(--surface-2);color:var(--text)}.rh73-form input:disabled{opacity:.6}'+
    '.rh73-checks,.rh73-full{grid-column:1/-1}.rh73-checks{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.rh73-checks label{display:flex;align-items:center;gap:8px;text-transform:none}.rh73-checks input{width:auto}.rh73-note{padding:11px 12px;border:1px solid var(--line-soft);border-radius:10px;background:var(--surface-2);color:var(--muted);font-size:11px;line-height:1.5}'+
    '.rh73-edit-btn{display:inline-block;margin-top:4px;padding:2px 8px;border:1px solid var(--line-soft);border-radius:7px;background:var(--surface-2);color:var(--gold-2);font-size:10px;font-weight:800;cursor:pointer}'+
    '@media(max-width:760px){#rh73-modal{padding:7px}.rh73-card{width:calc(100vw - 14px);max-height:calc(100vh - 14px)}.rh73-form{grid-template-columns:1fr}.rh73-full,.rh73-checks{grid-column:1}.rh73-checks{grid-template-columns:1fr}}'+
    'html[data-lnb-mobile-shell] #rh73-modal{inset:var(--lnb-mobile-top) 0 var(--lnb-mobile-bottom);z-index:999980;padding:7px;place-items:stretch center;overflow:hidden}'+
    'html[data-lnb-mobile-shell] #rh73-modal .rh73-card{width:100%;max-width:100%;height:100%;max-height:100%;min-height:0;border-radius:18px}'+
    'html[data-lnb-mobile-shell] #rh73-modal .rh73-head{position:relative;z-index:3;flex:0 0 auto;align-items:flex-start;padding:12px 13px;background:var(--surface)}'+
    'html[data-lnb-mobile-shell] #rh73-modal .rh73-head>div{min-width:0}html[data-lnb-mobile-shell] #rh73-modal .rh73-head h2{font-size:19px;line-height:1.15;overflow-wrap:anywhere}'+
    'html[data-lnb-mobile-shell] #rh73-modal .rh73-close{display:grid;place-items:center;flex:0 0 44px;width:44px;height:44px;margin:0;padding:0;position:relative;z-index:4}'+
    'html[data-lnb-mobile-shell] #rh73-modal .rh73-body{flex:1;min-height:0;padding:12px 12px 10px;overflow-y:auto;overflow-x:hidden;overscroll-behavior:contain}'+
    'html[data-lnb-mobile-shell] #rh73-modal .rh73-form{padding-bottom:4px}html[data-lnb-mobile-shell] #rh73-modal #rh73-edit-save{position:sticky;z-index:5;bottom:0;width:100%;min-height:50px;margin-top:4px;box-shadow:0 -10px 22px var(--surface)}';document.head.appendChild(s)
}
function close73(){var m=el73('rh73-modal');if(m)m.remove()}
function modal73(title,subtitle,html){
  close73();style73();var m=document.createElement('div');m.id='rh73-modal';m.setAttribute('role','dialog');m.setAttribute('aria-modal','true');m.innerHTML='<section class="rh73-card"><header class="rh73-head"><div><span>RH & FOLHA · CADASTRO DO COLABORADOR</span><h2>'+esc73(title)+'</h2><p>'+esc73(subtitle||'')+'</p></div><button type="button" class="rh73-close" data-rh73-close aria-label="Fechar">×</button></header><div class="rh73-body">'+html+'</div></section>';document.body.appendChild(m);m.addEventListener('click',function(e){if(e.target===m)close73()})
}

var VINCULOS73=['Celetista','Estagiário','Aprendiz','PJ','Diretor','Outro'];
function editModal73(id){
  var c=colaborador73(id);
  if(!c)return notify73('Colaborador não encontrado.',true);
  var html='<form class="rh73-form" id="rh73-edit-form" data-employee="'+esc73(c.id)+'">'+
    '<label>Matrícula<input value="'+esc73(c.matricula||'')+'" disabled></label>'+
    '<label>Nome completo *<input id="rh73-nome" maxlength="160" required value="'+esc73(c.nome||'')+'"></label>'+
    '<label>Data de admissão *<input id="rh73-admissao" type="date" required value="'+esc73(iso73(c.admissao)||'')+'"></label>'+
    '<label>Vínculo *<select id="rh73-vinculo"></select></label>'+
    '<label>Cargo<input id="rh73-cargo" maxlength="120" value="'+esc73(c.cargo||'')+'"></label>'+
    '<label>CBO<input id="rh73-cbo" maxlength="20" value="'+esc73(c.cbo||'')+'"></label>'+
    '<label>Departamento<input id="rh73-departamento" maxlength="120" value="'+esc73(c.departamento||'')+'"></label>'+
    '<label>Centro de custo<input id="rh73-cc" maxlength="80" value="'+esc73(c.centro_custo||'')+'"></label>'+
    '<label>Filial<input id="rh73-filial" maxlength="80" value="'+esc73(c.filial||'')+'"></label>'+
    '<label>Gestor responsável<input id="rh73-gestor" maxlength="120" value="'+esc73(c.gestor||'')+'"></label>'+
    '<label>Nascimento<input id="rh73-nascimento" type="date" value="'+esc73(iso73(c.data_nascimento)||'')+'"></label>'+
    '<label>E-mail corporativo<input id="rh73-email" type="email" maxlength="160" value="'+esc73(c.email||'')+'"></label>'+
    '<label>Telefone<input id="rh73-telefone" maxlength="30" value="'+esc73(c.telefone||'')+'"></label>'+
    '<label>Salário-base<input id="rh73-salario" inputmode="decimal" placeholder="0,00" value="'+esc73(money73(c.salario_base))+'"></label>'+
    '<label>Jornada semanal<input id="rh73-jornada" type="number" min="1" max="60" step="0.5" value="'+esc73(c.jornada_horas_semanais||40)+'"></label>'+
    '<label class="rh73-full">Observações<textarea id="rh73-observacoes" maxlength="500" rows="2">'+esc73(c.observacoes||'')+'</textarea></label>'+
    '<div class="rh73-checks">'+
      '<label><input id="rh73-vt" type="checkbox" '+(c.opta_vale_transporte?'checked':'')+'> Optou por Vale Transporte</label>'+
      '<label><input id="rh73-vr" type="checkbox" '+(c.opta_vr_va?'checked':'')+'> Optou por VR/VA</label>'+
      '<label><input id="rh73-med" type="checkbox" '+(c.opta_plano_saude?'checked':'')+'> Optou por Plano de Saúde</label>'+
      '<label><input id="rh73-seg" type="checkbox" '+(c.opta_seguro_vida?'checked':'')+'> Optou por Seguro de Vida</label>'+
    '</div>'+
    '<div class="rh73-note rh73-full">A matrícula não pode ser alterada por aqui, pois já está vinculada aos registros de benefícios sincronizados. Situação (Trabalhando/Férias/Afastado/Desligado) continua sendo alterada pela tela de consulta do colaborador.</div>'+
    '<button type="submit" class="button primary rh73-full" id="rh73-edit-save">Salvar alterações</button>'+
  '</form>';
  modal73(c.nome||'Editar colaborador','Cadastro completo · alteração é registrada na auditoria do RH.',html);
  var vSel=el73('rh73-vinculo');
  if(vSel){
    vSel.innerHTML=VINCULOS73.map(function(v){return '<option>'+esc73(v)+'</option>'}).join('');
    if(c.vinculo&&VINCULOS73.indexOf(c.vinculo)===-1){var o=document.createElement('option');o.textContent=c.vinculo;vSel.appendChild(o)}
    vSel.value=c.vinculo||'Celetista'
  }
  try{setupPermissions()}catch(e){}
}

async function saveEdit73(form){
  var id=form.dataset.employee,b=el73('rh73-edit-save');
  var salaryRaw=value73('rh73-salario');
  var body={
    p_colaborador_id:id,
    p_nome:value73('rh73-nome'),
    p_admissao:iso73(value73('rh73-admissao')),
    p_vinculo:value73('rh73-vinculo'),
    p_cargo:value73('rh73-cargo')||null,
    p_cbo:value73('rh73-cbo')||null,
    p_departamento:value73('rh73-departamento')||null,
    p_centro_custo:value73('rh73-cc')||null,
    p_filial:value73('rh73-filial')||null,
    p_data_nascimento:iso73(value73('rh73-nascimento')),
    p_email:value73('rh73-email')||null,
    p_telefone:value73('rh73-telefone')||null,
    p_salario_base:salaryRaw===''?null:parseMoney73(salaryRaw),
    p_jornada_horas_semanais:num73(value73('rh73-jornada'))||null,
    p_gestor:value73('rh73-gestor')||null,
    p_opta_vale_transporte:!!(el73('rh73-vt')||{}).checked,
    p_opta_vr_va:!!(el73('rh73-vr')||{}).checked,
    p_opta_plano_saude:!!(el73('rh73-med')||{}).checked,
    p_opta_seguro_vida:!!(el73('rh73-seg')||{}).checked,
    p_observacoes:value73('rh73-observacoes')||null
  };
  if(!body.p_nome||!body.p_admissao||!body.p_vinculo)return notify73('Preencha nome, admissão e vínculo.',true);
  if(b)b.disabled=true;
  try{
    await rpc('rh_atualizar_colaborador',body);
    close73();
    notify73('Cadastro atualizado e auditado.');
    if(S.competencia)await selectCompetence(S.competencia.id);
    if(typeof renderPeople==='function')renderPeople();
  }catch(e){notify73(e.message||String(e),true)}
  finally{if(b)b.disabled=false}
}

function addEditButtons73(){
  document.querySelectorAll('#employee-rows tr').forEach(function(tr){
    var nameEl=tr.querySelector('[data-rh62-employee]');
    if(!nameEl)return;
    var firstTd=tr.querySelector('td');
    if(!firstTd||firstTd.querySelector('[data-rh73-edit]'))return;
    var id=nameEl.getAttribute('data-rh62-employee');
    var btn=document.createElement('button');
    btn.type='button';btn.className='rh73-edit-btn admin-only';btn.setAttribute('data-rh73-edit',id);btn.textContent='Editar cadastro';
    firstTd.appendChild(btn)
  });
  try{setupPermissions()}catch(e){}
}

if(typeof renderPeople==='function'){
  var baseRenderPeople73=renderPeople;
  renderPeople=function(){var r=baseRenderPeople73.apply(this,arguments);addEditButtons73();return r};
}

document.addEventListener('click',function(e){
  var t=e.target.closest&&e.target.closest('[data-rh73-edit],[data-rh73-close]');
  if(!t)return;
  e.preventDefault();e.stopImmediatePropagation();
  if(t.hasAttribute('data-rh73-close')){close73();return}
  editModal73(t.getAttribute('data-rh73-edit'))
},true);
document.addEventListener('submit',function(e){
  if(e.target&&e.target.id==='rh73-edit-form'){e.preventDefault();e.stopImmediatePropagation();saveEdit73(e.target)}
},true);
document.addEventListener('keydown',function(e){if(e.key==='Escape'&&el73('rh73-modal'))close73()},true);

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){if(S.competencia)addEditButtons73()});
else if(S.competencia)addEditButtons73();
})();
