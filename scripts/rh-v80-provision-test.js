'use strict';
const fs=require('fs');
const assert=require('assert');
const sql=fs.readFileSync('supabase/migrations/20260826172253_rh_provisoes_oficiais.sql','utf8');
const ui=fs.readFileSync('runtime-patches/rh-folha-hotfix-v80-provisoes-oficiais.inc.js','utf8');
function record(kind){
  const re=new RegExp("'2026-07-01','"+kind+"'[\\s\\S]*?\\n\\s*'(\\{[\\s\\S]*?\\})'::jsonb,\\n\\s*'(\\[[\\s\\S]*?\\])'::jsonb,");
  const m=sql.match(re);assert(m,`parâmetro ${kind} não encontrado`);return{totals:JSON.parse(m[1]),rows:JSON.parse(m[2])};
}
function sums(rows,key){return Array.from({length:7},(_,i)=>Math.round((rows.reduce((s,r)=>s+Number(r[key][i]||0),0)+Number.EPSILON)*100)/100)}
for(const kind of ['ferias','decimo_terceiro']){
  const r=record(kind);assert.strictEqual(r.rows.length,25,`${kind}: quantidade individual`);
  assert.deepStrictEqual(sums(r.rows,'pm'),r.totals.mes,`${kind}: provisão regular não fecha`);
  assert.deepStrictEqual(sums(r.rows,'p'),r.totals.provisionado,`${kind}: provisionado no mês não fecha`);
  assert.deepStrictEqual(sums(r.rows,'s'),r.totals.saldo,`${kind}: saldo oficial não fecha`);
  assert.strictEqual(Math.round((r.totals.saldo[0]+r.totals.saldo.slice(1,6).reduce((a,b)=>a+b,0))*100)/100,r.totals.saldo[6],`${kind}: custo não concilia`);
  for(const matricula of ['615','486','489','648','646','647','475','611','596']){
    const row=r.rows.find(x=>x.m===matricula);assert(row,`${kind}: estagiário ${matricula} ausente`);
    assert(row.pm.slice(1,6).every(v=>Number(v)===0),`${kind}: encargos mensais indevidos para estagiário ${matricula}`);
    assert(row.s.slice(1,6).every(v=>Number(v)===0),`${kind}: encargos no saldo indevidos para estagiário ${matricula}`);
  }
  for(const matricula of ['421','580']){
    const row=r.rows.find(x=>x.m===matricula);assert(row,`${kind}: desligado histórico ${matricula} ausente da fonte`);
    assert(row.s.every(v=>Number(v)===0),`${kind}: desligado histórico ${matricula} altera o saldo do quadro ativo`);
  }
}
assert(sql.includes('enable row level security'),'provisões oficiais sem RLS');
assert(sql.includes("from public,anon,authenticated"),'privilégios da tabela não foram fechados antes do grant');
assert(sql.includes('grant select on public.rh_provisoes_oficiais to authenticated'),'leitura autenticada ausente');
assert(!sql.includes('grant select on public.rh_provisoes_oficiais to anon'),'provisões oficiais não podem ser lidas por anon');
for(const marker of ['RH_OFFICIAL_PROVISIONS_V80','Saldo provisionado','Provisão do mês','Encargos sobre saldo','Custo provisionado','Base provisionada','INSS Empresa','RAT','Terceiros','FGTS','PIS'])assert(ui.includes(marker),`interface sem ${marker}`);
assert(ui.includes('var official=await refresh80(force);if(official)return true;if(typeof baseRefresh80'), 'provisão oficial deve evitar o carregamento legado N+1');
assert(!ui.includes('pane.innerHTML=cards80'), 'provisão oficial não pode apagar simulador, exportações e recibos');
assert(ui.includes("child.id==='rh70-vacation-simulator'") && ui.includes("child.classList.contains('rh41-export-bar')"), 'provisão oficial não preserva simulador e barra de documentos');
assert(ui.includes("rows=(r.colaboradores||[]).map(function(q){return row80(q,map)})"), 'planejamento oficial deve preservar todas as matrículas do demonstrativo');
assert(!ui.includes('function active80('), 'composição oficial não deve depender do status cadastral atual');
assert(ui.includes('#page-planejamento article.rh80-official{display:block!important')&&ui.includes('visibility:visible!important'), 'painel oficial pode ser ocultado pela regra legada');
console.log('RH v80 provision tests: OK');
