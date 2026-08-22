/* RH & Folha — hotfix v16: importação em lote de múltiplos PDFs */
(function(){
  var BATCH={items:[],busy:false};
  function batchInput(){return $('pdf-input');}
  function ensureBatchUI(){
    var input=batchInput();if(input){input.multiple=true;var label=input.closest('label');if(label&&label.firstChild)label.firstChild.nodeValue='Selecionar PDF(s)';}
    if($('rh-pdf-batch'))return;
    var preview=$('import-preview');if(!preview||!preview.parentElement)return;
    var box=document.createElement('article');box.id='rh-pdf-batch';box.className='panel rh-pdf-batch';box.hidden=true;
    box.innerHTML='<div class="panel-head"><div><span class="panel-kicker">IMPORTAÇÃO EM LOTE</span><h2>Arquivos selecionados</h2><p class="rh-batch-help">Valide várias competências de uma só vez e importe somente os arquivos aprovados.</p></div><span class="status" id="rh-batch-status">—</span></div>'+
      '<div class="rh-batch-progress" id="rh-batch-progress" hidden><div id="rh-batch-progress-bar"></div></div>'+
      '<div class="table-wrap"><table class="rh-batch-table"><thead><tr><th>Arquivo</th><th>Empresa</th><th>Competência</th><th class="money">Pessoas</th><th>Status</th><th></th></tr></thead><tbody id="rh-batch-rows"></tbody></table></div>'+
      '<div class="preview-actions"><button class="button ghost" id="rh-batch-clear" type="button">Limpar seleção</button><button class="button primary import-only" id="rh-batch-confirm" type="button">Importar arquivos válidos</button></div>';
    preview.parentElement.insertBefore(box,preview);
    $('rh-batch-clear').onclick=clearBatch;
    $('rh-batch-confirm').onclick=confirmBatch;
    if(!document.getElementById('_rh_v16_batch_styles')){
      var st=document.createElement('style');st.id='_rh_v16_batch_styles';
      st.textContent='.rh-pdf-batch{margin-top:18px}.rh-batch-help{margin:.3rem 0 0;color:var(--muted);font-size:.78rem}.rh-batch-progress{height:6px;border-radius:999px;background:var(--surface-2);overflow:hidden;margin:12px 0 16px}.rh-batch-progress>div{height:100%;width:0;background:var(--gold);transition:width .2s ease}.rh-batch-table td,.rh-batch-table th{vertical-align:middle}.rh-batch-file{font-weight:750}.rh-batch-sub{display:block;color:var(--muted);font-size:.68rem;margin-top:2px}.rh-batch-remove{border:0;background:transparent;color:var(--muted);cursor:pointer;font-size:1rem}.rh-batch-remove:hover{color:var(--red)}.rh-batch-row-error{background:color-mix(in srgb,var(--red) 5%,transparent)}.rh-batch-row-ok{background:color-mix(in srgb,var(--emerald) 4%,transparent)}';
      document.head.appendChild(st);
    }
  }
  function setProgress(done,total,label){
    var wrap=$('rh-batch-progress'),bar=$('rh-batch-progress-bar'),status=$('rh-batch-status');
    if(wrap)wrap.hidden=!total;if(bar)bar.style.width=(total?Math.round(done/total*100):0)+'%';if(status)status.textContent=label||((done||0)+' de '+(total||0));
  }
  function itemStatus(it){
    if(it.imported)return {cls:'success',label:'Importado'};
    if(it.importing)return {cls:'',label:'Importando…'};
    if(it.error)return {cls:'error',label:'Revisar'};
    if(it.result)return {cls:'success',label:'Pronto'};
    return {cls:'',label:'Aguardando'};
  }
  function renderBatch(){
    ensureBatchUI();var box=$('rh-pdf-batch'),rows=$('rh-batch-rows'),btn=$('rh-batch-confirm');if(!box||!rows)return;
    box.hidden=!BATCH.items.length;
    rows.innerHTML=BATCH.items.map(function(it,i){var c=it.result&&it.result.competencia||{},s=itemStatus(it);return '<tr class="'+(it.error?'rh-batch-row-error':'rh-batch-row-ok')+'">'+
      '<td><span class="rh-batch-file">'+esc(it.file.name)+'</span><small class="rh-batch-sub">'+(it.file.size/1024/1024).toFixed(1).replace('.',',')+' MB</small></td>'+
      '<td>'+esc(c.empresa_codigo||'—')+'</td><td>'+esc(c.competencia?formatCompetence(c.competencia):'—')+'</td><td class="money">'+(it.result?nfmt((it.result.colaboradores||[]).length):'—')+'</td>'+
      '<td><span class="status '+s.cls+'">'+esc(s.label)+'</span>'+(it.error?'<small class="rh-batch-sub">'+esc(it.error)+'</small>':'')+'</td>'+
      '<td><button class="rh-batch-remove" type="button" data-rh-batch-remove="'+i+'" title="Remover arquivo">×</button></td></tr>';}).join('');
    Array.prototype.forEach.call(rows.querySelectorAll('[data-rh-batch-remove]'),function(b){b.onclick=function(){if(BATCH.busy)return;BATCH.items.splice(Number(this.dataset.rhBatchRemove),1);validateDuplicateCompetences();renderBatch();};});
    var ready=BATCH.items.filter(function(x){return x.result&&!x.error&&!x.imported;}).length;
    if(btn){btn.disabled=BATCH.busy||ready===0;btn.textContent=BATCH.busy?'Importando…':('Importar '+ready+' arquivo'+(ready===1?'':'s')+' válido'+(ready===1?'':'s'));}
    var status=$('rh-batch-status');if(status&&!BATCH.busy){var errors=BATCH.items.filter(function(x){return !!x.error;}).length;status.textContent=ready+' pronto'+(ready===1?'':'s')+(errors?' · '+errors+' revisar':'');status.className='status '+(errors?'':'success');}
  }
  function validateDuplicateCompetences(){
    var counts={};BATCH.items.forEach(function(it){if(it.result&&it.result.competencia&&it.result.competencia.competencia){var k=String(it.result.competencia.competencia).slice(0,7);counts[k]=(counts[k]||0)+1;}});
    BATCH.items.forEach(function(it){if(it._baseError){it.error=it._baseError;return;}var k=it.result&&it.result.competencia&&String(it.result.competencia.competencia||'').slice(0,7);it.error=(k&&counts[k]>1)?'Competência repetida dentro do lote. Mantenha apenas um PDF deste mês.':'';});
  }
  async function parseBatch(files){
    files=Array.prototype.slice.call(files||[]).filter(function(f){return f&&(/\.pdf$/i.test(f.name)||f.type==='application/pdf');});if(!files.length)return;
    ensureBatchUI();BATCH.items=files.map(function(file){return {file:file,result:null,error:'',_baseError:'',imported:false,importing:false};});BATCH.busy=true;renderBatch();
    try{await loadLibrary('pdf');for(var i=0;i<BATCH.items.length;i++){
      var it=BATCH.items[i];setProgress(i,BATCH.items.length,'Lendo '+(i+1)+' de '+BATCH.items.length);
      if(it.file.size>25*1024*1024){it._baseError=it.error='PDF acima do limite de 25 MB.';renderBatch();continue;}
      try{
        var result=await RHParser.extractPdf(it.file),comp=result&&result.competencia||{};comp.arquivo_nome=comp.arquivo_nome||it.file.name;
        if(!comp.empresa_codigo&&typeof rhImportCompanyCode==='function')comp.empresa_codigo=rhImportCompanyCode(comp);
        if(!comp.competencia||!(result.colaboradores||[]).length)throw new Error('Relatório não reconhecido ou sem colaboradores.');
        if(!comp.empresa_codigo)throw new Error('Código da empresa não identificado.');
        it.result=result;
      }catch(e){it._baseError=it.error=e&&e.message||'Falha ao processar PDF.';}
      validateDuplicateCompetences();renderBatch();
    }}finally{BATCH.busy=false;setProgress(BATCH.items.length,BATCH.items.length,'Pré-validação concluída');renderBatch();}
  }
  async function confirmBatch(){
    if(BATCH.busy)return;var ready=BATCH.items.filter(function(x){return x.result&&!x.error&&!x.imported;});if(!ready.length){toast('Nenhum PDF válido para importar.',true);return;}
    BATCH.busy=true;renderBatch();var ok=0,fail=0,lastId=null;
    for(var i=0;i<ready.length;i++){
      var it=ready[i];it.importing=true;renderBatch();setProgress(i,ready.length,'Importando '+(i+1)+' de '+ready.length);
      try{lastId=await rpc('rh_importar_folha',{p_payload:buildRpcPayload(it.result)});it.imported=true;ok++;}
      catch(e){it._baseError=it.error='Falha ao importar: '+(e&&e.message||'erro desconhecido');fail++;}
      finally{it.importing=false;renderBatch();}
    }
    BATCH.busy=false;setProgress(ready.length,ready.length,'Importação concluída');renderBatch();
    try{await loadCompetences(lastId||undefined);}catch(e){}
    if(ok)toast(ok+' competência'+(ok===1?'':'s')+' importada'+(ok===1?'':'s')+' com sucesso.'+(fail?' '+fail+' arquivo(s) precisam de revisão.':''),!!fail);else toast('Nenhum arquivo foi importado. Revise os erros do lote.',true);
    if(ok&&!fail)go('visao');
  }
  function clearBatch(){if(BATCH.busy)return;BATCH.items=[];setProgress(0,0,'—');renderBatch();var input=batchInput();if(input)input.value='';}
  function bindBatchInput(){
    ensureBatchUI();var input=batchInput();if(!input||input.dataset.rhBatchBound==='1')return;input.dataset.rhBatchBound='1';input.multiple=true;
    input.onchange=function(){var files=Array.prototype.slice.call(this.files||[]);this.value='';if(files.length<=1){clearBatch();if(files[0])handlePdf(files[0]);return;}S.preview=null;if($('import-preview'))$('import-preview').hidden=true;parseBatch(files).catch(function(e){BATCH.busy=false;renderBatch();toast('Não foi possível processar o lote: '+e.message,true);});};
  }
  var prevSetup=typeof setupUI==='function'?setupUI:null;if(prevSetup)setupUI=function(){var r=prevSetup.apply(this,arguments);bindBatchInput();return r;};
  document.addEventListener('DOMContentLoaded',bindBatchInput);setTimeout(bindBatchInput,0);
})();
