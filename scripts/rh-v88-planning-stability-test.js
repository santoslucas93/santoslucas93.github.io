const fs=require('fs');
const assert=require('assert');
const v80=fs.readFileSync('runtime-patches/rh-folha-hotfix-v80-provisoes-oficiais.inc.js','utf8');
const v84=fs.readFileSync('runtime-patches/rh-folha-hotfix-v84-integridade-provisoes.inc.js','utf8');
const hub=fs.readFileSync('index.html','utf8');
const worker=fs.readFileSync('worker.js','utf8');
const benefitsLogo=fs.readFileSync('runtime-patches/beneficios-official-logo.js','utf8');
const benefitsLogoCss=fs.readFileSync('runtime-patches/beneficios-official-logo.css','utf8');

assert(v80.includes('function signature80('),'composição sem assinatura idempotente');
assert(v80.includes("root.dataset.rh80Signature===sig"),'render oficial ainda remonta o DOM sem mudança de dados');
assert(v80.includes('rh84-integrity rh84-pending'),'espaço da conferência não é reservado no primeiro desenho');
assert(v80.includes('rh80-person-list')&&v80.includes('rh80-person-button'),'lista clicável de colaboradores ausente');
assert(v80.includes('function eligible80(')&&v80.includes('filter(eligible80)'),'lista não preserva empregados com saldo zero');
assert(v80.includes("!/estagi/.test(v)"),'lista não separa estagiários da composição provisionável');
assert(v80.includes('inclusive quando o saldo estiver zerado'),'orientação para provisão zerada ausente');
for(const marker of ['Base provisionada','Provisão regular do mês','Ajuste / diferença','Total de encargos','Custo provisionado'])assert(v80.includes(marker),`memória individual sem ${marker}`);
assert(v84.includes("banner.dataset.rh84Markup!==markup"),'conferência ainda redesenha conteúdo idêntico');
assert(v84.includes('tr.dataset.rh80Matricula'),'integridade não identifica a linha pelo colaborador');
assert(hub.includes('class="hub-login-emblem"')&&hub.includes('src="/rh/lnb-logo.png"'),'login central sem logo oficial');
assert(!hub.includes('<div class="hub-login-brand"><svg'),'símbolo provisório ainda presente no login');
assert(worker.includes('injectBenefitsOfficialLogo(')&&worker.includes('beneficios-official-logo.js?v=88'),'patch do logo de Benefícios não é injetado');
assert(benefitsLogo.includes("current.replaceWith(emblem)")&&benefitsLogo.includes('src="/rh/lnb-logo.png"'),'Benefícios sem troca pelo logo oficial');
assert(benefitsLogoCss.includes('.app-header>.lnb-official-emblem'),'estilo do logo oficial de Benefícios ausente');

console.log('RH v88 estabilidade/branding: OK');
