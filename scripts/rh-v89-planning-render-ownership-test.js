const fs=require('fs');
const assert=require('assert');

const v26=fs.readFileSync('runtime-patches/rh-folha-hotfix-v26-planejamento-modelos-contabeis.inc.js','utf8');
const v54=fs.readFileSync('runtime-patches/rh-folha-hotfix-v54-provisoes-seguras.inc.js','utf8');
const v80=fs.readFileSync('runtime-patches/rh-folha-hotfix-v80-provisoes-oficiais.inc.js','utf8');

assert(v26.includes('function official26('),'renderizador legado não reconhece a composição oficial');
assert(v26.includes("if(!p||official26(p))return"),'abas legadas ainda podem apagar a composição oficial');
assert((v26.match(/if\(!p\|\|official26\(p\)\)return/g)||[]).length===2,'proteção deve existir em 13º e férias');
assert(v54.includes('if(window.RH_OFFICIAL_PROVISIONS_V80)return'),'conciliador legado ainda concorre com a fonte oficial');
assert(v54.includes("document.querySelector('.rh80-official-root')"),'corrida assíncrona do conciliador não está protegida');
assert(v80.includes("root.dataset.rh80Signature===sig"),'render oficial perdeu a idempotência');
assert(v80.includes('rh80-person-list')&&v80.includes('rh80-memory-grid'),'composição individual oficial ausente');

console.log('RH v89 propriedade do render de Planejamento: OK');
