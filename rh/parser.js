/* ============================================================
 * LNB RH â parser.js
 * ExtraÃ§Ã£o de PDF (PDF.js) e Excel (XLSX.js)
 * ExpÃµe window.RHParser com a API esperada pelo app.js
 * ============================================================ */

(function (window) {
  'use strict';

  // ââ UtilitÃ¡rios ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

  /** Converte nÃºmero brasileiro ("1.234,56") em float */
  function brNumber(s) {
    if (s == null || s === '') return 0;
    const str = String(s).replace(/[^\d,.-]/g, '');
    return parseFloat(str.replace(/\./g, '').replace(',', '.')) || 0;
  }

  /** Mascara CPF: mantÃ©m posiÃ§Ãµes 3-8, oculta o resto  â  ***.XXX.XXX-** */
  function cpfMask(cpf) {
    const digits = String(cpf).replace(/\D/g, '');
    if (digits.length !== 11) return cpf; // mantÃ©m o original se formato incomum
    return `***.${digits.slice(3, 6)}.${digits.slice(6, 9)}-**`;
  }

  /** Mascara CNPJ: oculta os Ãºltimos 2 dÃ­gitos verificadores */
  function cnpjMask(cnpj) {
    return String(cnpj).replace(/(\d{2}\.\d{3}\.\d{3}\/\d{4}-)(\d{2})/, '$1**');
  }

  /** DD/MM/YYYY â YYYY-MM-DD */
  function isoDate(br) {
    const m = String(br || '').match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
  }

  /** MM/YYYY â YYYY-MM-01 */
  function competenciaToDate(s) {
    const m = String(s || '').match(/^(\d{2})\/(\d{4})$/);
    return m ? `${m[2]}-${m[1]}-01` : null;
  }

  /** SHA-256 de um ArrayBuffer */
  async function hashBuffer(buf) {
    const arr = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', buf)));
    return arr.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // ââ Parser de rubricas âââââââââââââââââââââââââââââââââââââââââââââââââââââ

  /**
   * Parseia uma linha de rubrica que pode conter 1 ou 2 itens
   * (layout de duas colunas: proventos Ã  esquerda, descontos Ã  direita).
   *
   * Formato de cada item:
   *   {CODIGO}{NOME}  {REFERENCIA}  {VALOR}{P|D}
   *
   * Casos especiais tratados:
   *   â¢ "9311/3 DAS FERIAS"  â cÃ³digo 931, nome "1/3 DAS FERIAS"
   *   â¢ "855013 SALARIO..."  â cÃ³digo 8550, nome "13 SALARIO..."   (\d{2,4} para no 4Âº dÃ­gito)
   *   â¢ "81691/3 FERIAS..."  â cÃ³digo 8169, nome "1/3 FERIAS..."
   *
   * @param {string} line
   * @returns {Array<{codigo, nome, referencia, valor, tipo}>}
   */
  function parseRubrics(line) {
    line = (line || '').trim();
    if (!line) return [];

    // Localiza todas as ocorrÃªncias de "VALOR P|D" na linha para dividir os itens
    const termRe = /([\d.]+,\d{2})\s*([PD])(?=\s|$)/g;
    const terminals = [];
    let tm;
    while ((tm = termRe.exec(line)) !== null) {
      terminals.push({ start: tm.index, end: tm.index + tm[0].length, type: tm[2] });
    }
    if (!terminals.length) return [];

    const items = [];
    let cursor = 0;

    for (const term of terminals) {
      const segment = line.slice(cursor, term.end).trim();

      // Cada segmento: (\d{2,4})\s*NOME  REF  VALOR[PD]
      const itemRe = /^(\d{2,4})\s*([\s\S]+?)\s+([\d.,]+)\s+([\d.,]+)\s*([PD])$/;
      const m = itemRe.exec(segment);

      if (m) {
        let codigo = m[1];
        let nome   = m[2].trim();

        // Fix: "9311" + "/3 DAS FERIAS" â cÃ³digo "931", nome "1/3 DAS FERIAS"
        if (nome.startsWith('/') && codigo.length > 2) {
          nome   = codigo.slice(-1) + nome;
          codigo = codigo.slice(0, -1);
        }

        // Ignora linhas informativas de FERIAS / DEMITIDO que nÃ£o sÃ£o rubricas
        if (/^(FERIAS DE|DEMITIDO EM)/i.test(nome)) {
          cursor = term.end;
          while (cursor < line.length && line[cursor] === ' ') cursor++;
          continue;
        }

        items.push({
          codigo,
          nome,
          referencia: m[3],
          valor: brNumber(m[4]),
          tipo: m[5] === 'P' ? 'provento' : 'desconto'
        });
      }

      cursor = term.end;
      while (cursor < line.length && line[cursor] === ' ') cursor++;
    }

    return items;
  }

  // ââ Parser de colaborador individual ââââââââââââââââââââââââââââââââââââââ

  /**
   * Recebe o bloco de texto de um colaborador e retorna objeto estruturado.
   * @param {string} block
   */
  function parseEmployee(block) {
    const headerRe  = /Empr\.: (\d+)([^\n]+?)Situ[aÃ£]Ã§Ã£o:(\S+)\s+CPF:([\d.*\/-]+)\s+Adm: (\d{2}\/\d{2}\/\d{4})/;
    const vinculoRe = /V[iÃ­]nculo:\s*([^\n]+?)CC:(\S+)\s+Depto:\s*(\d+)\s+Horas M[eÃª]s: ([\d,.]+)/;
    const cargoRe   = /Cargo:\s*(\d+)([^\n]+?)C\.B\.O:([\d]+)\s+Filial:\s*(\d+)\s+Sal[aÃ¡]rio: ([\d,.]+)/;
    const ndRe      = /ND:.*?Proventos: ([\d,.]+)\s+Descontos: ([\d,.]+).*?Informativa: ([\d,.]+).*?L[iÃ­]quido: ([\d,.]+)/;
    const nfRe      = /NF:.*?Base INSS: ([\d,.]+)\s+Excedente INSS: ([\d,.]+)\s+Base FGTS: ([\d,.]+)\s+Valor FGTS: ([\d,.]+)\s+Base IRRF: ([\d,.+\-]+)/;

    const hm  = headerRe.exec(block);
    const vm  = vinculoRe.exec(block);
    const cm  = cargoRe.exec(block);
    const ndm = ndRe.exec(block);
    const nfm = nfRe.exec(block);

    if (!hm || !vm || !cm || !ndm || !nfm) return null;

    // Bloco entre a linha de Cargo e a linha "ND:" contÃ©m as rubricas
    const cargoEnd = block.indexOf('\n', block.indexOf('C.B.O:'));
    const ndStart  = block.indexOf('\nND:');
    const rubricBlock = (cargoEnd >= 0 && ndStart > cargoEnd)
      ? block.slice(cargoEnd + 1, ndStart)
      : '';

    const lancamentos = [];
    for (const line of rubricBlock.split('\n')) {
      lancamentos.push(...parseRubrics(line));
    }

    return {
      matricula:    hm[1].trim(),
      nome:         hm[2].trim(),
      cpf_mascarado: cpfMask(hm[4].trim()),
      admissao:     isoDate(hm[5]),
      situacao:     hm[3].trim(),
      vinculo:      vm[1].trim(),
      centro_custo: vm[2].trim(),
      departamento: vm[3].trim(),
      cargo:        cm[2].trim(),
      cbo:          cm[3].trim(),
      filial:       cm[4].trim(),
      salario:      brNumber(cm[5]),
      folha: {
        horas_mes:     brNumber(vm[4]),
        salario:       brNumber(cm[5]),
        proventos:     brNumber(ndm[1]),
        descontos:     brNumber(ndm[2]),
        informativa:   brNumber(ndm[3]),
        liquido:       brNumber(ndm[4]),
        base_inss:     brNumber(nfm[1]),
        excedente_inss: brNumber(nfm[2]),
        base_fgts:     brNumber(nfm[3]),
        valor_fgts:    brNumber(nfm[4]),
        base_irrf:     brNumber(nfm[5])
      },
      lancamentos
    };
  }

  // ââ Parser de departamentos ââââââââââââââââââââââââââââââââââââââââââââââââ

  function parseDepartments(text) {
    const depts = [];
    // O cabeÃ§alho "Proventos Descontos Liquido" fica na MESMA linha que "Totais por Departamento"
    const sectionRe = /Totais por Departamento[^\n]*\n([\s\S]+?)Total:/;
    const sec = sectionRe.exec(text);
    if (!sec) return depts;

    const lineRe = /^(\d+)(.+?)\s+([\d.,]+)\s+([\d.,]+)\s+([\d.,]+)$/gm;
    let m;
    while ((m = lineRe.exec(sec[1])) !== null) {
      depts.push({
        codigo: m[1],
        nome:   m[2].trim(),
        proventos: brNumber(m[3]),
        descontos:  brNumber(m[4]),
        liquido:    brNumber(m[5])
      });
    }
    return depts;
  }

  // ââ Parser de centros de custo âââââââââââââââââââââââââââââââââââââââââââââ

  function parseCostCenters(text) {
    const ccs = [];
    // Idem: cabeÃ§alho na mesma linha; termina em "Total Geral" ou segunda ocorrÃªncia de "Total:"
    const sectionRe = /Totais por Centro de Custos[^\n]*\n([\s\S]+?)Total:/;
    const all = [...text.matchAll(/Totais por Centro de Custos[^\n]*\n([\s\S]+?)Total:/g)];
    const sec = all[0];
    if (!sec) return ccs;

    const lineRe = /^(\d+)(.+?)\s+([\d.,]+)\s+([\d.,]+)\s+([\d.,]+)$/gm;
    let m;
    while ((m = lineRe.exec(sec[1])) !== null) {
      ccs.push({
        codigo: m[1],
        nome:   m[2].trim(),
        proventos: brNumber(m[3]),
        descontos:  brNumber(m[4]),
        liquido:    brNumber(m[5])
      });
    }
    return ccs;
  }

  // ââ Parser de encargos (pÃ¡g. 7) ââââââââââââââââââââââââââââââââââââââââââââ

  function parseCharges(text) {
    const enc = {};
    const fields = {
      sal_contrib_empregados: /Sal[aÃ¡]rio contribui[cÃ§][aÃ£]o empregados:\s*([\d.,]+)/,
      excedente_inss:         /Excedente:\s*([\d.,]+)/,
      base_total_inss:        /Base total:\s*([\d.,]+)/,
      segurados:              /Segurados:\s*([\d.,]+)/,
      empresa_inss:           /Empresa:\s*([\d.,]+)/,
      rat:                    /RAT:\s*([\d.,]+)/,
      terceiros:              /Terceiros:\s*([\d.,]+)/,
      total_inss:             /Total INSS:\s*([\d.,]+)/,
      base_fgts:              /Base do FGTS:\s*([\d.,]+)/,
      valor_fgts:             /Valor do FGTS:\s*([\d.,]+)/,
      base_pis:               /Base PIS:\s*([\d.,]+)/,
      valor_pis:              /Valor PIS:\s*([\d.,]+)/,
      base_irrf_mensal:       /Base IRRF Mensal:\s*([\d.,]+)/,
      valor_irrf_mensal:      /Valor IRRF Mensal:\s*([\d.,]+)/,
      valor_total_irrf:       /Valor Total do IRRF:\s*([\d.,]+)/
    };

    for (const [k, re] of Object.entries(fields)) {
      const m = re.exec(text);
      if (m) enc[k] = brNumber(m[1]);
    }

    // SituaÃ§Ãµes â extrai apenas o bloco especÃ­fico para nÃ£o capturar "FÃ©rias" de IRRF
    const sit = {};
    const sitSection = /Situa[cÃ§][oÃµ]es\n([\s\S]+?)(?:\n\n|Sal[aÃ¡]rio maternidade[^\n]*\n[^\n]*\n[^\n]*$)/m.exec(text);
    const sitText = sitSection ? sitSection[1] : text;

    const sitFields = {
      empregados:  /N[oÂ°]\.\s*Empregados:\s*(\d+)/,
      estagiarios: /N[oÂ°]\.\s*Estagi[aÃ¡]rios:\s*(\d+)/,
      trabalhando: /Trabalhando:\s*(\d+)/,
      demitido:    /Demitido:\s*(\d+)/,
      transferido: /Transferido:\s*(\d+)/,
      ferias:      /F[eÃ©]rias:\s*(\d+)(?![\d,])/,   // nÃ£o captura "FÃ©rias: 765,57"
      afastado:    /Afastado direitos integrais:\s*(\d+)/
    };
    for (const [k, re] of Object.entries(sitFields)) {
      const m = re.exec(sitText);
      if (m) sit[k] = parseInt(m[1], 10);
    }
    enc.situacoes = sit;

    return enc;
  }

  // ââ Resumo por rubrica (pÃ¡g. 6) ââââââââââââââââââââââââââââââââââââââââââââ

  function parseResumoRubricas(text) {
    const sec = /Resumo por Rubrica\n?([\s\S]+?)(?:Totais por Filial|Sistema licenciado|$)/.exec(text);
    if (!sec) return [];
    const items = [];
    for (const line of sec[1].split('\n')) {
      items.push(...parseRubrics(line.trim()));
    }
    return items;
  }

  // ââ Parser de texto extraÃ­do do PDF âââââââââââââââââââââââââââââââââââââââ

  /**
   * Recebe o texto bruto extraÃ­do (via PDF.js ou pdfplumber) e retorna payload.
   * @param {string} text
   * @returns {{ competencia: Object, colaboradores: Array }}
   */
  function parsePdfText(text) {
    // Remove cabeÃ§alhos repetidos em cada pÃ¡gina
    const headerRe = /Empresa: \d+ - [^\n]+\n(?:CNPJ:[^\n]+\n)?(?:C[aÃ¡]lculo:[^\n]+\n)?(?:Compet[eÃª]ncia:[^\n]+\n)?(?:Complemento[^\n]*\n)?(?:Vinculos:[^\n]+\n)?(?:EXTRATO MENSAL\n)?(?:Folha Mensal\n)?/g;
    let clean = text.replace(headerRe, '');
    clean = clean.replace(/Sistema licenciado para[^\n]*\n?/g, '');

    // Metadados da empresa
    const empRe   = /Empresa: (\d+) - ([^\n]+)/;
    const cnpjRe  = /CNPJ: ([\d.\/\-]+)/;
    const calcRe  = /C[aÃ¡]lculo: ([^\n]+)/;
    const compRe  = /Compet[eÃª]ncia: (\d{2}\/\d{4})/;

    const empM  = empRe.exec(text);
    const cnpjM = cnpjRe.exec(text);
    const calcM = calcRe.exec(text);
    const compM = compRe.exec(text);

    const empresa_codigo = empM  ? empM[1]  : '';
    const empresa_nome   = empM  ? empM[2].split(' P')[0].trim() : '';  // corta " PÃ¡gina: X/Y"
    const cnpj_raw       = cnpjM ? cnpjM[1] : '';
    const tipo_calculo   = calcM ? calcM[1].split(' Horas:')[0].trim() : '';
    const competencia    = compM ? competenciaToDate(compM[1]) : null;

    // Localiza todos os blocos de colaboradores
    // (funciona mesmo com texto sem quebras de cabeÃ§alho, pois usa clean)
    const empBlockRe = new RegExp(
      'Empr\\.: (\\d+)([^\\n]+?)Situ[aÃ£][cÃ§][aÃ£]o:(\\S+)\\s+CPF:([\\d.*\\/-]+)\\s+Adm: (\\d{2}\\/\\d{2}\\/\\d{4})\\n' +
      'V[iÃ­]nculo:\\s*([^\\n]+?)CC:(\\S+)\\s+Depto:\\s*(\\d+)\\s+Horas M[eÃª]s: ([\\d,.]+)\\n' +
      'Cargo:\\s*(\\d+)([^\\n]+?)C\\.B\\.O:([\\d]+)\\s+Filial:\\s*(\\d+)\\s+Sal[aÃ¡]rio: ([\\d,.]+)\\n' +
      '([\\s\\S]*?)' +
      '\\nND:.*?Proventos: ([\\d,.]+)\\s+Descontos: ([\\d,.]+).*?Informativa: ([\\d,.]+).*?L[iÃ­]quido: ([\\d,.]+)\\n' +
      'NF:.*?Base INSS: ([\\d,.]+)\\s+Excedente INSS: ([\\d,.]+)\\s+Base FGTS: ([\\d,.]+)\\s+Valor FGTS: ([\\d,.]+)\\s+Base IRRF: ([\\d,.+\\-]+)',
      'g'
    );

    const colaboradores = [];
    let em;
    while ((em = empBlockRe.exec(clean)) !== null) {
      const rubricBlock = em[15].trim();
      const lancamentos = [];
      for (const line of rubricBlock.split('\n')) {
        lancamentos.push(...parseRubrics(line));
      }

      colaboradores.push({
        matricula:      em[1].trim(),
        nome:           em[2].trim(),
        cpf_mascarado:  cpfMask(em[4].trim()),
        admissao:       isoDate(em[5]),
        situacao:       em[3].trim(),
        vinculo:        em[6].trim(),
        centro_custo:   em[7].trim(),
        departamento:   em[8].trim(),
        cbo:            em[12].trim(),
        cargo:          em[11].trim(),
        filial:         em[13].trim(),
        salario:        brNumber(em[14]),
        folha: {
          horas_mes:      brNumber(em[9]),
          salario:        brNumber(em[14]),
          proventos:      brNumber(em[16]),
          descontos:      brNumber(em[17]),
          informativa:    brNumber(em[18]),
          liquido:        brNumber(em[19]),
          base_inss:      brNumber(em[20]),
          excedente_inss: brNumber(em[21]),
          base_fgts:      brNumber(em[22]),
          valor_fgts:     brNumber(em[23]),
          base_irrf:      brNumber(em[24])
        },
        lancamentos
      });
    }

    // Totais gerais (pÃ¡g. 6)
    const totalM = /Total Geral Proventos: ([\d.,]+)\s+Total Geral Descontos: ([\d.,]+)\s+L[iÃ­]quido Geral: ([\d.,]+)/.exec(text);
    const proventos = totalM ? brNumber(totalM[1]) : 0;
    const descontos  = totalM ? brNumber(totalM[2]) : 0;
    const liquido    = totalM ? brNumber(totalM[3]) : 0;

    // Encargos e situaÃ§Ãµes (pÃ¡g. 7)
    const encargos = parseCharges(text);

    // Resumo
    const resumo = {
      departamentos: parseDepartments(text),
      centros_custo: parseCostCenters(text),
      rubricas:      parseResumoRubricas(text)
    };

    // ValidaÃ§Ãµes
    const validacoes = [];
    const calcProv = colaboradores.reduce((s, c) => s + (c.folha.proventos || 0), 0);
    if (Math.abs(calcProv - proventos) > 0.10) {
      validacoes.push({
        tipo: 'aviso',
        msg: `Proventos calculados (${calcProv.toFixed(2)}) divergem do total do PDF (${proventos.toFixed(2)})`
      });
    }
    if (colaboradores.length === 0) {
      validacoes.push({ tipo: 'erro', msg: 'Nenhum colaborador encontrado â verifique se o PDF Ã© um Extrato Mensal vÃ¡lido' });
    }

    return {
      competencia: {
        competencia,
        empresa_codigo,
        empresa_nome,
        cnpj_mascarado: cnpj_raw,   // CNPJ da empresa (nÃ£o Ã© dado pessoal)
        tipo_calculo,
        fonte: 'pdf',
        status: 'processado',
        proventos,
        descontos,
        liquido,
        base_inss:  encargos.base_total_inss || 0,
        base_fgts:  encargos.base_fgts       || 0,
        valor_fgts: encargos.valor_fgts      || 0,
        base_irrf:  encargos.base_irrf_mensal || 0,
        encargos,
        resumo,
        validacoes
      },
      colaboradores
    };
  }

  // ââ ExtraÃ§Ã£o via PDF.js (browser) âââââââââââââââââââââââââââââââââââââââââ

  /**
   * ReconstrÃ³i o texto de uma pÃ¡gina a partir dos itens do PDF.js,
   * preservando o layout de duas colunas com espaÃ§os.
   */
  function _pageItemsToText(items) {
    if (!items || !items.length) return '';

    // Filtra itens vazios e normaliza
    const pts = items
      .filter(it => it.str && it.str.trim())
      .map(it => ({
        str: it.str,
        x:   it.transform[4],
        y:   Math.round(it.transform[5]),  // y = base da linha (coord. PDF: 0 = base da pÃ¡g.)
        w:   it.width || 0
      }));

    if (!pts.length) return '';

    // Agrupa por y (tolerÃ¢ncia 3 unidades)
    const Y_TOL = 3;
    const lineGroups = [];     // [{yKey, items:[]}]

    for (const pt of pts) {
      let found = null;
      for (const g of lineGroups) {
        if (Math.abs(g.yKey - pt.y) <= Y_TOL) { found = g; break; }
      }
      if (found) {
        found.items.push(pt);
      } else {
        lineGroups.push({ yKey: pt.y, items: [pt] });
      }
    }

    // Ordena linhas do topo para a base (y maior = mais alto na pÃ¡gina PDF)
    lineGroups.sort((a, b) => b.yKey - a.yKey);

    const lines = lineGroups.map(g => {
      // Ordena itens da linha da esquerda para a direita
      g.items.sort((a, b) => a.x - b.x);

      let text = '';
      let prevRight = null;

      for (const it of g.items) {
        if (prevRight !== null && it.x - prevRight > 3) {
          text += ' ';
        }
        text += it.str;
        prevRight = it.x + it.w;
      }
      return text;
    });

    return lines.join('\n');
  }

  /**
   * Extrai PDF a partir de um objeto File (browser).
   * Requer PDF.js carregado (window.pdfjsLib).
   * @param {File} file
   * @returns {Promise<{ competencia: Object, colaboradores: Array }>}
   */
  async function extractPdf(file) {
  var NL = String.fromCharCode(10);
  var data  = new Uint8Array(await file.arrayBuffer());
  var hash  = await hashBuffer(data);
  var pdf   = await pdfjsLib.getDocument({ data }).promise;
  var pageTexts = [];
  for (var i = 1; i <= pdf.numPages; i++) {
    var page = await pdf.getPage(i);
    var tc   = await page.getTextContent({ normalizeWhitespace: false, disableCombineTextItems: false });
    var vp   = page.getViewport({ scale: 1 });
    var allItems = tc.items
      .filter(function(it){ return 'str' in it && it.str.trim(); })
      .map(function(it){ return { str: it.str, x: it.transform[4], y: vp.height - it.transform[5], w: it.width || 0 }; });
    var lines = [];
    for (var j = 0; j < allItems.length; j++) {
      var it = allItems[j];
      var ex = null;
      for (var k = 0; k < lines.length; k++) { if (Math.abs(lines[k].y - it.y) <= 4) { ex = lines[k]; break; } }
      if (ex) ex.items.push(it);
      else lines.push({ y: it.y, items: [it] });
    }
    lines.sort(function(a, b){ return a.y - b.y; });
    lines.forEach(function(l){ l.items.sort(function(a, b){ return a.x - b.x; }); });
    var pageText = "";
    for (var li = 0; li < lines.length; li++) {
      var lt = "", lx = null;
      var litems = lines[li].items;
      for (var m = 0; m < litems.length; m++) {
        var pit = litems[m];
        if (lx !== null && pit.x > lx + 3) lt += " ";
        lt += pit.str;
        lx = pit.x + pit.w;
      }
      pageText += lt + NL;
    }
    pageTexts.push(pageText.trimEnd ? pageText.trimEnd() : pageText.replace(/\s+$/, ""));
  }
  var text   = pageTexts.join(NL);
  var result = parsePdfText(text);
  result.competencia.arquivo_nome = file.name;
  result.competencia.arquivo_hash = hash;
  return result;
}
async function parseExcel(file) {
    const XLSX = window.XLSX;
    if (!XLSX) throw new Error('XLSX.js nÃ£o encontrado. Carregue a biblioteca antes do parser.');

    const arrayBuffer = await file.arrayBuffer();
    const hash = await hashBuffer(arrayBuffer);
    const wb   = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array', cellDates: true });

    // Stub: retorna estrutura mÃ­nima enquanto o layout do Excel nÃ£o Ã© conhecido
    return {
      competencia: {
        fonte: 'excel',
        arquivo_nome: file.name,
        arquivo_hash: hash,
        status: 'rascunho',
        validacoes: [{ tipo: 'aviso', msg: 'Import Excel pendente: envie o arquivo para implementaÃ§Ã£o completa.' }]
      },
      colaboradores: []
    };
  }

  // ââ API pÃºblica ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

  function validate(payload) {
    const erros = [];
    if (!payload || !payload.competencia) {
      erros.push('Payload invalido: campo competencia ausente');
    } else {
      if (!payload.competencia.competencia)
        erros.push('Competencia nao identificada no documento');
      if (!payload.competencia.empresa_codigo)
        erros.push('Codigo da empresa nao identificado');
    }
    if (!payload.colaboradores || payload.colaboradores.length === 0)
      erros.push('Nenhum colaborador encontrado');

    if (payload.competencia && payload.competencia.validacoes) {
      for (const v of payload.competencia.validacoes) {
        if (v.tipo === 'erro') erros.push(v.msg);
      }
    }

    return { valido: erros.length === 0, erros };
  }

  function safePayload(payload) {
    if (!payload) return payload;
    const safe = JSON.parse(JSON.stringify(payload));
    if (safe.colaboradores) {
      safe.colaboradores = safe.colaboradores.map(c => {
        const copy = Object.assign({}, c);
        delete copy.lancamentos;
        return copy;
      });
    }
    return safe;
  }

  window.RHParser = {
    /** Extrai PDF (File â payload). Principal ponto de entrada para o app. */
    extractPdf,

    /** Extrai Excel (File â payload). */
    parseExcel,

    /** Parseia texto bruto jÃ¡ extraÃ­do de um PDF. Ãtil para testes. */
    parsePdfText,

    /** Parseia bloco de texto de um Ãºnico colaborador. */
    parseEmployee,

    /** Parseia uma linha de rubricas (suporte a duas colunas). */
    parseRubrics,

    /** Parseia totais por departamento do texto do PDF. */
    parseDepartments,

    /** Parseia encargos (INSS, FGTS, PIS, IRRF) do texto do PDF. */
    parseCharges,

    /** UtilitÃ¡rios */
    brNumber,
    cpfMask,
    cnpjMask,
    isoDate,
    hashBuffer,

    /** Valida payload gerado pelo parser. */
    validate,

    /** Retorna versÃ£o "segura" do payload para logs (sem dados sensÃ­veis detalhados). */
    safePayload
  };

})(window);
