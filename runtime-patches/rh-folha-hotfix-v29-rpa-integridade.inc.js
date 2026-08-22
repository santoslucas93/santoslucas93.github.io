/* RH & Folha — hotfix v29: RPA/autônomos fora do consolidado da folha + integridade */
(function(){
  'use strict';

  function rhV29Num(v){var n=Number(v);return isFinite(n)?n:0;}
  function rhV29Round(v){return Math.round((rhV29Num(v)+Number.EPSILON)*100)/100;}
  function rhV29IsRpaRubric(r){
    var code=String(r&&r.codigo||r&&r.rubrica_codigo||'').trim();
    var name=String(r&&r.nome||r&&r.rubrica_nome||'').toUpperCase();
    return code==='9384'||code==='857'||code==='858'||name.indexOf('AUTONOM')>=0||name.indexOf('RPA')>=0;
  }
  function rhV29RpaBreakdown(rubrics){
    var out={proventos:0,descontos:0,inss:0,irrf:0,rubricas:[]};
    (rubrics||[]).forEach(function(r){
      if(!rhV29IsRpaRubric(r))return;
      var code=String(r&&r.codigo||r&&r.rubrica_codigo||'').trim();
      var name=String(r&&r.nome||r&&r.rubrica_nome||'').toUpperCase();
      var type=String(r&&r.tipo||'').toLowerCase();
      var value=rhV29Num(r&&r.valor);
      out.rubricas.push(r);
      if(type==='provento'||type==='p')out.proventos+=value;
      if(type==='desconto'||type==='d')out.descontos+=value;
      if(code==='858'||name.indexOf('INSS AUTONOM')>=0)out.inss+=value;
      if(code==='857'||name.indexOf('IRRF AUTONOM')>=0)out.irrf+=value;
    });
    out.proventos=rhV29Round(out.proventos);out.descontos=rhV29Round(out.descontos);out.inss=rhV29Round(out.inss);out.irrf=rhV29Round(out.irrf);
    return out;
  }
  function rhV29PeopleTotals(result){
    var out={proventos:0,descontos:0,liquido:0,baseInss:0,excedenteInss:0,baseIrrf:0};
    (result&&result.colaboradores||[]).forEach(function(c){var f=c&&c.folha||{};out.proventos+=rhV29Num(f.proventos);out.descontos+=rhV29Num(f.descontos);out.liquido+=rhV29Num(f.liquido);out.baseInss+=rhV29Num(f.base_inss);out.excedenteInss+=rhV29Num(f.excedente_inss);out.baseIrrf+=rhV29Num(f.base_irrf);});
    Object.keys(out).forEach(function(k){out[k]=rhV29Round(out[k]);});return out;
  }
  function rhV29Close(a,b){return Math.abs(rhV29Num(a)-rhV29Num(b))<=0.02;}
  function rhV29NormalizeResult(result){
    if(!result||!result.competencia)return result;
    var comp=result.competencia,resumo=comp.resumo||(comp.resumo={}),integrity=resumo.integridade_rpa||{};
    if(integrity.normalizado)return result;
    var rubrics=(resumo.rubricas||[]).slice(),rpa=rhV29RpaBreakdown(rubrics);
    if(!rpa.proventos&&!rpa.descontos)return result;

    var raw={proventos:rhV29Num(comp.proventos),descontos:rhV29Num(comp.descontos),liquido:rhV29Num(comp.liquido),base_inss:rhV29Num(comp.base_inss),base_irrf:rhV29Num(comp.base_irrf)};
    var folha={
      proventos:rhV29Round(raw.proventos-rpa.proventos),
      descontos:rhV29Round(raw.descontos-rpa.descontos)
    };
    folha.liquido=rhV29Round(folha.proventos-folha.descontos);
    var people=rhV29PeopleTotals(result),reconciled=rhV29Close(folha.proventos,people.proventos)&&rhV29Close(folha.descontos,people.descontos)&&rhV29Close(folha.liquido,people.liquido);
    var enc=comp.encargos||(comp.encargos={});
    var payrollBase=rhV29Num(enc.sal_contrib_empregados)+rhV29Num(enc.excedente_inss);
    if(!payrollBase&&people.baseInss)payrollBase=people.baseInss+people.excedenteInss;
    payrollBase=rhV29Round(payrollBase);
    var segurados=rhV29Round(Math.max(0,rhV29Num(enc.segurados)-rpa.inss));
    var totalInss=rhV29Round(segurados+payrollBase*.20+rhV29Num(enc.rat)+rhV29Num(enc.terceiros));
    var totalIrrfRaw=rhV29Num(enc.valor_total_irrf!=null?enc.valor_total_irrf:enc.valor_irrf),totalIrrf=rhV29Round(Math.max(0,totalIrrfRaw-rpa.irrf));

    comp.proventos=resumo.proventos=folha.proventos;
    comp.descontos=resumo.descontos=folha.descontos;
    comp.liquido=resumo.liquido=folha.liquido;
    if(payrollBase>0){comp.base_inss=resumo.base_inss=payrollBase;enc.base_total_inss=payrollBase;}
    if(reconciled&&people.baseIrrf>0){comp.base_irrf=resumo.base_irrf=people.baseIrrf;}
    enc.segurados=segurados;if(payrollBase>0)enc.total_inss=totalInss;enc.valor_total_irrf=totalIrrf;enc.valor_irrf=totalIrrf;
    resumo.rubricas=rubrics.filter(function(r){return !rhV29IsRpaRubric(r);});
    resumo.integridade_rpa={
      normalizado:true,
      regra:'RPA/autônomos excluídos do consolidado RH & Folha',
      pdf_geral:raw,
      rpa_excluido:{proventos:rpa.proventos,descontos:rpa.descontos,inss:rpa.inss,irrf:rpa.irrf},
      folha:{proventos:folha.proventos,descontos:folha.descontos,liquido:folha.liquido},
      reconciliado_com_colaboradores:reconciled
    };
    var vals=(comp.validacoes||[]).filter(function(v){var msg=String(v&&v.msg||v&&v.mensagem||'').toLowerCase();return !(reconciled&&msg.indexOf('proventos calculados')>=0&&msg.indexOf('divergem')>=0);});
    vals.push({tipo:reconciled?'ok':'aviso',msg:reconciled?'Consolidado RH reconciliado: RPA/autônomos excluídos.':'RPA/autônomos excluídos; permanecem diferenças entre o resumo e as linhas individuais para revisão.'});
    comp.validacoes=vals;
    return result;
  }

  function rhV29WrapParser(){
    if(!window.RHParser||RHParser.__rhV29Wrapped)return;
    RHParser.__rhV29Wrapped=true;
    ['extractPdf','parseExcel'].forEach(function(name){var base=RHParser[name];if(typeof base!=='function')return;RHParser[name]=async function(){return rhV29NormalizeResult(await base.apply(this,arguments));};});
  }

  var baseBuild=typeof buildRpcPayload==='function'?buildRpcPayload:null;
  if(baseBuild)buildRpcPayload=function(preview){preview=rhV29NormalizeResult(preview);var payload=baseBuild(preview),meta=preview&&preview.competencia&&preview.competencia.resumo&&preview.competencia.resumo.integridade_rpa;if(meta&&meta.normalizado){payload.resumo.integridade_rpa=meta;}return payload;};

  window.rhNormalizePayrollRpa=rhV29NormalizeResult;
  window.rhRpaBreakdown=rhV29RpaBreakdown;
  rhV29WrapParser();
  document.addEventListener('DOMContentLoaded',rhV29WrapParser);
  setTimeout(rhV29WrapParser,0);
})();
