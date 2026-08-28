'use strict';
const fs=require('fs'),assert=require('assert'),vm=require('vm');
const source=fs.readFileSync('runtime-patches/rh-folha-hotfix-v93-cards-ferias-oficiais.inc.js','utf8');

for(const marker of ['RH_VACATION_CARD_OWNER_V93',"wrap93('rhProvisionRefresh')","wrap93('rhV80Refresh')",'rhV91ApplyVacationOfficial'])assert(source.includes(marker),`v93 sem ${marker}`);
assert(!source.includes('MutationObserver')&&!source.includes('setInterval'),'v93 não pode observar ou atualizar a tela continuamente');

const state={value:'oficial',applied:0};
const context={
  window:{
    rhProvisionRefresh:async()=>{state.value='R$ 0,00';return 'legado'},
    rhV80Refresh:async()=>true,
    rhV91ApplyVacationOfficial:()=>{state.value='R$ 170.076,04';state.applied++;return true}
  },
  document:{readyState:'complete',addEventListener(){}},
  setTimeout(fn){fn()}
};
vm.runInNewContext(source,context);

(async()=>{
  state.value='oficial';
  const result=await context.window.rhProvisionRefresh();
  assert.strictEqual(result,'legado','wrapper deve preservar o retorno da atualização existente');
  assert.strictEqual(state.value,'R$ 170.076,04','fonte antiga não pode permanecer como última escrita dos cards');
  assert(state.applied>=2,'fonte oficial precisa ser reaplicada na inicialização e após atualizações conhecidas');
  console.log('RH v93 propriedade oficial dos cards de férias: OK');
})().catch(err=>{console.error(err);process.exit(1)});
