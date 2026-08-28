/* RH v81 - popup "composicao do card" (13o/ferias) passa a usar os dados oficiais do v80
   quando disponiveis, em vez de raspar a tabela antiga (v48), que ficou com colunas
   desalinhadas depois que o v80 trocou o layout da tabela de provisoes. */
(function(){
'use strict';
function money81(text){
var s=String(text||'').replace(/[^0-9,.-]/g,'').replace(/\./g,'').replace(',','.');
var n=parseFloat(s);
return isFinite(n)?n:0;
}
var baseProvisionRows81=(typeof provisionRows48==='function')?provisionRows48:null;
provisionRows48=function(kind){
try{
var rec=window.RH_V80_LAST&&(kind==='13'?window.RH_V80_LAST.decimo:kind==='ferias'?window.RH_V80_LAST.ferias:null);
var rows=rec&&rec._rows;
if(rows&&rows.length){
return rows.map(function(x){
var s=x.s||[],prov=x.prov||x.pm||[];
return{
name:x.name,dep:x.dep,cc:x.cc||'',
pm:Number(prov[0])||0,
saldo:Number(s[0])||0,
inss:Number(s[1])||0,rat:Number(s[2])||0,terc:Number(s[3])||0,fgts:Number(s[4])||0,pis:Number(s[5])||0,
enc:Number(x.enc)||0,
custo:Number(s[6])||0
};
});
}
}catch(e){console.warn('RH v81 (dados oficiais):',e);}
try{
var pane=document.querySelector('[data-plan-pane="'+kind+'"]');
var table=pane&&pane.querySelector('table.rh80-table');
if(table){
var out=Array.from(table.querySelectorAll('tbody tr')).map(function(tr){
var c=tr.cells||[];if(c.length<11)return null;
var nameCell=c[0].querySelector('b');
var name=nameCell?nameCell.textContent:c[0].textContent;
var base=money81(c[4].textContent),inss=money81(c[5].textContent),rat=money81(c[6].textContent),
terc=money81(c[7].textContent),fgts=money81(c[8].textContent),pis=money81(c[9].textContent),
custo=money81(c[10].textContent);
return{
name:String(name||'\u2014').trim(),dep:String(c[2].textContent||'\u2014').trim(),cc:'',
pm:base,saldo:base,inss:inss,rat:rat,terc:terc,fgts:fgts,pis:pis,
enc:Math.round((inss+rat+terc+fgts+pis+Number.EPSILON)*100)/100,custo:custo
};
}).filter(Boolean);
if(out.length)return out;
}
}catch(e){console.warn('RH v81 (tabela oficial):',e);}
return baseProvisionRows81?baseProvisionRows81(kind):[];
};
window.RH_PROVISION_POPUP_OFFICIAL_V81=true;
})();
