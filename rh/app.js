(function(){
  'use strict';
  var K=['lnb_auth_session_v1','lnb_auth_session_beneficios_v1'],AK='lnb_access_snapshot_v1',CFG=null,SES=null,ACCESS=null;
  var S={competencias:[],competencia:null,colaboradores:[],folhas:[],lancamentos:[],pessoas:[],preview:null,charts:{},view:'visao',fromChat:false};
  var LIBRARIES={
    pdf:{url:'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',ready:function(){return !!window.pdfjsLib;}},
    xlsx:{url:'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',ready:function(){return !!window.XLSX;}},
    chart:{url:'https://cdn.jsdelivr.net/npm/chart.js@4.4.7/dist/chart.umd.min.js',ready:function(){return !!window.Chart;}}
  },libraryPromises={};
  var $=function(id){return document.getElementById(id);};
  var money=new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}),num=new Intl.NumberFormat('pt-BR');
  function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function fmt(v){return money.format(Number(v)||0);}function nfmt(v){return num.format(Number(v)||0);}
  function toast(message,error){var el=$('toast');el.textContent=message;el.className='toast'+(error?' error':'');el.hidden=false;clearTimeout(toast.t);toast.t=setTimeout(function(){el.hidden=true;},4200);}
  function headers(token){return {'apikey':CFG.SUPABASE_KEY,'Authorization':'Bearer '+token,'Content-Type':'application/json'};}
  function loadSession(){for(var i=0;i<K.length;i++)try{var s=JSON.parse(localStorage.getItem(K[i])||'null');if(s&&s.access_token)return s;}catch(e){}return null;}
  function saveSession(s){SES=s;K.forEach(function(k){localStorage.setItem(k,JSON.stringify(s));});}
  function clearSession(){K.forEach(function(k){localStorage.removeItem(k);});localStorage.removeItem(AK);SES=null;}
  function loadAccessSnapshot(){try{var item=JSON.parse(localStorage.getItem(AK)||'null');if(!item||!item.access||Date.now()-Number(item.saved_at)>10*60*1000)return null;var sessionUid=String(SES&&SES.uid||''),itemUid=String(item.uid||''),sessionEmail=String(SES&&SES.email||'').toLowerCase(),itemEmail=String(item.email||'').toLowerCase();if(sessionUid&&itemUid&&sessionUid!==itemUid)return null;if(sessionEmail&&itemEmail&&sessionEmail!==itemEmail)return null;return item.access;}catch(e){return null;}}
  function saveAccessSnapshot(access){try{localStorage.setItem(AK,JSON.stringify({saved_at:Date.now(),uid:SES&&SES.uid||'',email:String(SES&&SES.email||'').toLowerCase(),access:access}));}catch(e){}}
  function setGate(message){if($('gate-message'))$('gate-message').textContent=message;}
  function delay(ms){return new Promise(function(resolve){setTimeout(resolve,ms);});}
  async function fetchTimed(url,options,timeout){var controller=new AbortController(),timer=setTimeout(function(){controller.abort();},timeout||12000);options=Object.assign({},options||{},{signal:controller.signal});try{return await fetch(url,options);}catch(e){if(e&&e.name==='AbortError')throw new Error('A validaÃ§Ã£o demorou alÃ©m do esperado. Verifique sua conexÃ£o e tente novamente.');throw e;}finally{clearTimeout(timer);}}
  function loadLibrary(name){var lib=LIBRARIES[name];if(!lib)return Promise.reject(new Error('Biblioteca desconhecida.'));if(lib.ready())return Promise.resolve();if(libraryPromises[name])return libraryPromises[name];libraryPromises[name]=new Promise(function(resolve,reject){var script=document.createElement('script'),timer=setTimeout(function(){script.remove();delete libraryPromises[name];reject(new Error('NÃ£o foi possÃ­vel carregar o recurso necessÃ¡rio. Tente novamente.'));},12000);script.src=lib.url;script.async=true;script.onload=function(){clearTimeout(timer);if(lib.ready())resolve();else{delete libraryPromises[name];reject(new Error('O recurso foi carregado, mas nÃ£o pÃ´de ser iniciado.'));}};script.onerror=function(){clearTimeout(timer);script.remove();delete libraryPromises[name];reject(new Error('NÃ£o foi possÃ­vel carregar o recurso necessÃ¡rio. Tente novamente.'));};document.head.appendChild(script);});return libraryPromises[name];}
  async function refresh(s){if(!s||!s.refresh_token)return null;var r=await fetchTimed(CFG.SUPABASE_URL+'/auth/v1/token?grant_type=refresh_token',{method:'POST',headers:{'apikey':CFG.SUPABASE_KEY,'Content-Type':'application/json'},body:JSON.stringify({refresh_token:s.refresh_token})});if(!r.ok)return null;var j=await r.json();if(!j.access_token)return null;s.access_token=j.access_token;s.refresh_token=j.refresh_token||s.refresh_token;s.expires_at=Date.now()+((j.expires_in||3600)*1000);saveSession(s);return s;}
  async function api(path,options){options=options||{};var h=headers(SES.access_token);if(options.prefer)h.Prefer=options.prefer;var r=await fetchTimed(CFG.SUPABASE_URL+'/rest/v1/'+path,{method:options.method||'GET',headers:h,body:options.body?JSON.stringify(options.body):undefined});var text=await r.text(),body=null;try{body=text?JSON.parse(text):null;}catch(e){body=text;}if(!r.ok)throw new Error(body&&body.message||body&&body.error||('Erro '+r.status));return body;}
  function rpc(name,body){return api('rpc/'+name,{method:'POST',body:body||{}});}
  function can(action){if(!ACCESS)return false;if(ACCESS.acesso_total||ACCESS.permissoes==='*')return true;var a=(ACCESS.permissoes||{}).rh||[];return a.indexOf(action)>=0;}
  function canAdmin(){return can('administrar');}
  function validAccess(access){if(!access||!access.autenticado||!access.cadastrado)return false;if(access.usuario&&(access.usuario.bloqueado||!access.usuario.ativo))return false;var old=ACCESS;ACCESS=access;var ok=can('visualizar');ACCESS=old;return ok;}

  function applyTheme(){var light=localStorage.getItem('lnb_rh_theme')==='light';document.body.classList.toggle('light',light);$('theme-toggle').textContent=light?'ð':'âï¸';Object.keys(S.charts).forEach(function(k){try{S.charts[k].destroy();}catch(e){}});S.charts={};if(S.competencia)renderCharts();}
  function chartColors(){var css=getComputedStyle(document.documentElement);return {text:css.getPropertyValue('--chart-text').trim(),grid:css.getPropertyValue('--chart-grid').trim(),gold:css.getPropertyValue('--gold').trim(),emerald:css.getPropertyValue('--emerald').trim(),red:css.getPropertyValue('--red').trim(),blue:css.getPropertyValue('--blue').trim(),orange:css.getPropertyValue('--orange').trim(),purple:css.getPropertyValue('--purple').trim()};}
  function chart(id,type,data,options){if(!window.Chart||!$(id))return;if(S.charts[id])S.charts[id].destroy();var c=chartColors(),base={responsive:true,maintainAspectRatio:false,animation:{duration:450},plugins:{legend:{labels:{color:c.text,font:{family:'Segoe UI',size:11,weight:'700'},usePointStyle:true,padding:16}},tooltip:{backgroundColor:'#071a2c',titleColor:'#fff',bodyColor:'#dce7f3',padding:12}},scales:type==='doughnut'?{}:{x:{ticks:{color:c.text,font:{size:10,weight:'650'}},grid:{color:c.grid}},y:{ticks:{color:c.text,font:{size:10,weight:'650'}},grid:{color:c.grid}}}};S.charts[id]=new Chart($(id),{type:type,data:data,options:Object.assign(base,options||{})});}

  function go(view,trace){
    S.view=view;document.querySelectorAll('.page').forEach(function(p){p.classList.toggle('active',p.id==='page-'+view);});document.querySelectorAll('.nav-item').forEach(function(b){b.classList.toggle('active',b.dataset.view===view);});window.scrollTo({top:0,behavior:'smooth'});
    if(trace)setTimeout(function(){var el=document.querySelector('[data-trace="'+trace+'"]');if(el){el.scrollIntoView({behavior:'smooth',block:'center'});el.classList.remove('trace-highlight');void el.offsetWidth;el.classList.add('trace-highlight');}},180);
  }
  function setupPermissions(){document.querySelectorAll('.import-only').forEach(function(el){el.hidden=!can('importar')&&!canAdmin();});document.querySelectorAll('.export-only').forEach(function(el){el.hidden=!can('exportar')&&!canAdmin();});document.querySelectorAll('.admin-only').forEach(function(el){el.hidden=!canAdmin();});}

  async function loadCompetences(selectId){
    S.competencias=await api('rh_competencias?select=*&order=competencia.desc');var sel=$('competencia-select');sel.innerHTML=S.competencias.length?S.competencias.map(function(c){return '<option value="'+c.id+'">'+esc(formatCompetence(c.competencia))+'</option>';}).join(''):'<option value="">Nenhuma importaÃ§Ã£o</option>';
    var id=selectId||sel.value||(S.competencias[0]&&S.competencias[0].id);if(id){sel.value=id;await selectCompetence(id);}else{S.competencia=null;$('empty-state').hidden=false;$('dashboard').hidden=true;renderEmptyTables();}
  }
  function formatCompetence(v){if(!v)return 'â';var p=v.slice(0,7).split('-');return p[1]+'/'+p[0];}
  async function selectCompetence(id){
    S.competencia=S.competencias.find(function(c){return c.id===id;})||null;if(!S.competencia)return;
    var requests=[];
    requests.push(can('ver_nomes')||canAdmin()?api('rh_colaboradores?select=*&order=nome'):Promise.resolve([]));
    requests.push(can('ver_valores_individuais')||canAdmin()?api('rh_folha_colaboradores?competencia_id=eq.'+encodeURIComponent(id)+'&select=*'):Promise.resolve([]));
    requests.push(can('ver_valores_individuais')||canAdmin()?api('rh_lancamentos?competencia_id=eq.'+encodeURIComponent(id)+'&select=*&order=valor.desc'):Promise.resolve([]));
    var out=await Promise.all(requests);S.colaboradores=out[0]||[];S.folhas=out[1]||[];S.lancamentos=out[2]||[];
    var by={};S.colaboradores.forEach(function(x){by[x.id]=x;});var lanc={};S.lancamentos.forEach(function(x){(lanc[x.folha_colaborador_id]||(lanc[x.folha_colaborador_id]=[])).push(x);});
    S.pessoas=S.folhas.map(function(f){return Object.assign({},by[f.colaborador_id]||{id:f.colaborador_id,nome:'Dados protegidos'},f,{lancamentos:lanc[f.id]||[]});});
    renderAll();
  }
  function renderAll(){
    $('empty-state').hidden=true;$('dashboard').hidden=false;renderKpis();renderPeople();renderPayroll();renderRubrics();renderCharges();renderMovements();renderDepartments();renderValidations();renderCharts();
  }
  function renderKpis(){var c=S.competencia,r=c.resumo||{};$('kpi-proventos').textContent=fmt(c.proventos);$('kpi-descontos').textContent=fmt(c.descontos);$('kpi-liquido').textContent=fmt(c.liquido);$('kpi-pessoas').textContent=nfmt(r.pessoas||S.pessoas.length);$('kpi-vinculos').textContent=(r.empregados||0)+' CLT Â· '+(r.estagiarios||0)+' estagiÃ¡rios';$('payroll-kpis').innerHTML=[['Proventos',c.proventos],['Descontos',c.descontos],['LÃ­quido',c.liquido],['FGTS',c.valor_fgts]].map(function(x){return '<div class="kpi"><span>'+x[0]+'</span><strong>'+fmt(x[1])+'</strong><small>'+formatCompetence(c.competencia)+'</small></div>';}).join('');}
  function renderPeople(){var q=cleanSearch($('employee-search').value),rows=S.pessoas.filter(function(p){return !q||cleanSearch([p.nome,p.matricula,p.departamento,p.cargo].join(' ')).indexOf(q)>=0;});$('employee-rows').innerHTML=rows.length?rows.map(function(p){return '<tr><td><div class="row-person"><span class="avatar">'+esc(initials(p.nome))+'</span><span><b>'+esc(p.nome)+'</b><small>'+esc(p.cargo||p.cpf_mascarado||'')+'</small></span></div></td><td>'+esc(p.matricula)+'</td><td>'+esc(p.vinculo||'â')+'</td><td>'+esc(departmentName(p.departamento))+'</td><td><span class="status '+(/demit/i.test(p.situacao||'')?'danger':'success')+'">'+esc(p.situacao||'â')+'</span></td><td class="money"><b>'+fmt(p.liquido)+'</b></td><td><button class="detail-button" data-person="'+esc(p.id)+'">Ver composiÃ§Ã£o</button></td></tr>';}).join(''):emptyRow(7,'Nenhum registro individual disponÃ­vel para este perfil.');bindPersonButtons();}
  function renderPayroll(){$('payroll-rows').innerHTML=S.pessoas.length?S.pessoas.map(function(p){return '<tr><td><b>'+esc(p.nome)+'</b><br><small>'+esc(p.departamento||'')+'</small></td><td class="money">'+fmt(p.salario)+'</td><td class="money">'+fmt(p.proventos)+'</td><td class="money">'+fmt(p.descontos)+'</td><td class="money"><b>'+fmt(p.liquido)+'</b></td><td><button class="detail-button" data-person="'+esc(p.id)+'">Detalhar</button></td></tr>';}).join(''):emptyRow(6,'ComposiÃ§Ã£o individual protegida.');bindPersonButtons();}
  function rubricGroups(){var map={};S.lancamentos.forEach(function(x){var k=(x.rubrica_codigo||'')+'|'+x.rubrica_nome+'|'+x.tipo;if(!map[k])map[k]={codigo:x.rubrica_codigo,nome:x.rubrica_nome,tipo:x.tipo,valor:0};map[k].valor+=Number(x.valor)||0;});return Object.keys(map).map(function(k){return map[k];}).sort(function(a,b){return b.valor-a.valor;});}
  function renderRubrics(){var a=rubricGroups();$('rubric-rows').innerHTML=a.length?a.map(function(x){return '<tr><td>'+esc(x.codigo||'â')+'</td><td>'+esc(x.nome)+'</td><td><span class="status">'+esc(x.tipo)+'</span></td><td class="money">'+fmt(x.valor)+'</td></tr>';}).join(''):emptyRow(4,'Rubricas indisponÃ­veis para este perfil ou competÃªncia.');}
  function chargeData(){var e=S.competencia&&S.competencia.encargos||{};return [['INSS total',e.total_inss],['FGTS',e.valor_fgts||S.competencia.valor_fgts],['PIS',e.valor_pis],['IRRF',e.valor_irrf]];}
  function renderCharges(){var a=chargeData();$('charge-list').innerHTML=a.map(function(x){return '<div class="metric-row"><span>'+x[0]+'</span><strong>'+fmt(x[1])+'</strong></div>';}).join('');$('charges-kpis').innerHTML=a.map(function(x){return '<div class="kpi"><span>'+x[0]+'</span><strong>'+fmt(x[1])+'</strong><small>CompetÃªncia '+formatCompetence(S.competencia.competencia)+'</small></div>';}).join('');}
  function renderMovements(){var r=S.competencia.resumo||{},cards=[['AdmissÃµes',r.admissoes],['Desligamentos',r.demitidos],['Em fÃ©rias',r.ferias],['Trabalhando',r.trabalhando]];$('movement-kpis').innerHTML=cards.map(function(x){return '<div class="kpi"><span>'+x[0]+'</span><strong>'+nfmt(x[1])+'</strong><small>Na competÃªncia</small></div>';}).join('');var moves=S.pessoas.filter(function(p){return /demit/i.test(p.situacao||'')||(p.admissao||'').slice(0,7)===S.competencia.competencia.slice(0,7);});$('movement-rows').innerHTML=moves.length?moves.map(function(p){var dem=/demit/i.test(p.situacao||'');return '<tr><td>'+esc(p.nome)+'</td><td><span class="status '+(dem?'danger':'success')+'">'+(dem?'Desligamento':'AdmissÃ£o')+'</span></td><td>'+esc(dem?'Na competÃªncia':dateBR(p.admissao))+'</td><td>'+esc(departmentName(p.departamento))+'</td></tr>';}).join(''):emptyRow(4,'Nenhuma movimentaÃ§Ã£o individual disponÃ­vel.');}
  function departments(){var a=(S.competencia.resumo||{}).departamentos||[];if(a.length)return a;var m={};S.pessoas.forEach(function(p){var k=departmentName(p.departamento);if(!m[k])m[k]={nome:k,proventos:0,descontos:0,liquido:0};m[k].proventos+=Number(p.proventos)||0;m[k].descontos+=Number(p.descontos)||0;m[k].liquido+=Number(p.liquido)||0;});return Object.keys(m).map(function(k){return m[k];});}
  function renderDepartments(){var a=departments();$('department-rows').innerHTML=a.length?a.map(function(x){return '<tr><td><b>'+esc(x.nome)+'</b></td><td class="money">'+fmt(x.proventos)+'</td><td class="money">'+fmt(x.descontos)+'</td><td class="money"><b>'+fmt(x.liquido)+'</b></td></tr>';}).join(''):emptyRow(4,'Sem rateio por departamento.');}
  function validations(){return S.competencia.validacoes||[];}
  function renderValidations(){var a=validations(),html=a.length?a.slice(0,4).map(function(x){return '<div class="validation-row '+(x.tipo==='ok'?'':'warn')+'"><i>'+(x.tipo==='ok'?'â':'!')+'</i><span>'+esc(x.mensagem)+'</span></div>';}).join(''):'<div class="validation-row"><i>â</i><span>CompetÃªncia salva e disponÃ­vel para consulta.</span></div>';$('validation-list').innerHTML=html;$('reconciliation-list').innerHTML=a.length?a.map(function(x){return '<div class="reconciliation-item"><span class="check">'+(x.tipo==='ok'?'â':'!')+'</span><span><b>'+esc(title(x.campo))+'</b><small>'+esc(x.mensagem)+'</small></span><span class="status '+(x.tipo==='ok'?'success':'danger')+'">'+(x.tipo==='ok'?'Conciliado':'Revisar')+'</span></div>';}).join(''):'<div class="reconciliation-item"><span class="check">â</span><span><b>ImportaÃ§Ã£o</b><small>Registro disponÃ­vel no histÃ³rico.</small></span><span class="status success">ConcluÃ­do</span></div>';}
  function renderCharts(){if(!S.competencia||!window.Chart)return;var c=chartColors(),d=departments(),r=S.competencia.resumo||{},rub=rubricGroups().slice(0,10),charges=chargeData();chart('chart-composicao','bar',{labels:['Proventos','Descontos','LÃ­quido'],datasets:[{label:'Valor',data:[S.competencia.proventos,S.competencia.descontos,S.competencia.liquido],backgroundColor:[c.gold,c.red,c.emerald],borderRadius:8}]},{plugins:{legend:{display:false}}});chart('chart-departamentos','bar',{labels:d.map(function(x){return x.nome;}),datasets:[{label:'LÃ­quido',data:d.map(function(x){return x.liquido;}),backgroundColor:c.emerald,borderRadius:7}]},{indexAxis:'y',plugins:{legend:{display:false}}});chart('chart-vinculos','doughnut',{labels:['CLT','EstagiÃ¡rios','Outros'],datasets:[{data:[r.empregados||0,r.estagiarios||0,Math.max(0,(r.pessoas||0)-(r.empregados||0)-(r.estagiarios||0))],backgroundColor:[c.blue,c.gold,c.purple],borderColor:getComputedStyle(document.body).getPropertyValue('--surface'),borderWidth:3}]},{cutout:'66%'});chart('chart-rubricas','bar',{labels:rub.map(function(x){return x.nome;}),datasets:[{label:'Valor',data:rub.map(function(x){return x.valor;}),backgroundColor:rub.map(function(x){return x.tipo==='desconto'?c.red:c.gold;}),borderRadius:6}]},{indexAxis:'y',plugins:{legend:{display:false}}});chart('chart-encargos','bar',{labels:charges.map(function(x){return x[0];}),datasets:[{label:'Valor',data:charges.map(function(x){return Number(x[1])||0;}),backgroundColor:[c.blue,c.gold,c.emerald,c.purple],borderRadius:7}]},{plugins:{legend:{display:false}}});chart('chart-rateio','bar',{labels:d.map(function(x){return x.nome;}),datasets:[{label:'Proventos',data:d.map(function(x){return x.proventos;}),backgroundColor:c.gold,borderRadius:5},{label:'Descontos',data:d.map(function(x){return x.descontos;}),backgroundColor:c.red,borderRadius:5},{label:'LÃ­quido',data:d.map(function(x){return x.liquido;}),backgroundColor:c.emerald,borderRadius:5}]},{indexAxis:'y'});}
  function renderEmptyTables(){['employee-rows','payroll-rows','rubric-rows','movement-rows','department-rows'].forEach(function(id){if($(id))$(id).innerHTML='';});}

  async function handlePdf(file){if(!file)return;if(file.size>25*1024*1024){toast('O PDF ultrapassa o limite de 25 MB.',true);return;}try{toast('Preparando o leitor de PDFâ¦');await loadLibrary('pdf');toast('Lendo e validando o PDFâ¦');var result=await RHParser.extractPdf(file);if(!result.competencia||!result.competencia.competencia||!result.colaboradores.length)throw new Error('O relatÃ³rio nÃ£o pÃ´de ser reconhecido. Verifique se o PDF possui texto selecionÃ¡vel.');showPreview(result);}catch(e){toast(e.message,true);}}
  async function handleExcel(file){if(!file)return;try{toast('Preparando o leitor de Excelâ¦');await loadLibrary('xlsx');toast('Lendo e validando a planilhaâ¦');showPreview(await RHParser.parseExcel(file));}catch(e){toast(e.message,true);}}
  function showPreview(result){S.preview=result;var comp=result.competencia||{},validacoes=comp.validacoes||[];$('import-preview').hidden=false;$('preview-title').textContent=comp.arquivo_nome||'';$('preview-status').textContent=validacoes.every(function(x){return x.tipo==='ok';})?'Pronto para importar':'Importar com ressalvas';var compRot=comp.competencia?comp.competencia.slice(5,7)+'/'+comp.competencia.slice(0,4):'â';$('preview-summary').innerHTML=[['CompetÃªncia',compRot],['Pessoas',result.colaboradores.length],['Proventos',fmt(comp.proventos)],['LÃ­quido',fmt(comp.liquido)]].map(function(x){return '<div><span>'+x[0]+'</span><strong>'+esc(x[1])+'</strong></div>';}).join('');$('preview-validations').innerHTML=validacoes.map(function(x){return '<div class="validation-row '+(x.tipo==='ok'?'':'warn')+'"><i>'+(x.tipo==='ok'?'â':'!')+'</i><span>'+esc(x.msg||x.mensagem||'')+'</span></div>';}).join('');$('import-preview').scrollIntoView({behavior:'smooth',block:'center'});}
  function buildRpcPayload(preview){
  var comp = preview.competencia || {};
  var enc = comp.encargos || {};
  var colaboradores = (preview.colaboradores || []).map(function(c){
    var f = c.folha || {};
    var lancamentos = (c.lancamentos || []).map(function(l){
      return {
        codigo: l.codigo,
        nome: l.nome,
        referencia: RHParser.brNumber(l.referencia),
        valor: l.valor,
        tipo: l.tipo === 'provento' ? 'P' : (l.tipo === 'desconto' ? 'D' : l.tipo)
      };
    });
    return {
      matricula: c.matricula,
      nome: c.nome,
      cpf_mascarado: c.cpf_mascarado,
      admissao: c.admissao,
      situacao: c.situacao,
      vinculo: c.vinculo,
      centro_custo: c.centro_custo,
      departamento: c.departamento,
      cargo: c.cargo,
      cbo: c.cbo,
      filial: c.filial,
      horas_mes: f.horas_mes,
      salario: (f.salario != null ? f.salario : c.salario),
      proventos: f.proventos,
      descontos: f.descontos,
      liquido: f.liquido,
      informativa: f.informativa,
      base_inss: f.base_inss,
      excedente_inss: f.excedente_inss,
      base_fgts: f.base_fgts,
      valor_fgts: f.valor_fgts,
      base_irrf: f.base_irrf,
      lancamentos: lancamentos
    };
  });
  var competenciaYm = (comp.competencia || '').slice(0,7);
  var admissoesNoMes = colaboradores.filter(function(c){ return c.admissao && c.admissao.slice(0,7) === competenciaYm; }).length;
  var sit = enc.situacoes || {};
  return {
    meta: {
      competencia: comp.competencia,
      empresa_codigo: comp.empresa_codigo,
      empresa_nome: comp.empresa_nome,
      cnpj_mascarado: comp.cnpj_mascarado,
      tipo_calculo: comp.tipo_calculo,
      fonte: comp.fonte,
      arquivo_nome: comp.arquivo_nome,
      arquivo_hash: comp.arquivo_hash
    },
    resumo: {
      proventos: comp.proventos,
      descontos: comp.descontos,
      liquido: comp.liquido,
      base_inss: comp.base_inss,
      base_fgts: comp.base_fgts,
      valor_fgts: comp.valor_fgts,
      base_irrf: comp.base_irrf,
      trabalhando: sit.trabalhando,
      demitidos: sit.demitido,
      ferias: sit.ferias,
      admissoes: admissoesNoMes,
      departamentos: (comp.resumo || {}).departamentos,
      centros_custo: (comp.resumo || {}).centros_custo,
      rubricas: (comp.resumo || {}).rubricas
    },
    encargos: {
      sal_contrib_empregados: enc.sal_contrib_empregados,
      excedente_inss: enc.excedente_inss,
      base_total_inss: enc.base_total_inss,
      segurados: enc.segurados,
      empresa_inss: enc.empresa_inss,
      rat: enc.rat,
      terceiros: enc.terceiros,
      total_inss: enc.total_inss,
      base_fgts: enc.base_fgts,
      valor_fgts: enc.valor_fgts,
      base_pis: enc.base_pis,
      valor_pis: enc.valor_pis,
      base_irrf_mensal: enc.base_irrf_mensal,
      valor_irrf_mensal: enc.valor_irrf_mensal,
      valor_total_irrf: enc.valor_total_irrf,
      valor_irrf: enc.valor_total_irrf,
      situacoes: sit
    },
    validacoes: comp.validacoes || [],
    colaboradores: colaboradores
  };
}
async function confirmImport(){if(!S.preview)return;var btn=$('confirm-import');btn.disabled=true;btn.textContent='Importandoâ¦';try{var id=await rpc('rh_importar_folha',{p_payload:buildRpcPayload(S.preview)});toast('CompetÃªncia importada com sucesso.');S.preview=null;$('import-preview').hidden=true;await loadCompetences(id);go('visao');}catch(e){toast('NÃ£o foi possÃ­vel importar: '+e.message,true);}finally{btn.disabled=false;btn.textContent='Confirmar importaÃ§Ã£o';}}

  function bindPersonButtons(){document.querySelectorAll('[data-person]').forEach(function(b){b.onclick=function(){openPerson(b.dataset.person);};});}
  function openPerson(id){
    var p=S.pessoas.find(function(x){return x.id===id;});
    if(!p)return;
    $('employee-modal-title').textContent=p.nome;

    var ficha=[['Matr\u00edcula',p.matricula||'\u2014'],['Cargo',p.cargo||'\u2014'],['Departamento',p.departamento||'\u2014'],['Centro de custo',p.centro_custo||'\u2014'],['V\u00ednculo',p.vinculo||'\u2014'],['Admiss\u00e3o',brDate(p.admissao)],['Situa\u00e7\u00e3o',p.situacao||'\u2014'],['Sal\u00e1rio-base',fmt(p.salario)]];
    $('employee-modal-summary').innerHTML=ficha.map(function(x){return '<div><span>'+x[0]+'</span><strong>'+esc(x[1])+'</strong></div>';}).join('');

    var lanc=p.lancamentos||[];
    var prov=lanc.filter(function(x){return x.tipo==='provento';});
    var desc=lanc.filter(function(x){return x.tipo==='desconto';});
    var outros=lanc.filter(function(x){return x.tipo!=='provento'&&x.tipo!=='desconto';});

    function linha(x){
      return '<tr><td><b>'+esc((x.rubrica_codigo||'')+' '+(x.rubrica_nome||''))+'</b></td>'+
             '<td><span class="status">'+esc(x.tipo||'')+'</span></td>'+
             '<td class="money">'+nfmt(x.referencia)+'</td>'+
             '<td class="money"><b>'+fmt(x.valor)+'</b></td></tr>';
    }
    function grupo(titulo,itens,total){
      if(!itens.length)return '';
      return '<tr class="group-head"><td colspan="4"><b>'+titulo+'</b></td></tr>'+
             itens.map(linha).join('')+
             '<tr class="group-total"><td colspan="3"><b>Total de '+titulo.toLowerCase()+'</b></td>'+
             '<td class="money"><b>'+fmt(total)+'</b></td></tr>';
    }
    function soma(arr){return arr.reduce(function(s,x){return s+(Number(x.valor)||0);},0);}

    var totProv=soma(prov),totDesc=soma(desc);
    var html=grupo('Proventos',prov,totProv)+grupo('Descontos',desc,totDesc);
    if(outros.length)html+=grupo('Informativos',outros,soma(outros));

    html+='<tr class="group-total destaque"><td colspan="3"><b>L\u00edquido a receber</b></td>'+
          '<td class="money"><b>'+fmt(p.liquido)+'</b></td></tr>';

    var custo=custoEmpresa(p);
    html+='<tr class="group-head"><td colspan="4"><b>Custo para a empresa</b></td></tr>';
    html+=custo.itens.map(function(x){
      return '<tr><td>'+esc(x[0])+'</td><td><span class="status">'+esc(x[2]||'')+'</span></td><td class="money"></td><td class="money"><b>'+fmt(x[1])+'</b></td></tr>';
    }).join('');
    html+='<tr class="group-total destaque"><td colspan="3"><b>Custo total estimado</b></td>'+
          '<td class="money"><b>'+fmt(custo.total)+'</b></td></tr>';

    $('employee-modal-rows').innerHTML=html||'<tr><td colspan="4">Sem lan\u00e7amentos.</td></tr>';
    $('employee-modal').hidden=false;
  }

  function brDate(iso){
    if(!iso)return '\u2014';
    var m=String(iso).match(/^(\d{4})-(\d{2})-(\d{2})/);
    return m?m[3]+'/'+m[2]+'/'+m[1]:String(iso);
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
      [['INSS patronal',Number(enc.empresa_inss)||0],['RAT',Number(enc.rat)||0],['Terceiros',Number(enc.terceiros)||0]].forEach(function(x){
        if(!x[1])return;
        var v=x[1]*share;
        itens.push([x[0],v,'rateado']);total+=v;
      });
    }
    return {itens:itens,total:total};
  }
  function closeModal(){$('employee-modal').hidden=true;}

  function askAI(question){question=String(question||'').trim();if(!question)return;addMessage(question,'user');var q=cleanSearch(question),r=S.competencia&&S.competencia.resumo||{},d=departments().slice().sort(function(a,b){return b.liquido-a.liquido;}),e=S.competencia&&S.competencia.encargos||{},answer,trace,view='visao',composition=false;if(!S.competencia){answer='Ainda nÃ£o existe uma competÃªncia importada. Use o mÃ³dulo de ImportaÃ§Ã£o para carregar o primeiro arquivo.';view='importacao';trace=null;}else if(/liquido|lÃ­quido|total da folha/.test(q)){answer='O lÃ­quido da folha de '+formatCompetence(S.competencia.competencia)+' Ã© '+fmt(S.competencia.liquido)+'.';trace='liquido';composition=true;}else if(/departamento|area|Ã¡rea|maior custo/.test(q)){answer=d.length?'O departamento com maior custo lÃ­quido Ã© '+d[0].nome+', com '+fmt(d[0].liquido)+'.':'A competÃªncia nÃ£o possui rateio por departamento.';trace='departamentos';view='rateio';}else if(/quant|pessoa|colaborador|headcount/.test(q)){answer='A folha possui '+nfmt(r.pessoas||S.pessoas.length)+' pessoas: '+nfmt(r.empregados)+' empregados e '+nfmt(r.estagiarios)+' estagiÃ¡rios.';trace='headcount';view='colaboradores';composition=true;}else if(/fgts/.test(q)){answer='O FGTS da competÃªncia Ã© '+fmt(e.valor_fgts||S.competencia.valor_fgts)+', sobre base de '+fmt(e.base_fgts||S.competencia.base_fgts)+'.';trace='encargos';view='encargos';}else if(/desconto/.test(q)){answer='Os descontos totalizam '+fmt(S.competencia.descontos)+'. A composiÃ§Ã£o estÃ¡ disponÃ­vel em Rubricas.';trace='descontos';view='rubricas';composition=true;}else{answer='Posso responder sobre lÃ­quido, descontos, FGTS, quantidade de pessoas e custos por departamento. Quando houver vÃ­nculo verificÃ¡vel, mostro a origem e a composiÃ§Ã£o.';trace=null;}addAnswer(answer,trace,view,composition);}
  function addMessage(text,kind){var div=document.createElement('div');div.className='ai-message '+kind;div.textContent=text;$('ai-body').appendChild(div);$('ai-body').scrollTop=$('ai-body').scrollHeight;}
  function addAnswer(text,trace,view,composition){var div=document.createElement('div');div.className='ai-message bot';div.innerHTML='<span>'+esc(text)+'</span>'+(trace?'<div class="trace-actions"><button data-ai-view="'+view+'" data-ai-trace="'+trace+'">â Ver origem</button>'+(composition?'<button data-ai-view="'+(view==='colaboradores'?'colaboradores':'folha')+'">â¦ Ver composiÃ§Ã£o</button>':'')+'</div><small class="ai-source">Fonte: folha oficial Â· competÃªncia '+formatCompetence(S.competencia.competencia)+'</small>':'');$('ai-body').appendChild(div);div.querySelectorAll('[data-ai-view]').forEach(function(b){b.onclick=function(){S.fromChat=true;$('ai-panel').hidden=true;$('back-chat').hidden=false;go(b.dataset.aiView,b.dataset.aiTrace);};});$('ai-body').scrollTop=$('ai-body').scrollHeight;}

  async function exportPeople(){if(!S.pessoas.length){toast('NÃ£o hÃ¡ dados individuais disponÃ­veis para exportar.',true);return;}try{toast('Preparando a exportaÃ§Ã£oâ¦');await loadLibrary('xlsx');var rows=S.pessoas.map(function(p){return {Matricula:p.matricula,Colaborador:p.nome,Vinculo:p.vinculo,Departamento:departmentName(p.departamento),Cargo:p.cargo,Situacao:p.situacao,Proventos:p.proventos,Descontos:p.descontos,Liquido:p.liquido};}),ws=XLSX.utils.json_to_sheet(rows),wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,'Colaboradores');XLSX.writeFile(wb,'RH_Folha_'+formatCompetence(S.competencia.competencia).replace('/','_')+'.xlsx');}catch(e){toast(e.message,true);}}
  function initials(n){return String(n||'?').split(/\s+/).slice(0,2).map(function(x){return x.charAt(0);}).join('').toUpperCase();}function cleanSearch(v){return String(v||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');}function departmentName(v){var map={'1':'Administrativa','2':'ComunicaÃ§Ã£o','3':'Financeira','4':'Marketing','5':'TÃ©cnica','6':'TÃ©cnica/Projetos'};return map[String(v)]||v||'â';}function dateBR(v){if(!v)return 'â';var p=v.slice(0,10).split('-');return p[2]+'/'+p[1]+'/'+p[0];}function emptyRow(n,text){return '<tr><td colspan="'+n+'" style="text-align:center;color:var(--muted);padding:30px">'+esc(text)+'</td></tr>';}function title(v){return String(v||'').replace(/_/g,' ').replace(/^./,function(c){return c.toUpperCase();});}

  function bind(){
    $('theme-toggle').onclick=function(){localStorage.setItem('lnb_rh_theme',document.body.classList.contains('light')?'dark':'light');applyTheme();};$('logout').onclick=async function(){try{await fetch(CFG.SUPABASE_URL+'/auth/v1/logout',{method:'POST',headers:headers(SES.access_token)});}catch(e){}clearSession();location.href='/';};
    document.querySelectorAll('.nav-item').forEach(function(b){b.onclick=function(){go(b.dataset.view);};});document.querySelectorAll('[data-go]').forEach(function(b){b.onclick=function(){go(b.dataset.go);};});$('competencia-select').onchange=function(){selectCompetence(this.value).catch(function(e){toast(e.message,true);});};$('employee-search').oninput=renderPeople;$('pdf-input').onchange=function(){handlePdf(this.files[0]);this.value='';};$('excel-input').onchange=function(){handleExcel(this.files[0]);this.value='';};$('cancel-import').onclick=function(){S.preview=null;$('import-preview').hidden=true;};$('confirm-import').onclick=confirmImport;$('export-employees').onclick=exportPeople;document.querySelectorAll('[data-close-modal]').forEach(function(x){x.onclick=closeModal;});document.addEventListener('keydown',function(e){if(e.key==='Escape'){closeModal();$('ai-panel').hidden=true;}});
    $('ai-launch').onclick=function(){$('ai-panel').hidden=false;};$('ai-close').onclick=function(){$('ai-panel').hidden=true;};$('back-chat').onclick=function(){$('ai-panel').hidden=false;$('back-chat').hidden=true;};$('ai-form').onsubmit=function(e){e.preventDefault();var v=$('ai-input').value;$('ai-input').value='';askAI(v);};$('ai-suggestions').querySelectorAll('button').forEach(function(b){b.onclick=function(){askAI(b.textContent);};});
  }

  async function openModule(access){ACCESS=access;$('user-name').textContent=ACCESS.usuario&&ACCESS.usuario.nome||SES.nome||SES.email||'';setupPermissions();$('gate').hidden=true;$('app').hidden=false;loadLibrary('chart').then(function(){renderCharts();}).catch(function(){});try{await loadCompetences();}catch(loadError){$('empty-state').hidden=false;$('dashboard').hidden=true;toast('O mÃ³dulo abriu, mas o histÃ³rico nÃ£o pÃ´de ser carregado: '+loadError.message,true);}}
  function offerCentralValidation(){setTimeout(function(){if(!$('gate').hidden){$('gate-home').textContent='Validar pela Central de GestÃ£o';$('gate-home').href='/?abrir=rh';$('gate-home').hidden=false;}},5000);}
  function revalidateInBackground(){rpc('meu_acesso').then(function(fresh){if(!validAccess(fresh)){clearSession();location.href='/?acesso_negado=rh';return;}ACCESS=fresh;saveAccessSnapshot(fresh);setupPermissions();}).catch(function(){/* A RLS do banco continua sendo a autoridade para todos os dados e aÃ§Ãµes. */});}

  async function start(){
    window.__rhBootReady=true;bind();applyTheme();offerCentralValidation();try{setGate('Carregando a configuraÃ§Ã£o seguraâ¦');var configResponse=await fetchTimed('/api/config',{},10000);if(!configResponse.ok)throw new Error('ConfiguraÃ§Ã£o indisponÃ­vel.');CFG=await configResponse.json();SES=loadSession();if(!SES)throw new Error('Entre pela Central de GestÃ£o para acessar este mÃ³dulo.');var expiry=Number(SES.expires_at)||0;if(expiry&&expiry<1e12)expiry*=1000;if(!expiry||Date.now()>expiry-60000){setGate('Renovando sua sessÃ£oâ¦');SES=await refresh(SES);}if(!SES)throw new Error('Sua sessÃ£o expirou. Entre novamente pela Central de GestÃ£o.');var cachedAccess=loadAccessSnapshot();if(validAccess(cachedAccess)){setGate('Abrindo RH & Folhaâ¦');await openModule(cachedAccess);revalidateInBackground();return;}setGate('Verificando seu acesso ao RH & Folhaâ¦');try{ACCESS=await rpc('meu_acesso');}catch(firstError){setGate('A validaÃ§Ã£o demorou. Fazendo uma segunda tentativaâ¦');await delay(650);ACCESS=await rpc('meu_acesso');}if(!validAccess(ACCESS))throw new Error('Seu usuÃ¡rio nÃ£o possui acesso ao mÃ³dulo RH & Folha.');saveAccessSnapshot(ACCESS);await openModule(ACCESS);}catch(e){setGate(e&&e.message?e.message:'NÃ£o foi possÃ­vel validar o acesso. Tente novamente.');$('gate-home').hidden=false;}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
