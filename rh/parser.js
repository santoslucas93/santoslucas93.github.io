/* ============================================================
 * LNB RH — parser.js
 * Extração de PDF (PDF.js) e Excel (XLSX.js)
 * Expõe window.RHParser com a API esperada pelo app.js
 * ============================================================ */

(function (window) {
  'use strict';

  // ── Utilitários ────────────────────────────────────────────────────────────

  /** Converte número brasileiro ("1.234,56") em float */
  function brNumber(s) {
    if (s == null || s === '') return 0;
    const str = String(s).replace(/[^\d,.-]/g, '');
    return parseFloat(str.replace(/\./g, '').replace(',', '.')) || 0;
  }

  /** Mascara CPF: mantém posições 3-8, oculta o resto  →  ***.XXX.XXX-** */
  function cpfMask(cpf) {
    const digits = String(cpf).replace(/\D/g, '');
    if (digits.length !== 11) return cpf; // mantém o original se formato incomum
    return `***.${digits.slice(3, 6)}.${digits.slice(6, 9)}-**`;
  }

  /** Mascara CNPJ: oculta os últimos 2 dígitos verificadores */
  function cnpjMask(cnpj) {
    return String(cnpj).replace(/(\d{2}\.\d{3}\.\d{3}\/\d{4}-)(\d{2})/, '$1**');
  }

  /** DD/MM/YYYY → YYYY-MM-DD */
  function isoDate(br) {
    const m = String(br || '').match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
  }

  /** MM/YYYY → YYYY-MM-01 */
  function competenciaToDate(s) {
    const m = String(s || '').match(/^(\d{2})\/(\d{4})$/);
    return m ? `${m[2]}-${m[1]}-01` : null;
  }

  /** SHA-256 de um ArrayBuffer */
  async function hashBuffer(buf) {
    const arr = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', buf)));
    return arr.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // ── Parser de rubricas ─────────────────────────────────────────────────────

  /**
   * Parseia uma linha de rubrica que pode conter 1 ou 2 itens
   * (layout de duas colunas: proventos à esquerda, descontos à direita).
   *
   * Formato de cada item:
   *   {CODIGO}{NOME}  {REFERENCIA}  {VALOR}{P|D}
   *
   * Casos especiais tratados:
   *   • "9311/3 DAS FERIAS"  → código 931, nome "1/3 DAS FERIAS"
   *   • "855013 SALARIO..."  → código 8550, nome "13 SALARIO..."   (\d{2,4} para no 4º dígito)
   *   • "81691/3 FERIAS..."  → código 8169, nome "1/3 FERIAS..."
   *
   * @param {string} line
   * @returns {Array<{codigo, nome, referencia, valor, tipo}>}
   */
  function parseRubrics(line) {
    line = (line || '').trim();
    if (!line) return [];

    // Localiza todas as ocorrências de "VALOR P|D" na linha para dividir os itens
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

        // Fix: "9311" + "/3 DAS FERIAS" → código "931", nome "1/3 DAS FERIAS"
        if (nome.startsWith('/') && codigo.length > 2) {
          nome   = codigo.slice(-1) + nome;
          codigo = codigo.slice(0, -1);
        }

        // Ignora linhas informativas de FERIAS / DEMITIDO que não são rubricas
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

  // ── Parser de colaborador individual ──────────────────────────────────────

  /**
   * Recebe o bloco de texto de um colaborador e retorna objeto estruturado.
   * @param {string} block
   */
  function parseEmployee(block) {
    // Todos os separadores usam \s* — o espaçamento do texto extraído varia
    // conforme o motor (PDF.js x pdfplumber) e o limiar de gap usado.
    const headerRe  = /Empr\.:\s*(\d+)([^\n]+?)Situ[aá]?[cç][aã]o:\s*(\S+)\s*CPF:\s*([\d.*\/-]+)\s*Adm:\s*(\d{2}\/\d{2}\/\d{4})/;
    const vinculoRe = /V[ií]nculo:\s*([^\n]+?)CC:\s*(\S+)\s*Depto:\s*(\d+)\s*Horas\s*M[eê]s:\s*([\d,.]+)/;
    const cargoRe   = /Cargo:\s*(\d+)([^\n]+?)C\.B\.O:\s*(\d+)\s*Filial:\s*(\d+)\s*Sal[aá]rio:\s*([\d,.]+)/;
    const ndRe      = /ND:.*?Proventos:\s*([\d,.]+)\s*Descontos:\s*([\d,.]+).*?Informativa:\s*([\d,.]+).*?L[ií]quido:\s*([\d,.]+)/;
    const nfRe      = /NF:.*?Base\s*INSS:\s*([\d,.]+)\s*Excedente\s*INSS:\s*([\d,.]+)\s*Base\s*FGTS:\s*([\d,.]+)\s*Valor\s*FGTS:\s*([\d,.]+)\s*Base\s*IRRF:\s*([\d,.+\-]+)/;

    const hm  = headerRe.exec(block);
    const vm  = vinculoRe.exec(block);
    const cm  = cargoRe.exec(block);
    const ndm = ndRe.exec(block);
    const nfm = nfRe.exec(block);

    if (!hm || !vm || !cm || !ndm || !nfm) return null;

    // Bloco entre a linha de Cargo e a linha "ND:" contém as rubricas
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

  // ── Parser de departamentos ────────────────────────────────────────────────

  function parseDepartments(text) {
    const depts = [];
    // O cabeçalho "Proventos Descontos Liquido" fica na MESMA linha que "Totais por Departamento"
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

  // ── Parser de centros de custo ─────────────────────────────────────────────

  function parseCostCenters(text) {
    const ccs = [];
    // Idem: cabeçalho na mesma linha; termina em "Total Geral" ou segunda ocorrência de "Total:"
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

  // ── Parser de encargos (pág. 7) ────────────────────────────────────────────

  function parseCharges(text) {
    const enc = {};
    const fields = {
      sal_contrib_empregados: /Sal[aá]rio contribui[cç][aã]o empregados:\s*([\d.,]+)/,
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

    // Situações — extrai apenas o bloco específico para não capturar "Férias" de IRRF
    const sit = {};
    const sitSection = /Situa[cç][oõ]es\n([\s\S]+?)(?:\n\n|Sal[aá]rio maternidade[^\n]*\n[^\n]*\n[^\n]*$)/m.exec(text);
    const sitText = sitSection ? sitSection[1] : text;

    const sitFields = {
      empregados:  /N[o°]\.\s*Empregados:\s*(\d+)/,
      estagiarios: /N[o°]\.\s*Estagi[aá]rios:\s*(\d+)/,
      trabalhando: /Trabalhando:\s*(\d+)/,
      demitido:    /Demitido:\s*(\d+)/,
      transferido: /Transferido:\s*(\d+)/,
      ferias:      /F[eé]rias:\s*(\d+)(?![\d,])/,   // não captura "Férias: 765,57"
      afastado:    /Afastado direitos integrais:\s*(\d+)/
    };
    for (const [k, re] of Object.entries(sitFields)) {
      const m = re.exec(sitText);
      if (m) sit[k] = parseInt(m[1], 10);
    }
    enc.situacoes = sit;

    return enc;
  }

  // ── Resumo por rubrica (pág. 6) ────────────────────────────────────────────

  function parseResumoRubricas(text) {
    const sec = /Resumo por Rubrica\n?([\s\S]+?)(?:Totais por Filial|Sistema licenciado|$)/.exec(text);
    if (!sec) return [];
    const items = [];
    for (const line of sec[1].split('\n')) {
      items.push(...parseRubrics(line.trim()));
    }
    return items;
  }

  // ── Parser de texto extraído do PDF ───────────────────────────────────────

  /**
   * Recebe o texto bruto extraído (via PDF.js ou pdfplumber) e retorna payload.
   * @param {string} text
   * @returns {{ competencia: Object, colaboradores: Array }}
   */
  function parsePdfText(text) {
    // Remove cabeçalhos repetidos em cada página
    const headerRe = /Empresa: \d+ - [^\n]+\n(?:CNPJ:[^\n]+\n)?(?:C[aá]lculo:[^\n]+\n)?(?:Compet[eê]ncia:[^\n]+\n)?(?:Complemento[^\n]*\n)?(?:Vinculos:[^\n]+\n)?(?:EXTRATO MENSAL\n)?(?:Folha Mensal\n)?/g;
    let clean = text.replace(headerRe, '');
    clean = clean.replace(/Sistema licenciado para[^\n]*\n?/g, '');

    // Metadados da empresa
    const empRe   = /Empresa: (\d+) - ([^\n]+)/;
    const cnpjRe  = /CNPJ: ([\d.\/\-]+)/;
    const calcRe  = /C[aá]lculo: ([^\n]+)/;
    const compRe  = /Compet[eê]ncia: (\d{2}\/\d{4})/;

    const empM  = empRe.exec(text);
    const cnpjM = cnpjRe.exec(text);
    const calcM = calcRe.exec(text);
    const compM = compRe.exec(text);

    const empresa_codigo = empM  ? empM[1]  : '';
    const empresa_nome   = empM  ? empM[2].split(' P')[0].trim() : '';  // corta " Página: X/Y"
    const cnpj_raw       = cnpjM ? cnpjM[1] : '';
    const tipo_calculo   = calcM ? calcM[1].split(' Horas:')[0].trim() : '';
    const competencia    = compM ? competenciaToDate(compM[1]) : null;

    // Localiza todos os blocos de colaboradores
    // (funciona mesmo com texto sem quebras de cabeçalho, pois usa clean)
    const empBlockRe = new RegExp(
      'Empr\\.:\\s*(\\d+)([^\\n]+?)Situ[aá]?[cç][aã]o:\\s*(\\S+)\\s*CPF:\\s*([\\d.*\\/-]+)\\s*Adm:\\s*(\\d{2}\\/\\d{2}\\/\\d{4})\\n' +
      'V[ií]nculo:\\s*([^\\n]+?)CC:\\s*(\\S+)\\s*Depto:\\s*(\\d+)\\s*Horas\\s*M[eê]s:\\s*([\\d,.]+)\\n' +
      'Cargo:\\s*(\\d+)([^\\n]+?)C\\.B\\.O:\\s*(\\d+)\\s*Filial:\\s*(\\d+)\\s*Sal[aá]rio:\\s*([\\d,.]+)\\n' +
      '([\\s\\S]*?)' +
      '\\nND:.*?Proventos:\\s*([\\d,.]+)\\s*Descontos:\\s*([\\d,.]+).*?Informativa:\\s*([\\d,.]+).*?L[ií]quido:\\s*([\\d,.]+)\\n' +
      'NF:.*?Base\\s*INSS:\\s*([\\d,.]+)\\s*Excedente\\s*INSS:\\s*([\\d,.]+)\\s*Base\\s*FGTS:\\s*([\\d,.]+)\\s*Valor\\s*FGTS:\\s*([\\d,.]+)\\s*Base\\s*IRRF:\\s*([\\d,.+\\-]+)',
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

    // Totais gerais (pág. 6)
    const totalM = /Total Geral Proventos: ([\d.,]+)\s+Total Geral Descontos: ([\d.,]+)\s+L[ií]quido Geral: ([\d.,]+)/.exec(text);
    const proventos = totalM ? brNumber(totalM[1]) : 0;
    const descontos  = totalM ? brNumber(totalM[2]) : 0;
    const liquido    = totalM ? brNumber(totalM[3]) : 0;

    // Encargos e situações (pág. 7)
    const encargos = parseCharges(text);

    // Resumo
    const resumo = {
      departamentos: parseDepartments(text),
      centros_custo: parseCostCenters(text),
      rubricas:      parseResumoRubricas(text)
    };

    // Validações
    const validacoes = [];
    const calcProv = colaboradores.reduce((s, c) => s + (c.folha.proventos || 0), 0);
    if (Math.abs(calcProv - proventos) > 0.10) {
      validacoes.push({
        tipo: 'aviso',
        msg: `Proventos calculados (${calcProv.toFixed(2)}) divergem do total do PDF (${proventos.toFixed(2)})`
      });
    }
    if (colaboradores.length === 0) {
      validacoes.push({ tipo: 'erro', msg: 'Nenhum colaborador encontrado — verifique se o PDF é um Extrato Mensal válido' });
    }

    return {
      competencia: {
        competencia,
        empresa_codigo,
        empresa_nome,
        cnpj_mascarado: cnpj_raw,   // CNPJ da empresa (não é dado pessoal)
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

  // ── Extração via PDF.js (browser) ─────────────────────────────────────────

  /**
   * Reconstrói o texto de uma página a partir dos itens do PDF.js,
   * preservando o layout de duas colunas com espaços.
   * Ordena os itens do topo para a base (y decrescente no espaço PDF).
   */
  function _pageItemsToText(items) {
    if (!items || !items.length) return '';

    // Filtra itens vazios e normaliza
    const pts = items
      .filter(it => it.str && it.str.trim())
      .map(it => ({
        str: it.str,
        x:   it.transform[4],
        y:   Math.round(it.transform[5]),  // y = base da linha (coord. PDF: 0 = base da pág.)
        w:   it.width || 0
      }));

    if (!pts.length) return '';

    // Agrupa por y (tolerância 4 unidades)
    const Y_TOL = 4;
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

    // Ordena linhas do topo para a base (y maior = mais alto na página PDF)
    lineGroups.sort((a, b) => b.yKey - a.yKey);

    const lines = lineGroups.map(g => {
      // Ordena itens da linha da esquerda para a direita
      g.items.sort((a, b) => a.x - b.x);

      let text = '';
      let prevRight = null;

      for (const it of g.items) {
        // Limiar baixo: espaços estreitos desta fonte colam palavras se for alto
        if (prevRight !== null && it.x - prevRight > 1) {
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
    // Localiza PDF.js
    const pdfjsLib = window.pdfjsLib
      || window['pdfjs-dist/build/pdf']
      || (window.pdfjsLib = window.pdfjsLib);

    if (!pdfjsLib || typeof pdfjsLib.getDocument !== 'function') {
      throw new Error(
        'PDF.js não encontrado. Certifique-se de que a biblioteca está carregada antes do parser.'
      );
    }

    // Configura worker se ainda não foi feito
    if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
      pdfjsLib.GlobalWorkerOptions.workerSrc =
        'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    }

    const arrayBuffer = await file.arrayBuffer();
    const hash = await hashBuffer(arrayBuffer);

    const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;

    const pageParts = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const tc   = await page.getTextContent({
        normalizeWhitespace:   false,
        disableCombineTextItems: false,
        includeMarkedContent:  false
      });
      pageParts.push(_pageItemsToText(tc.items));
    }

    const fullText = pageParts.join('\n');
    const result   = parsePdfText(fullText);

    result.competencia.arquivo_nome = file.name;
    result.competencia.arquivo_hash = hash;

    return result;
  }

  // ── Validação de payload ───────────────────────────────────────────────────

  function validate(payload) {
    const erros = [];
    if (!payload || !payload.competencia) {
      erros.push('Payload inválido: campo "competencia" ausente');
    } else {
      if (!payload.competencia.competencia)
        erros.push('Competência não identificada no documento');
      if (!payload.competencia.empresa_codigo)
        erros.push('Código da empresa não identificado');
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

  // ── Payload seguro (sem dados sensíveis para log) ─────────────────────────

  function safePayload(payload) {
    if (!payload) return payload;
    const safe = JSON.parse(JSON.stringify(payload));
    // CPF já está mascarado; remove lancamentos para reduzir tamanho do log
    if (safe.colaboradores) {
      safe.colaboradores = safe.colaboradores.map(c => {
        const copy = Object.assign({}, c);
        delete copy.lancamentos;
        return copy;
      });
    }
    return safe;
  }

  // ── Parser Excel ───────────────────────────────────────────────────────────

  /**
   * Extrai dados de arquivo Excel (XLSX/XLS).
   * Requer XLSX.js (window.XLSX).
   * Implementação completa quando o arquivo Excel for fornecido.
   * @param {File} file
   */
  async function parseExcel(file) {
    const XLSX = window.XLSX;
    if (!XLSX) throw new Error('XLSX.js não encontrado. Carregue a biblioteca antes do parser.');

    const arrayBuffer = await file.arrayBuffer();
    const hash = await hashBuffer(arrayBuffer);
    const wb   = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array', cellDates: true });

    // Stub: retorna estrutura mínima enquanto o layout do Excel não é conhecido
    return {
      competencia: {
        fonte: 'excel',
        arquivo_nome: file.name,
        arquivo_hash: hash,
        status: 'rascunho',
        validacoes: [{ tipo: 'aviso', msg: 'Import Excel pendente: envie o arquivo para implementação completa.' }]
      },
      colaboradores: []
    };
  }

  // ── API pública ────────────────────────────────────────────────────────────

  window.RHParser = {
    /** Extrai PDF (File → payload). Principal ponto de entrada para o app. */
    extractPdf,

    /** Extrai Excel (File → payload). */
    parseExcel,

    /** Parseia texto bruto já extraído de um PDF. Útil para testes. */
    parsePdfText,

    /** Parseia bloco de texto de um único colaborador. */
    parseEmployee,

    /** Parseia uma linha de rubricas (suporte a duas colunas). */
    parseRubrics,

    /** Parseia totais por departamento do texto do PDF. */
    parseDepartments,

    /** Parseia encargos (INSS, FGTS, PIS, IRRF) do texto do PDF. */
    parseCharges,

    /** Utilitários */
    brNumber,
    cpfMask,
    cnpjMask,
    isoDate,
    hashBuffer,

    /** Valida payload gerado pelo parser. */
    validate,

    /** Retorna versão "segura" do payload para logs (sem dados sensíveis detalhados). */
    safePayload
  };

})(window);
