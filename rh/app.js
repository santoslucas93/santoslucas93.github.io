(function(){
'use strict';
var K=['lnb_auth_session_v1','lnb_auth_session_beneficios_v1'],AK='lnb_access_snapshot_v1',CFG=null,SES=null,ACCESS=null;
var S={competencias:[],competencia:null,colaboradores:[],folhas:[],lancamentos:[],pessoas:[],beneficios:[],preview:null,charts:{},view:'visao',fromChat:false};
var LIBRARIES={
  pdf:{url:'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',ready:function(){return !!window.pdfjsLib;}},
  xlsx:{url:'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',ready:function(){return !!window.XLSX;}},
  chart:{url:'https://cdn.jsdelivr.net/npm/chart.js@4.4.7/dist/chart.umd.min.js',ready:function(){return !!window.Chart;}}
},libraryPromises={};
var $=function(id){return document.getElementById(id);};
var money=new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}),num=new Intl.NumberFormat('pt-BR');
function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
function fmt(v){return money.format(Number(v)||0);}function nfmt(v){return num.format(Number(v)||0);}
function toast(msg,err){var el=$('toast');el.textContent=msg;el.className='toast'+(err?' error':'');el.hidden=false;clearTimeout(toast.t);toast.t=setTimeout(function(){el.hidden=true;},4200);}
function headers(token){return {'apikey':CFG.SUPABASE_KEY,'Authorization':'Bearer '+token,'Content-Type':'application/json'};}
function loadSession(){for(var i=0;i<K.length;i++)try{var s=JSON.parse(localStorage.getItem(K[i])||'null');if(s&&s.access_token)return s;}catch(e){}return null;}
function saveSession(s){SES=s;K.forEach(function(k){localStorage.setItem(k,JSON.stringify(s));});}
function clearSession(){K.forEach(function(k){localStorage.removeItem(k);});localStorage.removeItem(AK);SES=null;}
function loadAccessSnapshot(){try{var item=JSON.parse(localStorage.getItem(AK)||'null');if(!item||!item.access||Date.now()-Number(item.saved_at)>10*60*1000)return null;var sessionUid=String(SES&&SES.uid||''),itemUid=String(item.uid||''),sessionEmail=String(SES&&SES.email||'').toLowerCase(),itemEmail=String(item.email||'').toLowerCase();if(sessionUid&&itemUid&&sessionUid!==itemUid)return null;if(sessionEmail&&itemEmail&&sessionEmail!==itemEmail)return null;return item.access;}catch(e){return null;}}
function saveAccessSnapshot(access){try{localStorage.setItem(AK,JSON.stringify({saved_at:Date.now(),uid:SES&&SES.uid||'',email:String(SES&&SES.email||'').toLowerCase(),access:access}));}catch(e){}}
function setGate(message){if($('gate-message'))$('gate-message').textContent=message;}
function delay(ms){return new Promise(function(resolve){setTimeout(resolve,ms);});}
async function fetchTimed(url,options,timeout){var controller=new AbortController(),timer=setTimeout(function(){controller.abort();},timeout||12000);options=Object.assign({},options||{},{signal:controller.signal});try{return await fetch(url,options);}catch(e){if(e&&e.name==='AbortError')throw new Error('A valida\u00e7\u00e3o demorou al\u00e9m do esperado. Verifique sua conex\u00e3o e tente novamente.');throw e;}finally{clearTimeout(timer);}}
function loadLibrary(name){var lib=LIBRARIES[name];if(!lib)return Promise.reject(new Error('Biblioteca desconhecida.'));if(lib.ready())return Promise.resolve();if(libraryPromises[name])return libraryPromises[name];libraryPromises[name]=new Promise(function(resolve,reject){var script=document.createElement('script'),timer=setTimeout(function(){script.remove();delete libraryPromises[name];reject(new Error('N\u00e3o foi poss\u00edvel carregar o recurso necess\u00e1rio. Tente novamente.'));},12000);script.src=lib.url;script.async=true;script.onload=function(){clearTimeout(timer);if(lib.ready())resolve();else{delete libraryPromises[name];reject(new Error('O recurso foi carregado, mas n\u00e3o p\u00f4de ser iniciado.'));}};script.onerror=function(){clearTimeout(timer);script.remove();delete libraryPromises[name];reject(new Error('N\u00e3o foi poss\u00edvel carregar o recurso necess\u00e1rio. Tente novamente.'));};document.head.appendChild(script);});return libraryPromises[name];}
async function refresh(s){if(!s||!s.refresh_token)return null;var r=await fetchTimed(CFG.SUPABASE_URL+'/auth/v1/token?grant_type=refresh_token',{method:'POST',headers:{'apikey':CFG.SUPABASE_KEY,'Content-Type':'application/json'},body:JSON.stringify({refresh_token:s.refresh_token})});if(!r.ok)return null;var j=await r.json();if(!j.access_token)return null;s.access_token=j.access_token;s.refresh_token=j.refresh_token||s.refresh_token;s.expires_at=Date.now()+((j.expires_in||3600)*1000);saveSession(s);return s;}
async function api(path,options){options=options||{};var h=headers(SES.access_token);if(options.prefer)h.Prefer=options.prefer;var r=await fetchTimed(CFG.SUPABASE_URL+'/rest/v1/'+path,{method:options.method||'GET',headers:h,body:options.body?JSON.stringify(options.body):undefined});var text=await r.text(),body=null;try{body=text?JSON.parse(text):null;}catch(e){body=text;}if(!r.ok)throw new Error(body&&body.message||body&&body.error||('Erro '+r.status));return body;}
function rpc(name,body){return api('rpc/'+name,{method:'POST',body:body||{}});}
function can(action){if(!ACCESS)return false;if(ACCESS.acesso_total||ACCESS.permissoes==='*')return true;var a=(ACCESS.permissoes||{}).rh||[];return a.indexOf(action)>=0;}
function canAdmin(){return can('administrar');}
function validAccess(access){if(!access||!access.autenticado||!access.cadastrado)return false;if(access.usuario&&(access.usuario.bloqueado||!access.usuario.ativo))return false;var old=ACCESS;ACCESS=access;var ok=can('visualizar');ACCESS=old;return ok;}

function applyTheme(){var light=localStorage.getItem('lnb_rh_theme')==='light';document.body.classList.toggle('light',light);$('theme-toggle').textContent=light?'\ud83c\udf19':'\u2600\ufe0f';Object.keys(S.charts).forEach(function(k){try{S.charts[k].destroy();}catch(e){}});S.charts={};if(S.competencia)renderCharts();}
function chartColors(){var css=getComputedStyle(document.documentElement);return {text:css.getPropertyValue('--chart-text').trim(),grid:css.getPropertyValue('--chart-grid').trim(),gold:css.getPropertyValue('--gold').trim(),emerald:css.getPropertyValue('--emerald').trim(),red:css.getPropertyValue('--red').trim(),blue:css.getPropertyValue('--blue').trim(),orange:css.getPropertyValue('--orange').trim(),purple:css.getPropertyValue('--purple').trim()};}
function chart(id,type,data,options,clickHandler){if(!window.Chart||!$(id))return;if(S.charts[id])S.charts[id].destroy();var c=chartColors(),base={responsive:true,maintainAspectRatio:false,animation:{duration:450},plugins:{legend:{labels:{color:c.text,font:{family:'Segoe UI',size:11,weight:'700'},usePointStyle:true,padding:16}},tooltip:{backgroundColor:'#071a2c',titleColor:'#fff',bodyColor:'#dce7f3',padding:12}},scales:type==='doughnut'?{}:{x:{ticks:{color:c.text,font:{size:10,weight:'650'}},grid:{color:c.grid}},y:{ticks:{color:c.text,font:{size:10,weight:'650'}},grid:{color:c.grid}}}};var opts=Object.assign({},base,options||{});if(clickHandler)opts.onClick=clickHandler;S.charts[id]=new Chart($(id),{type:type,data:data,options:opts});}

function go(view,trace){
  S.view=view;document.querySelectorAll('.page').forEach(function(p){p.classList.toggle('active',p.id==='page-'+view);});document.querySelectorAll('.nav-item').forEach(function(b){b.classList.toggle('active',b.dataset.view===view);});window.scrollTo({top:0,behavior:'smooth'});
  if(trace)setTimeout(function(){var el=document.querySelector('[data-trace="'+trace+'"]');if(el){el.scrollIntoView({behavior:'smooth',block:'center'});el.classList.remove('trace-highlight');void el.offsetWidth;el.classList.add('trace-highlight');}},180);
}
function setupPermissions(){document.querySelectorAll('.import-only').forEach(function(el){el.hidden=!can('importar')&&!canAdmin();});document.querySelectorAll('.export-only').forEach(function(el){el.hidden=!can('exportar')&&!canAdmin();});document.querySelectorAll('.admin-only').forEach(function(el){el.hidden=!canAdmin();});}

/* \u2500\u2500 utilidades \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
function initials(n){return String(n||'?').split(/\s+/).slice(0,2).map(function(x){return x.charAt(0);}).join('').toUpperCase();}
function cleanSearch(v){return String(v||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');}
function departmentName(v){var map={'1':'Administrativa','2':'Comunica\u00e7\u00e3o','3':'Financeira','4':'Marketing','5':'T\u00e9cnica','6':'T\u00e9cnica/Projetos'};return map[String(v)]||v||'\u2014';}
function dateBR(v){if(!v)return '\u2014';var p=v.slice(0,10).split('-');return p[2]+'/'+p[1]+'/'+p[0];}
function brDate(iso){return dateBR(iso);}
function emptyRow(n,text){return '<tr><td colspan="'+n+'" style="text-align:center;color:var(--muted);padding:30px">'+esc(text)+'</td></tr>';}
function title(v){return String(v||'').replace(/_/g,' ').replace(/^./,function(c){return c.toUpperCase();});}

/* \u2500\u2500 custo do empregador por pessoa \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
/* ── cálculo IRRF progressivo (tabela 2024) ───────────────────────────── */
function calcIrrf(base){
  if(!base||base<=2824)return 0;
  if(base<=3751.05)return Math.max(0,base*0.075-211.78);
  if(base<=4664.68)return Math.max(0,base*0.15-493.22);
  if(base<=5981.69)return Math.max(0,base*0.225-843.78);
  return Math.max(0,base*0.275-1242.34);
}

function custoEmpresa(p){
  var enc=(S.competencia&&S.competencia.encargos)||{};
  var itens=[],total=0;
  var prov=Number(p.proventos)||0;
  itens.push(['Proventos brutos',prov,'']);total+=prov;
  var fgts=Number(p.valor_fgts)||0;
  if(fgts){itens.push(['FGTS',fgts,'exato']);total+=fgts;}
  var baseTotal=Number(enc.base_total_inss)||0;
  var baseInd=Number(p.base_inss)||0;
  if(baseTotal>0&&baseInd>0){
    var share=baseInd/baseTotal;
    var patronalTotal=baseTotal*0.20;
    var rat=baseTotal*0.01,terceiros=baseTotal*0.058;
    [['INSS patronal',patronalTotal],['RAT',rat],['Terceiros',terceiros]].forEach(function(x){
      if(!x[1])return;
      var v=x[1]*share;itens.push([x[0],v,'rateado']);total+=v;
    });
  }
  if(S.beneficios&&S.beneficios.length){
    var ben=S.beneficios.find(function(b){return b.colaborador_id===p.colaborador_id||b.cpf_mascarado===p.cpf_mascarado||b.matricula===p.matricula;});
    if(ben){
      [['Seguro de Vida',ben.seguro_vida],['Assistência Médica',ben.assistencia_medica||ben.assist_medica],['VR Caixa',ben.vr_caixa],['Vale Transporte',ben.vale_transporte]].forEach(function(x){if(Number(x[1])>0){itens.push([x[0],Number(x[1]),'benefício']);total+=Number(x[1]);}});
    }
  }
  return {itens:itens,total:total};
}

/* \u2500\u2500 carregamento de compet\u00eancias \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
async function loadCompetences(selectId){
  S.competencias=await api('rh_competencias?select=*&order=competencia.desc');
  var sel=$('competencia-select');
  sel.innerHTML=S.competencias.length?S.competencias.map(function(c){return '<option value="'+c.id+'">'+esc(formatCompetence(c.competencia))+'</option>';}).join(''):'<option value="">Nenhuma importa\u00e7\u00e3o</option>';
  var id=selectId||sel.value||(S.competencias[0]&&S.competencias[0].id);
  if(id){sel.value=id;await selectCompetence(id);}
  else{S.competencia=null;$('empty-state').hidden=false;$('dashboard').hidden=true;renderEmptyTables();}
}
function formatCompetence(v){if(!v)return '\u2014';var p=v.slice(0,7).split('-');return p[1]+'/'+p[0];}
async function selectCompetence(id){
  S.competencia=S.competencias.find(function(c){return c.id===id;})||null;if(!S.competencia)return;
  var requests=[];
  requests.push(can('ver_nomes')||canAdmin()?api('rh_colaboradores?select=*&order=nome'):Promise.resolve([]));
  requests.push(can('ver_valores_individuais')||canAdmin()?api('rh_folha_colaboradores?competencia_id=eq.'+encodeURIComponent(id)+'&select=*'):Promise.resolve([]));
  requests.push(can('ver_valores_individuais')||canAdmin()?api('rh_lancamentos?competencia_id=eq.'+encodeURIComponent(id)+'&select=*&order=valor.desc'):Promise.resolve([]));
  var out=await Promise.all(requests);S.colaboradores=out[0]||[];S.folhas=out[1]||[];S.lancamentos=out[2]||[];
  var by={};S.colaboradores.forEach(function(x){by[x.id]=x;});
  var lanc={};S.lancamentos.forEach(function(x){(lanc[x.folha_colaborador_id]||(lanc[x.folha_colaborador_id]=[])).push(x);});
  S.pessoas=S.folhas.map(function(f){return Object.assign({},by[f.colaborador_id]||{id:f.colaborador_id,nome:'Dados protegidos'},f,{lancamentos:lanc[f.id]||[]});});
  S.beneficios=[];
  try{
    var bd=await api('beneficios_colaboradores?select=*&competencia_id=eq.'+encodeURIComponent(id));
    if(bd&&bd.length)S.beneficios=bd;
    else{var bd2=await api('ben_contratos?select=*&is_ativo=eq.true');if(bd2&&bd2.length)S.beneficios=bd2;}
  }catch(e){/* benefícios serão integrados quando disponíveis */}
  renderAll();
}
function renderAll(){
  $('empty-state').hidden=true;$('dashboard').hidden=false;
  renderKpis();renderPeople();renderPayroll();renderRubrics();renderCharges();renderMovements();renderDepartments();renderValidations();renderCharts();renderCustoReal();
  populatePainelFilters();
}

/* \u2500\u2500 KPIs \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
function renderKpis(){
  var c=S.competencia,r=c.resumo||{};
  $('kpi-proventor').textContent=fmt(c.proventos);$('kpi-descontos').textContent=fmt(c.descontos);$('kpi-liquido').textContent=fmt(c.liquido);
  $('kpi-pessoas').textContent=nfmt(r.pessoas||S.pessoas.length);
  $('kpi-vinculos').textContent=(r.empregados||0)+' CLT \u00b7 '+(r.estagiarios||0)+' estagi\u00e1rios';
  $('payroll-kpis').innerHTML=[['Proventos',c.proventos],['Descontos',c.descontos],['L\u00edquido',c.liquido],['FGTS',c.valor_fgts]].map(function(x){return '<div class="kpi"><span>'+x[0]+'</span><strong>'+fmt(x[1])+'</strong><small>'+formatCompetence(c.competencia)+'</small></div>';}).join('');
}

/* \u2500\u2500 colaboradores \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
function filteredPessoas(){
  var fvenc=($('filter-vinculo')&&$('filter-vinculo').value)||'';
  var fdept=($('filter-dept')&&$('filter-dept').value)||'';
  return S.pessoas.filter(function(p){
    if(fvenc&&cleanSearch(p.vinculo||'')!==cleanSearch(fvenc))return false;
    if(fdept&&String(p.departamento)!==String(fdept))return false;
    return true;
  });
}
function renderPeople(){
  var q=cleanSearch(($('employee-search')&&$('employee-search').value)||'');
  var rows=filteredPessoas().filter(function(p){return !q||cleanSearch([p.nome,p.matricula,p.departamento,p.cargo].join(' ')).indexOf(q)>=0;});
  $('employee-rows').innerHTML=rows.length?rows.map(function(p){
    var custo=custoEmpresa(p);
    return '<tr>'
      +'<td><div class="row-person"><span class="avatar">'+esc(initials(p.nome))+'</span>'
      +'<span><b class="link-name" data-person="'+esc(p.id)+'">'+esc(p.nome)+'</b>'
      +'<small>'+esc(p.cargo||p.cpf_mascarado||'')+'</small></span></div></td>'
      +'<td>'+esc(p.matricula||'\u2014')+'</td>'
      +'<td>'+esc(p.vinculo||'\u2014')+'</td>'
      +'<td>'+esc(departmentName(p.departamento))+'</td>'
      +'<td><span class="status '+(/demit/i.test(p.situacao||'')?'danger':'success')+'">'+esc(p.situacao||'\u2014')+'</span></td>'
      +'<td class="money">'+fmt(p.proventos)+'</td>'
      +'<td class="money"><button class="detail-button enc-btn" data-encargos="'+esc(p.id)+'">'+fmt(custo.total)+'</button></td>'
      +'<td class="money"><b>'+fmt(p.liquido)+'</b></td>'
    +'</tr>';
  }).join(''):emptyRow(8,'Nenhum registro individual dispon\u00edvel para este perfil.');
  bindPersonButtons();bindEncargosButtons();
}
function renderPayroll(){
  $('payroll-rows').innerHTML=S.pessoas.length?S.pessoas.map(function(p){return '<tr><td><b>'+esc(p.nome)+'</b><br><small>'+esc(p.departamento||'')+'</small></td><td class="money">'+fmt(p.salario)+'</td><td class="money">'+fmt(p.proventos)+'</td><td class="money">'+fmt(p.descontos)+'</td><td class="money"><b>'+fmt(p.liquido)+'</b></td><td><button class="detail-button" data-person="'+esc(p.id)+'">Detalhar</button></td></tr>';}).join(''):emptyRow(6,'Composi\u00e7\u00e3o individual protegida.');
  bindPersonButtons();
}
function rubricGroups(){var map={};S.lancamentos.forEach(function(x){var k=(x.rubrica_codigo||'')+'|'+x.rubrica_nome+'|'+x.tipo;if(!map[k])map[k]={codigo:x.rubrica_codigo,nome:x.rubrica_nome,tipo:x.tipo,valor:0};map[k].valor+=Number(x.valor)||0;});return Object.keys(map).map(function(k){return map[k];}).sort(function(a,b){return b.valor-a.valor;});}
function renderRubrics(){var a=rubricGroups();$('rubric-rows').innerHTML=a.length?a.map(function(x){return '<tr><td>'+esc(x.codigo||'\u2014')+'</td><td>'+esc(x.nome)+'</td><td><span class="status">'+esc(x.tipo)+'</span></td><td class="money">'+fmt(x.valor)+'</td></tr>';}).join(''):emptyRow(4,'Rubricas indispon\u00edveis para este perfil ou compet\u00eancia.');}
function chargeData(){var e=S.competencia&&S.competencia.encargos||{};return [['INSS total',e.total_inss],['FGTS',e.valor_fgts||S.competencia.valor_fgts],['PIS',e.valor_pis],['IRRF',e.valor_irrf]];}
function renderCharges(){
  var a=chargeData();
  var handlers={'INSS total':'window._openInss()','FGTS':'window._openFgts()','IRRF':'window._openIrrf()'};
  $('charge-list').innerHTML=a.map(function(x){
    var oc=Object.keys(handlers).find(function(k){return x[0].indexOf(k)>=0;});
    var onclick=oc?handlers[oc]:'';
    return '<div class="metric-row'+(onclick?' clickable':'')+(onclick?'" onclick="'+onclick+'"':'"')+'><span>'+x[0]+'</span><strong>'+fmt(x[1])+'</strong>'+(onclick?'<small>clique para detalhar</small>':'')+'</div>';
  }).join('');
  $('charges-kpis').innerHTML=a.map(function(x){return '<div class="kpi"><span>'+x[0]+'</span><strong>'+fmt(x[1])+'</strong><small>Compet\u00eancia '+formatCompetence(S.competencia.competencia)+'</small></div>';}).join('');
}
function renderMovements(){
  var r=S.competencia.resumo||{},cards=[['Admiss\u00f5es',r.admissoes],['Desligamentos',r.demitidos],['Em f\u00e9rias',r.ferias],['Trabalhando',r.trabalhando]];
  $('movement-kpis').innerHTML=cards.map(function(x){return '<div class="kpi"><span>'+x[0]+'</span><strong>'+nfmt(x[1])+'</strong><small>Na compet\u00eancia</small></div>';}).join('');
  var moves=S.pessoas.filter(function(p){return /demit/i.test(p.situacao||'')||(p.admissao||'').slice(0,7)===S.competencia.competencia.slice(0,7);});
  $('movement-rows').innerHTML=moves.length?moves.map(function(p){var dem=/demit/i.test(p.situacao||'');return '<tr><td>'+esc(p.nome)+'</td><td><span class="status '+(dem?'danger':'success')+'">'+(dem?'Desligamento':'Admiss\u00e3o')+'</span></td><td>'+esc(dem?'Na compet\u00eancia':dateBR(p.admissao))+'</td><td>'+esc(departmentName(p.departamento))+'</td></tr>';}).join(''):emptyRow(4,'Nenhuma movimenta\u00e7\u00e3o individual dispon\u00edvel.');
}
function departments(){var a=(S.competencia.resumo||{}).departamentos||[];if(a.length)return a;var m={};S.pessoas.forEach(function(p){var k=departmentName(p.departamento);if(!m[k])m[k]={nome:k,proventos:0,descontos:0,liquido:0};m[k].proventos+=Number(p.proventos)||0;m[k].descontos+=Number(p.descontos)||0;m[k].liquido+=Number(p.liquido)||0;});return Object.keys(m).map(function(k){return m[k];});}
function renderDepartments(){var a=departments();$('department-rows').innerHTML=a.length?a.map(function(x){return '<tr><td><b>'+esc(x.nome)+'</b></td><td class="money">'+fmt(x.proventos)+'</td><td class="money">'+fmt(x.descontos)+'</td><td class="money"><b>'+fmt(x.liquido)+'</b></td></tr>';}).join(''):emptyRow(4,'Sem rateio por departamento.');}
function validations(){return S.competencia.validacoes||[];}
function renderValidations(){
  var a=validations();
  var html=a.length?a.slice(0,4).map(function(x){return '<div class="validation-row '+(x.tipo==='ok'?'':'warn')+'"><i>'+(x.tipo==='ok'?'\u2713':'!')+'</i><span>'+esc(x.mensagem)+'</span></div>';}).join(''):'<div class="validation-row"><i>\u2713</i><span>Compet\u00eancia salva e dispon\u00edvel para consulta.</span></div>';
  $('validation-list').innerHTML=html;
  $('reconciliation-list').innerHTML=a.length?a.map(function(x){return '<div class="reconciliation-item"><span class="check">'+(x.tipo==='ok'?'\u2713':'!')+'</span><span><b>'+esc(title(x.campo))+'</b><small>'+esc(x.mensagem)+'</small></span><span class="status '+(x.tipo==='ok'?'success':'danger')+'">'+(x.tipo==='ok'?'Conciliado':'Revisar')+'</span></div>';}).join(''):'<div class="reconciliation-item"><span class="check">\u2713</span><span><b>Importa\u00e7\u00e3o</b><small>Registro dispon\u00edvel no hist\u00f3rico.</small></span><span class="status success">Conclu\u00eddo</span></div>';
}

/* \u2500\u2500 gr\u00e1ficos \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
function renderCharts(){
  if(!S.competencia||!window.Chart)return;
  var c=chartColors(),d=departments(),r=S.competencia.resumo||{},rub=rubricGroups().slice(0,10),charges=chargeData();
  var fp=filteredPessoas();
  var fdepts=fp.length&&fp.length<S.pessoas.length?(function(){var m={};fp.forEach(function(p){var k=departmentName(p.departamento);if(!m[k])m[k]={nome:k,liquido:0,proventos:0,descontos:0};m[k].liquido+=Number(p.liquido)||0;m[k].proventos+=Number(p.proventos)||0;m[k].descontos+=Number(p.descontos)||0;});return Object.keys(m).map(function(k){return m[k];});})():d;

  chart('chart-composicao','bar',{labels:['Proventos','Descontos','L\u00edquido'],datasets:[{label:'Valor',data:[S.competencia.proventos,S.competencia.descontos,S.competencia.liquido],backgroundColor:[c.gold,c.red,c.emerald],borderRadius:8}]},{plugins:{legend:{display:false}}});
  chart('chart-departamentos','bar',{labels:fdepts.map(function(x){return x.nome;}),datasets:[{label:'L\u00edquido',data:fdepts.map(function(x){return x.liquido;}),backgroundColor:c.emerald,borderRadius:7}]},{indexAxis:'y',plugins:{legend:{display:false}}},function(evt,elements){if(!elements.length)return;var idx=elements[0].index;var dname=fdepts[idx]&&fdepts[idx].nome;if(dname){var key=Object.keys({'1':'Administrativa','2':'Comunica\u00e7\u00e3o','3':'Financeira','4':'Marketing','5':'T\u00e9cnica','6':'T\u00e9cnica/Projetos'}).find(function(k){return departmentName(k)===dname;});if(key&&$('filter-dept')){$('filter-dept').value=key;renderPeople();renderCharts();}go('colaboradores');}});
  chart('chart-vinculos','doughnut',{labels:['CLT','Estagi\u00e1rios','Outros'],datasets:[{data:[r.empregados||0,r.estagiarios||0,Math.max(0,(r.pessoas||0)-(r.empregados||0)-(r.estagiarios||0))],backgroundColor:[c.blue,c.gold,c.purple],borderColor:getComputedStyle(document.body).getPropertyValue('--surface'),borderWidth:3}]},{cutout:'66%'},function(evt,elements){if(!elements.length)return;var labels=['Celetista','Estagi\u00e1rio',''];var lbl=labels[elements[0].index];if(lbl&&$('filter-vinculo')){$('filter-vinculo').value=lbl;renderPeople();renderCharts();}go('colaboradores');});
  chart('chart-rubricas','bar',{labels:rub.map(function(x){return x.nome;}),datasets:[{label:'Valor',data:rub.map(function(x){return x.valor;}),backgroundColor:rub.map(function(x){return x.tipo==='D'||x.tipo==='desconto'?c.red:c.gold;}),borderRadius:6}]},{indexAxis:'y',plugins:{legend:{display:false}}});
  chart('chart-encargos','bar',{labels:charges.map(function(x){return x[0];}),datasets:[{label:'Valor',data:charges.map(function(x){return Number(x[1])||0;}),backgroundColor:[c.blue,c.gold,c.emerald,c.purple],borderRadius:7}]},{plugins:{legend:{display:false}}},function(evt,elements){if(!elements.length)return;var idx=elements[0].index;var lbl=charges[idx]&&charges[idx][0]||'';if(lbl.indexOf('INSS')>=0)openInssBreakdown();else if(lbl.indexOf('FGTS')>=0)openFgtsBreakdown();else if(lbl.indexOf('IRRF')>=0)openIrrfBreakdown();});
  chart('chart-rateio','bar',{labels:fdepts.map(function(x){return x.nome;}),datasets:[{label:'Proventos',data:fdepts.map(function(x){return x.proventos;}),backgroundColor:c.gold,borderRadius:5},{label:'Descontos',data:fdepts.map(function(x){return x.descontos;}),backgroundColor:c.red,borderRadius:5},{label:'L\u00edquido',data:fdepts.map(function(x){return x.liquido;}),backgroundColor:c.emerald,borderRadius:5}]},{indexAxis:'y'});
}
function renderEmptyTables(){['employee-rows','payroll-rows','rubric-rows','movement-rows','department-rows'].forEach(function(id){if($(id))$(id).innerHTML='';});}

/* ── aba: Custo Real ──────────────────────────────────────────────────── */
function renderCustoReal(){
  if(!$('custo-real-rows')||!S.competencia)return;
  var hasBen=S.beneficios&&S.beneficios.length>0;
  var rows=S.pessoas.slice().sort(function(a,b){return custoEmpresa(b).total-custoEmpresa(a).total;});
  var totCusto=0,totProv=0,totFgts=0,totEnc=0,totBen=0;
  rows.forEach(function(p){
    var c=custoEmpresa(p);totCusto+=c.total;totProv+=Number(p.proventos)||0;totFgts+=Number(p.valor_fgts)||0;
    c.itens.forEach(function(it){if(it[2]==='rateado')totEnc+=it[1];if(it[2]==='benefício')totBen+=it[1];});
  });
  var kpiItems=[['Custo total LNB',totCusto],['Salários brutos',totProv],['FGTS + Encargos patronais',totFgts+totEnc]];
  if(hasBen)kpiItems.push(['Benefícios',totBen]);
  $('custo-real-kpis').innerHTML=kpiItems.map(function(x){return '<div class="kpi"><span>'+esc(x[0])+'</span><strong>'+fmt(x[1])+'</strong><small>'+formatCompetence(S.competencia.competencia)+'</small></div>';}).join('');
  var colBen=hasBen?'<th class="money">Benefícios</th>':'';
  $('custo-real-head').innerHTML='<th>Colaborador</th><th class="money">Proventos</th><th class="money">FGTS</th><th class="money">INSS+RAT+Terc.</th>'+colBen+'<th class="money">Custo total</th>';
  $('custo-real-rows').innerHTML=rows.length?rows.map(function(p,i){
    var c=custoEmpresa(p);
    var enc=0,ben=0;c.itens.forEach(function(it){if(it[2]==='rateado')enc+=it[1];if(it[2]==='benefício')ben+=it[1];});
    return '<tr>'
      +'<td><span class="rank">'+(i+1)+'</span> <b>'+esc(p.nome)+'</b><br><small>'+esc(departmentName(p.departamento))+'</small></td>'
      +'<td class="money">'+fmt(p.proventos)+'</td>'
      +'<td class="money">'+fmt(p.valor_fgts)+'</td>'
      +'<td class="money">'+fmt(enc)+'</td>'
      +(hasBen?'<td class="money">'+fmt(ben)+'</td>':'')
      +'<td class="money"><b>'+fmt(c.total)+'</b></td>'
      +'</tr>';
  }).join(''):emptyRow(hasBen?6:5,'Dados individuais não disponíveis para este perfil.');
  if(!hasBen&&$('custo-ben-note')){$('custo-ben-note').hidden=false;}else if($('custo-ben-note')){$('custo-ben-note').hidden=true;}
  // gráfico top 15
  if(window.Chart&&rows.length){
    var c=chartColors(),top=rows.slice(0,15);
    var datasets=[
      {label:'Proventos',data:top.map(function(p){return Number(p.proventos)||0;}),backgroundColor:c.gold,borderRadius:4},
      {label:'FGTS',data:top.map(function(p){return Number(p.valor_fgts)||0;}),backgroundColor:c.blue,borderRadius:4},
      {label:'Encargos',data:top.map(function(p){var e=0;custoEmpresa(p).itens.forEach(function(it){if(it[2]==='rateado')e+=it[1];});return e;}),backgroundColor:c.orange,borderRadius:4}
    ];
    if(hasBen)datasets.push({label:'Benefícios',data:top.map(function(p){var b=0;custoEmpresa(p).itens.forEach(function(it){if(it[2]==='benefício')b+=it[1];});return b;}),backgroundColor:c.purple,borderRadius:4});
    chart('chart-custo-real','bar',{labels:top.map(function(p){return p.nome.split(' ')[0];}),datasets:datasets},{indexAxis:'y',plugins:{legend:{display:true,position:'top'}},scales:{x:{stacked:true},y:{stacked:true}}});
  }
}

/* \u2500\u2500 filtros do painel \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
function populatePainelFilters(){
  var fd=$('filter-dept'),fv=$('filter-vinculo');
  if(!fd||!fv)return;
  var depts=departments();
  var curD=fd.value,curV=fv.value;
  fd.innerHTML='<option value="">Todos os departamentos</option>'+depts.map(function(d){var key=Object.keys({'1':'Administrativa','2':'Comunica\u00e7\u00e3o','3':'Financeira','4':'Marketing','5':'T\u00e9cnica','6':'T\u00e9cnica/Projetos'}).find(function(k){return departmentName(k)===d.nome;})||d.nome;return '<option value="'+esc(key)+'">'+esc(d.nome)+'</option>';}).join('');
  var vinculos=[...new Set(S.pessoas.map(function(p){return p.vinculo||'';}).filter(Boolean))].sort();
  fv.innerHTML='<option value="">Todos os v\u00ednculos</option>'+vinculos.map(function(v){return '<option value="'+esc(v)+'">'+esc(v)+'</option>';}).join('');
  if(curD)fd.value=curD;if(curV)fv.value=curV;
}

/* \u2500\u2500 importa\u00e7\u00e3o \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
async function handlePdf(file){
  if(!file)return;if(file.size>25*1024*1024){toast('O PDF ultrapassa o limite de 25 MB.',true);return;}
  try{toast('Preparando o leitor de PDF\u2026');await loadLibrary('pdf');toast('Lendo e validando o PDF\u2026');var result=await RHParser.extractPdf(file);if(!result.competencia||!result.competencia.competencia||!result.colaboradores.length)throw new Error('O relat\u00f3rio n\u00e3o p\u00f4de ser reconhecido. Verifique se o PDF possui texto selecion\u00e1vel.');showPreview(result);}catch(e){toast(e.message,true);}
}
async function handleExcel(file){
  if(!file)return;
  try{toast('Preparando o leitor de Excel\u2026');await loadLibrary('xlsx');toast('Lendo e validando a planilha\u2026');showPreview(await RHParser.parseExcel(file));}catch(e){toast(e.message,true);}
}
function showPreview(result){
  S.preview=result;
  var comp=result.competencia||{},validacoes=comp.validacoes||[];
  $('import-preview').hidden=false;
  $('preview-title').textContent=comp.arquivo_nome||'';
  $('preview-status').textContent=validacoes.every(function(x){return x.tipo==='ok';})?'Pronto para importar':'Importar com ressalvas';
  var compRot=comp.competencia?comp.competencia.slice(5,7)+'/'+comp.competencia.slice(0,4):'\u2014';
  $('preview-summary').innerHTML=[['Compet\u00eancia',compRot],['Pessoas',result.colaboradores.length],['Proventos',fmt(comp.proventos)],['L\u00edquido',fmt(comp.liquido)]].map(function(x){return '<div><span>'+x[0]+'</span><strong>'+esc(x[1])+'</strong></div>';}).join('');
  $('preview-validations').innerHTML=validacoes.map(function(x){return '<div class="validation-row '+(x.tipo==='ok'?'':'warn')+'"><i>'+(x.tipo==='ok'?'\u2713':'!')+'</i><span>'+esc(x.msg||x.mensagem||'')+'</span></div>';}).join('');
  $('import-preview').scrollIntoView({behavior:'smooth',block:'center'});
}
function buildRpcPayload(preview){
  var comp=preview.competencia||{};
  var enc=comp.encargos||{};
  var colaboradores=(preview.colaboradores||[]).map(function(c){
    var f=c.folha||{};
    var lancamentos=(c.lancamentos||[]).map(function(l){
      return {codigo:l.codigo,nome:l.nome,referencia:RHParser.brNumber(l.referencia),valor:l.valor,tipo:l.tipo==='provento'?'P':(l.tipo==='desconto'?'D':l.tipo)};
    });
    return {matricula:c.matricula,nome:c.nome,cpf_mascarado:c.cpf_mascarado,admissao:c.admissao,situacao:c.situacao,vinculo:c.vinculo,centro_custo:c.centro_custo,departamento:c.departamento,cargo:c.cargo,cbo:c.cbo,filial:c.filial,horas_mes:f.horas_mes,salario:(f.salario!=null?f.salario:c.salario),proventos:f.proventos,descontos:f.descontos,liquido:f.liquido,informativa:f.informativa,base_inss:f.base_inss,excedente_inss:f.excedente_inss,base_fgts:f.base_fgts,valor_fgts:f.valor_fgts,base_irrf:f.base_irrf,lancamentos:lancamentos};
  });
  var competenciaYm=(comp.competencia||'').slice(0,7);
  var admissoesNoMes=colaboradores.filter(function(c){return c.admissao&&c.admissao.slice(0,7)===competenciaYm;}).length;
  var sit=enc.situacoes||{};
  return {
    meta:{competencia:comp.competencia,empresa_codigo:comp.empresa_codigo,empresa_nome:comp.empresa_nome,cnpj_mascarado:comp.cnpj_mascarado,tipo_calculo:comp.tipo_calculo,fonte:comp.fonte,arquivo_nome:comp.arquivo_nome,arquivo_hash:comp.arquivo_hash},
    resumo:{proventos:comp.proventos,descontos:comp.descontos,liquido:comp.liquido,base_inss:comp.base_inss,base_fgts:comp.base_fgts,valor_fgts:comp.valor_fgts,base_irrf:comp.base_irrf,trabalhando:sit.trabalhando,demitidos:sit.demitido,ferias:sit.ferias,admissoes:admissoesNoMes,departamentos:(comp.resumo||{}).departamentos,centros_custo:(comp.resumo||{}).centros_custo,rubricas:(comp.resumo||{}).rubricas},
    encargos:{sal_contrib_empregados:enc.sal_contrib_empregados,excedente_inss:enc.excedente_inss,base_total_inss:enc.base_total_inss,segurados:enc.segurados,empresa_inss:enc.empresa_inss,rat:enc.rat,terceiros:enc.terceiros,total_inss:enc.total_inss,base_fgts:enc.base_fgts,valor_fgts:enc.valor_fgts,base_pis:enc.base_pis,valor_pis:enc.valor_pis,base_irrf_mensal:enc.base_irrf_mensal,valor_irrf_mensal:enc.valor_irrf_mensal,valor_total_irrf:enc.valor_total_irrf,valor_irrf:enc.valor_total_irrf,situacoes:sit},
    validacoes:comp.validacoes||[],
    colaboradores:colaboradores
  };
}
async function confirmImport(){
  if(!S.preview)return;var btn=$('confirm-import');btn.disabled=true;btn.textContent='Importando\u2026';
  try{var id=await rpc('rh_importar_folha',{p_payload:buildRpcPayload(S.preview)});toast('Compet\u00eancia importada com sucesso.');S.preview=null;$('import-preview').hidden=true;await loadCompetences(id);go('visao');}
  catch(e){toast('N\u00e3o foi poss\u00edvel importar: '+e.message,true);}
  finally{btn.disabled=false;btn.textContent='Confirmar importa\u00e7\u00e3o';}
}

/* \u2500\u2500 modal: composi\u00e7\u00e3o individual \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
function bindPersonButtons(){
  document.querySelectorAll('[data-person]').forEach(function(b){b.onclick=function(){openPerson(b.dataset.person);};});
  document.querySelectorAll('.link-name[data-person]').forEach(function(b){b.style.cursor='pointer';b.onclick=function(){openPerson(b.dataset.person);};});
}
function openPerson(id){
  var p=S.pessoas.find(function(x){return x.id===id;});if(!p)return;
  $('employee-modal-title').textContent=p.nome;
  $('employee-modal-summary').innerHTML=[
    ['Matr\u00edcula',p.matricula||'\u2014'],['Cargo',p.cargo||'\u2014'],
    ['Departamento',departmentName(p.departamento)],['Centro de custo',p.centro_custo||'\u2014'],
    ['V\u00ednculo',p.vinculo||'\u2014'],['Admiss\u00e3o',brDate(p.admissao)],
    ['Situa\u00e7\u00e3o',p.situacao||'\u2014'],['Sal\u00e1rio base',fmt(p.salario)]
  ].map(function(x){return '<div><span>'+esc(x[0])+'</span><strong>'+esc(x[1])+'</strong></div>';}).join('');
  var lancs=p.lancamentos||[];
  var provs=lancs.filter(function(x){return x.tipo==='P'||x.tipo==='provento';});
  var descs=lancs.filter(function(x){return x.tipo==='D'||x.tipo==='desconto';});
  var sumProv=provs.reduce(function(a,x){return a+(Number(x.valor)||0);},0);
  var sumDesc=descs.reduce(function(a,x){return a+(Number(x.valor)||0);},0);
  var liquido=Number(p.liquido)||0;
  var custo=custoEmpresa(p);
  function rubrRow(x){return '<tr><td><b>'+esc((x.rubrica_codigo||x.codigo||'')+' '+(x.rubrica_nome||x.nome||''))+'</b></td><td class="money">'+nfmt(x.referencia)+'</td><td></td><td class="money">'+fmt(x.valor)+'</td></tr>';}
  var html='';
  if(lancs.length){
    html+='<tr class="group-head"><td colspan="4">Proventos</td></tr>';
    html+=provs.map(rubrRow).join('');
    html+='<tr class="group-total"><td colspan="3"><b>Subtotal proventos</b></td><td class="money"><b>'+fmt(sumProv)+'</b></td></tr>';
    html+='<tr class="group-head"><td colspan="4">Descontos</td></tr>';
    html+=descs.map(rubrRow).join('');
    html+='<tr class="group-total"><td colspan="3"><b>Subtotal descontos</b></td><td class="money"><b>'+fmt(sumDesc)+'</b></td></tr>';
    html+='<tr class="group-total destaque"><td colspan="3"><b>L\u00edquido a receber</b></td><td class="money"><b>'+fmt(liquido)+'</b></td></tr>';
    html+='<tr class="group-head"><td colspan="4">Custo para a empresa</td></tr>';
    custo.itens.forEach(function(it){html+='<tr><td>'+esc(it[0])+'</td><td></td><td><small>'+esc(it[2])+'</small></td><td class="money">'+fmt(it[1])+'</td></tr>';});
    html+='<tr class="group-total"><td colspan="3"><b>Total custo empresa</b></td><td class="money"><b>'+fmt(custo.total)+'</b></td></tr>';
  }else{html=emptyRow(4,'Sem rubricas individuais dispon\u00edveis.');}
  $('employee-modal-rows').innerHTML=html;
  $('employee-modal').hidden=false;
}
function closeModal(){$('employee-modal').hidden=true;}

/* \u2500\u2500 popup: encargos por colaborador \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
function bindEncargosButtons(){
  document.querySelectorAll('.enc-btn[data-encargos]').forEach(function(b){b.onclick=function(e){e.stopPropagation();openEncargosPopup(b.dataset.encargos);};});
}
function openEncargosPopup(id){
  var p=S.pessoas.find(function(x){return x.id===id;});if(!p)return;
  var custo=custoEmpresa(p);
  var modal=$('encargos-popup');if(!modal)return;
  modal.querySelector('.ep-title').textContent=p.nome;
  modal.querySelector('.ep-body').innerHTML=custo.itens.map(function(it){
    return '<div class="ep-row"><span>'+esc(it[0])+'</span>'+(it[2]?'<small class="ep-tag">'+esc(it[2])+'</small>':'')+'<strong>'+fmt(it[1])+'</strong></div>';
  }).join('')
  +'<div class="ep-row ep-total"><span><b>Total custo empresa</b></span><strong>'+fmt(custo.total)+'</strong></div>';
  modal.hidden=false;
}

/* \u2500\u2500 popup: detalhamento INSS \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
window._openInss=function(){openInssBreakdown();};
window._openIrrf=function(){openIrrfBreakdown();};
window._openFgts=function(){openFgtsBreakdown();};

function openInssBreakdown(){
  var modal=$('inss-modal');if(!modal)return;
  var e=(S.competencia&&S.competencia.encargos)||{};
  var base=Number(e.base_total_inss)||0;
  var totalInss=Number(e.total_inss)||0;
  var patronal=base>0?base*0.20:(Number(e.empresa_inss)||0);
  var rat=base>0?base*0.01:(Number(e.rat)||0);
  var terceiros=base>0?base*0.058:(Number(e.terceiros)||0);
  var retido=Math.max(0,totalInss-patronal-rat-terceiros);
  var itens=[
    ['INSS retido (colaboradores)',retido,'empregados'],
    ['INSS patronal (20% da base)',patronal,'empresa'],
    ['RAT (1% da base)',rat,'empresa'],
    ['Terceiros — SESC/SENAI/etc. (5,8%)',terceiros,'empresa']
  ].filter(function(x){return x[1]>0;});
  var totalGeral=itens.reduce(function(a,x){return a+x[1];},0);
  // per-person breakdown
  var perPerson=S.pessoas.filter(function(p){return Number(p.base_inss)>0;}).sort(function(a,b){return b.base_inss-a.base_inss;});
  var perPersonHtml=perPerson.length?
    '<details style="margin-top:1rem"><summary style="cursor:pointer;color:var(--gold);font-size:.85rem;padding:.4rem 0">▶ INSS por colaborador ('+perPerson.length+')</summary>'+
    '<table class="modal-table-inner"><thead><tr><th>Colaborador</th><th class="money">Base INSS</th><th class="money">INSS patronal</th><th class="money">RAT</th><th class="money">Terceiros</th></tr></thead><tbody>'+
    perPerson.map(function(p){var bi=Number(p.base_inss)||0,share=base>0?bi/base:0;return '<tr><td>'+esc(p.nome)+'</td><td class="money">'+fmt(bi)+'</td><td class="money">'+fmt(patronal*share)+'</td><td class="money">'+fmt(rat*share)+'</td><td class="money">'+fmt(terceiros*share)+'</td></tr>';}).join('')+
    '</tbody></table></details>':'';
  modal.querySelector('.im-total-inss').textContent=fmt(totalInss);
  modal.querySelector('.im-base').textContent=fmt(base);
  modal.querySelector('.im-body').innerHTML=itens.map(function(it){
    return '<div class="ep-row"><span>'+esc(it[0])+'</span><small class="ep-tag">'+esc(it[2])+'</small><strong>'+fmt(it[1])+'</strong></div>';
  }).join('')
  +'<div class="ep-row ep-total"><span><b>Total INSS (empresa + empregados)</b></span><strong>'+fmt(totalGeral)+'</strong></div>'
  +perPersonHtml;
  modal.hidden=false;
}

function openIrrfBreakdown(){
  var modal=$('irrf-modal');if(!modal)return;
  var e=(S.competencia&&S.competencia.encargos)||{};
  var totalFolha=Number(e.valor_total_irrf||e.valor_irrf||S.competencia.valor_irrf)||0;
  var pessoas=S.pessoas.filter(function(p){return Number(p.base_irrf)>0;}).sort(function(a,b){return b.base_irrf-a.base_irrf;});
  var totalCalc=pessoas.reduce(function(a,p){return a+calcIrrf(Number(p.base_irrf));},0);
  var rows=pessoas.map(function(p){
    var base=Number(p.base_irrf)||0;
    var calc=calcIrrf(base);
    var irrfLancs=(p.lancamentos||[]).filter(function(x){return /irrf/i.test(x.rubrica_nome||x.nome||'');});
    var folha=irrfLancs.reduce(function(a,x){return a+(Number(x.valor)||0);},0);
    if(!folha)folha=calc; // se não tiver rubrica individual, usa o calculado
    var diff=Math.round((calc-folha)*100)/100;
    return {nome:p.nome,base:base,calc:calc,folha:folha,diff:diff};
  });
  modal.querySelector('.irrf-total-folha').textContent=fmt(totalFolha);
  modal.querySelector('.irrf-total-calc').textContent=fmt(totalCalc);
  modal.querySelector('.irrf-body').innerHTML=rows.length?
    '<table class="modal-table-inner"><thead><tr><th>Colaborador</th><th class="money">Base IRRF</th><th class="money">Calculado</th><th class="money">Folha</th><th class="money">Dif.</th></tr></thead><tbody>'+
    rows.map(function(r){var abs=Math.abs(r.diff);var dc=abs>1?'money danger':'money';return '<tr><td>'+esc(r.nome)+'</td><td class="money">'+fmt(r.base)+'</td><td class="money">'+fmt(r.calc)+'</td><td class="money">'+fmt(r.folha)+'</td><td class="'+dc+'">'+fmt(r.diff)+'</td></tr>';}).join('')+
    '</tbody></table>':
    '<p style="color:var(--muted);padding:1rem 0">Dados individuais de IRRF não disponíveis para este perfil.</p>';
  modal.hidden=false;
}

function openFgtsBreakdown(){
  var modal=$('fgts-modal');if(!modal)return;
  var e=(S.competencia&&S.competencia.encargos)||{};
  var totalFgts=Number(e.valor_fgts||S.competencia.valor_fgts)||0;
  var base=Number(e.base_fgts||S.competencia.base_fgts)||0;
  var pessoas=S.pessoas.filter(function(p){return Number(p.valor_fgts)>0;}).sort(function(a,b){return b.valor_fgts-a.valor_fgts;});
  modal.querySelector('.fgts-total').textContent=fmt(totalFgts);
  modal.querySelector('.fgts-base').textContent=fmt(base);
  modal.querySelector('.fgts-body').innerHTML=pessoas.length?
    '<table class="modal-table-inner"><thead><tr><th>Colaborador</th><th class="money">Base FGTS</th><th class="money">FGTS (8%)</th></tr></thead><tbody>'+
    pessoas.map(function(p){return '<tr><td>'+esc(p.nome)+'</td><td class="money">'+fmt(p.base_fgts)+'</td><td class="money">'+fmt(p.valor_fgts)+'</td></tr>';}).join('')+
    '</tbody></table>':
    '<p style="color:var(--muted);padding:1rem 0">Dados individuais de FGTS não disponíveis para este perfil.</p>';
  modal.hidden=false;
}

/* \u2500\u2500 export \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
async function exportPeople(){
  if(!S.pessoas.length){toast('N\u00e3o h\u00e1 dados individuais dispon\u00edveis para exportar.',true);return;}
  try{
    toast('Preparando a exporta\u00e7\u00e3o\u2026');await loadLibrary('xlsx');
    var rows=S.pessoas.map(function(p){return {Matricula:p.matricula,Colaborador:p.nome,Vinculo:p.vinculo,Departamento:departmentName(p.departamento),Cargo:p.cargo,Situacao:p.situacao,Proventos:p.proventos,Descontos:p.descontos,Liquido:p.liquido};});
    var ws=XLSX.utils.json_to_sheet(rows),wb=XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb,ws,'Colaboradores');
    XLSX.writeFile(wb,'RH_Folha_'+formatCompetence(S.competencia.competencia).replace('/','_')+'.xlsx');
  }catch(e){toast(e.message,true);}
}

/* \u2500\u2500 assistente IA \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
function askAI(question){
  question=String(question||'').trim();if(!question)return;
  addMessage(question,'user');
  var q=cleanSearch(question),r=S.competencia&&S.competencia.resumo||{},d=departments().slice().sort(function(a,b){return b.liquido-a.liquido;}),e=S.competencia&&S.competencia.encargos||{},answer,trace,view='visao',composition=false;
  if(!S.competencia){answer='Ainda n\u00e3o existe uma compet\u00eancia importada. Use o m\u00f3dulo de Importa\u00e7\u00e3o para carregar o primeiro arquivo.';view='importacao';trace=null;}
  else if(/liquido|l\u00edquido|total da folha/.test(q)){answer='O l\u00edquido da folha de '+formatCompetence(S.competencia.competencia)+' \u00e9 '+fmt(S.competencia.liquido)+'.';trace='liquido';composition=true;}
  else if(/departamento|area|\u00e1rea|maior custo/.test(q)){answer=d.length?'O departamento com maior custo l\u00edquido \u00e9 '+d[0].nome+', com '+fmt(d[0].liquido)+'.':'A compet\u00eancia n\u00e3o possui rateio por departamento.';trace='departamentos';view='rateio';}
  else if(/quant|pessoa|colaborador|headcount/.test(q)){answer='A folha possui '+nfmt(r.pessoas||S.pessoas.length)+' pessoas: '+nfmt(r.empregados)+' empregados e '+nfmt(r.estagiarios)+' estagi\u00e1rios.';trace='headcount';view='colaboradores';composition=true;}
  else if(/fgts/.test(q)){answer='O FGTS da compet\u00eancia \u00e9 '+fmt(e.valor_fgts||S.competencia.valor_fgts)+', sobre base de '+fmt(e.base_fgts||S.competencia.base_fgts)+'.';trace='encargos';view='encargos';}
  else if(/desconto/.test(q)){answer='Os descontos totalizam '+fmt(S.competencia.descontos)+'. A composi\u00e7\u00e3o est\u00e1 dispon\u00edvel em Rubricas.';trace='descontos';view='rubricas';composition=true;}
  else{answer='Posso responder sobre l\u00edquido, descontos, FGTS, quantidade de pessoas e custos por departamento. Quando houver v\u00ednculo verific\u00e1vel, mostro a origem e a composi\u00e7\u00e3o.';trace=null;}
  addAnswer(answer,trace,view,composition);
}
function addMessage(text,kind){var div=document.createElement('div');div.className='ai-message '+kind;div.textContent=text;$('ai-body').appendChild(div);$('ai-body').scrollTop=$('ai-body').scrollHeight;}
function addAnswer(text,trace,view,composition){
  var div=document.createElement('div');div.className='ai-message bot';
  div.innerHTML='<span>'+esc(text)+'</span>'+(trace?'<div class="trace-actions"><button data-ai-view="'+view+'" data-ai-trace="'+trace+'">\u2197 Ver origem</button>'+(composition?'<button data-ai-view="'+(view==='colaboradores'?'colaboradores':'folha')+'">\u25a6 Ver composi\u00e7\u00e3o</button>':'')+'</div><small class="ai-source">Fonte: folha oficial \u00b7 compet\u00eancia '+formatCompetence(S.competencia.competencia)+'</small>':'');
  $('ai-body').appendChild(div);
  div.querySelectorAll('[data-ai-view]').forEach(function(b){b.onclick=function(){S.fromChat=true;$('ai-panel').hidden=true;$('back-chat').hidden=false;go(b.dataset.aiView,b.dataset.aiTrace);};});
  $('ai-body').scrollTop=$('ai-body').scrollHeight;
}

/* \u2500\u2500 inje\u00e7\u00e3o de UI (modals, filtros, headers) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
function setupUI(){
  /* 0. estilos de suporte para novos modais */
  if(!$('_rh_extra_styles')){
    var st=document.createElement('style');st.id='_rh_extra_styles';
    st.textContent='.modal-table-inner{width:100%;border-collapse:collapse;font-size:.82rem;margin-top:.5rem}'
      +'.modal-table-inner th,.modal-table-inner td{padding:.35rem .5rem;border-bottom:1px solid var(--border)}'
      +'.modal-table-inner th{color:var(--muted);font-weight:600;text-align:left}'
      +'.modal-table-inner td.money,.modal-table-inner th.money{text-align:right}'
      +'.money.danger{color:var(--red)!important}'
      +'.rank{display:inline-block;width:1.4rem;color:var(--muted);font-size:.8rem;text-align:right;margin-right:.3rem}';
    document.head.appendChild(st);
  }

  /* 1. header da tabela de colaboradores: 8 colunas */
  var ethead=document.querySelector('#employee-rows')&&document.querySelector('#employee-rows').closest('table')&&document.querySelector('#employee-rows').closest('table').querySelector('thead tr');
  if(ethead)ethead.innerHTML='<th>Colaborador</th><th>Matr\u00edcula</th><th>V\u00ednculo</th><th>Departamento</th><th>Situa\u00e7\u00e3o</th><th class="money">Bruto</th><th class="money">Encargos</th><th class="money">L\u00edquido</th>';

  /* 2. header da tabela no modal: Rubrica | Ref. | Nota | Valor */
  var mthead=document.querySelector('#employee-modal-rows')&&document.querySelector('#employee-modal-rows').closest('table')&&document.querySelector('#employee-modal-rows').closest('table').querySelector('thead tr');
  if(mthead)mthead.innerHTML='<th>Rubrica</th><th class="money">Ref.</th><th>Nota</th><th class="money">Valor</th>';

  /* 3. modal de encargos por colaborador */
  if(!$('encargos-popup')){
    var ep=document.createElement('div');ep.id='encargos-popup';ep.className='modal';ep.hidden=true;
    ep.innerHTML='<div class="modal-backdrop" data-close-encargos></div><article class="modal-card" role="dialog" style="max-width:420px"><div class="modal-head"><div><span class="eyebrow">CUSTO PARA A EMPRESA</span><h2 class="ep-title">Colaborador</h2></div><button class="modal-close" data-close-encargos>\u00d7</button></div><div class="ep-body" style="padding:1.2rem 1.4rem"></div></article>';
    document.body.appendChild(ep);
    ep.querySelectorAll('[data-close-encargos]').forEach(function(b){b.onclick=function(){ep.hidden=true;};});
  }

  /* 4. modal de detalhamento INSS */
  if(!$('inss-modal')){
    var im=document.createElement('div');im.id='inss-modal';im.className='modal';im.hidden=true;
    im.innerHTML='<div class="modal-backdrop" data-close-inss></div><article class="modal-card" role="dialog" style="max-width:560px;max-height:90vh;overflow-y=auto"><div class="modal-head" style="position:sticky;top:0;background:var(--surface);z-index:1"><div><span class="eyebrow">DETALHAMENTO INSS</span><h2>Composi\u00e7\u00e3o do INSS</h2></div><button class="modal-close" data-close-inss>\u00d7</button></div><div style="padding:1rem 1.4rem 0"><div style="display:grid;grid-template-columns:1fr 1fr;gap:.6rem;margin-bottom:1rem"><div class="kpi" style="padding:.8rem"><span>INSS total (folha)</span><strong class="im-total-inss">\u2014</strong></div><div class="kpi" style="padding:.8rem"><span>Base de c\u00e1lculo</span><strong class="im-base">\u2014</strong></div></div></div><div class="im-body" style="padding:0 1.4rem 1.4rem"></div></article>';
    document.body.appendChild(im);
    im.querySelectorAll('[data-close-inss]').forEach(function(b){b.onclick=function(){im.hidden=true;};});
  }

  /* 5. modal de detalhamento IRRF */
  if(!$('irrf-modal')){
    var irm=document.createElement('div');irm.id='irrf-modal';irm.className='modal';irm.hidden=true;
    irm.innerHTML='<div class="modal-backdrop" data-close-irrf></div><article class="modal-card" role="dialog" style="max-width:640px;max-height:90vh;overflow-y:auto"><div class="modal-head" style="position:sticky;top:0;background:var(--surface);z-index:1"><div><span class="eyebrow">DETALHAMENTO IRRF</span><h2>Composi\u00e7\u00e3o do IRRF</h2></div><button class="modal-close" data-close-irrf>\u00d7</button></div><div style="padding:1rem 1.4rem 0"><div style="display:grid;grid-template-columns:1fr 1fr;gap:.6rem;margin-bottom:1rem"><div class="kpi" style="padding:.8rem"><span>IRRF total (folha)</span><strong class="irrf-total-folha">\u2014</strong></div><div class="kpi" style="padding:.8rem"><span>IRRF calculado (tabela 2024)</span><strong class="irrf-total-calc">\u2014</strong></div></div><p style="color:var(--muted);font-size:.8rem;margin-bottom:1rem">Tabela progressiva 2024: isento at\u00e9 R$ 2.824 \u00b7 7,5% \u00b7 15% \u00b7 22,5% \u00b7 27,5%. <em>Folha de junho = sal\u00e1rio pago em julho.</em></p></div><div class="irrf-body" style="padding:0 1.4rem 1.4rem"></div></article>';
    document.body.appendChild(irm);
    irm.querySelectorAll('[data-close-irrf]').forEach(function(b){b.onclick=function(){irm.hidden=true;};});
  }

  /* 6. modal de detalhamento FGTS */
  if(!$('fgts-modal')){
    var fgm=document.createElement('div');fgm.id='fgts-modal';fgm.className='modal';fgm.hidden=true;
    fgm.innerHTML='<div class="modal-backdrop" data-close-fgts></div><article class="modal-card" role="dialog" style="max-width:520px;max-height:90vh;overflow-y:auto"><div class="modal-head" style="position:sticky;top:0;background:var(--surface);z-index:1"><div><span class="eyebrow">DETALHAMENTO FGTS</span><h2>FGTS por Colaborador</h2></div><button class="modal-close" data-close-fgts>\u00d7</button></div><div style="padding:1rem 1.4rem 0"><div style="display:grid;grid-template-columns:1fr 1fr;gap:.6rem;margin-bottom:1rem"><div class="kpi" style="padding:.8rem"><span>FGTS total (8% base)</span><strong class="fgts-total">\u2014</strong></div><div class="kpi" style="padding:.8rem"><span>Base de c\u00e1lculo</span><strong class="fgts-base">\u2014</strong></div></div></div><div class="fgts-body" style="padding:0 1.4rem 1.4rem"></div></article>';
    document.body.appendChild(fgm);
    fgm.querySelectorAll('[data-close-fgts]').forEach(function(b){b.onclick=function(){fgm.hidden=true;};});
  }

  /* 7. aba Custo Real */
  if(!$('page-custoreal')){
    var crPage=document.createElement('div');crPage.id='page-custoreal';crPage.className='page';
    crPage.innerHTML='<h1>Custo Real por Colaborador</h1><p style="color:var(--muted);margin-bottom:1.5rem">Soma de folha + encargos patronais + benef\u00edcios \u2014 custo efetivo da LNB por pessoa.</p>'
      +'<div id="custo-real-kpis" class="kpi-grid" style="margin-bottom:1.5rem"></div>'
      +'<p id="custo-ben-note" class="validation-row warn" hidden>\u2139\ufe0f Benef\u00edcios (Seguro de Vida, Assist\u00eancia M\u00e9dica, VR Caixa, Vale Transporte) ser\u00e3o inclu\u00eddos automaticamente quando o m\u00f3dulo de Gest\u00e3o de Benef\u00edcios estiver integrado.</p>'
      +'<div class="chart-wrap tall" style="margin-bottom:2rem"><canvas id="chart-custo-real"></canvas></div>'
      +'<div class="table-wrap"><table><thead><tr id="custo-real-head"></tr></thead><tbody id="custo-real-rows"></tbody></table></div>';
    var _mainContent=document.querySelector('#app .content')||document.querySelector('#app .main')||document.querySelector('#app');
    _mainContent.appendChild(crPage);
    // bot\u00e3o no nav
    if(!document.querySelector('[data-view="custoreal"]')){
      var crBtn=document.createElement('button');crBtn.className='nav-item';crBtn.dataset.view='custoreal';crBtn.innerHTML='<span>\ud83d\udcb0</span>Custo Real';
      crBtn.onclick=function(){go('custoreal');};
      var nav=document.querySelector('.sidebar nav')||document.querySelector('nav');
      if(nav){var lastBtn=nav.querySelector('.nav-item:last-child');if(lastBtn)nav.insertBefore(crBtn,lastBtn);else nav.appendChild(crBtn);}
    }
  }

  /* 8. barra de filtros no painel */
  var dashboard=$('dashboard');
  if(dashboard&&!$('painel-filters')){
    var fb=document.createElement('div');fb.id='painel-filters';fb.className='filter-bar';
    fb.innerHTML='<label>Departamento<select id="filter-dept"><option value="">Todos</option></select></label>'
      +'<label>V\u00ednculo<select id="filter-vinculo"><option value="">Todos</option></select></label>'
      +'<button class="filter-reset" id="filter-reset">Limpar filtros</button>';
    dashboard.insertBefore(fb,dashboard.firstChild);
    $('filter-dept').onchange=function(){renderPeople();renderCharts();};
    $('filter-vinculo').onchange=function(){renderPeople();renderCharts();};
    $('filter-reset').onclick=function(){$('filter-dept').value='';$('filter-vinculo').value='';renderPeople();renderCharts();};
  }
}

/* \u2500\u2500 bind \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
function bind(){
  $('theme-toggle').onclick=function(){localStorage.setItem('lnb_rh_theme',document.body.classList.contains('light')?'dark':'light');applyTheme();};
  $('logout').onclick=async function(){try{await fetch(CFG.SUPABASE_URL+'/auth/v1/logout',{method:'POST',headers:headers(SES.access_token)});}catch(e){}clearSession();location.href='/';};
  document.querySelectorAll('.nav-item').forEach(function(b){b.onclick=function(){go(b.dataset.view);};});
  document.querySelectorAll('[data-go]').forEach(function(b){b.onclick=function(){go(b.dataset.go);};});
  $('competencia-select').onchange=function(){selectCompetence(this.value).catch(function(e){toast(e.message,true);});};
  $('employee-search').oninput=renderPeople;
  $('pdf-input').onchange=function(){handlePdf(this.files[0]);this.value='';};
  $('excel-input').onchange=function(){handleExcel(this.files[0]);this.value='';};
  $('cancel-import').onclick=function(){S.preview=null;$('import-preview').hidden=true;};
  $('confirm-import').onclick=confirmImport;
  $('export-employees').onclick=exportPeople;
  document.querySelectorAll('[data-close-modal]').forEach(function(x){x.onclick=closeModal;});
  document.addEventListener('keydown',function(e){
    if(e.key==='Escape'){
      closeModal();$('ai-panel').hidden=true;
      ['encargos-popup','inss-modal','irrf-modal','fgts-modal'].forEach(function(id){if($(id))$(id).hidden=true;});
    }
  });
  $('ai-launch').onclick=function(){$('ai-panel').hidden=false;};
  $('ai-close').onclick=function(){$('ai-panel').hidden=true;};
  $('back-chat').onclick=function(){$('ai-panel').hidden=false;$('back-chat').hidden=true;};
  $('ai-form').onsubmit=function(e){e.preventDefault();var v=$('ai-input').value;$('ai-input').value='';askAI(v);};
  $('ai-suggestions').querySelectorAll('button').forEach(function(b){b.onclick=function(){askAI(b.textContent);};});
}

/* \u2500\u2500 abertura do m\u00f3dulo \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
async function openModule(access){
  ACCESS=access;$('user-name').textContent=ACCESS.usuario&&ACCESS.usuario.nome||SES.nome||SES.email||'';
  setupPermissions();setupUI();$('gate').hidden=true;$('app').hidden=false;
  loadLibrary('chart').then(function(){renderCharts();}).catch(function(){});
  try{await loadCompetences();}catch(loadError){$('empty-state').hidden=false;$('dashboard').hidden=true;toast('O m\u00f3dulo abriu, mas o hist\u00f3rico n\u00e3o p\u00f4de ser carregado: '+loadError.message,true);}
}
function offerCentralValidation(){setTimeout(function(){if(!$('gate').hidden){$('gate-home').textContent='Validar pela Central de Gest\u00e3o';$('gate-home').href='/?abrir=rh';$('gate-home').hidden=false;}},5000);}
function revalidateInBackground(){rpc('meu_acesso').then(function(fresh){if(!validAccess(fresh)){clearSession();location.href='/?acesso_negado=rh';return;}ACCESS=fresh;saveAccessSnapshot(fresh);setupPermissions();}).catch(function(){/* RLS continua sendo autoridade */});}

async function start(){
  window.__rhBootReady=true;bind();applyTheme();offerCentralValidation();
  try{
    setGate('Carregando a configura\u00e7\u00e3o segura\u2026');
    var configResponse=await fetchTimed('/api/config',{},10000);if(!configResponse.ok)throw new Error('Configura\u00e7\u00e3o indispon\u00edvel.');CFG=await configResponse.json();
    SES=loadSession();if(!SES)throw new Error('Entre pela Central de Gest\u00e3o para acessar este m\u00f3dulo.');
    var expiry=Number(SES.expires_at)||0;if(expiry&&expiry<1e12)expiry*=1000;if(!expiry||Date.now()>expiry-60000){setGate('Renovando sua sess\u00e3o\u2026');SES=await refresh(SES);}
    if(!SES)throw new Error('Sua sess\u00e3o expirou. Entre novamente pela Central de Gest\u00e3o.');
    var cachedAccess=loadAccessSnapshot();
    if(validAccess(cachedAccess)){setGate('Abrindo RH & Folha\u2026');await openModule(cachedAccess);revalidateInBackground();return;}
    setGate('Verificando seu acesso ao RH & Folha\u2026');
    try{ACCESS=await rpc('meu_acesso');}catch(firstError){setGate('A valida\u00e7\u00e3o demorou. Fazendo uma segunda tentativa\u2026');await delay(650);ACCESS=await rpc('meu_acesso');}
    if(!validAccess(ACCESS))throw new Error('Seu usu\u00e1rio n\u00e3o possui acesso ao m\u00f3dulo RH & Folha.');
    saveAccessSnapshot(ACCESS);await openModule(ACCESS);
  }catch(e){setGate(e&&e.message?e.message:'N\u00e3o foi poss\u00edvel validar o acesso. Tente novamente.');$('gate-home').hidden=false;}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
