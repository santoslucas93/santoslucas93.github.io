const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const v80=fs.readFileSync(path.join(root,'runtime-patches/rh-folha-hotfix-v80-provisoes-oficiais.inc.js'),'utf8');
const v84=fs.readFileSync(path.join(root,'runtime-patches/rh-folha-hotfix-v84-integridade-provisoes.inc.js'),'utf8');
function ok(value,message){if(!value)throw new Error(message)}

ok(v80.includes("rows=(r.colaboradores||[]).map"),'composição oficial não pode filtrar matrículas pelo cadastro atual');
ok(!v80.includes("rows=(r.colaboradores||[]).filter(function(q){return active80"),'filtro cadastral antigo ainda está ativo');
ok(v80.includes("root.querySelector('article.rh80-official')"),'tabela oficial não tem autorreparo após rerenderização legada');
ok(v80.includes('function ensure80()')&&v80.includes('function schedule80()'),'painel não recompõe a tabela após interações conhecidas');
ok(!v80.includes('new MutationObserver('),'reparo da composição não pode manter observador contínuo');
ok(v80.includes("e.key==='Escape'||e.key==='Esc'"),'modal oficial não fecha por ESC');
ok(v80.includes("rh80-compact")&&v80.includes("rh80-medium")&&v80.includes("rh80-wide"),'modal não dimensiona pela quantidade de colunas');
ok(v80.includes("width:min(720px")&&v80.includes("width:min(1120px"),'limites compactos de largura ausentes');
ok(v80.includes("max-height:min(84vh,780px)"),'modal não limita altura útil');
ok(v80.includes("CustomEvent('rh:v80-rendered'"),'render oficial não avisa extensões dependentes');
ok(v84.includes("addEventListener('rh:v80-rendered'"),'conferência de integridade não retorna após autorreparo');

console.log('RH v87 popup/composição: OK');
