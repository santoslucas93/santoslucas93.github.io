/* RH & Folha — hotfix v27: renovação automática de JWT em importações e chamadas Supabase */
(function(){
  'use strict';
  var rhV27RefreshPromise=null;
  var rhV27BaseApi=api;

  function rhV27JwtExpiryMs(token){
    try{
      var part=String(token||'').split('.')[1];
      if(!part)return 0;
      part=part.replace(/-/g,'+').replace(/_/g,'/');
      while(part.length%4)part+='=';
      var payload=JSON.parse(atob(part));
      return Number(payload&&payload.exp||0)*1000;
    }catch(e){return 0;}
  }

  function rhV27SessionExpiryMs(s){
    if(!s)return 0;
    var v=Number(s.expires_at||0);
    if(v>0&&v<100000000000)v*=1000;
    return v||rhV27JwtExpiryMs(s.access_token);
  }

  function rhV27NeedsRefresh(s){
    if(!s||!s.access_token)return true;
    var exp=rhV27SessionExpiryMs(s);
    return !!exp&&exp-Date.now()<90000;
  }

  function rhV27IsAuthError(err){
    var msg=String(err&&err.message||err||'').toLowerCase();
    return /jwt\s*expired|token\s*expired|expired\s*jwt|invalid\s*jwt|jwt.*expir|pgrst301|unauthori[sz]ed|invalid\s*token/.test(msg);
  }

  async function rhEnsureFreshSession(force){
    if(!SES){
      var stored=loadSession();
      if(stored)SES=stored;
    }
    if(!SES||!SES.access_token)throw new Error('Sessão não encontrada. Entre novamente no Painel LNB.');
    if(!force&&!rhV27NeedsRefresh(SES))return SES;
    if(!SES.refresh_token)throw new Error('Sua sessão expirou e não pôde ser renovada automaticamente. Entre novamente no Painel LNB.');
    if(!rhV27RefreshPromise){
      rhV27RefreshPromise=(async function(){
        var renewed=await refresh(SES);
        if(!renewed||!renewed.access_token)throw new Error('Sua sessão expirou e não pôde ser renovada automaticamente. Entre novamente no Painel LNB.');
        SES=renewed;
        saveSession(renewed);
        return renewed;
      })().finally(function(){rhV27RefreshPromise=null;});
    }
    return rhV27RefreshPromise;
  }

  api=async function(path,options){
    try{
      await rhEnsureFreshSession(false);
      return await rhV27BaseApi(path,options);
    }catch(err){
      if(!rhV27IsAuthError(err))throw err;
      await rhEnsureFreshSession(true);
      try{return await rhV27BaseApi(path,options);}
      catch(retryErr){
        if(rhV27IsAuthError(retryErr))throw new Error('Sua sessão expirou. Atualize o acesso ao Painel LNB e tente novamente; os PDFs selecionados não foram gravados.');
        throw retryErr;
      }
    }
  };

  rpc=function(name,body){return api('rpc/'+name,{method:'POST',body:body||{}});};
  window.rhEnsureFreshSession=rhEnsureFreshSession;
})();
