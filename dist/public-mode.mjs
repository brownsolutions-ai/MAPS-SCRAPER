const rewritePublicCopy=()=>{
  const app=document.querySelector('#app');
  if(!app)return;
  app.querySelectorAll('.connection-card p,.bottom-note span').forEach(el=>{
    if(el.textContent.includes('Entre na sua conta'))el.textContent='Execute o schema para ativar o banco público.';
  });
  app.querySelectorAll('.connection-card strong').forEach(el=>{
    if(el.textContent.includes('Banco desconectado'))el.textContent=el.textContent.replace('Banco desconectado','Banco aguardando schema');
  });
  app.querySelectorAll('.connection-card button').forEach(el=>{
    if(el.textContent.includes('Conectar banco'))el.childNodes.forEach(n=>{if(n.nodeType===3)n.textContent=n.textContent.replace('Conectar banco','Configurar banco');});
  });
};
rewritePublicCopy();
new MutationObserver(rewritePublicCopy).observe(document.querySelector('#app')||document.body,{childList:true,subtree:true});
