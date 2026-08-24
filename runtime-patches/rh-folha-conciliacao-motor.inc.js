/* =============================================================================
 * MOTOR DE FOLHA DE PAGAMENTO — LIGA NACIONAL DE BASQUETE (Painel LNB /rh/)
 * =============================================================================
 * Versão .......: 1.0.0
 * Competência ..: parametrizado por vigência (2026-01 em diante)
 * Referência ...: Extrato Mensal 07/2026 — empresa 2038 / CNPJ 10.435.803/0001-22
 * Base legal ...: CLT, Lei 8.212/91, Lei 8.036/90, Lei 7.713/88, Lei 11.788/08,
 *                 Lei 10.097/00, Lei 605/49, Lei 15.270/2025 (redutor IRRF),
 *                 Lei 10.820/03 (consignado), Lei 7.418/85 (VT).
 *
 * REGRA DE OURO DE ARREDONDAMENTO
 * ------------------------------------------------------------------------
 * O sistema da contabilidade (GF Serviços) TRUNCA em 2 casas decimais cada
 * parcela intermediária (faixa de INSS, alíquota de encargo, FGTS individual)
 * em vez de arredondar. Isso foi confirmado nos 26 registros da folha 07/2026:
 *   - INSS Lilian (teto)  : fórmula c/ arredondamento = 988,09 | extrato = 988,07
 *   - Terceiros 5,8%      : fórmula c/ arredondamento = 5.283,57 | extrato = 5.283,56
 *   - INSS Patronal 20%   : fórmula c/ arredondamento = 18.219,22 | extrato = 18.219,21
 * Truncando cada parcela, o motor fecha CENTAVO A CENTAVO com o extrato.
 * O IRRF, por outro lado, ARREDONDA (meio para cima) o imposto final.
 * Controlado por CFG.arredondamento — não altere sem reconferir a folha.
 * ========================================================================== */

;(function (global) {
  'use strict';

  /* ==========================================================================
   * 0. UTILITÁRIOS MONETÁRIOS
   * ======================================================================== */

  /** Arredonda para 2 casas (half-up), imune a erro de ponto flutuante. */
  function r2(v) {
    if (!isFinite(v)) return 0;
    return Math.sign(v) * Math.round((Math.abs(v) + Number.EPSILON) * 100) / 100;
  }

  /** Trunca para 2 casas (corta o centavo, não arredonda). */
  function t2(v) {
    if (!isFinite(v)) return 0;
    // +1e-9 neutraliza 0.145*100 = 14.499999999999998
    return Math.sign(v) * Math.floor(Math.abs(v) * 100 + 1e-9) / 100;
  }

  /** Arredonda com N casas (para referências: horas, avos, percentuais). */
  function rN(v, n) {
    if (!isFinite(v)) return 0;
    var f = Math.pow(10, n);
    return Math.sign(v) * Math.round((Math.abs(v) + Number.EPSILON) * f) / f;
  }

  /** Soma segura de uma lista de valores monetários. */
  function soma(lista, campo) {
    return r2((lista || []).reduce(function (acc, it) {
      var v = campo ? it[campo] : it;
      return acc + (Number(v) || 0);
    }, 0));
  }

  function nz(v) { return Number(v) || 0; }
  function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

  /** Formata para exibição pt-BR. */
  function brl(v) {
    return (Number(v) || 0).toLocaleString('pt-BR', {
      minimumFractionDigits: 2, maximumFractionDigits: 2
    });
  }

  /* ---- Datas (tudo em ISO 'YYYY-MM-DD', sem fuso, sem Date parsing solto) -- */

  function dt(iso) {
    if (iso instanceof Date) return iso;
    var p = String(iso).slice(0, 10).split('-');
    return new Date(Date.UTC(+p[0], +p[1] - 1, +p[2]));
  }
  function iso(d) { return d.toISOString().slice(0, 10); }
  function diasEntre(a, b) { return Math.round((dt(b) - dt(a)) / 86400000); }
  function addDias(a, n) { var d = dt(a); d.setUTCDate(d.getUTCDate() + n); return iso(d); }
  function diasNoMes(comp) {
    var p = String(comp).split('-');
    return new Date(Date.UTC(+p[0], +p[1], 0)).getUTCDate();
  }
  function primeiroDia(comp) { return comp + '-01'; }
  function ultimoDia(comp) { return comp + '-' + String(diasNoMes(comp)).padStart(2, '0'); }
  function compDe(isoData) { return String(isoData).slice(0, 7); }
  function addMeses(comp, n) {
    var p = String(comp).split('-'), y = +p[0], m = +p[1] - 1 + n;
    y += Math.floor(m / 12); m = ((m % 12) + 12) % 12;
    return y + '-' + String(m + 1).padStart(2, '0');
  }
  /** Conta domingos + feriados no intervalo (para DSR). */
  function diasRepouso(compet, feriados) {
    var n = diasNoMes(compet), rep = 0, uteis = 0;
    var fer = (feriados || []).map(function (f) { return String(f).slice(0, 10); });
    for (var i = 1; i <= n; i++) {
      var d = compet + '-' + String(i).padStart(2, '0');
      var dow = dt(d).getUTCDay();
      if (dow === 0 || fer.indexOf(d) >= 0) rep++; else uteis++;
    }
    return { repouso: rep, uteis: uteis, dias: n };
  }

  /* ==========================================================================
   * 1. PARÂMETROS LEGAIS — VERSIONADOS POR VIGÊNCIA
   * --------------------------------------------------------------------------
   * NUNCA gravar valor de tabela dentro da rotina de cálculo. Toda tabela é
   * lida por competência para que folhas retroativas (dissídio, rescisão de
   * mês fechado, recálculo) usem a tabela DAQUELA competência.
   * ======================================================================== */

  var TABELAS = [
    {
      vigencia: '2026-01',
      salarioMinimo: 1621.00,
      salarioMinimoHora: 1621.00 / 220,

      inss: {
        teto: 8475.55,
        // Faixas progressivas — 'ate' é o topo da faixa.
        faixas: [
          { ate: 1621.00, aliquota: 0.075, deduzir: 0.00 },
          { ate: 2902.84, aliquota: 0.090, deduzir: 24.32 },
          { ate: 4354.27, aliquota: 0.120, deduzir: 111.40 },
          { ate: 8475.55, aliquota: 0.140, deduzir: 198.49 }
        ],
        // Desconto máximo do empregado (teto x faixas, truncado por parcela)
        tetoDesconto: 988.07
      },

      irrf: {
        // Tabela progressiva mensal
        faixas: [
          { ate: 2428.80, aliquota: 0.000, deduzir: 0.00 },
          { ate: 2826.65, aliquota: 0.075, deduzir: 182.16 },
          { ate: 3751.05, aliquota: 0.150, deduzir: 394.16 },
          { ate: 4664.68, aliquota: 0.225, deduzir: 675.49 },
          { ate: Infinity, aliquota: 0.275, deduzir: 908.73 }
        ],
        dependente: 189.59,
        descontoSimplificado: 607.20,   // 25% do limite da faixa de isenção
        // Redutor da Lei 15.270/2025 (isenção até R$ 5.000 / redução até 7.350)
        redutor: {
          isencaoTotalAte: 5000.00,
          limiteSuperior: 7350.00,
          constante: 978.62,
          multiplicador: 0.133145
        }
      },

      salarioFamilia: { cota: 67.54, limiteRemuneracao: 1980.38 },

      fgts: { geral: 0.08, aprendiz: 0.02, multaSemJustaCausa: 0.40, multaAcordo: 0.20 },

      // Encargos patronais — parâmetros REAIS da LNB (FPAS/terceiros 5,8%)
      patronal: {
        inssPatronal: 0.20,
        rat: 0.01,
        fap: 1.0000,                    // extrato 07/2026: RAT recolhido = 1,00% exato
        terceiros: {
          total: 0.058,
          // Detalhamento (cada componente é truncado separadamente — é assim
          // que o extrato fecha em 5.283,56 em vez de 5.283,57)
          componentes: [
            { codigo: 'SAL_EDUCACAO', descricao: 'Salário-Educação', aliquota: 0.025 },
            { codigo: 'INCRA',        descricao: 'INCRA',            aliquota: 0.002 },
            { codigo: 'SENAC',        descricao: 'SENAC',            aliquota: 0.010 },
            { codigo: 'SESC',         descricao: 'SESC',             aliquota: 0.015 },
            { codigo: 'SEBRAE',       descricao: 'SEBRAE',           aliquota: 0.006 }
          ]
        },
        pisFolha: 0.01,                 // Lei 9.532/97 art. 13 — entidade sem fins lucrativos
        senaiAdicional: 0.00
      },

      // Adicionais legais
      adicionais: {
        horaExtra: { normal: 0.50, especial: 1.00 },
        noturno: { percentual: 0.20, horaReduzidaMin: 52.5, inicio: '22:00', fim: '05:00' },
        insalubridade: { minimo: 0.10, medio: 0.20, maximo: 0.40, base: 'SALARIO_MINIMO' },
        periculosidade: 0.30
      },

      // Descontos com trava legal
      travas: {
        valeTransportePercentual: 0.06,     // Lei 7.418/85 art. 9º §único
        margemConsignavelTotal: 0.35,       // Lei 10.820/03 (30% empréstimo + 5% cartão)
        margemConsignavelEmprestimo: 0.30,
        margemConsignavelCartao: 0.05,
        limiteDescontosFacultativos: 0.70   // art. 462 CLT — princípio da intangibilidade
      },

      // Parâmetros da CCT/empresa (conferidos no extrato 07/2026)
      convencao: {
        contribuicaoAssistencial: { percentual: 0.016, teto: 85.00, rubrica: '231' },
        estagiario: {
          pagaGratificacao13: true,        // rubrica 8470 — liberalidade da LNB
          recessoTerçoConstitucional: false // recesso do estagiário NÃO tem 1/3
        }
      }
    }
  ];

  /** Retorna a tabela vigente na competência informada ('YYYY-MM'). */
  function params(competencia) {
    var alvo = String(competencia || '').slice(0, 7);
    var achou = null;
    for (var i = 0; i < TABELAS.length; i++) {
      if (TABELAS[i].vigencia <= alvo) {
        if (!achou || TABELAS[i].vigencia > achou.vigencia) achou = TABELAS[i];
      }
    }
    if (!achou) achou = TABELAS[0];
    return achou;
  }

  /* ==========================================================================
   * 2. CONFIGURAÇÃO DO MOTOR (comportamentos ajustáveis)
   * ======================================================================== */

  var CFG = {
    /* Modo de arredondamento das parcelas intermediárias.
       'TRUNCA'   -> replica o sistema da contabilidade (GF) — PADRÃO
       'ARREDONDA'-> fórmula matemática pura (parcela a deduzir)          */
    arredondamento: 'TRUNCA',

    /* Divisor do salário-dia. 30 é o padrão CLT (art. 64), inclusive em
       fevereiro e meses de 31 dias.                                       */
    divisorDiasMes: 30,

    /* IRRF de férias apurado em separado do salário do mês (é como a folha
       07/2026 opera: "Base IRRF Mensal" e "Base IRRF Férias" são distintas).*/
    irrfFeriasSeparado: true,

    /* Férias VENCIDAS pagas na rescisão: a contabilidade tributou pelo IRRF
       (conferido no desligamento de 17/07/2026), embora a Súmula 386/STJ e o
       Parecer PGFN/CRJ 2.114/2011 apontem isenção. Mantido TRUE para bater
       com o extrato — PONTO DE REVISÃO JURÍDICA.                          */
    tributarFeriasVencidasIndenizadas: true,

    /* Pensão em % do líquido: recalcular o IRRF em loop até convergir?
       false = passe único (padrão de mercado, evita dependência circular). */
    iterarPensaoLiquido: false,

    /* Perda do DSR por atraso (não só por falta) — art. 6º Lei 605/49.     */
    atrasoPerdeDSR: true,

    /* Tolerância diária de marcação sem desconto (art. 58 §1º CLT).        */
    toleranciaMinutosDia: 10,

    /* Semana para efeito de DSR: 'DOM_SAB' (domingo a sábado).             */
    semanaDSR: 'DOM_SAB'
  };

  function arred(v) { return CFG.arredondamento === 'TRUNCA' ? t2(v) : r2(v); }

  /* ==========================================================================
   * 3. TIPOS DE VÍNCULO — MATRIZ DE INCIDÊNCIAS E RESTRIÇÕES
   * ======================================================================== */

  var VINCULOS = {
    CLT_MENSALISTA: {
      codigo: 'CLT_MENSALISTA',
      descricao: 'CLT — Mensalista (salário fixo mensal)',
      camposObrigatorios: ['nome', 'cpf', 'admissao', 'salarioBase', 'horasMes', 'cbo', 'departamento', 'centroCusto'],
      incide: { inss: true, fgts: true, irrf: true, salarioFamilia: true, decimoTerceiro: true, ferias: true },
      fgtsAliquota: 'geral',
      remuneracao: 'MENSAL',
      horasMesPadrao: 220,
      regras: [
        'Salário do mês é fixo; dias do mês não alteram o valor (art. 64 CLT: divisor 30).',
        'DSR já está embutido no salário mensal — só os variáveis (HE, noturno, comissão) geram reflexo de DSR.',
        'Faltas descontam salarioBase/30 por dia + o DSR da semana correspondente.'
      ]
    },

    CLT_PRAZO_DETERMINADO: {
      codigo: 'CLT_PRAZO_DETERMINADO',
      descricao: 'CLT — Contrato por prazo determinado / experiência',
      camposObrigatorios: ['nome', 'cpf', 'admissao', 'terminoPrevisto', 'salarioBase', 'horasMes', 'cbo'],
      incide: { inss: true, fgts: true, irrf: true, salarioFamilia: true, decimoTerceiro: true, ferias: true },
      fgtsAliquota: 'geral',
      remuneracao: 'MENSAL',
      horasMesPadrao: 220,
      regras: [
        'Sem aviso prévio no término normal (art. 479/480 CLT no término antecipado).',
        'Término antecipado pelo empregador: indenização de 1/2 dos salários do período restante.',
        'Término normal do prazo: SEM multa de 40% do FGTS; saque liberado (código SD 04).'
      ]
    },

    CLT_HORISTA: {
      codigo: 'CLT_HORISTA',
      descricao: 'CLT — Horista (jornada variável)',
      camposObrigatorios: ['nome', 'cpf', 'admissao', 'salarioHora', 'jornadaSemanal', 'cbo'],
      incide: { inss: true, fgts: true, irrf: true, salarioFamilia: true, decimoTerceiro: true, ferias: true },
      fgtsAliquota: 'geral',
      remuneracao: 'HORARIA',
      regras: [
        'Salário do mês = horas efetivamente trabalhadas x salarioHora.',
        'O DSR NÃO está embutido: precisa ser calculado e pago como rubrica própria.',
        'DSR = (remuneração das horas do mês / dias úteis) x (domingos + feriados).',
        'Piso: o total do mês não pode ser inferior ao salário mínimo/hora x horas contratuais.'
      ]
    },

    ESTAGIARIO: {
      codigo: 'ESTAGIARIO',
      descricao: 'Estagiário — Lei 11.788/2008',
      camposObrigatorios: ['nome', 'cpf', 'admissao', 'terminoPrevisto', 'bolsaAuxilio',
        'instituicaoEnsino', 'cursoNivel', 'supervisor', 'apoliceSeguro', 'horasMes'],
      incide: { inss: false, fgts: false, irrf: true, salarioFamilia: false, decimoTerceiro: false, ferias: false },
      fgtsAliquota: null,
      remuneracao: 'BOLSA',
      restricoes: [
        'Jornada máxima: 6h/dia e 30h/semana (4h/dia e 20h/sem para ensino especial/fund. EJA).',
        'Contrato máximo de 2 anos na mesma parte concedente (salvo PcD).',
        'Limite de estagiários por quadro (art. 17): 1-5 func => 1 | 6-10 => 2 | 11-25 => 5 | >25 => 20%.',
        'Obrigatórios: Termo de Compromisso, Plano de Atividades, seguro de acidentes pessoais.'
      ],
      regras: [
        'NÃO gera vínculo empregatício: ISENTO de INSS (empregado E patronal), FGTS, PIS-folha, RAT e terceiros.',
        'A bolsa-auxílio É rendimento tributável pelo IRRF (tabela progressiva normal, com direito ao desconto simplificado e ao redutor da Lei 15.270/2025).',
        'Auxílio-transporte é OBRIGATÓRIO (art. 12) e NÃO admite desconto de 6% — é custo integral da concedente.',
        'Recesso remunerado: 30 dias a cada 12 meses (proporcional se < 12 meses), SEM o terço constitucional.',
        '13º salário NÃO é devido por lei. A LNB paga como liberalidade (rubrica 8470 — BOLSA GRATIFICACAO 13º).',
        'Recesso indenizado no desligamento é ISENTO de IRRF (conferido: rubricas 8489/8490 fora da base).'
      ]
    },

    MENOR_APRENDIZ: {
      codigo: 'MENOR_APRENDIZ',
      descricao: 'Menor Aprendiz — Lei 10.097/2000 / Decreto 9.579/2018',
      camposObrigatorios: ['nome', 'cpf', 'dataNascimento', 'admissao', 'terminoPrevisto',
        'salarioBase', 'entidadeFormadora', 'cursoAprendizagem', 'horasMes'],
      incide: { inss: true, fgts: true, irrf: true, salarioFamilia: true, decimoTerceiro: true, ferias: true },
      fgtsAliquota: 'aprendiz',        // 2,0% em vez de 8,0%
      remuneracao: 'MENSAL',
      restricoes: [
        'Idade entre 14 e 24 anos (sem limite superior para PcD).',
        'Contrato máximo de 2 anos (sem limite para PcD).',
        'Jornada de 6h/dia (8h se ensino fundamental concluído e incluída a formação teórica).',
        'Proibido trabalho noturno, insalubre, perigoso e hora extra (art. 432 CLT).',
        'Férias coincidentes com as férias escolares (art. 136 §2º CLT).'
      ],
      regras: [
        'Salário-hora mínimo garantido (salário mínimo/hora x horas contratadas).',
        'FGTS reduzido a 2,0% (art. 15 §7º Lei 8.036/90).',
        'INSS, IRRF e encargos patronais NORMAIS (20% + RAT x FAP + terceiros).',
        'Multa rescisória de 40% NÃO se aplica no término normal do prazo.'
      ]
    }
  };

  /* ==========================================================================
   * 4. CATÁLOGO DE RUBRICAS
   * Códigos alinhados ao extrato da contabilidade para permitir conciliação
   * automática na aba /rh/ > Conciliação.
   * tipo: P = provento | D = desconto | I = informativa | B = base
   * ======================================================================== */

  var RUBRICAS = {
    /* ---- Proventos ------------------------------------------------------ */
    '8781': { cod: '8781', desc: 'DIAS NORMAIS',                    tipo: 'P', inss: true,  fgts: true,  irrf: true },
    '8797': { cod: '8797', desc: 'DIAS BOLSA AUXILIO',              tipo: 'P', inss: false, fgts: false, irrf: true },
    '9180': { cod: '9180', desc: 'SALDO DE SALARIO DIAS',           tipo: 'P', inss: true,  fgts: true,  irrf: true },
    '8783': { cod: '8783', desc: 'DIAS FERIAS',                     tipo: 'P', inss: true,  fgts: true,  irrf: true,  baseIRRF: 'FERIAS' },
    '931':  { cod: '931',  desc: '1/3 DAS FERIAS',                  tipo: 'P', inss: true,  fgts: true,  irrf: true,  baseIRRF: 'FERIAS' },
    '8800': { cod: '8800', desc: 'DIAS ABONO PECUNIARIO (FERIAS)',  tipo: 'P', inss: false, fgts: false, irrf: false },
    '932':  { cod: '932',  desc: '1/3 DO ABONO FERIAS',             tipo: 'P', inss: false, fgts: false, irrf: false },
    '28':   { cod: '28',   desc: 'FERIAS VENCIDAS',                 tipo: 'P', inss: false, fgts: false, irrf: 'CFG_FERIAS_VENCIDAS' },
    '29':   { cod: '29',   desc: 'FERIAS PROPORCIONAIS',            tipo: 'P', inss: false, fgts: false, irrf: false },
    '64':   { cod: '64',   desc: '1/3 FERIAS RESCISAO',             tipo: 'P', inss: false, fgts: false, irrf: false },
    '8169': { cod: '8169', desc: '1/3 FERIAS PROPORCIONAIS RESCI',  tipo: 'P', inss: false, fgts: false, irrf: false },
    '8550': { cod: '8550', desc: '13 SALARIO INTEGRAL RESCISAO',    tipo: 'P', inss: true,  fgts: true,  irrf: true,  baseIRRF: 'DECIMO' },
    '8470': { cod: '8470', desc: 'BOLSA GRATIFICACAO 13º',          tipo: 'P', inss: false, fgts: false, irrf: true },
    '8489': { cod: '8489', desc: 'BOLSA AUXILIO FERIAS VENCIDAS',   tipo: 'P', inss: false, fgts: false, irrf: false },
    '8490': { cod: '8490', desc: 'BOLSA AUXILIO FERIAS PROPORC',    tipo: 'P', inss: false, fgts: false, irrf: false },
    '955':  { cod: '955',  desc: 'ADICIONAL DE DUPLA FUNCAO',       tipo: 'P', inss: true,  fgts: true,  irrf: true },
    '100':  { cod: '100',  desc: 'HORAS EXTRAS 50%',                tipo: 'P', inss: true,  fgts: true,  irrf: true },
    '101':  { cod: '101',  desc: 'HORAS EXTRAS 100%',               tipo: 'P', inss: true,  fgts: true,  irrf: true },
    '102':  { cod: '102',  desc: 'DSR SOBRE VARIAVEIS',             tipo: 'P', inss: true,  fgts: true,  irrf: true },
    '110':  { cod: '110',  desc: 'ADICIONAL NOTURNO',               tipo: 'P', inss: true,  fgts: true,  irrf: true },
    '120':  { cod: '120',  desc: 'ADICIONAL DE INSALUBRIDADE',      tipo: 'P', inss: true,  fgts: true,  irrf: true },
    '130':  { cod: '130',  desc: 'ADICIONAL DE PERICULOSIDADE',     tipo: 'P', inss: true,  fgts: true,  irrf: true },
    '140':  { cod: '140',  desc: 'SALARIO FAMILIA',                 tipo: 'P', inss: false, fgts: false, irrf: false },
    '150':  { cod: '150',  desc: 'AVISO PREVIO INDENIZADO',         tipo: 'P', inss: false, fgts: true,  irrf: false },
    '151':  { cod: '151',  desc: '13 SALARIO S/ AVISO INDENIZADO',  tipo: 'P', inss: true,  fgts: true,  irrf: true,  baseIRRF: 'DECIMO' },
    '160':  { cod: '160',  desc: 'DIFERENCA SALARIAL DISSIDIO',     tipo: 'P', inss: true,  fgts: true,  irrf: true },
    '170':  { cod: '170',  desc: '13 SALARIO 1a PARCELA',           tipo: 'P', inss: false, fgts: true,  irrf: false, baseIRRF: 'DECIMO' },
    '171':  { cod: '171',  desc: '13 SALARIO 2a PARCELA',           tipo: 'P', inss: true,  fgts: true,  irrf: true,  baseIRRF: 'DECIMO' },

    /* ---- Descontos ------------------------------------------------------ */
    '998':  { cod: '998',  desc: 'I.N.S.S.',                        tipo: 'D' },
    '812':  { cod: '812',  desc: 'INSS FERIAS',                     tipo: 'D' },
    '821':  { cod: '821',  desc: 'INSS DIFERENCA FERIAS',           tipo: 'D' },
    '826':  { cod: '826',  desc: 'INSS SOBRE RESCISAO',             tipo: 'D' },
    '989':  { cod: '989',  desc: 'INSS 13 SAL.RESCISAO',            tipo: 'D' },
    '999':  { cod: '999',  desc: 'IMPOSTO DE RENDA',                tipo: 'D' },
    '828':  { cod: '828',  desc: 'IRRF SOBRE RESCISAO',             tipo: 'D' },
    '56':   { cod: '56',   desc: 'VALE TRANSPORTE %',               tipo: 'D' },
    '231':  { cod: '231',  desc: 'CONTRIBUICAO ASSISTENCIAL - %',   tipo: 'D' },
    '8111': { cod: '8111', desc: 'DESCONTO PLANO DE SAUDE',         tipo: 'D' },
    '8112': { cod: '8112', desc: 'DESCONTO PLANO ODONTOLOGICO',     tipo: 'D' },
    '8113': { cod: '8113', desc: 'DESCONTO SEGURO DE VIDA',         tipo: 'D' },
    '8114': { cod: '8114', desc: 'COPARTICIPACAO PLANO DE SAUDE',   tipo: 'D' },
    '200':  { cod: '200',  desc: 'FALTAS',                          tipo: 'D' },
    '201':  { cod: '201',  desc: 'DSR SOBRE FALTAS',                tipo: 'D' },
    '202':  { cod: '202',  desc: 'ATRASOS',                         tipo: 'D' },
    '210':  { cod: '210',  desc: 'PENSAO ALIMENTICIA',              tipo: 'D' },
    '211':  { cod: '211',  desc: 'PENSAO ALIMENTICIA S/ 13º',       tipo: 'D' },
    '220':  { cod: '220',  desc: 'EMPRESTIMO CONSIGNADO',           tipo: 'D' },
    '221':  { cod: '221',  desc: 'CARTAO CONSIGNADO',               tipo: 'D' },
    '230':  { cod: '230',  desc: 'ADIANTAMENTO SALARIAL',           tipo: 'D' },
    '937':  { cod: '937',  desc: 'ADIANTAMENTO DE FERIAS',          tipo: 'D' },
    '240':  { cod: '240',  desc: 'AVISO PREVIO NAO CUMPRIDO',       tipo: 'D' },
    '51':   { cod: '51',   desc: 'LIQUIDO RESCISAO',                tipo: 'D' },
    '8517': { cod: '8517', desc: 'LIQUIDO RESCISAO ESTAGIARIO',     tipo: 'D' },

    /* ---- Informativas / bases ------------------------------------------ */
    'FGTS': { cod: 'FGTS', desc: 'F.G.T.S. DO MES',                 tipo: 'I' }
  };

  /* Exporta o núcleo — as demais partes do arquivo penduram aqui. */
  var LNB = {
    VERSION: '1.0.0',
    CFG: CFG,
    TABELAS: TABELAS,
    VINCULOS: VINCULOS,
    RUBRICAS: RUBRICAS,
    params: params,
    util: {
      r2: r2, t2: t2, rN: rN, arred: arred, soma: soma, nz: nz, clamp: clamp, brl: brl,
      dt: dt, iso: iso, diasEntre: diasEntre, addDias: addDias, diasNoMes: diasNoMes,
      primeiroDia: primeiroDia, ultimoDia: ultimoDia, compDe: compDe, addMeses: addMeses,
      diasRepouso: diasRepouso
    }
  };

  global.LNBPayroll = LNB;
  /* Uso como módulo (Node/bundler) — no navegador basta o global acima. */
  if (typeof module !== 'undefined' && module.exports) module.exports = LNB;

})(typeof globalThis !== 'undefined' ? globalThis : this);
/* =============================================================================
 * BLOCO 2 — MOTOR DE PROVENTOS E ADICIONAIS
 * ========================================================================== */

;(function (LNB) {
  'use strict';
  var U = LNB.util, r2 = U.r2, t2 = U.t2, rN = U.rN, nz = U.nz;
  /* VERBAS (proventos) são ARREDONDADAS meio-para-cima. Só as contribuições
     (INSS, FGTS, encargos patronais) usam truncamento — ver 00-nucleo.js. */
  var arred = r2;

  var P = {};

  /* --------------------------------------------------------------------------
   * 2.1 SALÁRIO BASE E SALÁRIO-HORA
   * Entradas: vinculo, salarioBase | salarioHora, horasMes, jornadaSemanal
   * ------------------------------------------------------------------------ */

  /**
   * horasMes derivado da jornada semanal quando não informado.
   * Fórmula legal: horasMes = jornadaSemanal / 6 * 30  (inclui o DSR)
   *   44h/sem -> 220h | 40h/sem -> 200h | 30h/sem -> 150h | 20h/sem -> 100h
   */
  P.horasMes = function (colab) {
    if (nz(colab.horasMes) > 0) return nz(colab.horasMes);
    if (nz(colab.jornadaSemanal) > 0) return rN(nz(colab.jornadaSemanal) / 6 * 30, 2);
    return LNB.VINCULOS[colab.vinculo] && LNB.VINCULOS[colab.vinculo].horasMesPadrao || 220;
  };

  /** Salário-hora. Mensalista: salário / horasMes. Horista: valor contratado. */
  P.salarioHora = function (colab) {
    if (colab.vinculo === 'CLT_HORISTA') return nz(colab.salarioHora);
    var hm = P.horasMes(colab);
    return hm > 0 ? nz(colab.salarioBase) / hm : 0;   // NÃO arredondar aqui (precisão)
  };

  /** Salário-dia — divisor 30 SEMPRE (art. 64 CLT), independente do mês. */
  P.salarioDia = function (colab) {
    return nz(colab.salarioBase) / LNB.CFG.divisorDiasMes;
  };

  /**
   * Remuneração base do mês.
   *  - Mensalista: salário integral (ou proporcional em admissão/rescisão).
   *  - Horista: horas trabalhadas x salário-hora (+ DSR calculado à parte).
   *  - Estagiário: bolsa proporcional aos dias.
   */
  P.remuneracaoBase = function (colab, evt, ctx) {
    var vinc = colab.vinculo;
    var dias = nz(evt.diasTrabalhados);
    var divisor = LNB.CFG.divisorDiasMes;

    if (vinc === 'CLT_HORISTA') {
      var horas = nz(evt.horasTrabalhadas);
      var valor = arred(horas * P.salarioHora(colab));
      return { rubrica: '8781', descricao: 'HORAS NORMAIS', referencia: rN(horas, 2), valor: valor };
    }

    if (vinc === 'ESTAGIARIO') {
      var bolsa = nz(colab.bolsaAuxilio || colab.salarioBase);
      var vB = (dias >= divisor || !dias) ? arred(bolsa) : arred(bolsa / divisor * dias);
      return { rubrica: '8797', descricao: 'DIAS BOLSA AUXILIO', referencia: dias || divisor, valor: vB };
    }

    var sal = nz(colab.salarioBase);
    var v = (dias >= divisor || !dias) ? arred(sal) : arred(sal / divisor * dias);
    return { rubrica: '8781', descricao: 'DIAS NORMAIS', referencia: dias || divisor, valor: v };
  };

  /* --------------------------------------------------------------------------
   * 2.2 HORAS EXTRAS
   * Fórmula: HE = qtdHoras x salarioHora x (1 + percentual)
   * A base da HE inclui os adicionais de caráter salarial já incorporados
   * (Súmula 264 TST): periculosidade, insalubridade, dupla função, gratificações.
   * ------------------------------------------------------------------------ */

  /** Base horária para hora extra = (salário + adicionais fixos) / horasMes. */
  P.baseHoraExtra = function (colab, adicionaisFixos) {
    var hm = P.horasMes(colab);
    var base = nz(colab.salarioBase) + nz(adicionaisFixos);
    return hm > 0 ? base / hm : 0;
  };

  /**
   * @param {Array} lista [{quantidade, percentual, noturna}]
   *   percentual em decimal (0.50, 1.00) ou inteiro (50, 100) — normalizado.
   */
  P.horasExtras = function (colab, lista, adicionaisFixos, prm) {
    var baseH = P.baseHoraExtra(colab, adicionaisFixos);
    var itens = [], total = 0;

    (lista || []).forEach(function (he) {
      var pc = nz(he.percentual);
      if (pc > 3) pc = pc / 100;                       // aceita 50 ou 0.50
      var qtd = nz(he.quantidade);
      if (qtd <= 0) return;
      var vhora = baseH * (1 + pc);
      // Hora extra noturna: incide o adicional noturno sobre a HE (Súm. 60 TST)
      if (he.noturna) vhora = vhora * (1 + prm.adicionais.noturno.percentual);
      var valor = arred(qtd * vhora);
      total += valor;
      itens.push({
        rubrica: pc >= 1 ? '101' : '100',
        descricao: 'HORAS EXTRAS ' + rN(pc * 100, 0) + '%' + (he.noturna ? ' NOTURNAS' : ''),
        referencia: rN(qtd, 2),
        valor: valor,
        percentual: pc
      });
    });

    return { itens: itens, total: r2(total) };
  };

  /* --------------------------------------------------------------------------
   * 2.3 ADICIONAL NOTURNO
   * Hora noturna reduzida = 52min30s => fator 60/52,5 = 1,142857...
   * Passos:
   *   1. horasRelogio  = horas efetivamente marcadas entre 22h e 05h
   *   2. horasFicticias = horasRelogio x (60 / 52,5)
   *   3. adicional     = horasFicticias x salarioHora x percentual (20% ou CCT)
   *   4. a HORA CHEIA das horas fictícias excedentes também é devida ao horista
   * Súmula 60 II TST: prorrogação após as 5h mantém o adicional.
   * ------------------------------------------------------------------------ */

  P.adicionalNoturno = function (colab, horasRelogio, prm, opts) {
    opts = opts || {};
    var cfg = prm.adicionais.noturno;
    var pct = nz(opts.percentualCCT) > 0 ? nz(opts.percentualCCT) : cfg.percentual;
    if (pct > 1) pct = pct / 100;

    var fator = 60 / cfg.horaReduzidaMin;            // 1,1428571...
    var horasFic = horasRelogio * fator;
    var sh = P.salarioHora(colab);

    var adicional = arred(horasFic * sh * pct);
    // Para HORISTA, a hora fictícia excedente também é hora NORMAL a pagar.
    var horaFicticiaExtra = 0;
    if (colab.vinculo === 'CLT_HORISTA') {
      horaFicticiaExtra = arred((horasFic - horasRelogio) * sh);
    }

    return {
      horasRelogio: rN(horasRelogio, 2),
      horasFicticias: rN(horasFic, 2),
      fatorReducao: rN(fator, 7),
      percentual: pct,
      itens: [
        { rubrica: '110', descricao: 'ADICIONAL NOTURNO', referencia: rN(horasFic, 2), valor: adicional }
      ].concat(horaFicticiaExtra > 0
        ? [{ rubrica: '111', descricao: 'HORA NOTURNA REDUZIDA', referencia: rN(horasFic - horasRelogio, 2), valor: horaFicticiaExtra }]
        : []),
      total: r2(adicional + horaFicticiaExtra)
    };
  };

  /* --------------------------------------------------------------------------
   * 2.4 INSALUBRIDADE (art. 192 CLT)
   * Base: salário mínimo (Súmula Vinculante 4 do STF até norma coletiva dispor
   * diferente). Se a CCT fixa o salário base ou o piso da categoria, trocar
   * colab.insalubridade.base para 'SALARIO_BASE' ou 'PISO_CATEGORIA'.
   * NÃO acumula com periculosidade (art. 193 §2º) — opta-se pelo maior.
   * ------------------------------------------------------------------------ */

  P.insalubridade = function (colab, prm) {
    var ins = colab.insalubridade;
    if (!ins || !nz(ins.grau)) return { valor: 0, itens: [] };

    var grau = nz(ins.grau);                          // 10, 20 ou 40
    if (grau > 1) grau = grau / 100;

    var base;
    switch (ins.base || prm.adicionais.insalubridade.base) {
      case 'SALARIO_BASE':    base = nz(colab.salarioBase); break;
      case 'PISO_CATEGORIA':  base = nz(colab.pisoCategoria || colab.salarioBase); break;
      default:                base = prm.salarioMinimo;
    }
    var valor = arred(base * grau);
    return {
      valor: valor, base: base, grau: grau,
      itens: [{ rubrica: '120', descricao: 'ADICIONAL DE INSALUBRIDADE ' + rN(grau * 100, 0) + '%', referencia: rN(grau * 100, 2), valor: valor }]
    };
  };

  /* --------------------------------------------------------------------------
   * 2.5 PERICULOSIDADE (art. 193 §1º CLT)
   * 30% sobre o SALÁRIO BASE, sem os adicionais (Súmula 191 TST).
   * ------------------------------------------------------------------------ */

  P.periculosidade = function (colab, prm) {
    if (!colab.periculosidade) return { valor: 0, itens: [] };
    var pct = nz(colab.periculosidadePercentual) > 0
      ? (nz(colab.periculosidadePercentual) > 1 ? nz(colab.periculosidadePercentual) / 100 : nz(colab.periculosidadePercentual))
      : prm.adicionais.periculosidade;
    var valor = arred(nz(colab.salarioBase) * pct);
    return {
      valor: valor, percentual: pct,
      itens: [{ rubrica: '130', descricao: 'ADICIONAL DE PERICULOSIDADE', referencia: rN(pct * 100, 2), valor: valor }]
    };
  };

  /** Regra de não-cumulação: mantém o mais vantajoso e zera o outro. */
  P.resolverInsalPericul = function (ins, per) {
    if (ins.valor > 0 && per.valor > 0) {
      if (per.valor >= ins.valor) return { escolhido: 'PERICULOSIDADE', itens: per.itens, valor: per.valor, descartado: ins };
      return { escolhido: 'INSALUBRIDADE', itens: ins.itens, valor: ins.valor, descartado: per };
    }
    if (per.valor > 0) return { escolhido: 'PERICULOSIDADE', itens: per.itens, valor: per.valor };
    if (ins.valor > 0) return { escolhido: 'INSALUBRIDADE', itens: ins.itens, valor: ins.valor };
    return { escolhido: null, itens: [], valor: 0 };
  };

  /* --------------------------------------------------------------------------
   * 2.6 ADICIONAL DE DUPLA FUNÇÃO / ACÚMULO DE FUNÇÃO
   * Percentual acordado (CCT/aditivo) sobre o salário BASE.
   * Conferido no extrato 07/2026: 6.789,00 x 20% = 1.357,80 (rubrica 955).
   * Natureza SALARIAL: integra INSS, FGTS, IRRF, DSR, férias, 13º e rescisão.
   * ------------------------------------------------------------------------ */

  P.duplaFuncao = function (colab, evt) {
    var df = colab.duplaFuncao || (evt && evt.duplaFuncao);
    if (!df) return { valor: 0, itens: [] };
    var pct = nz(df.percentual);
    if (pct > 1) pct = pct / 100;
    var base = df.base === 'SALARIO_MINIMO' ? null : nz(colab.salarioBase);
    var valor = arred((base !== null ? base : 0) * pct);
    // proporcionalidade por dias, se o acúmulo durou parte do mês
    if (nz(df.dias) > 0 && nz(df.dias) < LNB.CFG.divisorDiasMes) {
      valor = arred(valor / LNB.CFG.divisorDiasMes * nz(df.dias));
    }
    return {
      valor: valor, percentual: pct,
      itens: [{ rubrica: '955', descricao: 'ADICIONAL DE DUPLA FUNCAO ' + rN(pct * 100, 0) + '%',
                referencia: rN(pct * 100, 2), valor: valor }]
    };
  };

  /* --------------------------------------------------------------------------
   * 2.7 DSR SOBRE VARIÁVEIS (Lei 605/49 art. 7º §único + Súmula 172 TST)
   *
   * MENSALISTA: o DSR do salário fixo já está pago dentro do salário. Só os
   * valores VARIÁVEIS do mês (HE, adicional noturno, comissões, prêmios com
   * habitualidade) geram reflexo:
   *      DSR = (soma dos variáveis / dias úteis) x (domingos + feriados)
   *
   * HORISTA: além do reflexo dos variáveis, o DSR das horas NORMAIS também é
   * devido, pela mesma fórmula, porque não está embutido no salário.
   * ------------------------------------------------------------------------ */

  P.dsrSobreVariaveis = function (colab, valorVariaveis, competencia, feriados) {
    if (valorVariaveis <= 0) return { valor: 0, itens: [] };
    var cal = U.diasRepouso(competencia, feriados);
    if (cal.uteis <= 0) return { valor: 0, itens: [] };
    var valor = arred(valorVariaveis / cal.uteis * cal.repouso);
    return {
      valor: valor, diasUteis: cal.uteis, diasRepouso: cal.repouso,
      itens: [{ rubrica: '102', descricao: 'DSR SOBRE VARIAVEIS',
                referencia: cal.repouso, valor: valor }]
    };
  };

  /* --------------------------------------------------------------------------
   * 2.8 SALÁRIO-FAMÍLIA (Lei 8.213/91 art. 65)
   * Cota por filho < 14 anos (ou inválido de qualquer idade), devida apenas se
   * a remuneração do mês <= limite. Pago pela empresa e COMPENSADO na GPS.
   * Estagiário NÃO tem direito.
   * ------------------------------------------------------------------------ */

  P.salarioFamilia = function (colab, remuneracaoMes, prm) {
    var v = LNB.VINCULOS[colab.vinculo];
    if (!v || !v.incide.salarioFamilia) return { valor: 0, itens: [] };
    var filhos = nz(colab.filhosSalarioFamilia);
    if (filhos <= 0) return { valor: 0, itens: [] };
    if (remuneracaoMes > prm.salarioFamilia.limiteRemuneracao) {
      return { valor: 0, itens: [], motivo: 'REMUNERACAO_ACIMA_DO_LIMITE' };
    }
    var valor = arred(filhos * prm.salarioFamilia.cota);
    return {
      valor: valor, filhos: filhos,
      itens: [{ rubrica: '140', descricao: 'SALARIO FAMILIA', referencia: filhos, valor: valor }],
      compensavelNaGPS: valor
    };
  };

  /* --------------------------------------------------------------------------
   * 2.9 FÉRIAS GOZADAS NO MÊS
   * remuneraçãoFérias = (salário + médias de variáveis) / 30 x diasFérias
   * terço             = remuneraçãoFérias / 3
   * abono pecuniário  = (salário/30 x diasAbono) — máx. 10 dias (1/3 do período)
   * terço do abono    = abono / 3
   * Incidências: férias gozadas + 1/3 => INSS SIM, FGTS SIM, IRRF SIM.
   *              abono pecuniário + 1/3 => tudo NÃO (art. 28 §9 Lei 8.212 e
   *              art. 6º IN RFB 1.500).
   * ------------------------------------------------------------------------ */

  P.ferias = function (colab, fer, prm) {
    if (!fer || !nz(fer.dias)) return { itens: [], baseINSS: 0, baseFGTS: 0, baseIRRF: 0, total: 0 };
    var div = LNB.CFG.divisorDiasMes;
    var mediaVar = nz(fer.mediaVariaveis);
    var remMensal = nz(colab.salarioBase) + mediaVar;

    /* PERÍODO QUE ATRAVESSA DUAS COMPETÊNCIAS
       Ex.: férias de 29/06 a 13/07 — 2 dias caem em junho e 13 em julho.
       A contabilidade calcula o período INTEIRO e desconta a parte já paga.
       Conferido em 07/2026 (Pedro Henrique):
         15 dias -> 1.790,50 | 1/3 = 596,83
          2 dias ->   238,73 | 1/3 =  79,58
         julho   -> 1.551,77 | 1/3 = 517,25  <- bate com o extrato
       Calcular direto sobre 13 dias daria 1/3 = 517,26 (1 centavo a mais). */
    var diasAnt = nz(fer.diasCompetenciaAnterior);
    var vFerias, vTerco;
    if (diasAnt > 0) {
      var diasTotais = nz(fer.dias) + diasAnt;
      var vTot = arred(remMensal / div * diasTotais);
      var tTot = arred(vTot / 3);
      var vAnt = arred(remMensal / div * diasAnt);
      var tAnt = arred(vAnt / 3);
      vFerias = r2(vTot - vAnt);
      vTerco  = r2(tTot - tAnt);
    } else {
      vFerias = arred(remMensal / div * nz(fer.dias));
      vTerco  = arred(vFerias / 3);
    }

    var diasAbono = nz(fer.abonoPecuniarioDias);
    var vAbono = diasAbono > 0 ? arred(remMensal / div * diasAbono) : 0;
    var vTercoAbono = vAbono > 0 ? arred(vAbono / 3) : 0;

    var itens = [
      { rubrica: '8783', descricao: 'DIAS FERIAS', referencia: nz(fer.dias), valor: vFerias },
      { rubrica: '931',  descricao: '1/3 DAS FERIAS', referencia: 33.33, valor: vTerco }
    ];
    if (vAbono > 0) {
      itens.push({ rubrica: '8800', descricao: 'DIAS ABONO PECUNIARIO (FERIAS)', referencia: diasAbono, valor: vAbono });
      itens.push({ rubrica: '932',  descricao: '1/3 DO ABONO FERIAS', referencia: diasAbono, valor: vTercoAbono });
    }

    return {
      itens: itens,
      diasFerias: nz(fer.dias),
      baseINSS: r2(vFerias + vTerco),      // abono fora
      baseFGTS: r2(vFerias + vTerco),      // abono fora
      baseIRRF: r2(vFerias + vTerco),      // abono fora (isento)
      total: r2(vFerias + vTerco + vAbono + vTercoAbono)
    };
  };

  LNB.proventos = P;

})(globalThis.LNBPayroll);
/* =============================================================================
 * BLOCO 3 — IMPOSTOS RETIDOS E DESCONTOS
 * ========================================================================== */

;(function (LNB) {
  'use strict';
  var U = LNB.util, r2 = U.r2, t2 = U.t2, rN = U.rN, nz = U.nz;
  /* truncaINSS = truncamento por faixa (replica o sistema da contabilidade).
     Os demais descontos (VT, assistencial, faltas, benefícios) ARREDONDAM. */
  var truncaINSS = U.arred, arred = r2;

  var R = {};

  /* ==========================================================================
   * 3.1 INSS EMPREGADO — TABELA PROGRESSIVA (Lei 8.212/91 art. 20 c/ EC 103)
   * --------------------------------------------------------------------------
   * ALGORITMO (fatiamento por faixa — NUNCA aplicar alíquota única):
   *   1. base = min(baseDeCalculo, TETO)
   *   2. anterior = 0 ; total = 0
   *   3. para cada faixa F (em ordem crescente):
   *         se base <= anterior -> pare
   *         limite  = min(base, F.ate)
   *         parcela = TRUNCA2( (limite - anterior) * F.aliquota )
   *         total  += parcela
   *         anterior = F.ate
   *   4. desconto = total (nunca maior que tetoDesconto)
   *   5. aliquotaEfetiva = desconto / base  (só informativa, é o que aparece
   *      na coluna de referência do holerite: 10,80 / 11,29 / 7,10 ...)
   *
   * ATENÇÃO 1 — O truncamento por parcela é o que faz o motor bater com a
   * contabilidade. Com arredondamento o desconto sai 1 a 2 centavos maior.
   * ATENÇÃO 2 — O teto se aplica por VÍNCULO agregado: se o colaborador tem
   * mais de um emprego, ele declara e a soma das bases é limitada ao teto.
   * ATENÇÃO 3 — 13º salário tem BASE PRÓPRIA e teto próprio (não soma com o
   * salário do mês). Férias pagas em separado geram a "diferença de INSS".
   * ======================================================================== */

  R.inss = function (base, prm, opts) {
    opts = opts || {};
    var tabela = prm.inss;
    var b = r2(nz(base));
    if (b <= 0) return { base: 0, valor: 0, aliquotaEfetiva: 0, faixas: [], teto: false };

    var tetoAplicado = false;
    // Desconta a base já tributada em outro vínculo/pagamento do mesmo tipo
    var jaTributado = nz(opts.baseJaTributada);
    var bTotal = r2(b + jaTributado);
    if (bTotal > tabela.teto) { bTotal = tabela.teto; tetoAplicado = true; }

    var anterior = 0, total = 0, faixas = [];
    for (var i = 0; i < tabela.faixas.length; i++) {
      var F = tabela.faixas[i];
      if (bTotal <= anterior) break;
      var limite = Math.min(bTotal, F.ate);
      var parcela = truncaINSS((limite - anterior) * F.aliquota);
      total = r2(total + parcela);
      faixas.push({
        de: anterior, ate: limite, aliquota: F.aliquota,
        baseFaixa: r2(limite - anterior), parcela: parcela
      });
      anterior = F.ate;
    }

    // Se parte da base já foi tributada (ex.: INSS de férias já retido),
    // devolve apenas a DIFERENÇA a reter agora.
    var valorTotal = r2(Math.min(total, tabela.tetoDesconto));
    var valor = valorTotal;
    if (jaTributado > 0) valor = r2(valorTotal - nz(opts.valorJaRetido));
    if (valor < 0) valor = 0;

    return {
      base: r2(b),
      baseTotalConsiderada: bTotal,
      valor: valor,
      valorTotalSobreBaseCheia: valorTotal,
      aliquotaEfetiva: bTotal > 0 ? rN(valorTotal / bTotal * 100, 2) : 0,
      faixas: faixas,
      teto: tetoAplicado,
      excedente: r2(Math.max(0, r2(b + jaTributado) - tabela.teto))
    };
  };

  /**
   * Fluxo completo de INSS quando há FÉRIAS pagas no mesmo mês.
   * A contabilidade (e o eSocial) exige três rubricas:
   *   812 INSS FERIAS          -> INSS calculado SÓ sobre a base de férias
   *   998 INSS                 -> INSS calculado SÓ sobre a base mensal
   *   821 INSS DIFERENCA FERIAS-> INSS(base mensal + base férias) - 812 - 998
   * Conferido em 07/2026:
   *   Geiseane: 118,16 + 188,37 + 54,72 = 361,25 = INSS(3.938,89)  ✔
   *   Pedro   : 165,13 +  56,93 + 158,31 = 380,37 = INSS(4.098,25) ✔
   */
  R.inssComFerias = function (baseMensal, baseFerias, prm, opts) {
    opts = opts || {};
    var itens = [];
    /* Múltiplos vínculos: o teto é do SEGURADO, não do contrato. Se o
       colaborador já teve base tributada em outro empregador (declaração do
       art. 64 da IN 128/2022), informe opts.baseJaTributada/valorJaRetido.
       Conferido 07/2026 — Mario Fernandes: Base INSS 0,00 / Excedente 4.658,00
       (teto já atingido no outro vínculo) => nenhum desconto nesta folha. */
    var iFer = baseFerias > 0 ? R.inss(baseFerias, prm, opts) : { valor: 0 };
    var iMen = baseMensal > 0 ? R.inss(baseMensal, prm, opts) : { valor: 0 };
    var iTot = R.inss(r2(baseMensal + baseFerias), prm, opts);
    /* Quando as férias começaram na competência anterior, parte do INSS de
       férias já foi retida lá. Informe opts.inssFeriasInformado com o valor da
       rubrica 812 do recibo de férias para conciliar rubrica a rubrica — o
       TOTAL não muda, só a divisão entre 812 / 998 / 821. */
    if (nz(opts.inssFeriasInformado) > 0) iFer = { valor: r2(opts.inssFeriasInformado), aliquotaEfetiva: 0 };
    var diferenca = r2(iTot.valor - iFer.valor - iMen.valor);
    if (diferenca < 0) diferenca = 0;

    if (iFer.valor > 0) itens.push({ rubrica: '812', descricao: 'INSS FERIAS', referencia: iFer.aliquotaEfetiva, valor: iFer.valor });
    if (iMen.valor > 0) itens.push({ rubrica: '998', descricao: 'I.N.S.S.', referencia: iMen.aliquotaEfetiva, valor: iMen.valor });
    if (diferenca > 0) itens.push({ rubrica: '821', descricao: 'INSS DIFERENCA FERIAS', referencia: 0, valor: diferenca });

    return {
      itens: itens,
      inssFerias: iFer.valor, inssMensal: iMen.valor, diferenca: diferenca,
      total: iTot.valor, base: iTot.base, aliquotaEfetiva: iTot.aliquotaEfetiva,
      excedente: iTot.excedente, detalheFaixas: iTot.faixas
    };
  };

  /* ==========================================================================
   * 3.2 IRRF EMPREGADO
   * --------------------------------------------------------------------------
   * PASSO A PASSO (ordem obrigatória):
   *
   *   1) RENDIMENTO TRIBUTÁVEL BRUTO (RTB)
   *        RTB = soma das rubricas com incidencia.irrf = true
   *        (fora: férias/abono indenizados, aviso indenizado, salário-família,
   *         diárias até 50%, PLR — que tem tabela exclusiva própria)
   *
   *   2) DEDUÇÕES LEGAIS
   *        DL = INSS retido
   *           + (nº de dependentes x 189,59)
   *           + pensão alimentícia judicial
   *           + previdência privada / FAPI (limite 12% do rendimento)
   *
   *   3) DESCONTO SIMPLIFICADO (MP 1.206/2024, art. 4º)
   *        DS = 607,20  — SUBSTITUI todas as deduções do passo 2
   *        Aplica-se o que for MAIOR:  DEDUCAO = max(DL, DS)
   *
   *   4) BASE DE CÁLCULO
   *        BC = RTB - DEDUCAO           (se BC < 0 -> BC = 0)
   *
   *   5) IMPOSTO PELA TABELA PROGRESSIVA
   *        localizar a faixa de BC
   *        IMP = ARREDONDA2( BC x aliquota - parcelaADeduzir )
   *
   *   6) REDUTOR — Lei 15.270/2025 (vigência 01/2026)
   *        seja RTB o rendimento tributável do mês:
   *          RTB <= 5.000,00                -> REDUTOR = IMP   (imposto zera)
   *          5.000,01 <= RTB <= 7.350,00    -> REDUTOR = ARRED2(978,62 - 0,133145 x RTB)
   *          RTB > 7.350,00                 -> REDUTOR = 0
   *        IRRF = max(0, IMP - REDUTOR)
   *
   * VALIDAÇÃO CONTRA A FOLHA 07/2026 (todos exatos):
   *   Lilian   13.908,00 -> BC 12.919,93 -> IMP 2.644,25 -> redutor 0     -> 2.644,25 ✔
   *   Eronildo  9.147,00 -> BC  7.969,34 (1 dep) -> 1.282,84 -> 0         -> 1.282,84 ✔
   *   Isabel    5.756,00 -> BC  5.148,66 -> IMP 507,15 -> redutor 212,24  ->   294,91 ✔
   *   Bruna     5.452,00 -> BC  4.844,80 (simplificado) -> 423,59 - 252,71->   170,88 ✔
   *   Ariosvaldo 7.317,00-> BC  6.491,12 -> 876,33 - 4,40                 ->   871,93 ✔
   *   Patrícia  5.000,00 -> BC  4.392,80 -> 312,89 - 312,89               ->     0,00 ✔
   * ======================================================================== */

  R.irrf = function (args, prm) {
    var RTB       = r2(nz(args.rendimentoTributavel));
    var inss      = nz(args.inss);
    var deps      = nz(args.dependentes);
    var pensao    = nz(args.pensao);
    var prevPriv  = nz(args.previdenciaPrivada);
    var outras    = nz(args.outrasDeducoes);
    var tab       = prm.irrf;

    var dedDependentes = r2(deps * tab.dependente);
    var deducoesLegais = r2(inss + dedDependentes + pensao + prevPriv + outras);
    var simplificado   = args.permitirSimplificado === false ? 0 : tab.descontoSimplificado;

    // O desconto simplificado SUBSTITUI o conjunto das deduções legais.
    var usouSimplificado = simplificado > deducoesLegais;
    var deducao = usouSimplificado ? simplificado : deducoesLegais;

    var BC = r2(RTB - deducao);
    if (BC < 0) BC = 0;

    var faixa = null;
    for (var i = 0; i < tab.faixas.length; i++) {
      if (BC <= tab.faixas[i].ate) { faixa = tab.faixas[i]; break; }
    }
    if (!faixa) faixa = tab.faixas[tab.faixas.length - 1];

    var impostoBruto = r2(BC * faixa.aliquota - faixa.deduzir);
    if (impostoBruto < 0) impostoBruto = 0;

    /* ---- Redutor da Lei 15.270/2025 -------------------------------------- */
    var red = tab.redutor, redutor = 0, regimeRedutor = 'SEM_REDUTOR';
    if (args.aplicarRedutor !== false && red) {
      if (RTB <= red.isencaoTotalAte) {
        redutor = impostoBruto; regimeRedutor = 'ISENCAO_TOTAL';
      } else if (RTB <= red.limiteSuperior) {
        redutor = r2(red.constante - red.multiplicador * RTB);
        if (redutor < 0) redutor = 0;
        if (redutor > impostoBruto) redutor = impostoBruto;
        regimeRedutor = 'REDUCAO_PARCIAL';
      }
    }

    var imposto = r2(impostoBruto - redutor);
    if (imposto < 0) imposto = 0;

    return {
      rendimentoTributavel: RTB,
      deducaoINSS: inss,
      deducaoDependentes: dedDependentes,
      deducaoPensao: pensao,
      deducoesLegais: deducoesLegais,
      descontoSimplificado: simplificado,
      usouSimplificado: usouSimplificado,
      deducaoAplicada: deducao,
      baseCalculo: BC,
      aliquota: faixa.aliquota,
      parcelaDeduzir: faixa.deduzir,
      impostoBruto: impostoBruto,
      redutor: redutor,
      regimeRedutor: regimeRedutor,
      valor: imposto,
      itens: imposto > 0
        ? [{ rubrica: args.rubrica || '999', descricao: args.descricao || 'IMPOSTO DE RENDA',
             referencia: rN(faixa.aliquota * 100, 2), valor: imposto }]
        : []
    };
  };

  /**
   * IRRF do 13º salário — TRIBUTAÇÃO EXCLUSIVA NA FONTE.
   * Base própria: 13º bruto - INSS do 13º - dependentes - pensão sobre o 13º.
   * NÃO soma com o salário do mês e NÃO entra no ajuste anual.
   * O redutor da Lei 15.270/2025 também se aplica, com RTB = 13º bruto.
   */
  R.irrfDecimoTerceiro = function (args, prm) {
    return R.irrf({
      rendimentoTributavel: args.decimoBruto,
      inss: args.inssDecimo,
      dependentes: args.dependentes,
      pensao: args.pensaoDecimo,
      permitirSimplificado: args.permitirSimplificado !== false,
      aplicarRedutor: true,
      rubrica: '999',
      descricao: 'IMPOSTO DE RENDA 13º SALARIO'
    }, prm);
  };

  /* ==========================================================================
   * 3.3 VALE-TRANSPORTE (Lei 7.418/85 art. 9º §único / Decreto 95.247/87)
   * --------------------------------------------------------------------------
   * desconto = MENOR( 6% x salárioBásico do mês , custo real do VT entregue )
   * A diferença é CUSTO da empresa (não desconta e não é salário).
   * BASE = salário básico PROPORCIONAL aos dias trabalhados — conferido:
   *   Geiseane: 6% x 2.363,33 = 141,80 ✔ | Pedro: 6% x 2.029,23 = 121,75 ✔
   * ESTAGIÁRIO: auxílio-transporte obrigatório e SEM desconto (Lei 11.788 art.12).
   * ======================================================================== */

  R.valeTransporte = function (colab, salarioBasicoDoMes, custoRealVT, prm) {
    if (!colab.vtOptante) return { valor: 0, itens: [], custoEmpresa: 0 };

    if (colab.vinculo === 'ESTAGIARIO') {
      return {
        valor: 0, itens: [], custoEmpresa: r2(nz(custoRealVT)),
        motivo: 'ESTAGIARIO_SEM_DESCONTO_LEI_11788_ART_12'
      };
    }

    var limite6 = arred(nz(salarioBasicoDoMes) * prm.travas.valeTransportePercentual);
    var custo = nz(custoRealVT);
    // Se o custo real não foi informado, aplica-se o percentual (é como a
    // folha da LNB opera hoje: rubrica 56 "VALE TRANSPORTE %" = 6% cheios).
    var valor = custo > 0 ? Math.min(limite6, r2(custo)) : limite6;

    return {
      valor: valor,
      limite6pct: limite6,
      custoReal: custo,
      custoEmpresa: custo > 0 ? r2(custo - valor) : 0,
      itens: valor > 0 ? [{ rubrica: '56', descricao: 'VALE TRANSPORTE %',
                            referencia: rN(prm.travas.valeTransportePercentual * 100, 2), valor: valor }] : []
    };
  };

  /* ==========================================================================
   * 3.4 PENSÃO ALIMENTÍCIA JUDICIAL
   * --------------------------------------------------------------------------
   * O sistema precisa suportar as 5 formas que aparecem em ofício judicial:
   *   PERC_SALARIO_BASE   -> % sobre o salário base contratual
   *   PERC_BRUTO          -> % sobre o total de proventos do mês
   *   PERC_LIQUIDO        -> % sobre o líquido (bruto - INSS - IRRF)
   *   PERC_SALARIO_MINIMO -> % sobre o salário mínimo vigente
   *   VALOR_FIXO          -> valor nominal
   *
   * QUEBRA DA DEPENDÊNCIA CIRCULAR (PERC_LIQUIDO):
   *   O líquido depende do IRRF, que depende da pensão, que depende do líquido.
   *   Solução de passe único (padrão do mercado e do eSocial):
   *     a) IRRF_0 = IRRF calculado SEM a pensão
   *     b) LIQUIDO_REF = bruto - INSS - IRRF_0
   *     c) PENSAO = % x LIQUIDO_REF
   *     d) IRRF_FINAL = IRRF recalculado COM a pensão como dedução
   *   NÃO reiterar (c)->(d): geraria oscilação sem convergência garantida.
   *   CFG.iterarPensaoLiquido = true força até 5 iterações se o juízo exigir.
   *
   * ORDEM DE DEDUÇÃO NA FOLHA (obrigatória, para não furar o IRRF):
   *     1º INSS  ->  2º Pensão  ->  3º IRRF (deduzindo a pensão da base)
   *   A pensão é dedutível INTEGRALMENTE da base do IRRF (art. 4º III da
   *   Lei 9.250/95) e o valor pago ao alimentando é isento na fonte.
   *
   * 13º SALÁRIO: a pensão sobre 13º só é devida se o título judicial disser.
   * Verba rescisória: idem — conferir a expressão "sobre todas as verbas".
   * ======================================================================== */

  R.pensaoAlimenticia = function (colab, ctx, prm) {
    var lista = colab.pensoes || [];
    if (!lista.length) return { total: 0, itens: [], dedutivelIRRF: 0, detalhes: [] };

    var det = [], itens = [], total = 0, dedutivel = 0;

    lista.forEach(function (p, idx) {
      var pct = nz(p.percentual);
      if (pct > 1) pct = pct / 100;
      var base = 0, valor = 0;

      switch (p.tipo) {
        case 'PERC_SALARIO_BASE':
          base = nz(colab.salarioBase); valor = arred(base * pct); break;
        case 'PERC_BRUTO':
          base = nz(ctx.totalProventosTributaveis); valor = arred(base * pct); break;
        case 'PERC_LIQUIDO':
          base = r2(nz(ctx.totalProventos) - nz(ctx.inss) - nz(ctx.irrfSemPensao));
          valor = arred(base * pct); break;
        case 'PERC_SALARIO_MINIMO':
          base = prm.salarioMinimo; valor = arred(base * pct); break;
        case 'VALOR_FIXO':
        default:
          base = nz(p.valor); valor = r2(base); break;
      }

      // Piso/teto informados no ofício
      if (nz(p.valorMinimo) > 0 && valor < nz(p.valorMinimo)) valor = r2(nz(p.valorMinimo));
      if (nz(p.valorMaximo) > 0 && valor > nz(p.valorMaximo)) valor = r2(nz(p.valorMaximo));

      total = r2(total + valor);
      if (p.dedutivelIRRF !== false) dedutivel = r2(dedutivel + valor);

      det.push({
        beneficiario: p.beneficiario || ('ALIMENTANDO ' + (idx + 1)),
        tipo: p.tipo, percentual: pct, base: base, valor: valor,
        incideSobre13: !!p.incideSobre13, incideSobreRescisao: !!p.incideSobreRescisao,
        processo: p.processo || null, conta: p.contaDeposito || null
      });
      itens.push({ rubrica: '210', descricao: 'PENSAO ALIMENTICIA', referencia: rN(pct * 100, 2), valor: valor });
    });

    return { total: total, dedutivelIRRF: dedutivel, itens: itens, detalhes: det };
  };

  /* ==========================================================================
   * 3.5 EMPRÉSTIMO CONSIGNADO — TRAVA DE MARGEM (Lei 10.820/03)
   * --------------------------------------------------------------------------
   * Margem total 35% da remuneração disponível, sendo:
   *     30% para empréstimo consignado
   *      5% exclusivos para cartão de crédito consignado / cartão benefício
   * BASE DA MARGEM = remuneração bruta - descontos OBRIGATÓRIOS
   *                  (INSS, IRRF, pensão alimentícia judicial)
   * A trava é BLOQUEANTE: se a soma das parcelas exceder a margem, o motor
   * NÃO desconta o excedente — devolve o contrato rejeitado para tratamento.
   * ======================================================================== */

  R.consignado = function (colab, ctx, prm) {
    var contratos = colab.consignados || [];
    if (!contratos.length) return { total: 0, itens: [], margem: null, rejeitados: [] };

    var baseMargem = r2(nz(ctx.totalProventos) - nz(ctx.inss) - nz(ctx.irrf) - nz(ctx.pensao));
    var margemTotal = arred(baseMargem * prm.travas.margemConsignavelTotal);
    var margemEmp   = arred(baseMargem * prm.travas.margemConsignavelEmprestimo);
    var margemCart  = arred(baseMargem * prm.travas.margemConsignavelCartao);

    var usadoEmp = 0, usadoCart = 0, itens = [], rejeitados = [], total = 0;

    // Ordem de prioridade: contratos mais antigos primeiro (data de averbação)
    contratos.slice().sort(function (a, b) {
      return String(a.averbacao || '') < String(b.averbacao || '') ? -1 : 1;
    }).forEach(function (c) {
      var parcela = r2(nz(c.parcela));
      var ehCartao = c.tipo === 'CARTAO';
      var limite = ehCartao ? margemCart : margemEmp;
      var usado  = ehCartao ? usadoCart : usadoEmp;

      if (r2(usado + parcela) > limite || r2(usadoEmp + usadoCart + parcela) > margemTotal) {
        rejeitados.push({
          contrato: c.contrato || c.banco, parcela: parcela, tipo: c.tipo,
          motivo: 'EXCEDE_MARGEM_CONSIGNAVEL',
          margemDisponivel: r2(limite - usado)
        });
        return;
      }

      if (ehCartao) usadoCart = r2(usadoCart + parcela); else usadoEmp = r2(usadoEmp + parcela);
      total = r2(total + parcela);
      itens.push({
        rubrica: ehCartao ? '221' : '220',
        descricao: (ehCartao ? 'CARTAO CONSIGNADO ' : 'EMPRESTIMO CONSIGNADO ') + (c.banco || ''),
        referencia: c.parcelaAtual ? (c.parcelaAtual + '/' + c.totalParcelas) : 0,
        valor: parcela
      });
    });

    return {
      total: total, itens: itens, rejeitados: rejeitados,
      margem: {
        base: baseMargem, total: margemTotal, emprestimo: margemEmp, cartao: margemCart,
        usadoEmprestimo: usadoEmp, usadoCartao: usadoCart,
        disponivelEmprestimo: r2(margemEmp - usadoEmp),
        disponivelCartao: r2(margemCart - usadoCart)
      }
    };
  };

  /* ==========================================================================
   * 3.6 BENEFÍCIOS CORPORATIVOS (plano de saúde, odonto, seguro de vida)
   * --------------------------------------------------------------------------
   * Mensalidade titular + dependentes + COPARTICIPAÇÃO por evento (consultas,
   * exames), com TETO configurável por colaborador ou por percentual da
   * remuneração. Requisito legal: autorização expressa e prévia do empregado
   * (art. 462 CLT + Súmula 342 TST).
   * Conferido: Lilian — rubrica 8111 DESCONTO PLANO DE SAÚDE = 136,91.
   * ======================================================================== */

  R.beneficios = function (colab, ctx, prm) {
    var itens = [], total = 0, alertas = [];

    function add(rubrica, descricao, valor, teto) {
      valor = r2(nz(valor));
      if (valor <= 0) return;
      if (nz(teto) > 0 && valor > nz(teto)) {
        alertas.push({ rubrica: rubrica, solicitado: valor, teto: r2(teto), motivo: 'TETO_APLICADO' });
        valor = r2(teto);
      }
      total = r2(total + valor);
      itens.push({ rubrica: rubrica, descricao: descricao, referencia: 0, valor: valor });
    }

    var b = colab.beneficios || {};

    if (b.planoSaude) {
      var ps = r2(nz(b.planoSaude.titular) + nz(b.planoSaude.dependentes));
      add('8111', 'DESCONTO PLANO DE SAUDE', ps, b.planoSaude.teto);
      add('8114', 'COPARTICIPACAO PLANO DE SAUDE', nz(b.planoSaude.coparticipacao), b.planoSaude.tetoCoparticipacao);
    }
    if (b.odontologico) {
      add('8112', 'DESCONTO PLANO ODONTOLOGICO',
          r2(nz(b.odontologico.titular) + nz(b.odontologico.dependentes)), b.odontologico.teto);
    }
    if (b.seguroVida) {
      add('8113', 'DESCONTO SEGURO DE VIDA', nz(b.seguroVida.valor), b.seguroVida.teto);
    }

    // Teto global de benefícios (% da remuneração) — trava de segurança
    var tetoGlobalPct = nz(colab.tetoBeneficiosPercentual);
    if (tetoGlobalPct > 0) {
      if (tetoGlobalPct > 1) tetoGlobalPct = tetoGlobalPct / 100;
      var tetoGlobal = arred(nz(ctx.totalProventos) * tetoGlobalPct);
      if (total > tetoGlobal) {
        alertas.push({ motivo: 'TETO_GLOBAL_BENEFICIOS', solicitado: total, teto: tetoGlobal });
        // proporcionaliza os descontos
        var fator = tetoGlobal / total;
        total = 0;
        itens = itens.map(function (it) {
          it.valor = arred(it.valor * fator); total = r2(total + it.valor); return it;
        });
      }
    }

    return { total: total, itens: itens, alertas: alertas };
  };

  /* ==========================================================================
   * 3.7 CONTRIBUIÇÃO ASSISTENCIAL / SINDICAL (CCT)
   * Conferido 07/2026: 1,60% da remuneração, TETO de R$ 85,00 (rubrica 231).
   * Exige oposição expressa não manifestada (Tema 935 STF).
   * ======================================================================== */

  R.contribuicaoAssistencial = function (colab, baseRemuneracao, prm) {
    if (colab.oposicaoContribuicao === true) return { valor: 0, itens: [] };
    if (colab.vinculo === 'ESTAGIARIO') return { valor: 0, itens: [] };
    var cfg = (colab.contribuicaoAssistencial || prm.convencao.contribuicaoAssistencial);
    var pct = nz(cfg.percentual); if (pct > 1) pct = pct / 100;
    var v = arred(nz(baseRemuneracao) * pct);
    if (nz(cfg.teto) > 0 && v > nz(cfg.teto)) v = r2(cfg.teto);
    return {
      valor: v,
      itens: v > 0 ? [{ rubrica: '231', descricao: 'CONTRIBUICAO ASSISTENCIAL - %',
                        referencia: rN(pct * 100, 2), valor: v }] : []
    };
  };

  /* ==========================================================================
   * 3.8 FALTAS, ATRASOS E PERDA DO DSR
   * --------------------------------------------------------------------------
   * FALTA INJUSTIFICADA:
   *     descontoFalta = (salarioBase / 30) x diasFalta
   *
   * PERDA DO DSR (art. 6º da Lei 605/49):
   *     O repouso semanal remunerado só é devido ao empregado ASSÍDUO e
   *     PONTUAL. Uma única falta injustificada na semana derruba o DSR
   *     daquela semana:
   *       para cada semana (dom->sáb) que contenha >= 1 falta injustificada:
   *           descontoDSR += (salarioBase / 30) x 1
   *     Feriados dentro da semana também são perdidos (mesma regra) se a CCT
   *     não dispuser diferente -> CFG.feriadoSegueDSR.
   *
   * ATRASO:
   *     minutosDescontaveis = max(0, minutosAtrasoDia - tolerancia(10 min))
   *     descontoAtraso = (minutosDescontaveis / 60) x salarioHora
   *     Se CFG.atrasoPerdeDSR = true, o atraso também derruba o DSR da semana.
   *
   * IMPORTANTE: o desconto de faltas REDUZ a base de INSS/FGTS/IRRF (é redutor
   * de provento, não desconto pós-base). Por isso ele entra ANTES do bloco de
   * retenções no pipeline.
   * ======================================================================== */

  R.faltasEAtrasos = function (colab, evt, prm) {
    var salDia = nz(colab.salarioBase) / LNB.CFG.divisorDiasMes;
    var salHora = LNB.proventos.salarioHora(colab);

    var faltas = (evt.faltas || []).filter(function (f) { return f.tipo !== 'JUSTIFICADA'; });
    var diasFalta = faltas.reduce(function (a, f) { return a + (nz(f.dias) || 1); }, 0);

    var atrasos = evt.atrasos || [];
    var minutosDesc = 0;
    atrasos.forEach(function (a) {
      var m = nz(a.minutos) - LNB.CFG.toleranciaMinutosDia;
      if (m > 0) minutosDesc += m;
    });

    var descFalta = diasFalta > 0 ? arred(salDia * diasFalta) : 0;
    var descAtraso = minutosDesc > 0 ? arred(minutosDesc / 60 * salHora) : 0;

    /* ---- Semanas atingidas (algoritmo de perda do DSR) ------------------- */
    var semanas = {};
    function marcarSemana(dataISO) {
      var d = U.dt(dataISO);
      var dow = d.getUTCDay();                       // 0=domingo
      var inicioSemana = U.addDias(dataISO, -dow);   // domingo da semana
      semanas[inicioSemana] = true;
    }
    faltas.forEach(function (f) { if (f.data) marcarSemana(f.data); });
    if (LNB.CFG.atrasoPerdeDSR) {
      atrasos.forEach(function (a) {
        if (a.data && nz(a.minutos) > LNB.CFG.toleranciaMinutosDia) marcarSemana(a.data);
      });
    }
    var qtdSemanas = Object.keys(semanas).length;
    // Se não vieram datas, usa a aproximação conservadora: 1 DSR por falta
    if (qtdSemanas === 0 && diasFalta > 0 && !faltas.some(function (f) { return f.data; })) {
      qtdSemanas = diasFalta;
    }
    var descDSR = qtdSemanas > 0 ? arred(salDia * qtdSemanas) : 0;

    var itens = [];
    if (descFalta > 0)  itens.push({ rubrica: '200', descricao: 'FALTAS', referencia: diasFalta, valor: descFalta });
    if (descDSR > 0)    itens.push({ rubrica: '201', descricao: 'DSR SOBRE FALTAS', referencia: qtdSemanas, valor: descDSR });
    if (descAtraso > 0) itens.push({ rubrica: '202', descricao: 'ATRASOS', referencia: rN(minutosDesc / 60, 2), valor: descAtraso });

    return {
      diasFalta: diasFalta, semanasComFalta: qtdSemanas, minutosDescontaveis: minutosDesc,
      descontoFalta: descFalta, descontoDSR: descDSR, descontoAtraso: descAtraso,
      total: r2(descFalta + descDSR + descAtraso),
      itens: itens,
      // Reflexos: faltas reduzem avos de férias (art. 130 CLT) e de 13º
      avosFeriasPerdidos: R.escalaFaltasFerias(diasFalta),
      perdeAvo13: diasFalta > 15
    };
  };

  /** Art. 130 CLT — escala de dias de férias conforme faltas injustificadas. */
  R.escalaFaltasFerias = function (faltasNoPeriodoAquisitivo) {
    var f = nz(faltasNoPeriodoAquisitivo);
    if (f <= 5)  return { diasFerias: 30, perdidos: 0 };
    if (f <= 14) return { diasFerias: 24, perdidos: 6 };
    if (f <= 23) return { diasFerias: 18, perdidos: 12 };
    if (f <= 32) return { diasFerias: 12, perdidos: 18 };
    return { diasFerias: 0, perdidos: 30 };
  };

  /* ==========================================================================
   * 3.9 TRAVA GERAL DE DESCONTOS (art. 462 CLT)
   * Descontos FACULTATIVOS não podem comprometer o mínimo existencial.
   * O motor sinaliza (não bloqueia) quando o líquido cair abaixo de 30% do
   * bruto, e bloqueia quando o líquido ficar negativo.
   * ======================================================================== */

  R.validarDescontos = function (totalProventos, descontosObrigatorios, descontosFacultativos, prm) {
    var liquido = r2(totalProventos - descontosObrigatorios - descontosFacultativos);
    var limite = arred(totalProventos * prm.travas.limiteDescontosFacultativos);
    var alertas = [];
    if (liquido < 0) {
      alertas.push({ nivel: 'ERRO', codigo: 'LIQUIDO_NEGATIVO', liquido: liquido });
    } else if (r2(descontosObrigatorios + descontosFacultativos) > limite) {
      alertas.push({
        nivel: 'AVISO', codigo: 'DESCONTOS_ACIMA_DE_70PCT',
        descontos: r2(descontosObrigatorios + descontosFacultativos), limite: limite
      });
    }
    return { liquido: liquido, alertas: alertas };
  };

  LNB.retencoes = R;

})(globalThis.LNBPayroll);
/* =============================================================================
 * BLOCO 4 — ENCARGOS PATRONAIS E PROVISÕES DE FECHAMENTO
 * ========================================================================== */

;(function (LNB) {
  'use strict';
  var U = LNB.util, r2 = U.r2, rN = U.rN, nz = U.nz;
  var arred = U.arred;              // encargos patronais e FGTS: truncam
  var arredVerba = r2;              // provisões contábeis: arredondam

  var E = {};

  /* ==========================================================================
   * 4.1 BASES PATRONAIS
   * --------------------------------------------------------------------------
   * BASE PREVIDENCIÁRIA PATRONAL (folha de salários):
   *   = soma da remuneração de TODOS os segurados empregados e contribuintes
   *     individuais, SEM TETO (o teto é só do empregado).
   *   Entram:   salário, HE, adicionais, DSR, férias gozadas + 1/3, 13º,
   *             comissões, gratificações habituais.
   *   NÃO entram: bolsa de estagiário, férias/abono indenizados, aviso prévio
   *             indenizado, salário-família, vale-transporte, PLR (na forma da
   *             lei), diárias até 50%, participação em previdência privada.
   *
   * BASE FGTS:
   *   Praticamente a mesma, MAIS o aviso prévio indenizado (Súmula 305 TST).
   *   Confirmado 07/2026: Base INSS total = Base FGTS = 91.096,09.
   *
   * BASE PIS-FOLHA (Lei 9.532/97 art. 13 — entidade sem fins lucrativos):
   *   1% sobre a folha de salários — mesma base do INSS patronal.
   *   Confirmado 07/2026: 91.096,09 x 1% = 910,96.
   * ======================================================================== */

  E.montarBases = function (folhas) {
    var b = {
      baseINSSPatronal: 0, baseFGTS: 0, baseFGTSAprendiz: 0, basePIS: 0,
      salarioContribuicaoEmpregados: 0, excedenteTeto: 0,
      inssSegurados: 0, salarioFamiliaCompensavel: 0, baseFGTSRescisorio: 0,
      /* O FGTS da guia é a SOMA dos depósitos individuais (cada um truncado),
         não 8% da base somada — no fechamento 07/2026 a diferença é de 1
         centavo (7.287,67 x 7.287,68). O individual é o que vale. */
      fgtsSomaIndividual: 0, fgtsSomaIndividualAprendiz: 0
    };
    (folhas || []).forEach(function (f) {
      b.baseINSSPatronal = r2(b.baseINSSPatronal + nz(f.bases.inss));
      b.basePIS          = r2(b.basePIS + nz(f.bases.inss));
      if (f.vinculo === 'MENOR_APRENDIZ') {
        b.baseFGTSAprendiz = r2(b.baseFGTSAprendiz + nz(f.bases.fgts));
        b.fgtsSomaIndividualAprendiz = r2(b.fgtsSomaIndividualAprendiz + nz(f.totais.fgts));
      } else {
        b.baseFGTS = r2(b.baseFGTS + nz(f.bases.fgts));
        b.fgtsSomaIndividual = r2(b.fgtsSomaIndividual + nz(f.totais.fgts));
      }
      b.baseFGTSRescisorio = r2(b.baseFGTSRescisorio + nz(f.bases.fgtsRescisorio));
      b.salarioContribuicaoEmpregados = r2(b.salarioContribuicaoEmpregados + nz(f.bases.salarioContribuicao));
      b.excedenteTeto = r2(b.excedenteTeto + nz(f.bases.excedenteINSS));
      b.inssSegurados = r2(b.inssSegurados + nz(f.totais.inss));
      b.salarioFamiliaCompensavel = r2(b.salarioFamiliaCompensavel + nz(f.totais.salarioFamilia));
    });
    return b;
  };

  /* ==========================================================================
   * 4.2 ENCARGOS PATRONAIS — PARÂMETROS REAIS DA LNB
   * --------------------------------------------------------------------------
   *   INSS Patronal ....... 20,00%   (art. 22 I Lei 8.212/91)
   *   RAT ................. 1,00% x FAP   (Decreto 6.957/09 — FAP 0,5 a 2,0)
   *   Terceiros ........... 5,80%   (FPAS — Sal.Educ 2,5 + INCRA 0,2 +
   *                                  SENAC 1,0 + SESC 1,5 + SEBRAE 0,6)
   *   PIS sobre a folha ... 1,00%   (Lei 9.532/97 art. 13)
   *   FGTS ................ 8,00% geral | 2,00% menor aprendiz
   *
   * APLICAÇÃO DO FAP:
   *   ratAjustado = RAT x FAP, arredondado em 4 casas (regra da RFB).
   *   O FAP é publicado anualmente por CNPJ (setembro, vigência no ano
   *   seguinte) e varia de 0,5000 a 2,0000. Guardar por competência para que
   *   recálculos retroativos usem o FAP daquele ano.
   *   Extrato 07/2026: RAT recolhido = 910,96 = 1,0000% x base => FAP = 1,0000.
   *
   * ARREDONDAMENTO:
   *   Cada componente de terceiros é truncado SEPARADAMENTE. Somando os cinco
   *   componentes truncados chega-se a 5.283,56 (o extrato), enquanto 5,8%
   *   direto arredondado daria 5.283,57.
   * ======================================================================== */

  E.encargosPatronais = function (bases, prm, opts) {
    opts = opts || {};
    var pp = prm.patronal;
    var fap = nz(opts.fap) > 0 ? nz(opts.fap) : pp.fap;
    var ratAjustado = rN(pp.rat * fap, 6);

    var baseINSS = r2(nz(bases.baseINSSPatronal));

    var inssPatronal = arred(baseINSS * pp.inssPatronal);
    var rat          = arred(baseINSS * ratAjustado);

    var terceiros = [], totalTerceiros = 0;
    pp.terceiros.componentes.forEach(function (c) {
      var v = arred(baseINSS * c.aliquota);
      totalTerceiros = r2(totalTerceiros + v);
      terceiros.push({ codigo: c.codigo, descricao: c.descricao, aliquota: c.aliquota, valor: v });
    });

    var pisFolha = arred(baseINSS * pp.pisFolha);

    /* Preferir a soma dos depósitos individuais (é o que a Caixa recebe). */
    var fgtsGeral    = bases.fgtsSomaIndividual != null
      ? r2(bases.fgtsSomaIndividual) : arred(nz(bases.baseFGTS) * prm.fgts.geral);
    var fgtsAprendiz = bases.fgtsSomaIndividualAprendiz != null
      ? r2(bases.fgtsSomaIndividualAprendiz) : arred(nz(bases.baseFGTSAprendiz) * prm.fgts.aprendiz);

    var totalINSSGuia = r2(inssPatronal + rat + totalTerceiros + nz(bases.inssSegurados)
                           - nz(bases.salarioFamiliaCompensavel));

    return {
      base: baseINSS,
      inssPatronal:  { aliquota: pp.inssPatronal, valor: inssPatronal },
      rat:           { aliquotaNominal: pp.rat, fap: fap, aliquotaAjustada: ratAjustado, valor: rat },
      terceiros:     { aliquota: pp.terceiros.total, valor: totalTerceiros, componentes: terceiros },
      pisFolha:      { aliquota: pp.pisFolha, base: r2(nz(bases.basePIS)), valor: pisFolha },
      fgts:          {
        geral:    { aliquota: prm.fgts.geral,    base: r2(nz(bases.baseFGTS)),         valor: fgtsGeral },
        aprendiz: { aliquota: prm.fgts.aprendiz, base: r2(nz(bases.baseFGTSAprendiz)), valor: fgtsAprendiz },
        total: r2(fgtsGeral + fgtsAprendiz)
      },
      inssSegurados: r2(nz(bases.inssSegurados)),
      salarioFamiliaCompensavel: r2(nz(bases.salarioFamiliaCompensavel)),
      totalGuiaPrevidenciaria: totalINSSGuia,
      custoEmpresaEncargos: r2(inssPatronal + rat + totalTerceiros + pisFolha + fgtsGeral + fgtsAprendiz),
      /* Percentual total de encargos sobre a folha — para o painel de custo */
      percentualEncargos: baseINSS > 0
        ? rN((inssPatronal + rat + totalTerceiros + pisFolha + fgtsGeral + fgtsAprendiz) / baseINSS * 100, 4)
        : 0
    };
  };

  /* ==========================================================================
   * 4.3 PROVISÕES DE FECHAMENTO (competência — CPC 33 / NBC TG 33)
   * --------------------------------------------------------------------------
   * REGRA DE AVOS: mês com 15 dias ou mais trabalhados = 1/12 (art. 146 §único
   * CLT para férias; art. 1º §2º Lei 4.090/62 para o 13º).
   *
   * FÉRIAS:
   *   provisaoFerias  = remuneracaoMes / 12
   *   provisaoTerco   = provisaoFerias / 3
   *   provisaoAbono   = (opcional) provisaoFerias / 3 x indiceHistoricoAbono
   *   encargosFerias  = (provisaoFerias + provisaoTerco) x FATOR_ENCARGOS
   *
   * 13º SALÁRIO:
   *   provisao13      = remuneracaoMes / 12
   *   encargos13      = provisao13 x FATOR_ENCARGOS
   *
   * FATOR_ENCARGOS (LNB) = 20% INSS + 1% RAT x FAP + 5,8% terceiros
   *                      + 8% FGTS + 1% PIS-folha = 35,80%
   *   (o PIS-folha só entra porque a LNB é entidade do art. 13 da Lei 9.532/97)
   *
   * SALDO ACUMULADO:
   *   saldoFerias(n) = saldoFerias(n-1) + provisao(n) - pagamentos(n)
   *   Reversão obrigatória na rescisão e no gozo.
   *
   * ATENÇÃO: estagiário NÃO gera provisão de férias/13º legais. Se a empresa
   * paga a gratificação de 13º por liberalidade (é o caso da LNB), provisionar
   * SEM encargos (bolsa não é salário de contribuição).
   * ======================================================================== */

  E.fatorEncargos = function (prm, opts) {
    opts = opts || {};
    var pp = prm.patronal;
    var fap = nz(opts.fap) > 0 ? nz(opts.fap) : pp.fap;
    var f = pp.inssPatronal + (pp.rat * fap) + pp.terceiros.total + prm.fgts.geral + pp.pisFolha;
    if (opts.vinculo === 'MENOR_APRENDIZ') {
      f = pp.inssPatronal + (pp.rat * fap) + pp.terceiros.total + prm.fgts.aprendiz + pp.pisFolha;
    }
    return rN(f, 6);
  };

  /**
   * Provisão mensal de um colaborador.
   * @param {Object} colab
   * @param {Number} remuneracaoMes  remuneração do mês (base de incidência)
   * @param {Object} estado          { avosFerias, avosDecimo, saldoFerias, saldoDecimo }
   */
  E.provisaoMensal = function (colab, remuneracaoMes, prm, estado, opts) {
    estado = estado || {};
    var v = LNB.VINCULOS[colab.vinculo] || {};
    var rem = r2(nz(remuneracaoMes));

    if (colab.vinculo === 'ESTAGIARIO') {
      // Recesso remunerado (30 dias / 12 meses) e gratificação por liberalidade
      var recesso = arredVerba(rem / 12);
      var grat13 = prm.convencao.estagiario.pagaGratificacao13 ? arredVerba(rem / 12) : 0;
      return {
        vinculo: colab.vinculo,
        ferias: { principal: recesso, terco: 0, encargos: 0, total: recesso, observacao: 'RECESSO_SEM_TERCO' },
        decimoTerceiro: { principal: grat13, encargos: 0, total: grat13, observacao: 'LIBERALIDADE_SEM_ENCARGOS' },
        fatorEncargos: 0,
        totalProvisaoMes: r2(recesso + grat13),
        saldos: {
          ferias: r2(nz(estado.saldoFerias) + recesso),
          decimoTerceiro: r2(nz(estado.saldoDecimo) + grat13)
        }
      };
    }

    if (!v.incide || !v.incide.ferias) {
      return { vinculo: colab.vinculo, ferias: null, decimoTerceiro: null, totalProvisaoMes: 0 };
    }

    var fator = E.fatorEncargos(prm, { fap: opts && opts.fap, vinculo: colab.vinculo });

    var pFerias = arredVerba(rem / 12);
    var pTerco  = arredVerba(pFerias / 3);
    var eFerias = arredVerba((pFerias + pTerco) * fator);

    var p13 = arredVerba(rem / 12);
    var e13 = arredVerba(p13 * fator);

    return {
      vinculo: colab.vinculo,
      fatorEncargos: fator,
      ferias: {
        principal: pFerias, terco: pTerco, encargos: eFerias,
        total: r2(pFerias + pTerco + eFerias)
      },
      decimoTerceiro: { principal: p13, encargos: e13, total: r2(p13 + e13) },
      totalProvisaoMes: r2(pFerias + pTerco + eFerias + p13 + e13),
      saldos: {
        ferias: r2(nz(estado.saldoFerias) + pFerias + pTerco + eFerias),
        decimoTerceiro: r2(nz(estado.saldoDecimo) + p13 + e13)
      },
      lancamentoContabil: [
        { conta: 'DESPESA_FERIAS',        debito: r2(pFerias + pTerco) },
        { conta: 'DESPESA_ENC_FERIAS',    debito: eFerias },
        { conta: 'PROVISAO_FERIAS',       credito: r2(pFerias + pTerco) },
        { conta: 'PROVISAO_ENC_FERIAS',   credito: eFerias },
        { conta: 'DESPESA_13',            debito: p13 },
        { conta: 'DESPESA_ENC_13',        debito: e13 },
        { conta: 'PROVISAO_13',           credito: p13 },
        { conta: 'PROVISAO_ENC_13',       credito: e13 }
      ]
    };
  };

  /** Consolida as provisões da competência inteira. */
  E.provisoesDaFolha = function (folhas, prm, opts) {
    var out = { ferias: 0, terco: 0, encargosFerias: 0, decimo: 0, encargosDecimo: 0, total: 0, porColaborador: [] };
    (folhas || []).forEach(function (f) {
      var p = E.provisaoMensal(f.colaborador, f.bases.provisao != null ? f.bases.provisao : f.bases.inss, prm, f.estadoProvisao, opts);
      if (p.ferias) {
        out.ferias = r2(out.ferias + nz(p.ferias.principal));
        out.terco = r2(out.terco + nz(p.ferias.terco));
        out.encargosFerias = r2(out.encargosFerias + nz(p.ferias.encargos));
      }
      if (p.decimoTerceiro) {
        out.decimo = r2(out.decimo + nz(p.decimoTerceiro.principal));
        out.encargosDecimo = r2(out.encargosDecimo + nz(p.decimoTerceiro.encargos));
      }
      out.total = r2(out.total + nz(p.totalProvisaoMes));
      out.porColaborador.push({ matricula: f.matricula, nome: f.nome, provisao: p });
    });
    return out;
  };

  /* ==========================================================================
   * 4.4 CUSTO TOTAL DO COLABORADOR (para o painel Orçado x Realizado)
   * custoEmpresa = remuneração bruta
   *              + encargos incidentes (INSS 20% + RAT x FAP + 5,8% + PIS 1%)
   *              + FGTS
   *              + provisões (férias + 1/3 + 13º e seus encargos)
   *              + benefícios custeados (VT patronal, plano de saúde patronal)
   * ======================================================================== */

  E.custoColaborador = function (folha, prm, opts) {
    var rem = r2(nz(folha.totais.proventos));
    var baseEnc = r2(nz(folha.bases.inss));
    var baseFgts = r2(nz(folha.bases.fgts));
    var pp = prm.patronal;
    var fap = (opts && nz(opts.fap) > 0) ? nz(opts.fap) : pp.fap;
    var aliqFgts = folha.vinculo === 'MENOR_APRENDIZ' ? prm.fgts.aprendiz : prm.fgts.geral;

    var enc = {
      inssPatronal: arred(baseEnc * pp.inssPatronal),
      rat: arred(baseEnc * pp.rat * fap),
      terceiros: arred(baseEnc * pp.terceiros.total),
      pisFolha: arred(baseEnc * pp.pisFolha),
      fgts: arred(baseFgts * aliqFgts)
    };
    var totalEnc = r2(enc.inssPatronal + enc.rat + enc.terceiros + enc.pisFolha + enc.fgts);

    var prov = E.provisaoMensal(folha.colaborador, baseEnc, prm, folha.estadoProvisao, opts);
    var beneficiosPatronais = r2(nz(folha.custosPatronais && folha.custosPatronais.total));

    return {
      matricula: folha.matricula, nome: folha.nome, vinculo: folha.vinculo,
      remuneracaoBruta: rem,
      encargos: enc, totalEncargos: totalEnc,
      provisoes: prov.totalProvisaoMes || 0,
      beneficiosPatronais: beneficiosPatronais,
      custoTotal: r2(rem + totalEnc + (prov.totalProvisaoMes || 0) + beneficiosPatronais),
      indiceCusto: rem > 0 ? rN((r2(rem + totalEnc + (prov.totalProvisaoMes || 0) + beneficiosPatronais)) / rem, 4) : 0
    };
  };

  LNB.encargos = E;

})(globalThis.LNBPayroll);
/* =============================================================================
 * BLOCO 5 — EVENTOS ESPECIAIS: RESCISÃO E DISSÍDIO COLETIVO
 * ========================================================================== */

;(function (LNB) {
  'use strict';
  var U = LNB.util, r2 = U.r2, rN = U.rN, nz = U.nz;
  var truncaTributo = U.arred, arred = r2;   // verbas arredondam; FGTS trunca
  var R = LNB.retencoes;

  var X = {};

  /* ==========================================================================
   * 5.1 AUXILIARES DE AVOS
   * ======================================================================== */

  /** Avos de 13º: meses do ANO com 15 dias ou mais trabalhados. */
  X.avosDecimo = function (admissao, desligamento) {
    var ini = U.dt(admissao), fim = U.dt(desligamento);
    var ano = fim.getUTCFullYear();
    var avos = 0;
    for (var m = 0; m < 12; m++) {
      var primeiro = new Date(Date.UTC(ano, m, 1));
      var ultimo = new Date(Date.UTC(ano, m + 1, 0));
      if (ultimo < ini || primeiro > fim) continue;
      var de = primeiro < ini ? ini : primeiro;
      var ate = ultimo > fim ? fim : ultimo;
      var dias = Math.round((ate - de) / 86400000) + 1;
      if (dias >= 15) avos++;
    }
    return Math.min(12, avos);
  };

  /**
   * Avos de férias proporcionais: períodos de 1 mês contados a partir do
   * início do período aquisitivo; fração final >= 15 dias conta 1 avo.
   */
  X.avosFerias = function (inicioAquisitivo, desligamento) {
    var ini = U.dt(inicioAquisitivo), fim = U.dt(desligamento);
    if (fim < ini) return 0;
    var avos = 0;
    var cursor = new Date(ini.getTime());
    while (true) {
      var prox = new Date(cursor.getTime());
      prox.setUTCMonth(prox.getUTCMonth() + 1);
      if (prox <= fim) { avos++; cursor = prox; if (avos >= 12) break; }
      else {
        var dias = Math.round((fim - cursor) / 86400000) + 1;
        if (dias >= 15) avos++;
        break;
      }
    }
    return Math.min(12, avos);
  };

  /** Aviso prévio proporcional — Lei 12.506/2011: 30 + 3 por ano, máx. 90. */
  X.diasAvisoPrevio = function (admissao, desligamento) {
    var anos = Math.floor(U.diasEntre(admissao, desligamento) / 365.25);
    return Math.min(90, 30 + 3 * anos);
  };

  /** Início do período aquisitivo em aberto na data do desligamento. */
  X.inicioAquisitivoAberto = function (admissao, desligamento, periodosGozadosOuPagos) {
    var n = nz(periodosGozadosOuPagos);
    var d = U.dt(admissao);
    d.setUTCFullYear(d.getUTCFullYear() + n);
    return U.iso(d);
  };

  /* ==========================================================================
   * 5.2 MATRIZ DE VERBAS POR MOTIVO DE RESCISÃO
   * --------------------------------------------------------------------------
   * SJC  = Dispensa SEM justa causa
   * PED  = Pedido de demissão
   * ACO  = Acordo (art. 484-A CLT)
   * JC   = Dispensa POR justa causa
   * TPD  = Término normal de contrato por prazo determinado
   * RI   = Rescisão indireta (art. 483) — equivale a SJC
   * ======================================================================== */

  X.MOTIVOS = {
    SEM_JUSTA_CAUSA:  { cod: 'SEM_JUSTA_CAUSA',  esocial: '02', saldo: true, avisoDevido: 'EMPREGADOR', avisoFator: 1.0,
                        decimoProp: true, feriasVencidas: true, feriasProp: true, multaFGTS: 0.40, saqueFGTS: 1.00, seguroDesemprego: true },
    RESCISAO_INDIRETA:{ cod: 'RESCISAO_INDIRETA',esocial: '03', saldo: true, avisoDevido: 'EMPREGADOR', avisoFator: 1.0,
                        decimoProp: true, feriasVencidas: true, feriasProp: true, multaFGTS: 0.40, saqueFGTS: 1.00, seguroDesemprego: true },
    PEDIDO_DEMISSAO:  { cod: 'PEDIDO_DEMISSAO',  esocial: '07', saldo: true, avisoDevido: 'EMPREGADO', avisoFator: 1.0,
                        decimoProp: true, feriasVencidas: true, feriasProp: true, multaFGTS: 0.00, saqueFGTS: 0.00, seguroDesemprego: false },
    ACORDO_484A:      { cod: 'ACORDO_484A',      esocial: '33', saldo: true, avisoDevido: 'EMPREGADOR', avisoFator: 0.5,
                        decimoProp: true, feriasVencidas: true, feriasProp: true, multaFGTS: 0.20, saqueFGTS: 0.80, seguroDesemprego: false },
    JUSTA_CAUSA:      { cod: 'JUSTA_CAUSA',      esocial: '06', saldo: true, avisoDevido: null, avisoFator: 0,
                        decimoProp: false, feriasVencidas: true, feriasProp: false, multaFGTS: 0.00, saqueFGTS: 0.00, seguroDesemprego: false },
    TERMINO_PRAZO:    { cod: 'TERMINO_PRAZO',    esocial: '08', saldo: true, avisoDevido: null, avisoFator: 0,
                        decimoProp: true, feriasVencidas: true, feriasProp: true, multaFGTS: 0.00, saqueFGTS: 1.00, seguroDesemprego: false },
    CULPA_RECIPROCA:  { cod: 'CULPA_RECIPROCA',  esocial: '04', saldo: true, avisoDevido: 'EMPREGADOR', avisoFator: 0.5,
                        decimoProp: 'METADE', feriasVencidas: true, feriasProp: 'METADE', multaFGTS: 0.20, saqueFGTS: 1.00, seguroDesemprego: false },
    MORTE:            { cod: 'MORTE',            esocial: '10', saldo: true, avisoDevido: null, avisoFator: 0,
                        decimoProp: true, feriasVencidas: true, feriasProp: true, multaFGTS: 0.00, saqueFGTS: 1.00, seguroDesemprego: false }
  };

  /* ==========================================================================
   * 5.3 CÁLCULO DE RESCISÃO
   * --------------------------------------------------------------------------
   * ENTRADAS:
   *   colab  : cadastro completo
   *   resc   : {
   *              data: 'YYYY-MM-DD',
   *              motivo: 'SEM_JUSTA_CAUSA' | ...,
   *              avisoPrevio: 'INDENIZADO' | 'TRABALHADO' | 'DISPENSADO',
   *              periodosFeriasQuitados: 2,      // p/ achar o aquisitivo aberto
   *              feriasVencidasPeriodos: 1,      // períodos completos não gozados
   *              mediaVariaveis: 0,              // média de HE/adicionais (Súm.253/347)
   *              saldoFGTSConta: 0,              // extrato da conta vinculada
   *              faltasNoAquisitivo: 0
   *            }
   *
   * INCIDÊNCIAS (crítico para não errar a GFIP/eSocial):
   *   VERBA                              INSS   FGTS   IRRF
   *   Saldo de salário .................  SIM    SIM    SIM
   *   Aviso prévio INDENIZADO ..........  NÃO    SIM    NÃO
   *   Aviso prévio TRABALHADO ..........  SIM    SIM    SIM
   *   13º proporcional .................  SIM*   SIM    SIM* (*base própria/exclusiva)
   *   13º sobre aviso indenizado .......  SIM    SIM    SIM
   *   Férias vencidas indenizadas + 1/3   NÃO    NÃO    NÃO (**)
   *   Férias proporcionais + 1/3 .......  NÃO    NÃO    NÃO
   *   Férias GOZADAS no aviso trabalhado  SIM    SIM    SIM
   *   Multa 40% / 20% do FGTS ..........  NÃO    NÃO    NÃO
   *   (**) A contabilidade da LNB TRIBUTA as férias vencidas indenizadas pelo
   *        IRRF (conferido no desligamento de 17/07/2026, IRRF 235,45 exato).
   *        Controlado por CFG.tributarFeriasVencidasIndenizadas.
   *
   * PRAZO DE PAGAMENTO: 10 dias corridos do desligamento (art. 477 §6º CLT).
   * Multa do art. 477 §8º = 1 salário nominal em caso de atraso.
   * ======================================================================== */

  X.rescisao = function (colab, resc, prm) {
    var M = X.MOTIVOS[resc.motivo];
    if (!M) throw new Error('Motivo de rescisão inválido: ' + resc.motivo);

    var div = LNB.CFG.divisorDiasMes;
    var salario = nz(colab.salarioBase || colab.bolsaAuxilio);
    var media = nz(resc.mediaVariaveis);
    var remuneracao = r2(salario + media);
    var salDia = remuneracao / div;

    var proventos = [], descontos = [];
    var baseINSSMensal = 0, baseINSSDecimo = 0, baseFGTS = 0, baseFGTSDecimo = 0;
    var baseIRRFMensal = 0, baseIRRFDecimo = 0;

    var dataDesl = resc.data;
    var ehEstagiario = colab.vinculo === 'ESTAGIARIO';

    /* ---- 1) SALDO DE SALÁRIO ------------------------------------------- */
    var diaDesl = U.dt(dataDesl).getUTCDate();
    var diasSaldo = diaDesl;
    var vSaldo = arred(salDia * diasSaldo);
    proventos.push({ rubrica: ehEstagiario ? '8797' : '9180',
                     descricao: ehEstagiario ? 'DIAS BOLSA AUXILIO' : 'SALDO DE SALARIO DIAS',
                     referencia: diasSaldo, valor: vSaldo });
    if (!ehEstagiario) { baseINSSMensal += vSaldo; baseFGTS += vSaldo; baseIRRFMensal += vSaldo; }
    else { baseIRRFMensal += vSaldo; }

    /* ---- 2) AVISO PRÉVIO ------------------------------------------------ */
    var diasAviso = 0, vAviso = 0, dataProjetada = dataDesl;
    if (M.avisoDevido === 'EMPREGADOR' && !ehEstagiario) {
      diasAviso = Math.round(X.diasAvisoPrevio(colab.admissao, dataDesl) * M.avisoFator);
      if (resc.avisoPrevio === 'INDENIZADO' || resc.avisoPrevio === undefined) {
        vAviso = arred(salDia * diasAviso);
        proventos.push({ rubrica: '150', descricao: 'AVISO PREVIO INDENIZADO', referencia: diasAviso, valor: vAviso });
        baseFGTS += vAviso;                              // Súmula 305 TST
        // Projeção do contrato para efeito de avos (OJ 82 SDI-1 / Súm. 371)
        dataProjetada = U.addDias(dataDesl, diasAviso);
      }
    } else if (M.avisoDevido === 'EMPREGADO' && resc.avisoPrevio === 'NAO_CUMPRIDO') {
      var vDesconto = arred(salDia * 30);
      descontos.push({ rubrica: '240', descricao: 'AVISO PREVIO NAO CUMPRIDO', referencia: 30, valor: vDesconto });
    }

    /* ---- 3) 13º SALÁRIO PROPORCIONAL ------------------------------------ */
    var avos13 = 0, vDecimo = 0;
    if (M.decimoProp) {
      /* avosDecimoInformado: usado quando os avos vêm de fora do algoritmo —
         ex.: gratificação de 13º do estagiário, que é liberalidade da LNB e
         segue a política interna, não a regra do art. 1º da Lei 4.090/62. */
      avos13 = resc.avosDecimoInformado != null
        ? nz(resc.avosDecimoInformado)
        : X.avosDecimo(colab.admissao, dataProjetada);
      if (M.decimoProp === 'METADE') avos13 = avos13 / 2;
      vDecimo = arred(remuneracao / 12 * avos13);
      if (vDecimo > 0) {
        proventos.push({
          rubrica: ehEstagiario ? '8470' : '8550',
          descricao: ehEstagiario ? 'BOLSA GRATIFICACAO 13º' : '13 SALARIO INTEGRAL RESCISAO',
          referencia: rN(avos13, 2), valor: vDecimo
        });
        if (!ehEstagiario) { baseINSSDecimo += vDecimo; baseFGTSDecimo += vDecimo; baseIRRFDecimo += vDecimo; }
        else { baseIRRFMensal += vDecimo; }
      }
    }

    /* ---- 4) FÉRIAS VENCIDAS + 1/3 --------------------------------------- */
    var vFeriasVenc = 0, vTercoVenc = 0;
    var periodosVencidos = nz(resc.feriasVencidasPeriodos);
    if (M.feriasVencidas && periodosVencidos > 0) {
      vFeriasVenc = arred(remuneracao * periodosVencidos);
      vTercoVenc = arred(vFeriasVenc / 3);
      proventos.push({ rubrica: ehEstagiario ? '8489' : '28',
                       descricao: ehEstagiario ? 'BOLSA AUXILIO FERIAS VENCIDAS' : 'FERIAS VENCIDAS',
                       referencia: periodosVencidos, valor: vFeriasVenc });
      if (!ehEstagiario && !prm.convencao.estagiario) { /* noop */ }
      if (!ehEstagiario) {
        proventos.push({ rubrica: '64', descricao: '1/3 FERIAS RESCISAO', referencia: 33.33, valor: vTercoVenc });
        if (LNB.CFG.tributarFeriasVencidasIndenizadas) baseIRRFMensal += vFeriasVenc;
      }
    }

    /* ---- 5) FÉRIAS PROPORCIONAIS + 1/3 ---------------------------------- */
    var avosFerias = 0, vFeriasProp = 0, vTercoProp = 0;
    if (M.feriasProp) {
      var inicioAq = resc.inicioAquisitivoAberto ||
        X.inicioAquisitivoAberto(colab.admissao, dataDesl, nz(resc.periodosFeriasQuitados));
      avosFerias = resc.avosFeriasInformado != null
        ? nz(resc.avosFeriasInformado)
        : X.avosFerias(inicioAq, dataProjetada);
      if (M.feriasProp === 'METADE') avosFerias = avosFerias / 2;
      // Art. 130 CLT: faltas injustificadas no aquisitivo reduzem os dias
      var escala = R.escalaFaltasFerias(nz(resc.faltasNoAquisitivo));
      var fatorFaltas = escala.diasFerias / 30;
      vFeriasProp = arred(remuneracao / 12 * avosFerias * fatorFaltas);
      vTercoProp = arred(vFeriasProp / 3);
      if (vFeriasProp > 0) {
        proventos.push({ rubrica: ehEstagiario ? '8490' : '29',
                         descricao: ehEstagiario ? 'BOLSA AUXILIO FERIAS PROPORC' : 'FERIAS PROPORCIONAIS',
                         referencia: rN(avosFerias, 2), valor: vFeriasProp });
        if (!ehEstagiario) {
          proventos.push({ rubrica: '8169', descricao: '1/3 FERIAS PROPORCIONAIS RESCI', referencia: 33.33, valor: vTercoProp });
        }
      }
    }

    /* ---- 6) RETENÇÕES ---------------------------------------------------- */
    var totalProventos = U.soma(proventos, 'valor');

    var inssMensal = { valor: 0 }, inssDecimo = { valor: 0 };
    if (!ehEstagiario) {
      if (baseINSSMensal > 0) {
        inssMensal = R.inss(baseINSSMensal, prm);
        descontos.push({ rubrica: '826', descricao: 'INSS SOBRE RESCISAO',
                         referencia: inssMensal.aliquotaEfetiva, valor: inssMensal.valor });
      }
      if (baseINSSDecimo > 0) {
        inssDecimo = R.inss(baseINSSDecimo, prm);
        descontos.push({ rubrica: '989', descricao: 'INSS 13 SAL.RESCISAO',
                         referencia: inssDecimo.aliquotaEfetiva, valor: inssDecimo.valor });
      }
    }

    // Pensão sobre verbas rescisórias, se o título judicial abranger
    var pensaoResc = 0;
    (colab.pensoes || []).forEach(function (p) {
      if (!p.incideSobreRescisao) return;
      var pct = nz(p.percentual); if (pct > 1) pct = pct / 100;
      pensaoResc = r2(pensaoResc + arred(r2(baseIRRFMensal - inssMensal.valor) * pct));
    });
    if (pensaoResc > 0) descontos.push({ rubrica: '210', descricao: 'PENSAO ALIMENTICIA', referencia: 0, valor: pensaoResc });

    var irrfMensal = R.irrf({
      rendimentoTributavel: baseIRRFMensal,
      inss: inssMensal.valor,
      dependentes: nz(colab.dependentesIRRF),
      pensao: pensaoResc,
      rubrica: '828', descricao: 'IRRF SOBRE RESCISAO'
    }, prm);
    if (irrfMensal.valor > 0) descontos.push(irrfMensal.itens[0]);

    var irrfDecimo = { valor: 0 };
    if (baseIRRFDecimo > 0) {
      irrfDecimo = R.irrfDecimoTerceiro({
        decimoBruto: baseIRRFDecimo, inssDecimo: inssDecimo.valor,
        dependentes: nz(colab.dependentesIRRF), pensaoDecimo: 0
      }, prm);
      if (irrfDecimo.valor > 0) {
        descontos.push({ rubrica: '828', descricao: 'IRRF 13º SOBRE RESCISAO',
                         referencia: rN(irrfDecimo.aliquota * 100, 2), valor: irrfDecimo.valor });
      }
    }

    // Contribuição assistencial (CCT) — sobre o saldo de salário
    var assist = R.contribuicaoAssistencial(colab, vSaldo, prm);
    if (assist.valor > 0) descontos.push(assist.itens[0]);

    // Descontos remanescentes informados (consignado, benefícios, adiantamentos)
    (resc.descontosAdicionais || []).forEach(function (d) { descontos.push(d); });

    var totalDescontos = U.soma(descontos, 'valor');
    var liquido = r2(totalProventos - totalDescontos);

    /* APRESENTAÇÃO NO EXTRATO MENSAL
       A contabilidade lança o líquido rescisório como DESCONTO (rubrica 51 —
       ou 8517 para estagiário) para que a folha do mês feche em zero: o
       pagamento sai fora da folha, pelo TRCT. Ative com
       resc.lancarLiquidoComoDesconto = true para conciliar com o extrato. */
    if (resc.lancarLiquidoComoDesconto && liquido > 0) {
      descontos.push({ rubrica: ehEstagiario ? '8517' : '51',
                       descricao: ehEstagiario ? 'LIQUIDO RESCISAO ESTAGIARIO' : 'LIQUIDO RESCISAO',
                       referencia: 0, valor: liquido });
      totalDescontos = r2(totalDescontos + liquido);
      liquido = 0;
    }

    /* ---- 7) FGTS: depósito do mês, multa e saque ------------------------ */
    var aliqFgts = colab.vinculo === 'MENOR_APRENDIZ' ? prm.fgts.aprendiz : prm.fgts.geral;
    /* O FGTS é apurado SEPARADAMENTE para a remuneração mensal e para o 13º
       (são linhas distintas no FGTS Digital / eSocial) e cada uma é truncada.
       Conferido: Gabriel -> trunc(2.029,23 x 8%) + trunc(2.088,92 x 8%)
       = 162,33 + 167,11 = 329,44 (8% sobre a soma daria 329,45). */
    var fgtsRescisorio = ehEstagiario ? 0
      : r2(truncaTributo(baseFGTS * aliqFgts) + truncaTributo(baseFGTSDecimo * aliqFgts));
    var saldoConta = r2(nz(resc.saldoFGTSConta) + fgtsRescisorio);
    var multaFGTS = M.multaFGTS > 0 ? truncaTributo(saldoConta * M.multaFGTS) : 0;
    var saqueDisponivel = M.saqueFGTS > 0 ? truncaTributo(r2(saldoConta + multaFGTS) * M.saqueFGTS) : 0;

    return {
      colaborador: colab.nome, matricula: colab.matricula,
      motivo: M.cod, codigoESocial: M.esocial,
      dataDesligamento: dataDesl, dataProjetadaAviso: dataProjetada,
      avisoPrevio: { dias: diasAviso, modalidade: resc.avisoPrevio || 'INDENIZADO', valor: vAviso },
      avos: { decimoTerceiro: rN(avos13, 2), ferias: rN(avosFerias, 2), feriasVencidas: periodosVencidos },
      proventos: proventos, descontos: descontos,
      bases: {
        inssMensal: r2(baseINSSMensal), inssDecimo: r2(baseINSSDecimo),
        fgts: r2(baseFGTS + baseFGTSDecimo), fgtsMensal: r2(baseFGTS),
        fgtsDecimo: r2(baseFGTSDecimo), irrfMensal: r2(baseIRRFMensal), irrfDecimo: r2(baseIRRFDecimo)
      },
      detalheINSS: { mensal: inssMensal, decimo: inssDecimo },
      detalheIRRF: { mensal: irrfMensal, decimo: irrfDecimo },
      totais: {
        proventos: totalProventos, descontos: totalDescontos, liquido: liquido,
        inss: r2(inssMensal.valor + inssDecimo.valor),
        irrf: r2(irrfMensal.valor + irrfDecimo.valor)
      },
      fgts: {
        aliquota: aliqFgts, baseRescisoria: r2(baseFGTS + baseFGTSDecimo), depositoRescisorio: fgtsRescisorio,
        saldoContaEstimado: saldoConta, percentualMulta: M.multaFGTS, multa: multaFGTS,
        percentualSaque: M.saqueFGTS, saqueDisponivel: saqueDisponivel,
        codigoSaque: M.cod === 'SEM_JUSTA_CAUSA' ? '01' : (M.cod === 'ACORDO_484A' ? '88' : (M.cod === 'TERMINO_PRAZO' ? '04' : null))
      },
      obrigacoes: {
        prazoPagamento: U.addDias(dataDesl, 10),
        multaArt477SeAtrasar: r2(salario),
        seguroDesemprego: M.seguroDesemprego,
        eventosESocial: ['S-2299 (desligamento)', 'S-1200 ou S-1210', 'S-5001/S-5011/S-5003'],
        guiaFGTSRescisorio: 'DAE/GRRF conforme o caso'
      },
      custoEmpresa: r2(totalProventos + fgtsRescisorio + multaFGTS +
        truncaTributo(r2(baseINSSMensal + baseINSSDecimo) * (prm.patronal.inssPatronal + prm.patronal.rat * prm.patronal.fap + prm.patronal.terceiros.total + prm.patronal.pisFolha)))
    };
  };

  /* ==========================================================================
   * 5.4 DISSÍDIO COLETIVO / ACORDO COLETIVO RETROATIVO
   * --------------------------------------------------------------------------
   * PROBLEMA: a CCT é assinada em (por ex.) setembro com efeitos retroativos a
   * maio. Os meses de maio a agosto JÁ ESTÃO FECHADOS, com GPS, FGTS, DCTFWeb
   * e eSocial transmitidos.
   *
   * ALGORITMO:
   *   1. Para cada competência C do período retroativo:
   *        a) recuperar a folha ORIGINAL fechada (snapshot imutável)
   *        b) recalcular a folha inteira com o salário novo, MANTENDO os
   *           mesmos eventos (dias, faltas, HE, férias) e a TABELA de INSS/IRRF
   *           daquela competência (params(C) — nunca a tabela do mês atual)
   *        c) diferenca(C) = folhaRecalculada(C) - folhaOriginal(C), rubrica a
   *           rubrica; o que interessa é a diferença de PROVENTOS e de BASES
   *   2. Somar as diferenças de proventos -> rubrica 160 DIFERENCA SALARIAL
   *      DISSIDIO, lançada na folha do MÊS DO PAGAMENTO.
   *   3. FATO GERADOR (regra que evita autuação):
   *        - INSS e IRRF: o fato gerador é o MÊS DO PAGAMENTO da diferença
   *          (art. 22 §único da Lei 8.212 c/c ADI 2 SRF/2009). Recolhe-se na
   *          GPS/DCTFWeb da competência do pagamento, SEM multa nem juros, se
   *          pago no prazo normal. NÃO retificar as GFIP/eSocial anteriores.
   *        - FGTS: é devido POR COMPETÊNCIA DE ORIGEM. Gera guia complementar
   *          de cada mês, COM atualização monetária e juros (JAM), e a folha
   *          precisa emitir uma GRF/DAE por competência.
   *        - IRRF: se as diferenças se referem a anos-calendário ANTERIORES,
   *          aplica-se o regime de RRA (art. 12-A da Lei 7.713/88): tabela
   *          acumulada = tabela mensal x número de meses a que se refere.
   *          Dentro do mesmo ano-calendário, soma-se ao rendimento do mês.
   *   4. Reflexos obrigatórios sobre o retroativo:
   *        - HE, DSR, adicional noturno e demais % sobre o salário
   *        - férias gozadas no período (diferença + 1/3)
   *        - 13º já pago (1ª parcela) -> diferença
   *        - rescisões ocorridas no período -> complemento rescisório (TRCT
   *          complementar e recolhimento da diferença de multa de 40%)
   * ======================================================================== */

  X.dissidio = function (colab, cfg, calcularFolhaFn) {
    var competencias = cfg.competencias || [];       // ['2026-05','2026-06',...]
    var linhas = [], totalDiferenca = 0, totalFGTSPorComp = [];

    competencias.forEach(function (C) {
      var prmC = LNB.params(C);
      var original = (cfg.folhasOriginais || {})[C];
      if (!original) return;

      var colabNovo = Object.assign({}, colab, { salarioBase: cfg.salarioNovo });
      var recalc = calcularFolhaFn(colabNovo, Object.assign({}, original.eventos, { competencia: C }));

      var difProventos = r2(recalc.totais.proventos - original.totais.proventos);
      var difBaseINSS  = r2(recalc.bases.inss - original.bases.inss);
      var difBaseFGTS  = r2(recalc.bases.fgts - original.bases.fgts);
      var difFGTS      = truncaTributo(difBaseFGTS * (colab.vinculo === 'MENOR_APRENDIZ' ? prmC.fgts.aprendiz : prmC.fgts.geral));

      totalDiferenca = r2(totalDiferenca + difProventos);
      totalFGTSPorComp.push({
        competencia: C, baseAdicional: difBaseFGTS, fgtsDevido: difFGTS,
        guia: 'GRF/DAE complementar da competência ' + C + ' (com JAM)'
      });

      linhas.push({
        competencia: C, tabelaUsada: prmC.vigencia,
        salarioAntigo: cfg.salarioAntigo, salarioNovo: cfg.salarioNovo,
        proventosOriginais: r2(original.totais.proventos),
        proventosRecalculados: r2(recalc.totais.proventos),
        diferencaProventos: difProventos,
        diferencaBaseINSS: difBaseINSS,
        diferencaBaseFGTS: difBaseFGTS,
        fgtsComplementar: difFGTS,
        detalheRubricas: X.diffRubricas(original.proventos, recalc.proventos)
      });
    });

    /* ---- Tributação da diferença na competência do PAGAMENTO ------------ */
    var prmPg = LNB.params(cfg.competenciaPagamento);
    var mesmoAno = competencias.every(function (C) {
      return C.slice(0, 4) === String(cfg.competenciaPagamento).slice(0, 4);
    });

    var patronal = {
      base: totalDiferenca,
      inssPatronal: truncaTributo(totalDiferenca * prmPg.patronal.inssPatronal),
      rat: truncaTributo(totalDiferenca * prmPg.patronal.rat * prmPg.patronal.fap),
      terceiros: truncaTributo(totalDiferenca * prmPg.patronal.terceiros.total),
      pisFolha: truncaTributo(totalDiferenca * prmPg.patronal.pisFolha)
    };
    patronal.total = r2(patronal.inssPatronal + patronal.rat + patronal.terceiros + patronal.pisFolha);

    return {
      colaborador: colab.nome, matricula: colab.matricula,
      periodoRetroativo: competencias,
      competenciaPagamento: cfg.competenciaPagamento,
      linhas: linhas,
      rubricaFolhaAtual: {
        rubrica: '160', descricao: 'DIFERENCA SALARIAL DISSIDIO',
        referencia: competencias.length, valor: totalDiferenca
      },
      regimeIRRF: mesmoAno ? 'SOMA_AO_MES_DE_PAGAMENTO' : 'RRA_ART_12A_LEI_7713',
      mesesRRA: mesmoAno ? null : competencias.length,
      fgtsComplementarPorCompetencia: totalFGTSPorComp,
      totalFGTSComplementar: U.soma(totalFGTSPorComp, 'fgtsDevido'),
      encargosPatronaisSobreDiferenca: patronal,
      instrucoesOperacionais: [
        'Lançar a rubrica 160 na folha de ' + cfg.competenciaPagamento + ' — o INSS e o IRRF seguem o fato gerador do pagamento.',
        'NÃO retificar as folhas fechadas: o eSocial recebe o valor no S-1200 da competência do pagamento.',
        'Emitir uma guia de FGTS complementar POR competência de origem, com juros e atualização (JAM).',
        'Se houve rescisão no período retroativo, gerar TRCT complementar e recolher a diferença da multa de 40%.',
        mesmoAno
          ? 'Diferenças do mesmo ano-calendário: somar ao rendimento do mês e aplicar a tabela mensal normal.'
          : 'Diferenças de anos anteriores: aplicar RRA (tabela acumulada = tabela mensal x ' + competencias.length + ' meses).'
      ]
    };
  };

  /** Diferença rubrica a rubrica entre duas listas de proventos. */
  X.diffRubricas = function (antes, depois) {
    var mapa = {};
    (antes || []).forEach(function (i) { mapa[i.rubrica] = { rubrica: i.rubrica, descricao: i.descricao, antes: nz(i.valor), depois: 0 }; });
    (depois || []).forEach(function (i) {
      if (!mapa[i.rubrica]) mapa[i.rubrica] = { rubrica: i.rubrica, descricao: i.descricao, antes: 0, depois: 0 };
      mapa[i.rubrica].depois = nz(i.valor);
    });
    return Object.keys(mapa).map(function (k) {
      var m = mapa[k]; m.diferenca = r2(m.depois - m.antes); return m;
    }).filter(function (m) { return m.diferenca !== 0; });
  };

  LNB.eventos = X;

})(globalThis.LNBPayroll);
/* =============================================================================
 * BLOCO 6 — PIPELINE DE EXECUÇÃO (ordem cronológica antianomalias)
 * -----------------------------------------------------------------------------
 * A ordem abaixo NÃO É NEGOCIÁVEL. Ela existe para quebrar as três dependências
 * circulares clássicas de folha:
 *
 *   (A) IRRF depende do INSS  -> INSS SEMPRE antes do IRRF.
 *   (B) IRRF depende da PENSÃO e a pensão em % do líquido depende do IRRF
 *       -> resolve-se com o IRRF "sombra" (sem pensão) no passo 12.
 *   (C) A margem consignável depende do líquido e o líquido depende do
 *       consignado -> a margem é calculada sobre a remuneração DISPONÍVEL
 *       (bruto - INSS - IRRF - pensão), nunca sobre o líquido final.
 *   (D) A base patronal depende do fechamento de TODOS os proventos
 *       -> encargos só rodam no passo 22, depois de fechar as bases individuais.
 *
 * PASSO  OPERAÇÃO
 *  01    Validar cadastro e vínculo
 *  02    Resolver competência e carregar tabelas daquela vigência
 *  03    Proventos fixos (salário / bolsa proporcional aos dias)
 *  04    Adicionais fixos (insalubridade x periculosidade, dupla função)
 *  05    Variáveis (horas extras, adicional noturno)
 *  06    DSR sobre variáveis
 *  07    Férias do mês (férias + 1/3 + abono + 1/3 abono)
 *  08    13º salário (1ª / 2ª parcela)
 *  09    Faltas, atrasos e perda de DSR  (REDUZEM as bases)
 *  10    Fechamento das BASES: INSS mensal / INSS férias / INSS 13º / FGTS / IRRF
 *  11    INSS (mensal + férias + diferença de férias + 13º)
 *  12    Salário-família (provento não tributável, testado contra o limite)
 *  13    IRRF sombra (sem pensão)  ->  pensão alimentícia  ->  IRRF definitivo
 *  14    Vale-transporte (6% x salário do mês, limitado ao custo real)
 *  15    Contribuição assistencial / sindical (CCT)
 *  16    Benefícios corporativos com teto
 *  17    Consignado com trava de margem
 *  18    Adiantamentos (salarial, de férias, 1ª parcela do 13º)
 *  19    Validação do art. 462 CLT (líquido não negativo)
 *  20    LÍQUIDO A RECEBER
 *  21    FGTS individual do mês
 *  22    Provisões (férias + 1/3 + 13º + encargos)
 *  --- consolidação da competência ---
 *  23    Bases patronais agregadas
 *  24    Encargos patronais e guias (GPS/DCTFWeb, GRF FGTS, DARF IRRF, PIS-folha)
 * ========================================================================== */

;(function (LNB) {
  'use strict';
  var U = LNB.util, r2 = U.r2, rN = U.rN, nz = U.nz;
  var truncaTributo = U.arred, arred = r2;
  var P = LNB.proventos, R = LNB.retencoes, E = LNB.encargos, X = LNB.eventos;

  var F = {};

  /* --------------------------------------------------------------------------
   * PASSO 01 — VALIDAÇÃO DE CADASTRO
   * ------------------------------------------------------------------------ */
  F.validarCadastro = function (colab) {
    var erros = [];
    var v = LNB.VINCULOS[colab.vinculo];
    if (!v) { erros.push('Vínculo inválido: ' + colab.vinculo); return erros; }
    v.camposObrigatorios.forEach(function (c) {
      var val = colab[c];
      if (val === undefined || val === null || val === '' || (typeof val === 'number' && !isFinite(val))) {
        erros.push('Campo obrigatório ausente para ' + v.codigo + ': ' + c);
      }
    });
    if (colab.vinculo === 'ESTAGIARIO') {
      if (nz(colab.horasMes) > 150) erros.push('Estagiário: jornada acima de 30h/semana (Lei 11.788 art. 10).');
      if (colab.admissao && colab.terminoPrevisto &&
          U.diasEntre(colab.admissao, colab.terminoPrevisto) > 731 && !colab.pcd) {
        erros.push('Estagiário: contrato acima de 2 anos (Lei 11.788 art. 11).');
      }
    }
    if (colab.vinculo === 'MENOR_APRENDIZ') {
      if (colab.dataNascimento) {
        var idade = Math.floor(U.diasEntre(colab.dataNascimento, U.iso(new Date())) / 365.25);
        if ((idade < 14 || idade > 24) && !colab.pcd) erros.push('Aprendiz: idade fora da faixa 14–24 anos.');
      }
      if (colab.insalubridade && nz(colab.insalubridade.grau) > 0) erros.push('Aprendiz: vedado trabalho insalubre (art. 405 CLT).');
      if (colab.periculosidade) erros.push('Aprendiz: vedado trabalho perigoso (art. 405 CLT).');
    }
    /* Piso: salário nunca abaixo do mínimo proporcional à jornada contratada
       (art. 7º IV CF + Súmula 356 TST). Para horista, salarioHora mínimo. */
    var prmHoje = LNB.params(U.compDe(U.iso(new Date())));
    if (colab.vinculo === 'CLT_HORISTA') {
      var minHora = prmHoje.salarioMinimo / 220;
      if (nz(colab.salarioHora) > 0 && nz(colab.salarioHora) < minHora - 0.005) {
        erros.push('Salário-hora (' + U.brl(colab.salarioHora) + ') abaixo do mínimo/hora (' + U.brl(minHora) + ').');
      }
    } else if (colab.vinculo !== 'ESTAGIARIO') {
      var horasContr = nz(colab.horasMes) || 220;
      var pisoProporcional = U.r2(prmHoje.salarioMinimo / 220 * horasContr);
      if (nz(colab.salarioBase) > 0 && nz(colab.salarioBase) < pisoProporcional - 0.005) {
        erros.push('Salário (' + U.brl(colab.salarioBase) + ') abaixo do piso proporcional à jornada (' + U.brl(pisoProporcional) + ').');
      }
    }
    if (colab.insalubridade && nz(colab.insalubridade.grau) > 0 && colab.periculosidade) {
      erros.push('AVISO: insalubridade e periculosidade não acumulam (art. 193 §2º) — o motor manterá o mais vantajoso.');
    }
    return erros;
  };

  /* --------------------------------------------------------------------------
   * CÁLCULO DA FOLHA DE UM COLABORADOR
   * @param colab  cadastro
   * @param evt    eventos do mês
   * ------------------------------------------------------------------------ */
  F.calcularColaborador = function (colab, evt) {
    evt = evt || {};
    var competencia = evt.competencia || U.compDe(U.iso(new Date()));
    var prm = LNB.params(competencia);                       // PASSO 02
    var vinc = LNB.VINCULOS[colab.vinculo] || LNB.VINCULOS.CLT_MENSALISTA;
    var ehEstagiario = colab.vinculo === 'ESTAGIARIO';

    var avisos = F.validarCadastro(colab);
    var proventos = [], descontos = [], informativas = [];

    /* -- Rescisão tem pipeline próprio ------------------------------------ */
    if (evt.rescisao) {
      var resc = X.rescisao(colab, Object.assign({}, evt.rescisao), prm);
      resc.competencia = competencia;
      resc.avisosCadastro = avisos;
      return F.embrulharRescisao(colab, resc, prm);
    }

    /* -- PASSO 03: proventos fixos ---------------------------------------- */
    var base = P.remuneracaoBase(colab, evt, { prm: prm });
    proventos.push(base);
    var salarioDoMes = base.valor;                           // base do VT e da CCT

    /* -- PASSO 04: adicionais fixos --------------------------------------- */
    var ins = P.insalubridade(colab, prm);
    var per = P.periculosidade(colab, prm);
    var adicFixo = P.resolverInsalPericul(ins, per);
    adicFixo.itens.forEach(function (i) { proventos.push(i); });

    var dupla = P.duplaFuncao(colab, evt);
    dupla.itens.forEach(function (i) { proventos.push(i); });

    var totalAdicionaisFixos = r2(adicFixo.valor + dupla.valor);

    /* -- PASSO 05: variáveis ---------------------------------------------- */
    var he = P.horasExtras(colab, evt.horasExtras, totalAdicionaisFixos, prm);
    he.itens.forEach(function (i) { proventos.push(i); });

    var noturno = { total: 0, itens: [] };
    if (nz(evt.horasNoturnas) > 0) {
      noturno = P.adicionalNoturno(colab, nz(evt.horasNoturnas), prm, { percentualCCT: colab.percentualNoturnoCCT });
      noturno.itens.forEach(function (i) { proventos.push(i); });
    }

    var totalVariaveis = r2(he.total + noturno.total + nz(evt.comissoes) + nz(evt.premiosHabituais));
    if (nz(evt.comissoes) > 0) proventos.push({ rubrica: '105', descricao: 'COMISSOES', referencia: 0, valor: r2(evt.comissoes) });
    if (nz(evt.premiosHabituais) > 0) proventos.push({ rubrica: '106', descricao: 'PREMIOS/GRATIFICACOES', referencia: 0, valor: r2(evt.premiosHabituais) });

    /* -- PASSO 06: DSR sobre variáveis ------------------------------------ */
    var dsr = { valor: 0, itens: [] };
    if (totalVariaveis > 0) {
      var baseDSR = colab.vinculo === 'CLT_HORISTA' ? r2(totalVariaveis + base.valor) : totalVariaveis;
      dsr = P.dsrSobreVariaveis(colab, baseDSR, competencia, evt.feriados);
      dsr.itens.forEach(function (i) { proventos.push(i); });
    }

    /* -- PASSO 07: férias -------------------------------------------------- */
    var fer = P.ferias(colab, evt.ferias, prm);
    fer.itens.forEach(function (i) { proventos.push(i); });

    /* -- PASSO 08: 13º salário -------------------------------------------- */
    var dec = { bruto: 0, parcela: null };
    if (evt.decimoTerceiro) {
      var d13 = evt.decimoTerceiro;
      var avos = nz(d13.avos) || 12;
      var remuneracao13 = r2(nz(colab.salarioBase) + nz(d13.mediaVariaveis));
      var integral = arred(remuneracao13 / 12 * avos);
      if (d13.parcela === 1) {
        dec.bruto = arred(integral / 2);
        proventos.push({ rubrica: '170', descricao: '13 SALARIO 1a PARCELA', referencia: avos, valor: dec.bruto });
        dec.parcela = 1;
      } else {
        dec.bruto = integral;
        proventos.push({ rubrica: '171', descricao: '13 SALARIO 2a PARCELA', referencia: avos, valor: dec.bruto });
        if (nz(d13.adiantamentoPago) > 0) {
          descontos.push({ rubrica: '230', descricao: 'ADIANTAMENTO 13 SALARIO', referencia: 0, valor: r2(d13.adiantamentoPago) });
        }
        dec.parcela = 2;
      }
    }

    /* -- PASSO 09: faltas, atrasos e DSR perdido -------------------------- */
    var fa = R.faltasEAtrasos(colab, evt, prm);
    fa.itens.forEach(function (i) { descontos.push(i); });

    /* -- PASSO 10: fechamento das BASES ----------------------------------- */
    function somaBase(campo, incluirFerias) {
      var t = 0;
      proventos.forEach(function (p) {
        var rb = LNB.RUBRICAS[p.rubrica];
        if (!rb) return;
        if (rb.baseIRRF === 'FERIAS' && !incluirFerias && campo === 'irrf') return;
        if (rb.baseIRRF === 'DECIMO' && campo !== 'decimo') return;
        if (campo === 'decimo' && rb.baseIRRF !== 'DECIMO') return;
        var inc = rb[campo === 'decimo' ? 'irrf' : campo];
        if (inc === 'CFG_FERIAS_VENCIDAS') inc = LNB.CFG.tributarFeriasVencidasIndenizadas;
        if (inc === true) t = r2(t + nz(p.valor));
      });
      return t;
    }

    // Bases brutas, antes de abater faltas
    var baseINSSBruta = 0, baseFGTSBruta = 0, baseIRRFBruta = 0;
    proventos.forEach(function (p) {
      var rb = LNB.RUBRICAS[p.rubrica]; if (!rb) return;
      if (rb.baseIRRF === 'DECIMO') return;                 // 13º tem base própria
      if (rb.inss === true) baseINSSBruta = r2(baseINSSBruta + nz(p.valor));
      if (rb.fgts === true) baseFGTSBruta = r2(baseFGTSBruta + nz(p.valor));
      var incIR = rb.irrf === 'CFG_FERIAS_VENCIDAS' ? LNB.CFG.tributarFeriasVencidasIndenizadas : rb.irrf;
      if (incIR === true) baseIRRFBruta = r2(baseIRRFBruta + nz(p.valor));
    });

    // Faltas reduzem as bases
    var reducao = r2(fa.descontoFalta + fa.descontoDSR + fa.descontoAtraso);
    var baseINSSTotal = r2(Math.max(0, baseINSSBruta - reducao));
    var baseFGTSTotal = r2(Math.max(0, baseFGTSBruta - reducao));
    var baseIRRFTotal = r2(Math.max(0, baseIRRFBruta - reducao));

    // Segrega a parcela de férias (base e IRRF apurados em separado)
    var baseINSSFerias = ehEstagiario ? 0 : r2(Math.min(fer.baseINSS, baseINSSTotal));
    var baseINSSMensal = r2(baseINSSTotal - baseINSSFerias);
    var baseIRRFFerias = LNB.CFG.irrfFeriasSeparado ? r2(Math.min(fer.baseIRRF, baseIRRFTotal)) : 0;
    var baseIRRFMensal = r2(baseIRRFTotal - baseIRRFFerias);

    /* -- PASSO 11: INSS --------------------------------------------------- */
    var inssBloco = { itens: [], total: 0, base: 0, aliquotaEfetiva: 0, excedente: 0 };
    if (vinc.incide.inss && baseINSSTotal > 0) {
      // Múltiplos vínculos: teto do segurado já consumido em outro empregador
      var optsINSS = colab.inssOutrosVinculos
        ? { baseJaTributada: nz(colab.inssOutrosVinculos.baseJaTributada),
            valorJaRetido: nz(colab.inssOutrosVinculos.valorJaRetido) }
        : {};
      if (evt.ferias && nz(evt.ferias.inssFeriasInformado) > 0) {
        optsINSS.inssFeriasInformado = nz(evt.ferias.inssFeriasInformado);
      }
      inssBloco = R.inssComFerias(baseINSSMensal, baseINSSFerias, prm, optsINSS);
      inssBloco.itens.forEach(function (i) { descontos.push(i); });
    }
    var inssDecimo = { valor: 0 };
    var baseDecimo = dec.parcela === 2 || (dec.parcela === 1 ? 0 : 0) ? dec.bruto : 0;
    if (vinc.incide.inss && dec.parcela === 2 && dec.bruto > 0) {
      inssDecimo = R.inss(dec.bruto, prm);
      descontos.push({ rubrica: '998', descricao: 'I.N.S.S. 13º SALARIO',
                       referencia: inssDecimo.aliquotaEfetiva, valor: inssDecimo.valor });
    }

    /* -- PASSO 12: salário-família ---------------------------------------- */
    var sf = P.salarioFamilia(colab, baseINSSTotal, prm);
    sf.itens.forEach(function (i) { proventos.push(i); });

    /* -- PASSO 13: IRRF sombra -> pensão -> IRRF definitivo --------------- */
    var totalProventosParcial = U.soma(proventos, 'valor');

    /* O INSS dedutível na base MENSAL é o do salário do mês (rubricas 998 +
       821). O INSS de férias (rubrica 812) é dedutível na base de FÉRIAS —
       senão a dedução seria contada duas vezes. Conferido: Geiseane, base
       IRRF 1.741,06 = 2.363,33 - (188,37 + 54,72) - 2 x 189,59. */
    var inssDedutivelMensal = r2((inssBloco.inssMensal || 0) + (inssBloco.diferenca || 0));

    var irrfSombra = R.irrf({
      rendimentoTributavel: baseIRRFMensal,
      inss: inssDedutivelMensal,
      dependentes: nz(colab.dependentesIRRF),
      pensao: 0
    }, prm);

    var pensao = R.pensaoAlimenticia(colab, {
      totalProventos: totalProventosParcial,
      totalProventosTributaveis: baseIRRFTotal,
      inss: inssBloco.total || 0,
      irrfSemPensao: irrfSombra.valor
    }, prm);

    // Iteração opcional (só se o juízo exigir convergência exata)
    if (LNB.CFG.iterarPensaoLiquido && pensao.total > 0) {
      for (var it = 0; it < 5; it++) {
        var irrfIt = R.irrf({
          rendimentoTributavel: baseIRRFMensal, inss: inssDedutivelMensal,
          dependentes: nz(colab.dependentesIRRF), pensao: pensao.dedutivelIRRF
        }, prm);
        var novo = R.pensaoAlimenticia(colab, {
          totalProventos: totalProventosParcial, totalProventosTributaveis: baseIRRFTotal,
          inss: inssBloco.total || 0, irrfSemPensao: irrfIt.valor
        }, prm);
        if (Math.abs(novo.total - pensao.total) < 0.01) { pensao = novo; break; }
        pensao = novo;
      }
    }
    pensao.itens.forEach(function (i) { descontos.push(i); });

    var irrfMensal = R.irrf({
      rendimentoTributavel: baseIRRFMensal,
      inss: inssDedutivelMensal,
      dependentes: nz(colab.dependentesIRRF),
      pensao: pensao.dedutivelIRRF
    }, prm);
    irrfMensal.itens.forEach(function (i) { descontos.push(i); });

    var irrfFerias = { valor: 0, baseCalculo: 0 };
    if (baseIRRFFerias > 0) {
      irrfFerias = R.irrf({
        rendimentoTributavel: baseIRRFFerias,
        inss: inssBloco.inssFerias || 0,
        dependentes: 0,                      // dependentes já usados no mensal
        pensao: 0, rubrica: '999', descricao: 'IMPOSTO DE RENDA FERIAS'
      }, prm);
      irrfFerias.itens.forEach(function (i) { descontos.push(i); });
    }

    var irrfDecimo = { valor: 0, baseCalculo: 0 };
    if (dec.parcela === 2 && dec.bruto > 0) {
      irrfDecimo = R.irrfDecimoTerceiro({
        decimoBruto: dec.bruto, inssDecimo: inssDecimo.valor,
        dependentes: nz(colab.dependentesIRRF), pensaoDecimo: 0
      }, prm);
      if (irrfDecimo.valor > 0) {
        descontos.push({ rubrica: '999', descricao: 'IMPOSTO DE RENDA 13º SALARIO',
                         referencia: rN(irrfDecimo.aliquota * 100, 2), valor: irrfDecimo.valor });
      }
    }

    /* -- PASSO 14: vale-transporte ---------------------------------------- */
    var vt = R.valeTransporte(colab, salarioDoMes, evt.custoValeTransporte, prm);
    vt.itens.forEach(function (i) { descontos.push(i); });

    /* -- PASSO 15: contribuição assistencial ------------------------------ */
    var assist = R.contribuicaoAssistencial(colab, salarioDoMes, prm);
    assist.itens.forEach(function (i) { descontos.push(i); });

    /* -- PASSO 16: benefícios --------------------------------------------- */
    var ben = R.beneficios(colab, { totalProventos: totalProventosParcial }, prm);
    ben.itens.forEach(function (i) { descontos.push(i); });

    /* -- PASSO 17: consignado com trava de margem ------------------------- */
    var cons = R.consignado(colab, {
      totalProventos: totalProventosParcial,
      inss: r2((inssBloco.total || 0) + inssDecimo.valor),
      irrf: r2(irrfMensal.valor + irrfFerias.valor + irrfDecimo.valor),
      pensao: pensao.total
    }, prm);
    cons.itens.forEach(function (i) { descontos.push(i); });

    /* -- PASSO 18: adiantamentos ------------------------------------------ */
    if (fer.total > 0 && evt.ferias && evt.ferias.adiantar !== false) {
      var liquidoFerias = r2(fer.total - (inssBloco.inssFerias || 0) - irrfFerias.valor);
      descontos.push({ rubrica: '937', descricao: 'ADIANTAMENTO DE FERIAS', referencia: 0, valor: liquidoFerias });
      informativas.push({ rubrica: 'ADT-FER', descricao: 'Líquido de férias pago antecipadamente', valor: liquidoFerias });
    }
    if (nz(evt.adiantamentoSalarial) > 0) {
      descontos.push({ rubrica: '230', descricao: 'ADIANTAMENTO SALARIAL', referencia: 0, valor: r2(evt.adiantamentoSalarial) });
    }
    (evt.descontosAvulsos || []).forEach(function (d) { descontos.push(d); });

    /* -- PASSOS 19/20: validação e líquido -------------------------------- */
    var totalProventos = U.soma(proventos, 'valor');
    var totalDescontos = U.soma(descontos, 'valor');
    var obrigatorios = r2((inssBloco.total || 0) + inssDecimo.valor + irrfMensal.valor +
                          irrfFerias.valor + irrfDecimo.valor + pensao.total);
    /* Rubricas de ESTORNO (adiantamentos já pagos e líquido rescisório) não
       são desconto no sentido do art. 462 — não entram na trava dos 70%. */
    var ESTORNOS = ['937', '230', '51', '8517'];
    var totalEstornos = 0;
    descontos.forEach(function (d) { if (ESTORNOS.indexOf(d.rubrica) >= 0) totalEstornos = r2(totalEstornos + nz(d.valor)); });
    var val = R.validarDescontos(r2(totalProventos - totalEstornos), obrigatorios,
                                 r2(totalDescontos - obrigatorios - totalEstornos), prm);
    var liquido = r2(totalProventos - totalDescontos);

    /* -- PASSO 21: FGTS individual ---------------------------------------- */
    var aliqFgts = colab.vinculo === 'MENOR_APRENDIZ' ? prm.fgts.aprendiz : prm.fgts.geral;
    var baseFGTSDecimo = vinc.incide.fgts ? (dec.bruto || 0) : 0;
    var baseFGTSFinal = vinc.incide.fgts ? r2(baseFGTSTotal + baseFGTSDecimo) : 0;
    /* Mensal e 13º são linhas separadas no FGTS Digital: trunca cada uma. */
    var valorFGTS = vinc.incide.fgts
      ? r2(truncaTributo(baseFGTSTotal * aliqFgts) + truncaTributo(baseFGTSDecimo * aliqFgts))
      : 0;
    informativas.push({ rubrica: 'FGTS', descricao: 'F.G.T.S. DO MES',
                        referencia: rN(aliqFgts * 100, 2), base: baseFGTSFinal, valor: valorFGTS });

    /* -- PASSO 22: provisões ---------------------------------------------- */
    var provisao = E.provisaoMensal(colab, baseINSSTotal, prm, colab.estadoProvisao, { fap: prm.patronal.fap });

    /* -- Custos patronais de benefícios (não descontados) ----------------- */
    var custosPatronais = {
      valeTransporte: r2(vt.custoEmpresa || 0),
      planoSaude: r2(nz(colab.custoPatronalPlanoSaude)),
      outros: r2(nz(colab.outrosCustosPatronais))
    };
    custosPatronais.total = r2(custosPatronais.valeTransporte + custosPatronais.planoSaude + custosPatronais.outros);

    return {
      competencia: competencia,
      matricula: colab.matricula, nome: colab.nome, cpf: colab.cpf,
      vinculo: colab.vinculo, departamento: colab.departamento,
      centroCusto: colab.centroCusto, cbo: colab.cbo, filial: colab.filial || 1,
      situacao: 'TRABALHANDO',
      colaborador: colab,
      salarioContratual: r2(nz(colab.salarioBase || colab.bolsaAuxilio)),
      dependentes: nz(colab.dependentesIRRF),
      filhos: nz(colab.filhosSalarioFamilia),

      proventos: proventos,
      descontos: descontos,
      informativas: informativas,

      bases: {
        inss: r2(baseINSSTotal + (vinc.incide.inss ? (dec.parcela === 2 ? dec.bruto : 0) : 0)),
        inssMensal: baseINSSMensal, inssFerias: baseINSSFerias,
        inssDecimo: dec.parcela === 2 ? dec.bruto : 0,
        salarioContribuicao: r2(Math.min(baseINSSTotal, prm.inss.teto)),
        excedenteINSS: r2(Math.max(0, baseINSSTotal - prm.inss.teto)),
        fgts: baseFGTSFinal, fgtsRescisorio: 0,
        irrf: baseIRRFTotal,
        irrfMensal: irrfMensal.baseCalculo, irrfFerias: irrfFerias.baseCalculo,
        irrfDecimo: irrfDecimo.baseCalculo || 0,
        provisao: baseINSSTotal
      },

      detalhe: {
        inss: inssBloco, inssDecimo: inssDecimo,
        irrfMensal: irrfMensal, irrfFerias: irrfFerias, irrfDecimo: irrfDecimo,
        pensao: pensao, valeTransporte: vt, beneficios: ben, consignado: cons,
        faltas: fa, ferias: fer, horasExtras: he, adicionalNoturno: noturno,
        dsr: dsr, adicionalFixo: adicFixo, duplaFuncao: dupla, salarioFamilia: sf
      },

      totais: {
        proventos: totalProventos,
        descontos: totalDescontos,
        liquido: liquido,
        inss: r2((inssBloco.total || 0) + inssDecimo.valor),
        irrf: r2(irrfMensal.valor + irrfFerias.valor + irrfDecimo.valor),
        fgts: valorFGTS,
        salarioFamilia: sf.valor || 0,
        pensao: pensao.total
      },

      provisao: provisao,
      custosPatronais: custosPatronais,
      estadoProvisao: colab.estadoProvisao,
      avisos: avisos.concat(val.alertas).concat(ben.alertas)
        .concat(cons.rejeitados.map(function (r) { return { nivel: 'AVISO', codigo: 'CONSIGNADO_REJEITADO', detalhe: r }; }))
    };
  };

  /** Normaliza o retorno da rescisão para o mesmo formato da folha mensal. */
  F.embrulharRescisao = function (colab, resc, prm) {
    var vinc = LNB.VINCULOS[colab.vinculo] || {};
    return {
      competencia: resc.competencia, matricula: colab.matricula, nome: colab.nome,
      cpf: colab.cpf, vinculo: colab.vinculo, departamento: colab.departamento,
      centroCusto: colab.centroCusto, cbo: colab.cbo, filial: colab.filial || 1,
      situacao: 'DEMITIDO', colaborador: colab,
      salarioContratual: r2(nz(colab.salarioBase || colab.bolsaAuxilio)),
      proventos: resc.proventos, descontos: resc.descontos, informativas: [],
      bases: {
        inss: r2(resc.bases.inssMensal + resc.bases.inssDecimo),
        inssMensal: resc.bases.inssMensal, inssFerias: 0, inssDecimo: resc.bases.inssDecimo,
        salarioContribuicao: r2(Math.min(r2(resc.bases.inssMensal + resc.bases.inssDecimo), prm.inss.teto)),
        excedenteINSS: r2(Math.max(0, r2(resc.bases.inssMensal + resc.bases.inssDecimo) - prm.inss.teto)),
        /* A base do FGTS rescisório integra a base normal da competência —
           é assim que o extrato fecha (Base FGTS Rescisório = 0,00 e os
           4.118,15 do desligamento dentro dos 91.096,09 da base geral). */
        fgts: resc.bases.fgts, fgtsRescisorio: 0, baseFGTSDaRescisao: resc.bases.fgts,
        irrf: r2(resc.bases.irrfMensal + resc.bases.irrfDecimo), provisao: 0
      },
      detalhe: {
        rescisao: resc,
        irrfMensal: resc.detalheIRRF.mensal,
        irrfDecimo: resc.detalheIRRF.decimo,
        inss: { total: resc.totais.inss }
      },
      totais: {
        proventos: resc.totais.proventos, descontos: resc.totais.descontos,
        liquido: resc.totais.liquido, inss: resc.totais.inss, irrf: resc.totais.irrf,
        fgts: resc.fgts.depositoRescisorio, salarioFamilia: 0, pensao: 0
      },
      rescisao: resc,
      provisao: { totalProvisaoMes: 0, reversao: true },
      custosPatronais: { total: 0 },
      avisos: resc.avisosCadastro || []
    };
  };

  /* ==========================================================================
   * FECHAMENTO DA COMPETÊNCIA (passos 23 e 24)
   * ======================================================================== */

  F.fecharCompetencia = function (colaboradores, contexto) {
    contexto = contexto || {};
    var competencia = contexto.competencia;
    var prm = LNB.params(competencia);

    var folhas = (colaboradores || []).map(function (c) {
      var evt = Object.assign({ competencia: competencia }, (contexto.eventos || {})[c.matricula] || {});
      var f = F.calcularColaborador(c, evt);
      f.colaborador = c;
      return f;
    });

    var bases = E.montarBases(folhas);
    var enc = E.encargosPatronais(bases, prm, { fap: contexto.fap });
    var provisoes = E.provisoesDaFolha(folhas, prm, { fap: contexto.fap });

    /* ---- Totalizadores no formato do Extrato Mensal --------------------- */
    var totais = { proventos: 0, descontos: 0, liquido: 0, irrfMensal: 0, irrfFerias: 0, irrfDecimo: 0 };
    var porDepartamento = {}, porCentroCusto = {}, porRubrica = {};

    folhas.forEach(function (f) {
      totais.proventos = r2(totais.proventos + f.totais.proventos);
      totais.descontos = r2(totais.descontos + f.totais.descontos);
      totais.liquido   = r2(totais.liquido + f.totais.liquido);
      totais.irrfMensal= r2(totais.irrfMensal + ((f.detalhe.irrfMensal && f.detalhe.irrfMensal.valor) || 0));
      totais.irrfFerias= r2(totais.irrfFerias + ((f.detalhe.irrfFerias && f.detalhe.irrfFerias.valor) || 0));
      totais.irrfDecimo= r2(totais.irrfDecimo + ((f.detalhe.irrfDecimo && f.detalhe.irrfDecimo.valor) || 0));

      var dep = f.departamento || 'SEM DEPARTAMENTO';
      porDepartamento[dep] = porDepartamento[dep] || { proventos: 0, descontos: 0, liquido: 0 };
      porDepartamento[dep].proventos = r2(porDepartamento[dep].proventos + f.totais.proventos);
      porDepartamento[dep].descontos = r2(porDepartamento[dep].descontos + f.totais.descontos);
      porDepartamento[dep].liquido   = r2(porDepartamento[dep].liquido + f.totais.liquido);

      var cc = f.centroCusto || 'SEM CC';
      porCentroCusto[cc] = porCentroCusto[cc] || { proventos: 0, descontos: 0, liquido: 0 };
      porCentroCusto[cc].proventos = r2(porCentroCusto[cc].proventos + f.totais.proventos);
      porCentroCusto[cc].descontos = r2(porCentroCusto[cc].descontos + f.totais.descontos);
      porCentroCusto[cc].liquido   = r2(porCentroCusto[cc].liquido + f.totais.liquido);

      f.proventos.concat(f.descontos).forEach(function (i) {
        var k = i.rubrica;
        porRubrica[k] = porRubrica[k] || {
          rubrica: k, descricao: i.descricao,
          tipo: (LNB.RUBRICAS[k] && LNB.RUBRICAS[k].tipo) || 'P',
          referencia: 0, valor: 0
        };
        porRubrica[k].referencia = rN(porRubrica[k].referencia + nz(i.referencia), 2);
        porRubrica[k].valor = r2(porRubrica[k].valor + nz(i.valor));
      });
    });

    /* ---- Guias a recolher ------------------------------------------------ */
    var guias = {
      previdenciaria: {
        documento: 'DARF DCTFWeb (código 1410) — antiga GPS',
        competencia: competencia,
        vencimento: F.vencimentoDia20(competencia),
        segurados: bases.inssSegurados,
        patronal: enc.inssPatronal.valor,
        rat: enc.rat.valor,
        terceiros: enc.terceiros.valor,
        compensacaoSalarioFamilia: bases.salarioFamiliaCompensavel,
        total: enc.totalGuiaPrevidenciaria
      },
      fgts: {
        documento: 'DAE/FGTS Digital',
        competencia: competencia,
        vencimento: F.vencimentoDia20(competencia),
        base: r2(bases.baseFGTS + bases.baseFGTSAprendiz),
        total: enc.fgts.total
      },
      irrf: {
        documento: 'DARF DCTFWeb (código 0561)',
        competencia: competencia,
        vencimento: F.vencimentoDia20(competencia),
        baseMensal: 0, total: r2(totais.irrfMensal + totais.irrfFerias + totais.irrfDecimo)
      },
      pisFolha: {
        documento: 'DARF código 8301',
        competencia: competencia,
        vencimento: F.vencimentoDia25(competencia),
        base: enc.pisFolha.base, total: enc.pisFolha.valor
      }
    };

    return {
      competencia: competencia,
      parametros: { vigencia: prm.vigencia, fap: enc.rat.fap, arredondamento: LNB.CFG.arredondamento },
      folhas: folhas,
      bases: bases,
      encargos: enc,
      provisoes: provisoes,
      totais: totais,
      porDepartamento: porDepartamento,
      porCentroCusto: porCentroCusto,
      resumoPorRubrica: Object.keys(porRubrica).map(function (k) { return porRubrica[k]; })
        .sort(function (a, b) { return a.rubrica.localeCompare(b.rubrica, 'pt-BR', { numeric: true }); }),
      guias: guias,
      custoTotalEmpresa: r2(totais.proventos + enc.custoEmpresaEncargos + provisoes.total),
      situacoes: F.contarSituacoes(folhas),
      avisos: folhas.reduce(function (a, f) {
        return a.concat((f.avisos || []).map(function (av) {
          return { matricula: f.matricula, nome: f.nome, aviso: av };
        }));
      }, [])
    };
  };

  /** Vencimento dia 20 do mês seguinte, antecipado se cair em fim de semana. */
  F.vencimentoDia20 = function (competencia) { return F.ajustarUtil(U.addMeses(competencia, 1) + '-20'); };
  F.vencimentoDia25 = function (competencia) { return F.ajustarUtil(U.addMeses(competencia, 1) + '-25'); };
  F.ajustarUtil = function (isoData) {
    var d = U.dt(isoData), dow = d.getUTCDay();
    if (dow === 6) return U.addDias(isoData, -1);
    if (dow === 0) return U.addDias(isoData, -2);
    return isoData;
  };

  F.contarSituacoes = function (folhas) {
    var s = { empregados: 0, estagiarios: 0, aprendizes: 0, trabalhando: 0, demitidos: 0, ferias: 0 };
    folhas.forEach(function (f) {
      if (f.vinculo === 'ESTAGIARIO') s.estagiarios++;
      else if (f.vinculo === 'MENOR_APRENDIZ') { s.aprendizes++; s.empregados++; }
      else s.empregados++;
      if (f.situacao === 'DEMITIDO') s.demitidos++; else s.trabalhando++;
      if (f.detalhe && f.detalhe.ferias && f.detalhe.ferias.diasFerias > 0) s.ferias++;
    });
    return s;
  };

  LNB.folha = F;
  LNB.calcular = F.calcularColaborador;
  LNB.fechar = F.fecharCompetencia;

})(globalThis.LNBPayroll);
/* =============================================================================
 * BLOCO 7 — AUTOTESTE CONTRA A FOLHA REAL 07/2026
 * -----------------------------------------------------------------------------
 * Fonte: "2038 | 2026.07 | Extrato Mensal.pdf" — LIGA NACIONAL DE BASQUETE
 * Rode LNBPayroll.autoTeste() no console: qualquer divergência de centavo
 * aparece na lista de falhas. Use isso ANTES de publicar qualquer alteração
 * de tabela, alíquota ou regra de arredondamento.
 * ========================================================================== */

;(function (LNB) {
  'use strict';
  var r2 = LNB.util.r2, brl = LNB.util.brl;

  var COMP = '2026-07';

  /* ---- Cadastro dos colaboradores da folha 07/2026 --------------------- */
  function clt(matricula, nome, salario, extra) {
    return Object.assign({
      matricula: matricula, nome: nome, cpf: '000.000.000-00',
      vinculo: 'CLT_MENSALISTA', admissao: '2020-01-01',
      salarioBase: salario, horasMes: 220, cbo: '411010',
      departamento: 'LNB', centroCusto: '100101',
      dependentesIRRF: 0, filhosSalarioFamilia: 0, vtOptante: false
    }, extra || {});
  }
  function estag(matricula, nome, bolsa, extra) {
    return Object.assign({
      matricula: matricula, nome: nome, cpf: '000.000.000-00',
      vinculo: 'ESTAGIARIO', admissao: '2025-01-01', terminoPrevisto: '2026-12-31',
      bolsaAuxilio: bolsa, salarioBase: bolsa, horasMes: 150, cbo: '411010',
      instituicaoEnsino: 'IES', cursoNivel: 'SUPERIOR', supervisor: 'RH',
      apoliceSeguro: '0001', departamento: 'LNB', centroCusto: '300301',
      dependentesIRRF: 0, vtOptante: false
    }, extra || {});
  }

  var CASOS = [
    /* --- CLT mensalistas sem eventos (casos limpos) --------------------- */
    { c: clt(7, 'ARIOSVALDO PRADO SIMOES', 7317.00), e: {},
      esp: { inss: 825.88, irrf: 871.93, fgts: 585.36, liquido: 5534.19, baseIRRF: 6491.12, descontos: 1782.81 } },

    { c: clt(469, 'BRUNA CRISTINA ONGARO MOTTA', 5452.00), e: {},
      esp: { inss: 564.78, irrf: 170.88, fgts: 436.16, liquido: 4631.34, baseIRRF: 4844.80, descontos: 820.66 } },

    { c: clt(6, 'ERONILDO TELES DE MENEZES', 9147.00, { dependentesIRRF: 1 }), e: {},
      esp: { inss: 988.07, irrf: 1282.84, fgts: 731.76, liquido: 6791.09, baseIRRF: 7969.34, descontos: 2355.91 } },

    { c: clt(2, 'GUSTAVO DE OLIVEIRA MARINHEIRO', 5600.00), e: {},
      esp: { inss: 585.50, irrf: 231.28, fgts: 448.00, liquido: 4698.22, baseIRRF: 4992.80, descontos: 901.78 } },

    { c: clt(595, 'ISABEL DE AZEVEDO SOUZA', 5756.00), e: {},
      esp: { inss: 607.34, irrf: 294.91, fgts: 460.48, liquido: 4768.75, baseIRRF: 5148.66, descontos: 987.25 } },

    { c: clt(5, 'LILIAN CRISTINA LOPES GONCALVES', 13908.00,
        { beneficios: { planoSaude: { titular: 136.91 } } }), e: {},
      esp: { inss: 988.07, irrf: 2644.25, fgts: 1112.64, liquido: 10053.77, baseIRRF: 12919.93, descontos: 3854.23 } },

    { c: clt(13, 'LUCAS SOUZA DOS SANTOS', 6789.00,
        { dependentesIRRF: 1, duplaFuncao: { percentual: 20 } }), e: {},
      esp: { inss: 942.05, irrf: 1020.44, fgts: 651.74, liquido: 6099.31, baseIRRF: 7015.16,
             proventos: 8146.80, descontos: 2047.49 } },

    { c: clt(493, 'MARIA EDUARDA FIGUEIREDO MONTEIRO', 3141.00, { vtOptante: true }), e: {},
      esp: { inss: 265.50, irrf: 0, fgts: 251.28, liquido: 2636.78, baseIRRF: 2533.80, descontos: 504.22 } },

    { c: clt(610, 'PATRICIA DOS SANTOS PEREIRA', 5000.00, { vtOptante: true }), e: {},
      esp: { inss: 501.50, irrf: 0, fgts: 400.00, liquido: 4118.50, baseIRRF: 4392.80, descontos: 881.50 } },

    { c: clt(451, 'VICTORIA CRISTINA BARBOSA DE SOUZA', 3447.00), e: {},
      esp: { inss: 302.22, irrf: 0, fgts: 275.76, liquido: 3089.63, baseIRRF: 2839.80, descontos: 357.37 } },

    { c: clt(490, 'VIVIANE DE SILOS BERNAL CANO', 7368.00), e: {},
      esp: { inss: 833.02, irrf: 888.39, fgts: 589.44, liquido: 5561.59, baseIRRF: 6534.98, descontos: 1806.41 } },

    /* --- Teto do INSS já consumido em outro vínculo --------------------- */
    { c: clt(581, 'MARIO FERNANDES DE OLIVEIRA NETO', 4658.00,
        { vinculo: 'CLT_PRAZO_DETERMINADO', terminoPrevisto: '2026-12-31', horasMes: 40,
          inssOutrosVinculos: { baseJaTributada: 8475.55, valorJaRetido: 988.07 } }), e: {},
      esp: { inss: 0, irrf: 0, fgts: 372.64, liquido: 4583.47, baseIRRF: 4050.80, descontos: 74.53 } },

    /* --- Férias gozadas no mês (INSS em 3 rubricas) --------------------- */
    { c: clt(417, 'GEISEANE HONORATO DE ARAUJO', 3545.00, { dependentesIRRF: 2, vtOptante: true }),
      e: { diasTrabalhados: 20, ferias: { dias: 10 } },
      esp: { inss: 361.25, irrf: 0, fgts: 315.11, baseIRRF: 1741.06, proventos: 3938.89 } },

    /* --- Férias + abono pecuniário -------------------------------------- */
    { c: clt(525, 'PEDRO HENRIQUE SOUSA SANTANA', 3581.00, { dependentesIRRF: 2, vtOptante: true }),
      e: { diasTrabalhados: 17, ferias: { dias: 13, diasCompetenciaAnterior: 2, abonoPecuniarioDias: 10, inssFeriasInformado: 165.13 } },
      esp: { inss: 380.37, irrf: 0, fgts: 327.86, baseIRRF: 1422.03, proventos: 5689.81 } },

    /* --- Estagiários ---------------------------------------------------- */
    { c: estag(648, 'ALEXIA BARBEITO RIBEIRO DA SILVA', 1621.00), e: {},
      esp: { inss: 0, irrf: 0, fgts: 0, liquido: 1621.00, baseIRRF: 1013.80 } },

    { c: estag(611, 'EDUARDO MIRANDA HSU', 674.30), e: {},
      esp: { inss: 0, irrf: 0, fgts: 0, liquido: 674.30, baseIRRF: 67.10 } },

    { c: estag(475, 'LUIZ HENRIQUE XIMENES DA COSTA', 5000.00, { horasMes: 150 }), e: {},
      esp: { inss: 0, irrf: 0, fgts: 0, liquido: 5000.00, baseIRRF: 4392.80 } },

    { c: estag(649, 'STEPHANIE PIRES GRINBERG FONSECA', 1621.00),
      e: { diasTrabalhados: 10 },
      esp: { inss: 0, irrf: 0, fgts: 0, liquido: 540.33 } }
  ];

  /* ---- Rescisão real: pedido de demissão em 17/07/2026 ----------------- */
  var RESCISAO = {
    colab: clt(421, 'GABRIEL FRANCISCO MEDEIROS ROSSI', 3581.00,
      { admissao: '2023-11-21', centroCusto: '200121', departamento: 'COMUNICACAO' }),
    evt: {
      competencia: COMP,
      rescisao: {
        data: '2026-07-17', motivo: 'PEDIDO_DEMISSAO', avisoPrevio: 'DISPENSADO',
        periodosFeriasQuitados: 1, feriasVencidasPeriodos: 1,
        inicioAquisitivoAberto: '2025-11-21'
      }
    },
    esp: {
      proventos: 12075.93, saldoSalario: 2029.23, decimo: 2088.92,
      feriasVencidas: 3581.00, feriasProp: 2387.33, tercoVencidas: 1193.67, tercoProp: 795.78,
      inssMensal: 158.31, inssDecimo: 163.68, irrf: 235.45, assistencial: 32.47
    }
  };

  /* ---- Totalizadores patronais do extrato ------------------------------ */
  var PATRONAL_ESPERADO = {
    baseTotal: 91096.09,
    inssPatronal: 18219.21, rat: 910.96, terceiros: 5283.56,
    pis: 910.96, fgts: 7287.67, segurados: 8467.54, totalINSS: 32881.27
  };

  function comparar(nome, campo, obtido, esperado, falhas, tol) {
    tol = tol == null ? 0.005 : tol;
    if (esperado == null) return;
    if (Math.abs(r2(obtido) - r2(esperado)) > tol) {
      falhas.push({ caso: nome, campo: campo, esperado: r2(esperado), obtido: r2(obtido),
                    diferenca: r2(obtido - esperado) });
    }
  }

  LNB.autoTeste = function (opts) {
    opts = opts || {};
    var falhas = [], ok = 0, total = 0, linhas = [];

    CASOS.forEach(function (t) {
      var evt = Object.assign({ competencia: COMP }, t.e);
      var f = LNB.folha.calcularColaborador(t.c, evt);
      var antes = falhas.length;

      comparar(t.c.nome, 'INSS', f.totais.inss, t.esp.inss, falhas);
      comparar(t.c.nome, 'IRRF', f.totais.irrf, t.esp.irrf, falhas);
      comparar(t.c.nome, 'FGTS', f.totais.fgts, t.esp.fgts, falhas);
      comparar(t.c.nome, 'Proventos', f.totais.proventos, t.esp.proventos, falhas);
      comparar(t.c.nome, 'Descontos', f.totais.descontos, t.esp.descontos, falhas);
      comparar(t.c.nome, 'Líquido', f.totais.liquido, t.esp.liquido, falhas);
      comparar(t.c.nome, 'Base IRRF', f.detalhe.irrfMensal && f.detalhe.irrfMensal.baseCalculo, t.esp.baseIRRF, falhas);

      total++;
      if (falhas.length === antes) ok++;
      linhas.push({
        colaborador: t.c.nome, vinculo: t.c.vinculo,
        proventos: f.totais.proventos, inss: f.totais.inss, irrf: f.totais.irrf,
        fgts: f.totais.fgts, liquido: f.totais.liquido,
        status: falhas.length === antes ? 'OK' : 'DIVERGENTE'
      });
    });

    /* ---- Rescisão -------------------------------------------------------- */
    var fr = LNB.folha.calcularColaborador(RESCISAO.colab, RESCISAO.evt);
    var antesR = falhas.length;
    var rp = {};
    fr.proventos.forEach(function (p) { rp[p.rubrica] = p.valor; });
    var rd = {};
    fr.descontos.forEach(function (p) { rd[p.rubrica] = (rd[p.rubrica] || 0) + p.valor; });

    comparar('RESCISÃO Gabriel', 'Saldo de salário', rp['9180'], RESCISAO.esp.saldoSalario, falhas);
    comparar('RESCISÃO Gabriel', '13º rescisão', rp['8550'], RESCISAO.esp.decimo, falhas);
    comparar('RESCISÃO Gabriel', 'Férias vencidas', rp['28'], RESCISAO.esp.feriasVencidas, falhas);
    comparar('RESCISÃO Gabriel', '1/3 férias vencidas', rp['64'], RESCISAO.esp.tercoVencidas, falhas);
    comparar('RESCISÃO Gabriel', 'Férias proporcionais', rp['29'], RESCISAO.esp.feriasProp, falhas);
    comparar('RESCISÃO Gabriel', '1/3 férias prop.', rp['8169'], RESCISAO.esp.tercoProp, falhas);
    comparar('RESCISÃO Gabriel', 'Total proventos', fr.totais.proventos, RESCISAO.esp.proventos, falhas);
    comparar('RESCISÃO Gabriel', 'INSS s/ rescisão', rd['826'], RESCISAO.esp.inssMensal, falhas);
    comparar('RESCISÃO Gabriel', 'INSS 13º', rd['989'], RESCISAO.esp.inssDecimo, falhas);
    comparar('RESCISÃO Gabriel', 'IRRF s/ rescisão', rd['828'], RESCISAO.esp.irrf, falhas);
    comparar('RESCISÃO Gabriel', 'Contrib. assistencial', rd['231'], RESCISAO.esp.assistencial, falhas);
    total++; if (falhas.length === antesR) ok++;
    linhas.push({
      colaborador: RESCISAO.colab.nome, vinculo: 'RESCISÃO',
      proventos: fr.totais.proventos, inss: fr.totais.inss, irrf: fr.totais.irrf,
      fgts: fr.totais.fgts, liquido: fr.totais.liquido,
      status: falhas.length === antesR ? 'OK' : 'DIVERGENTE'
    });

    /* ---- Encargos patronais sobre a base real do extrato ---------------- */
    var prm = LNB.params(COMP);
    var enc = LNB.encargos.encargosPatronais({
      baseINSSPatronal: PATRONAL_ESPERADO.baseTotal,
      basePIS: PATRONAL_ESPERADO.baseTotal,
      baseFGTS: PATRONAL_ESPERADO.baseTotal,
      baseFGTSAprendiz: 0,
      inssSegurados: PATRONAL_ESPERADO.segurados,
      salarioFamiliaCompensavel: 0
    }, prm);

    var antesP = falhas.length;
    comparar('ENCARGOS', 'INSS Patronal 20%', enc.inssPatronal.valor, PATRONAL_ESPERADO.inssPatronal, falhas);
    comparar('ENCARGOS', 'RAT 1% x FAP', enc.rat.valor, PATRONAL_ESPERADO.rat, falhas);
    comparar('ENCARGOS', 'Terceiros 5,8%', enc.terceiros.valor, PATRONAL_ESPERADO.terceiros, falhas);
    comparar('ENCARGOS', 'PIS s/ folha 1%', enc.pisFolha.valor, PATRONAL_ESPERADO.pis, falhas);
    comparar('ENCARGOS', 'Total guia INSS', enc.totalGuiaPrevidenciaria, PATRONAL_ESPERADO.totalINSS, falhas);
    total++; if (falhas.length === antesP) ok++;

    var res = {
      competencia: COMP,
      modoArredondamento: LNB.CFG.arredondamento,
      casos: total, aprovados: ok, reprovados: total - ok,
      falhas: falhas, detalhe: linhas, encargos: enc
    };

    if (opts.log !== false && typeof console !== 'undefined') {
      console.log('=== AUTOTESTE MOTOR DE FOLHA LNB — competência ' + COMP + ' ===');
      console.log('Modo de arredondamento: ' + LNB.CFG.arredondamento);
      console.log('Casos: ' + total + ' | Aprovados: ' + ok + ' | Reprovados: ' + (total - ok));
      if (falhas.length) {
        console.log('--- DIVERGÊNCIAS ---');
        falhas.forEach(function (f) {
          console.log('  ' + f.caso + ' | ' + f.campo +
            ' | esperado ' + brl(f.esperado) + ' | obtido ' + brl(f.obtido) +
            ' | dif ' + brl(f.diferenca));
        });
      } else {
        console.log('Todos os valores fecham centavo a centavo com o extrato da contabilidade.');
      }
    }
    return res;
  };

  LNB.TESTE = { CASOS: CASOS, RESCISAO: RESCISAO, PATRONAL_ESPERADO: PATRONAL_ESPERADO };

})(globalThis.LNBPayroll);
/* =============================================================================
 * PAINEL DE CONFERÊNCIA DE CÁLCULO — aba Conciliação do /rh/
 * -----------------------------------------------------------------------------
 * SOMENTE LEITURA. Este módulo não grava nada no banco, não altera nenhuma
 * rubrica importada e não toca em nenhum patch existente. Ele apenas recalcula
 * a competência já carregada em memória (S.folhas / S.lancamentos) com o motor
 * LNBPayroll e mostra onde o cálculo diverge do que veio do PDF da contabilidade.
 *
 * Injetado pelo worker DEPOIS do release candidate, portanto compartilha o
 * escopo de rh/app.js: usa $, esc, fmt, toast e o estado S diretamente.
 * ========================================================================== */

(function () {
  'use strict';

  var L = globalThis.LNBPayroll;
  if (!L) { console.warn('[conciliacao] motor LNBPayroll indisponível'); return; }

  var COMPETENCIA_PADRAO = '2026-07';
  var TOL = 0.005;

  function num(v) { var x = Number(v); return isFinite(x) ? x : 0; }
  function r2(v) { return L.util.r2(v); }
  function money(v) { return (typeof fmt === 'function') ? fmt(v) : L.util.brl(v); }
  function safe(v) { return (typeof esc === 'function') ? esc(v) : String(v == null ? '' : v); }

  /* ---------------------------------------------------------------------------
   * Vínculo: o banco guarda o texto do PDF ("Celetista", "Estagiário",
   * "Celetista prazo determinado"). Normaliza para os códigos do motor.
   * ------------------------------------------------------------------------ */
  function vinculoDe(txt) {
    var t = String(txt || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    if (t.indexOf('estagi') >= 0) return 'ESTAGIARIO';
    if (t.indexOf('aprendiz') >= 0) return 'MENOR_APRENDIZ';
    if (t.indexOf('prazo determinado') >= 0 || t.indexOf('experiencia') >= 0) return 'CLT_PRAZO_DETERMINADO';
    if (t.indexOf('horista') >= 0) return 'CLT_HORISTA';
    return 'CLT_MENSALISTA';
  }

  /* ---------------------------------------------------------------------------
   * Dependentes de IRRF não são gravados hoje: o parser casa o rótulo "ND:" mas
   * descarta o número que vem depois dele. Enquanto o campo não existir, o
   * número é INFERIDO da base de IRRF que veio do próprio extrato:
   *
   *     bruto − INSS − baseIRRF  deve ser um múltiplo exato de 189,59
   *
   * Se não for múltiplo, foi o desconto simplificado que prevaleceu — e nesse
   * caso o número de dependentes não altera a base, então não precisa ser
   * conhecido. Confere com o extrato: Eronildo 9.147,00 − 988,07 − 7.969,34
   * = 189,59 → 1 dependente.
   * ------------------------------------------------------------------------ */
  function inferirDependentes(bruto, inss, baseIRRF, prm) {
    var dif = r2(num(bruto) - num(inss) - num(baseIRRF));
    if (Math.abs(dif) < 0.02) return { deps: 0, modo: 'DEDUCOES_LEGAIS' };
    var q = dif / prm.irrf.dependente;
    var arred = Math.round(q);
    if (arred > 0 && arred <= 20 && Math.abs(q - arred) < 0.01) {
      return { deps: arred, modo: 'DEDUCOES_LEGAIS' };
    }
    return { deps: 0, modo: 'SIMPLIFICADO_OU_INDETERMINADO' };
  }

  /* ---------------------------------------------------------------------------
   * Recompõe as bases a partir das rubricas importadas, usando a matriz de
   * incidências do motor. Rubricas fora do catálogo entram na lista de
   * desconhecidas em vez de serem silenciosamente ignoradas.
   * ------------------------------------------------------------------------ */
  var COD_INSS = { '998': 1, '812': 1, '821': 1, '826': 1, '989': 1 };
  var COD_IRRF = { '999': 1, '828': 1 };
  // INSS dedutível na base MENSAL do IRRF: exclui o de férias (812), que é
  // dedutível na base de férias, e o do 13º (989), que tem base própria.
  var COD_INSS_MENSAL = { '998': 1, '821': 1, '826': 1 };
  // Rubricas que só aparecem em rescisão — nelas o campo base_irrf do extrato
  // não é a base usada no cálculo do imposto, então a comparação é suprimida.
  var COD_RESCISAO = { '9180': 1, '8550': 1, '51': 1, '8517': 1, '64': 1, '8169': 1, '826': 1, '989': 1, '828': 1 };

  function analisarColaborador(folha, lancamentos, prm) {
    var vinc = vinculoDe(folha.vinculo_snapshot);
    var regras = L.VINCULOS[vinc] || L.VINCULOS.CLT_MENSALISTA;

    var baseINSS = 0, baseINSSDecimo = 0, baseFGTS = 0, baseFGTSDecimo = 0, rtbIRRF = 0;
    var inssLancado = 0, inssMensalLancado = 0, irrfLancado = 0;
    var desconhecidas = [], ehRescisao = false;

    lancamentos.forEach(function (l) {
      var cod = String(l.rubrica_codigo || '').trim();
      var valor = num(l.valor);
      var rb = L.RUBRICAS[cod];
      if (COD_RESCISAO[cod]) ehRescisao = true;

      if (l.tipo === 'desconto') {
        if (COD_INSS[cod]) {
          inssLancado = r2(inssLancado + valor);
          if (COD_INSS_MENSAL[cod]) inssMensalLancado = r2(inssMensalLancado + valor);
        } else if (COD_IRRF[cod]) irrfLancado = r2(irrfLancado + valor);
        return;
      }
      if (l.tipo !== 'provento') return;

      if (!rb) { desconhecidas.push({ codigo: cod, nome: l.rubrica_nome, valor: valor }); return; }

      var ehDecimo = rb.baseIRRF === 'DECIMO';
      var ehFerias = rb.baseIRRF === 'FERIAS';
      if (regras.incide.inss && rb.inss === true) {
        if (ehDecimo) baseINSSDecimo = r2(baseINSSDecimo + valor);
        else baseINSS = r2(baseINSS + valor);
      }
      if (regras.incide.fgts && rb.fgts === true) {
        if (ehDecimo) baseFGTSDecimo = r2(baseFGTSDecimo + valor);
        else baseFGTS = r2(baseFGTS + valor);
      }
      var incIR = rb.irrf === 'CFG_FERIAS_VENCIDAS' ? L.CFG.tributarFeriasVencidasIndenizadas : rb.irrf;
      // A base MENSAL do IRRF não inclui férias (base apurada em separado)
      // nem 13º (tributação exclusiva na fonte).
      if (incIR === true && !ehDecimo && !ehFerias) rtbIRRF = r2(rtbIRRF + valor);
    });

    /* ---- INSS ---------------------------------------------------------- */
    var baseINSSImportada = num(folha.base_inss);
    var excedente = num(folha.excedente_inss);
    var tetoOutroVinculo = (baseINSSImportada === 0 && excedente > 0);

    // A base do extrato é a referência para o VALOR; a base recomposta serve
    // para apontar divergência de composição, sem contaminar as duas leituras.
    // O que o extrato grava em base_inss é o SALÁRIO-DE-CONTRIBUIÇÃO, já
    // limitado ao teto — e o 13º entra com teto próprio. Por isso a base
    // recomposta é comparada depois de aplicar o teto em cada parcela.
    var teto = prm.inss.teto;
    var salContribuicao = r2(Math.min(baseINSS, teto) + Math.min(baseINSSDecimo, teto));

    var inssCalc = 0;
    if (regras.incide.inss && !tetoOutroVinculo) {
      if (baseINSS > 0) inssCalc = L.retencoes.inss(baseINSS, prm).valor;
      if (baseINSSDecimo > 0) inssCalc = r2(inssCalc + L.retencoes.inss(baseINSSDecimo, prm).valor);
    }

    /* ---- FGTS ---------------------------------------------------------- */
    var aliq = vinc === 'MENOR_APRENDIZ' ? prm.fgts.aprendiz : prm.fgts.geral;
    var fgtsCalc = regras.incide.fgts
      ? r2(L.util.t2(baseFGTS * aliq) + L.util.t2(baseFGTSDecimo * aliq)) : 0;

    /* ---- IRRF ---------------------------------------------------------- */
    var baseIRRFImportada = num(folha.base_irrf);
    var dep = inferirDependentes(rtbIRRF, inssMensalLancado, baseIRRFImportada, prm);
    var irrfObj = L.retencoes.irrf({
      rendimentoTributavel: rtbIRRF,
      inss: inssMensalLancado,
      dependentes: dep.deps,
      pensao: 0
    }, prm);

    /* ---- linhas divergentes -------------------------------------------- */
    var itens = [], informativos = [];
    function comparar(rotulo, importado, calculado, nota, apenasInfo) {
      var dif = r2(num(calculado) - num(importado));
      if (Math.abs(dif) <= TOL) return;
      var linha = { item: rotulo, importado: num(importado), calculado: num(calculado), dif: dif, nota: nota || '' };
      // Divergência com causa conhecida entra como INFORMATIVA: aparece na
      // tela, mas não conta como erro de cálculo.
      (apenasInfo ? informativos : itens).push(linha);
    }

    comparar('Base INSS', baseINSSImportada, tetoOutroVinculo ? baseINSS : salContribuicao,
      tetoOutroVinculo ? 'teto do segurado já consumido em outro vínculo' : '', tetoOutroVinculo);
    comparar('INSS retido', inssLancado, inssCalc);
    comparar('Base FGTS', num(folha.base_fgts), r2(baseFGTS + baseFGTSDecimo));
    comparar('FGTS do mês', num(folha.valor_fgts), fgtsCalc);
    if (!ehRescisao) {
      comparar('Base IRRF', baseIRRFImportada, irrfObj.baseCalculo,
        dep.modo === 'SIMPLIFICADO_OU_INDETERMINADO' ? 'dependentes não gravados (campo ND)' : '');
    }
    comparar('IRRF retido', irrfLancado, irrfObj.valor);

    return {
      vinculo: vinc,
      dependentesInferidos: dep.deps,
      modoDeducao: irrfObj.usouSimplificado ? 'simplificado' : 'legais',
      regimeRedutor: irrfObj.regimeRedutor,
      rescisao: ehRescisao,
      importado: {
        baseINSS: baseINSSImportada, inss: inssLancado,
        baseFGTS: num(folha.base_fgts), fgts: num(folha.valor_fgts),
        baseIRRF: baseIRRFImportada, irrf: irrfLancado
      },
      calculado: {
        baseINSS: tetoOutroVinculo ? baseINSSImportada : salContribuicao, inss: inssCalc,
        baseFGTS: r2(baseFGTS + baseFGTSDecimo), fgts: fgtsCalc,
        baseIRRF: ehRescisao ? baseIRRFImportada : irrfObj.baseCalculo, irrf: irrfObj.valor
      },
      itens: itens,
      informativos: informativos,
      desconhecidas: desconhecidas
    };
  }

  /* ---------------------------------------------------------------------------
   * Conferência da competência inteira
   * ------------------------------------------------------------------------ */
  function conferir() {
    if (!S || !S.competencia) return { erro: 'Nenhuma competência selecionada.' };

    var comp = String(S.competencia.competencia || '').slice(0, 7) || COMPETENCIA_PADRAO;
    var prm = L.params(comp);

    var porFolha = {};
    (S.lancamentos || []).forEach(function (l) {
      var k = l.folha_colaborador_id;
      (porFolha[k] = porFolha[k] || []).push(l);
    });
    var pessoas = {};
    (S.colaboradores || []).forEach(function (c) { pessoas[c.id] = c; });

    var linhas = [], desconhecidas = {};
    var tot = {
      baseINSS: [0, 0], inss: [0, 0], baseFGTS: [0, 0], fgts: [0, 0], baseIRRF: [0, 0], irrf: [0, 0]
    };

    (S.folhas || []).forEach(function (f) {
      var a = analisarColaborador(f, porFolha[f.id] || [], prm);
      var p = pessoas[f.colaborador_id] || {};
      ['baseINSS', 'inss', 'baseFGTS', 'fgts', 'baseIRRF', 'irrf'].forEach(function (k) {
        tot[k][0] = r2(tot[k][0] + a.importado[k]);
        tot[k][1] = r2(tot[k][1] + a.calculado[k]);
      });
      a.desconhecidas.forEach(function (d) {
        var e = desconhecidas[d.codigo] = desconhecidas[d.codigo] || { codigo: d.codigo, nome: d.nome, qtd: 0, valor: 0 };
        e.qtd++; e.valor = r2(e.valor + d.valor);
      });
      linhas.push({
        nome: p.nome || f.colaborador_id, matricula: p.matricula || '',
        vinculo: a.vinculo, analise: a, ok: a.itens.length === 0,
        temInfo: a.informativos.length > 0
      });
    });

    linhas.sort(function (x, y) { return (x.ok === y.ok) ? String(x.nome).localeCompare(y.nome, 'pt-BR') : (x.ok ? 1 : -1); });

    /* ---- encargos patronais sobre a base importada ---------------------- */
    var baseFolha = tot.baseINSS[0];
    var enc = L.encargos.encargosPatronais({
      baseINSSPatronal: baseFolha, basePIS: baseFolha,
      baseFGTS: tot.baseFGTS[0], baseFGTSAprendiz: 0,
      inssSegurados: tot.inss[0], salarioFamiliaCompensavel: 0
    }, prm);

    var encImportados = (S.competencia && S.competencia.encargos) || {};

    return {
      competencia: comp, versaoTabela: prm.vigencia,
      linhas: linhas, totais: tot, encargos: enc, encargosImportados: encImportados,
      desconhecidas: Object.keys(desconhecidas).map(function (k) { return desconhecidas[k]; }),
      divergentes: linhas.filter(function (l) { return !l.ok; }).length,
      informativas: linhas.filter(function (l) { return l.temInfo; }).length
    };
  }

  /* ---------------------------------------------------------------------------
   * Interface
   * ------------------------------------------------------------------------ */
  /* Usa os tokens do próprio /rh/ (--emerald, --red, --orange, --line-soft…),
     definidos em :root para o tema escuro e em body.light para o claro —
     assim o painel acompanha os dois temas sem cor fixa. */
  var CSS = ''
    + '#rh-motor-panel{margin-bottom:18px}'
    + '#rh-motor-panel .mtr-actions{display:flex;gap:10px;align-items:center;flex-wrap:wrap}'
    + '#rh-motor-panel .mtr-note{font-size:11px;color:var(--muted);line-height:1.55;margin:0;padding:0 18px 4px}'
    + '#rh-motor-panel .mtr-pills{display:flex;gap:8px;flex-wrap:wrap;padding:14px 18px 4px}'
    + '#rh-motor-panel .mtr-pill{font-size:10px;font-weight:800;letter-spacing:.04em;padding:6px 11px;'
    + 'border-radius:999px;border:1px solid var(--line-soft);background:var(--surface-2);color:var(--muted);'
    + 'display:inline-flex;gap:7px;align-items:center}'
    + '#rh-motor-panel .mtr-pill b{color:var(--text);font-variant-numeric:tabular-nums;font-size:11px}'
    + '#rh-motor-panel .mtr-pill.ok{color:var(--emerald);border-color:color-mix(in srgb,var(--emerald) 40%,transparent)}'
    + '#rh-motor-panel .mtr-pill.ok b{color:var(--emerald)}'
    + '#rh-motor-panel .mtr-pill.bad{color:var(--red);border-color:color-mix(in srgb,var(--red) 45%,transparent)}'
    + '#rh-motor-panel .mtr-pill.bad b{color:var(--red)}'
    + '#rh-motor-panel .mtr-wrap{width:100%;overflow-x:auto;margin-top:14px}'
    + '#rh-motor-panel table{width:100%;border-collapse:collapse;min-width:620px}'
    + '#rh-motor-panel td.n,#rh-motor-panel th.n{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}'
    + '#rh-motor-panel td.dif{font-weight:900}'
    + '#rh-motor-panel td.dif.pos{color:var(--red)}'
    + '#rh-motor-panel td.dif.neg{color:var(--orange)}'
    + '#rh-motor-panel .mtr-sub{display:block;color:var(--faint);font-size:10px;margin-top:3px}'
    + '#rh-motor-panel .mtr-empty{padding:16px 18px;color:var(--muted);font-size:12px;line-height:1.6}';

  function montarUI() {
    var page = $('page-conciliacao');
    if (!page || $('rh-motor-panel')) return;

    if (!$('_rh_motor_styles')) {
      var st = document.createElement('style');
      st.id = '_rh_motor_styles'; st.textContent = CSS;
      document.head.appendChild(st);
    }

    var art = document.createElement('article');
    art.id = 'rh-motor-panel'; art.className = 'panel';
    art.innerHTML =
      '<div class="panel-head">'
      + '<div><span class="panel-kicker">CONFERÊNCIA DE CÁLCULO</span>'
      + '<h2>Motor de folha × extrato importado</h2></div>'
      + '<div class="mtr-actions"><button class="btn" id="rh-motor-run" type="button">Conferir cálculo</button></div>'
      + '</div>'
      + '<p class="mtr-note">Recalcula a competência carregada com o motor LNBPayroll '
      + (L.VERSION ? 'v' + L.VERSION : '') + ' e compara com o que veio do PDF da contabilidade. '
      + '<b>Somente leitura</b> — nada é gravado no banco e nenhuma rubrica importada é alterada.</p>'
      + '<div id="rh-motor-out"><div class="mtr-empty">Clique em <b>Conferir cálculo</b> para rodar a comparação.</div></div>';

    var alvo = page.querySelector('.panel');
    if (alvo && alvo.parentNode) alvo.parentNode.insertBefore(art, alvo);
    else page.appendChild(art);

    var btn = $('rh-motor-run');
    if (btn) btn.addEventListener('click', function () {
      btn.disabled = true;
      try { render(conferir()); }
      catch (e) {
        console.error('[conciliacao]', e);
        $('rh-motor-out').innerHTML = '<div class="mtr-empty">Falha ao conferir: ' + safe(e.message) + '</div>';
      }
      finally { btn.disabled = false; }
    });
  }

  function celDif(v) {
    var cls = v > 0 ? 'pos' : 'neg';
    return '<td class="n dif ' + cls + '">' + (v > 0 ? '+' : '') + money(v) + '</td>';
  }

  function linhaTotal(rot, imp, calc) {
    var dif = r2(calc - imp);
    return '<tr><td>' + rot + '</td><td class="n">' + money(imp) + '</td><td class="n">' + money(calc) + '</td>'
      + (Math.abs(dif) <= TOL ? '<td class="n">—</td>' : celDif(dif)) + '</tr>';
  }

  function render(res) {
    var out = $('rh-motor-out');
    if (!out) return;
    if (res.erro) { out.innerHTML = '<div class="mtr-empty">' + safe(res.erro) + '</div>'; return; }

    var t = res.totais, e = res.encargos;
    var conferem = res.linhas.length - res.divergentes;

    var html = ''
      + '<div class="mtr-pills">'
      + '<span class="mtr-pill">Competência <b>' + safe(res.competencia) + '</b></span>'
      + '<span class="mtr-pill">Tabela <b>' + safe(res.versaoTabela) + '</b></span>'
      + '<span class="mtr-pill ok">Conferem <b>' + conferem + '</b></span>'
      + '<span class="mtr-pill ' + (res.divergentes ? 'bad' : '') + '">Divergem <b>' + res.divergentes + '</b></span>'
      + (res.informativas ? '<span class="mtr-pill">Explicadas <b>' + res.informativas + '</b></span>' : '')
      + '</div>'

      + '<div class="mtr-wrap"><table><thead><tr>'
      + '<th>Totalizador</th><th class="n">Importado</th><th class="n">Calculado</th><th class="n">Diferença</th>'
      + '</tr></thead><tbody>'
      + linhaTotal('Base INSS', t.baseINSS[0], t.baseINSS[1])
      + linhaTotal('INSS retido dos segurados', t.inss[0], t.inss[1])
      + linhaTotal('Base FGTS', t.baseFGTS[0], t.baseFGTS[1])
      + linhaTotal('FGTS do mês', t.fgts[0], t.fgts[1])
      + linhaTotal('Base IRRF', t.baseIRRF[0], t.baseIRRF[1])
      + linhaTotal('IRRF retido', t.irrf[0], t.irrf[1])
      + '</tbody></table></div>'

      + '<div class="mtr-wrap"><table><thead><tr>'
      + '<th>Encargo patronal (sobre a base importada)</th><th class="n">Alíquota</th><th class="n">Calculado</th>'
      + '</tr></thead><tbody>'
      + '<tr><td>INSS patronal</td><td class="n">20,00%</td><td class="n">' + money(e.inssPatronal.valor) + '</td></tr>'
      + '<tr><td>RAT × FAP ' + e.rat.fap.toFixed(4) + '</td><td class="n">' + (e.rat.aliquotaAjustada * 100).toFixed(2) + '%</td><td class="n">' + money(e.rat.valor) + '</td></tr>'
      + '<tr><td>Terceiros <span class="mtr-sub">(5 parcelas)</span></td><td class="n">5,80%</td><td class="n">' + money(e.terceiros.valor) + '</td></tr>'
      + '<tr><td>PIS sobre a folha</td><td class="n">1,00%</td><td class="n">' + money(e.pisFolha.valor) + '</td></tr>'
      + '<tr><td><b>Total da guia previdenciária</b></td><td class="n">—</td><td class="n"><b>' + money(e.totalGuiaPrevidenciaria) + '</b></td></tr>'
      + '</tbody></table></div>';

    if (res.divergentes) {
      html += '<div class="mtr-wrap"><table><thead><tr>'
        + '<th>Colaborador</th><th>Item</th><th class="n">Importado</th><th class="n">Calculado</th><th class="n">Diferença</th>'
        + '</tr></thead><tbody>';
      res.linhas.filter(function (l) { return !l.ok; }).forEach(function (l) {
        l.analise.itens.forEach(function (it, i) {
          html += '<tr>'
            + '<td>' + (i === 0 ? '<b>' + safe(l.nome) + '</b>' + (l.matricula ? ' <span class="mtr-sub">' + safe(l.matricula) + '</span>' : '') : '') + '</td>'
            + '<td>' + safe(it.item) + (it.nota ? '<div class="mtr-sub">' + safe(it.nota) + '</div>' : '') + '</td>'
            + '<td class="n">' + money(it.importado) + '</td>'
            + '<td class="n">' + money(it.calculado) + '</td>'
            + celDif(it.dif)
            + '</tr>';
        });
      });
      html += '</tbody></table></div>';
    } else {
      html += '<div class="mtr-empty">Nenhuma divergência: os ' + res.linhas.length
        + ' registros fecham centavo a centavo com o extrato.</div>';
    }

    var comInfo = res.linhas.filter(function (l) { return l.temInfo; });
    if (comInfo.length) {
      html += '<div class="mtr-wrap"><table><thead><tr>'
        + '<th>Diferença com causa conhecida</th><th>Item</th><th class="n">Importado</th><th class="n">Calculado</th><th class="n">Diferença</th>'
        + '</tr></thead><tbody>';
      comInfo.forEach(function (l) {
        l.analise.informativos.forEach(function (it, i) {
          html += '<tr>'
            + '<td>' + (i === 0 ? safe(l.nome) : '') + '</td>'
            + '<td>' + safe(it.item) + (it.nota ? '<div class="mtr-sub">' + safe(it.nota) + '</div>' : '') + '</td>'
            + '<td class="n">' + money(it.importado) + '</td>'
            + '<td class="n">' + money(it.calculado) + '</td>'
            + '<td class="n">' + money(it.dif) + '</td>'
            + '</tr>';
        });
      });
      html += '</tbody></table></div>';
    }

    if (res.desconhecidas.length) {
      html += '<div class="mtr-wrap"><table><thead><tr>'
        + '<th>Rubrica fora do catálogo do motor</th><th class="n">Ocorrências</th><th class="n">Valor</th>'
        + '</tr></thead><tbody>';
      res.desconhecidas.sort(function (a, b) { return b.valor - a.valor; }).forEach(function (d) {
        html += '<tr><td><b>' + safe(d.codigo) + '</b> ' + safe(d.nome) + '</td>'
          + '<td class="n">' + d.qtd + '</td><td class="n">' + money(d.valor) + '</td></tr>';
      });
      html += '</tbody></table>'
        + '<p class="mtr-note">Essas rubricas ficaram fora das bases recompostas porque o motor ainda '
        + 'não conhece a incidência delas. Cadastre em <code>LNBPayroll.RUBRICAS</code> antes de usar '
        + 'o motor como fonte de cálculo.</p></div>';
    }

    out.innerHTML = html;
  }

  /* ---- boot ------------------------------------------------------------ */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', montarUI);
  } else {
    montarUI();
  }
  setTimeout(montarUI, 1500);

  globalThis.RH_MOTOR_CONCILIACAO = { conferir: conferir, versao: L.VERSION };

})();
