/* RH & Folha — hotfix v11: metadados obrigatórios da importação */
function rhImportCompanyCode(comp){
  comp=comp||{};
  var direct=String(comp.empresa_codigo||'').trim();
  if(direct)return direct;
  var sources=[comp.arquivo_nome||'',comp.empresa_nome||''].join(' ').trim();
  var m=sources.match(/^\s*(\d{3,8})\s*(?:[-–—_]|$)/)
    ||sources.match(/\bempresa\s*[:#-]?\s*(\d{3,8})\b/i);
  return m?m[1]:'';
}

var _rhV11BuildRpcPayload=buildRpcPayload;
buildRpcPayload=function(preview){
  var payload=_rhV11BuildRpcPayload(preview),comp=(preview&&preview.competencia)||{};
  payload.meta=payload.meta||{};
  if(!payload.meta.empresa_codigo)payload.meta.empresa_codigo=rhImportCompanyCode(comp);
  if(!payload.meta.tipo_calculo)payload.meta.tipo_calculo='Folha mensal';
  return payload;
};

var _rhV11ShowPreview=showPreview;
showPreview=function(result){
  var comp=result&&result.competencia;
  if(comp&&!comp.empresa_codigo)comp.empresa_codigo=rhImportCompanyCode(comp);
  if(comp&&!comp.empresa_codigo){
    comp.validacoes=comp.validacoes||[];
    if(!comp.validacoes.some(function(v){return cleanSearch(v.msg||v.mensagem||'').indexOf('codigo da empresa')>=0;})){
      comp.validacoes.push({tipo:'erro',msg:'Código da empresa não identificado no PDF nem no nome do arquivo.'});
    }
  }
  _rhV11ShowPreview(result);
  var ok=!!(comp&&comp.competencia&&comp.empresa_codigo),btn=$('confirm-import');
  if(btn)btn.disabled=!ok;
  if($('preview-status')&&!ok)$('preview-status').textContent='Revisar metadados';
};

var _rhV11ConfirmImport=confirmImport;
confirmImport=async function(){
  if(S.preview&&S.preview.competencia&&!S.preview.competencia.empresa_codigo){
    S.preview.competencia.empresa_codigo=rhImportCompanyCode(S.preview.competencia);
  }
  if(!S.preview||!S.preview.competencia||!S.preview.competencia.competencia||!S.preview.competencia.empresa_codigo){
    toast('Não foi possível importar: competência e código da empresa precisam estar identificados.',true);return;
  }
  return _rhV11ConfirmImport();
};
