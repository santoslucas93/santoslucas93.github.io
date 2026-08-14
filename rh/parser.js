(function(global){
  'use strict';

  function clean(s){return String(s==null?'':s).replace(/\u00a0/g,' ').replace(/[ \t]+/g,' ').trim();}
  function brNumber(v){
    if(typeof v==='number') return Number.isFinite(v)?v:0;
    var s=String(v==null?'':v).trim().replace(/R\$/gi,'').replace(/\s/g,'');
    if(!s) return 0;
    if(s.indexOf(',')>=0) s=s.replace(/\./g,'').replace(',','.');
    var n=Number(s); return Number.isFinite(n)?n:0;
  }
  function isoDate(v){
    var m=String(v||'').match(/(\d{2})\/(\d{2})\/(\d{4})/); return m?m[3]+'-'+m[2]+'-'+m[1]:null;
  }
  function competenceDate(v){
    var m=String(v||'').match(/(\d{2})\/(\d{4})/); return m?m[2]+'-'+m[1]+'-01':null;
  }
  function findNumber(text,re){var m=text.match(re);return m?brNumber(m[1]):0;}
  function sum(a,key){return Math.round(a.reduce(function(t,x){return t+(Number(x[key])||0);},0)*100)/100;}
  function cpfMask(v){var d=String(v||'').replace(/\D/g,'');return d.length===11?'***.***.***-'+d.slice(-2):'';}
  function cnpjMask(v){var d=String(v||'').replace(/\D/g,'');return d.length===14?d.slice(0,2)+'.***.***/****-'+d.slice(-2):'';}

  async function hashBuffer(buffer){
    if(!global.crypto||!global.crypto.subtle) return '';
    var digest=await global.crypto.subtle.digest('SHA-256',buffer.slice(0));
    return Array.from(new Uint8Array(digest)).map(function(b){return b.toString(16).padStart(2,'0');}).join('');
  }

  function pageText(content){
    var rows={};
    content.items.forEach(function(item){
      if(!item.str) return;
      var y=Math.round((item.transform&&item.transform[5]||0)*2)/2;
      var key=String(y);(rows[key]||(rows[key]=[])).push({x:item.transform&&item.transform[4]||0,s:item.str,w:item.width||0});
    });
    return Object.keys(rows).map(Number).sort(function(a,b){return b-a;}).map(function(y){
      var parts=rows[String(y)].sort(function(a,b){return a.x-b.x;});
      var line='',end=0;
      parts.forEach(function(p,i){var gap=p.x-end;if(i&&gap>1.8)line+=' '.repeat(Math.min(12,Math.max(1,Math.round(gap/4))));line+=p.s;end=p.x+p.w;});
      return line.trimEnd();
    }).join('\n');
  }

  async function extractPdf(file,onProgress){
    if(!global.pdfjsLib) throw new Error('Leitor de PDF indisponível. Recarregue a página.');
    global.pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    var buffer=await file.arrayBuffer();
    var pdf=await global.pdfjsLib.getDocument({data:buffer}).promise,pages=[];
    for(var i=1;i<=pdf.numPages;i++){
      var page=await pdf.getPage(i),content=await page.getTextContent({normalizeWhitespace:true});
      pages.push(pageText(content));if(onProgress)onProgress(i,pdf.numPages);
    }
    return {text:pages.join('\n\f\n'),hash:await hashBuffer(buffer),pages:pdf.numPages};
  }

  function parseRubrics(block){
    var before=(block.split(/\n\s*ND:\s*/)[0]||'').split(/\n/).slice(3).join('\n');
    var out=[],re=/(?:^|\s)(\d{1,4})\s+([A-ZÁÀÂÃÉÊÍÓÔÕÚÇ0-9ºª%()\/.,+\- ]{3,}?)\s+(-?[\d.]+,\d{2})\s+(-?[\d.]+,\d{2})\s+([PDI])(?=\s|$)/g,m;
    while((m=re.exec(before))){
      var nome=clean(m[2]).replace(/^\d{1,4}\s+/,'');
      if(!nome||/^(CPF|ADM|SALÁRIO|FILIAL)$/i.test(nome))continue;
      out.push({codigo:m[1],nome:nome,referencia:brNumber(m[3]),valor:brNumber(m[4]),tipo:m[5]});
    }
    return out;
  }

  function parseEmployee(block){
    var head=block.match(/^\s*(\d+)\s+(.+?)\s+Situa(?:ç|c)[aã]o:\s*(.+?)\s+CPF:\s*([\d.\-]+)\s+Adm:\s*(\d{2}\/\d{2}\/\d{4})/i);
    if(!head)return null;
    var v=block.match(/V[ií]nculo:\s*(.+?)\s+CC:\s*([^\s]+)\s+Depto:\s*([^\s]+)\s+Horas M[eê]s:\s*([\d.,]+)/i)||[];
    var c=block.match(/Cargo:\s*(?:\d+\s+)?(.+?)\s+C\.B\.O:\s*([^\s]+)\s+Filial:\s*([^\s]+)\s+Sal[aá]rio:\s*([\d.,]+)/i)||[];
    var t=block.match(/Proventos:\s*([\d.,]+)\s+Descontos:\s*([\d.,]+)\s+Informativa:\s*([\d.,]+).*?L[ií]quido:\s*([\d.,]+)/is)||[];
    var b=block.match(/Base INSS:\s*([\d.,]+)\s+Excedente INSS:\s*([\d.,]+).*?Base FGTS:\s*([\d.,]+).*?Valor FGTS:\s*([\d.,]+).*?Base IRRF:\s*(-?[\d.,]+)/is)||[];
    return {
      matricula:head[1],nome:clean(head[2]),situacao:clean(head[3]),cpf:head[4],cpf_mascarado:cpfMask(head[4]),admissao:isoDate(head[5]),
      vinculo:clean(v[1]),centro_custo:clean(v[2]),departamento:clean(v[3]),horas_mes:brNumber(v[4]),
      cargo:clean(c[1]),cbo:clean(c[2]),filial:clean(c[3]),salario:brNumber(c[4]),
      proventos:brNumber(t[1]),descontos:brNumber(t[2]),informativa:brNumber(t[3]),liquido:brNumber(t[4]),
      base_inss:brNumber(b[1]),excedente_inss:brNumber(b[2]),base_fgts:brNumber(b[3]),valor_fgts:brNumber(b[4]),base_irrf:brNumber(b[5]),
      observacao:(block.match(/\n(FERIAS[^\n]+)/i)||[])[1]||'',lancamentos:parseRubrics(block)
    };
  }

  function parseDepartments(text){
    var section=(text.match(/Totais por Departamento([\s\S]*?)Totais por Centro de Custos/i)||[])[1]||'',out=[];
    section.split(/\n/).forEach(function(line){
      var m=line.match(/^\s*(\d+)\s+(.+?)\s+([\d.]+,\d{2})\s+([\d.]+,\d{2})\s+([\d.]+,\d{2})\s*$/);
      if(m)out.push({codigo:m[1],nome:clean(m[2]),proventos:brNumber(m[3]),descontos:brNumber(m[4]),liquido:brNumber(m[5])});
    });return out;
  }

  function parseCharges(text){
    var s=text.slice(Math.max(0,text.lastIndexOf('\nINSS')));
    return {
      inss_segurados:findNumber(s,/Segurados:\s*([\d.,]+)/i),inss_empresa:findNumber(s,/Empresa:\s*([\d.,]+)/i),rat:findNumber(s,/RAT:\s*([\d.,]+)/i),terceiros:findNumber(s,/Terceiros:\s*([\d.,]+)/i),total_inss:findNumber(s,/Total INSS:\s*([\d.,]+)/i),
      base_fgts:findNumber(s,/Base do FGTS:\s*([\d.,]+)/i),valor_fgts:findNumber(s,/Valor do FGTS:\s*([\d.,]+)/i),base_pis:findNumber(s,/Base PIS:\s*([\d.,]+)/i),valor_pis:findNumber(s,/Valor PIS:\s*([\d.,]+)/i),valor_irrf:findNumber(s,/Valor Total do IRRF:\s*([\d.,]+)/i)
    };
  }

  function parseSituations(text){
    var s=text.slice(Math.max(0,text.lastIndexOf('Situações'))),out={};
    [['empregados',/No\. Empregados:\s*(\d+)/i],['estagiarios',/No\. Estagiários:\s*(\d+)/i],['trabalhando',/Trabalhando:\s*(\d+)/i],['demitidos',/Demitido:\s*(\d+)/i],['admissoes',/Admissões:\s*(\d+)/i],['ferias',/Férias:\s*(\d+)/i],['afastados',/Outros afastamentos:\s*(\d+)/i]].forEach(function(x){var m=s.match(x[1]);out[x[0]]=m?Number(m[1]):0;});
    return out;
  }

  function validate(result,reported){
    var calc={proventos:sum(result.colaboradores,'proventos'),descontos:sum(result.colaboradores,'descontos'),liquido:sum(result.colaboradores,'liquido')},items=[];
    ['proventos','descontos','liquido'].forEach(function(k){var diff=Math.abs(calc[k]-reported[k]);items.push({tipo:diff<.03?'ok':'alerta',campo:k,calculado:calc[k],informado:reported[k],mensagem:diff<.03?'Composição individual confere com o total geral.':'Diferença de R$ '+diff.toFixed(2)+' entre composição e total geral.'});});
    items.push({tipo:result.colaboradores.length?'ok':'alerta',campo:'colaboradores',mensagem:result.colaboradores.length?result.colaboradores.length+' colaboradores identificados.':'Nenhum colaborador foi identificado.'});
    return items;
  }

  function parsePdfText(text,meta){
    text=String(text||'').replace(/\r/g,'');
    var company=text.match(/Empresa:\s*(\d+)\s*-\s*([^\n]+)/i)||[],cnpj=(text.match(/CNPJ:\s*([\d./-]+)/i)||[])[1]||'',compet=(text.match(/Compet[eê]ncia:\s*(\d{2}\/\d{4})/i)||[])[1]||'',calc=(text.match(/C[aá]lculo:\s*([^\n]+)/i)||[])[1]||'Folha mensal';
    var blocks=text.split(/\bEmpr\.:\s*/).slice(1),employees=blocks.map(parseEmployee).filter(Boolean);
    var reported={
      proventos:findNumber(text,/Total Geral Proventos:\s*([\d.,]+)/i)||sum(employees,'proventos'),
      descontos:findNumber(text,/Total Geral Descontos:\s*([\d.,]+)/i)||sum(employees,'descontos'),
      liquido:findNumber(text,/L[ií]quido Geral:\s*([\d.,]+)/i)||sum(employees,'liquido'),
      base_inss:sum(employees,'base_inss'),base_fgts:sum(employees,'base_fgts'),valor_fgts:sum(employees,'valor_fgts'),base_irrf:sum(employees,'base_irrf')
    };
    var situations=parseSituations(text),departments=parseDepartments(text),charges=parseCharges(text);
    var result={
      meta:{competencia:competenceDate(compet),competencia_rotulo:compet,empresa_codigo:company[1]||'',empresa_nome:clean((company[2]||'').replace(/\s+Página:.*/i,'')),cnpj_mascarado:cnpjMask(cnpj),tipo_calculo:clean(String(calc).replace(/\s+Horas:.*/i,'')),fonte:'pdf',arquivo_nome:meta&&meta.fileName||'',arquivo_hash:meta&&meta.hash||'',paginas:meta&&meta.pages||0},
      resumo:Object.assign({},reported,situations,{pessoas:employees.length,departamentos:departments}),encargos:charges,colaboradores:employees,validacoes:[]
    };
    result.validacoes=validate(result,reported);return result;
  }

  function normHeader(v){return clean(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,'');}
  function excelValue(row,keys){for(var i=0;i<keys.length;i++)if(row[keys[i]]!=null&&row[keys[i]]!=='')return row[keys[i]];return '';}
  async function parseExcel(file){
    if(!global.XLSX)throw new Error('Leitor de Excel indisponível. Recarregue a página.');
    var buffer=await file.arrayBuffer(),book=global.XLSX.read(buffer,{type:'array',cellDates:true}),sheet=book.Sheets[book.SheetNames[0]],raw=global.XLSX.utils.sheet_to_json(sheet,{defval:''});
    if(!raw.length)throw new Error('A planilha está vazia.');
    var rows=raw.map(function(r){var o={};Object.keys(r).forEach(function(k){o[normHeader(k)]=r[k];});return o;});
    var employees=rows.map(function(r){
      var adm=excelValue(r,['admissao','data_admissao']);if(adm instanceof Date)adm=adm.toISOString().slice(0,10);else adm=isoDate(adm)||String(adm||'');
      return {matricula:String(excelValue(r,['matricula','codigo','empregado'])),nome:clean(excelValue(r,['nome','colaborador','funcionario'])),cpf:String(excelValue(r,['cpf'])),cpf_mascarado:cpfMask(excelValue(r,['cpf'])),admissao:adm,vinculo:clean(excelValue(r,['vinculo','tipo_vinculo'])),cargo:clean(excelValue(r,['cargo','funcao'])),cbo:String(excelValue(r,['cbo'])),centro_custo:String(excelValue(r,['centro_custo','cc'])),departamento:clean(excelValue(r,['departamento','depto','area'])),filial:String(excelValue(r,['filial'])),situacao:clean(excelValue(r,['situacao','status'])),horas_mes:brNumber(excelValue(r,['horas_mes','horas'])),salario:brNumber(excelValue(r,['salario','salario_base'])),proventos:brNumber(excelValue(r,['proventos','total_proventos','bruto'])),descontos:brNumber(excelValue(r,['descontos','total_descontos'])),liquido:brNumber(excelValue(r,['liquido','valor_liquido'])),informativa:brNumber(excelValue(r,['informativa'])),base_inss:brNumber(excelValue(r,['base_inss'])),excedente_inss:brNumber(excelValue(r,['excedente_inss'])),base_fgts:brNumber(excelValue(r,['base_fgts'])),valor_fgts:brNumber(excelValue(r,['valor_fgts','fgts'])),base_irrf:brNumber(excelValue(r,['base_irrf'])),lancamentos:[]};
    }).filter(function(x){return x.matricula&&x.nome;});
    var competence=excelValue(rows[0],['competencia','mes_competencia']);if(competence instanceof Date)competence=competence.toISOString().slice(0,7)+'-01';else if(!/^\d{4}-\d{2}-\d{2}$/.test(String(competence)))competence=competenceDate(competence);
    var summary={proventos:sum(employees,'proventos'),descontos:sum(employees,'descontos'),liquido:sum(employees,'liquido'),base_inss:sum(employees,'base_inss'),base_fgts:sum(employees,'base_fgts'),valor_fgts:sum(employees,'valor_fgts'),base_irrf:sum(employees,'base_irrf'),pessoas:employees.length,departamentos:[]};
    var result={meta:{competencia:competence,competencia_rotulo:competence?competence.slice(5,7)+'/'+competence.slice(0,4):'',empresa_codigo:String(excelValue(rows[0],['empresa_codigo','codigo_empresa'])||'2038'),empresa_nome:clean(excelValue(rows[0],['empresa_nome','empresa'])||'LIGA NACIONAL DE BASQUETE'),cnpj_mascarado:cnpjMask(excelValue(rows[0],['cnpj'])),tipo_calculo:'Folha mensal',fonte:'excel',arquivo_nome:file.name,arquivo_hash:await hashBuffer(buffer)},resumo:summary,encargos:{},colaboradores:employees,validacoes:[]};
    result.validacoes=validate(result,summary);return result;
  }

  function safePayload(result){
    var copy=JSON.parse(JSON.stringify(result));copy.colaboradores.forEach(function(x){var masked=cpfMask(x.cpf)||x.cpf_mascarado||'';delete x.cpf;x.cpf_mascarado=masked;});return copy;
  }

  global.RHParser={extractPdf:extractPdf,parsePdfText:parsePdfText,parseExcel:parseExcel,safePayload:safePayload,brNumber:brNumber};
})(window);
