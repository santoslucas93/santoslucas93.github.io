(function(){
'use strict';
var INLINE=/^(A|ABBR|B|BUTTON|CODE|EM|I|LABEL|SMALL|SPAN|STRONG)$/;
function edge(el,first){var s=String(el.textContent||'').trim();return first?s.charAt(0):s.charAt(s.length-1)}
function needs(a,b){return a&&b&&INLINE.test(a.tagName)&&INLINE.test(b.tagName)&&/[0-9A-Za-zÀ-ÿ)]/.test(edge(a,false))&&/[0-9A-Za-zÀ-ÿ(]/.test(edge(b,true))}
function fix(root){
  (root.querySelectorAll?root.querySelectorAll('span,b,strong,small,label,button'):[]).forEach(function(a){var b=a.nextElementSibling;if(!needs(a,b))return;var n=a.nextSibling;if(n&&n.nodeType===3&&/\s/.test(n.nodeValue||''))return;a.parentNode.insertBefore(document.createTextNode(' '),b)})
}
var queued=false;function schedule(){if(queued)return;queued=true;requestAnimationFrame(function(){queued=false;fix(document)})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule);else schedule();
new MutationObserver(schedule).observe(document.documentElement,{childList:true,subtree:true});
})();
