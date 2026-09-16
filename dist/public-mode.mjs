const rewritePublicCopy=()=>{
  const app=document.querySelector('#app');
  if(!app)return;
  const replacements=[
    ['Entre na sua conta para salvar os leads.','Execute o schema para ativar o banco público.'],
    ['Entre na sua conta para salvar empresas e acompanhamento.','Execute o schema para ativar o banco público.'],
    ['Banco desconectado','Banco aguardando schema'],
    ['Conectar banco','Configurar banco']
  ];
  const walker=document.createTreeWalker(app,NodeFilter.SHOW_TEXT);
  let node;
  while(node=walker.nextNode())for(const [from,to] of replacements)node.nodeValue=node.nodeValue.replaceAll(from,to);
};
rewritePublicCopy();
new MutationObserver(rewritePublicCopy).observe(document.querySelector('#app')||document.body,{childList:true,subtree:true});
