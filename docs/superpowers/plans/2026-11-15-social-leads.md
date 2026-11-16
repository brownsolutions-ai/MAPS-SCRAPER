# Leads sociais e fila de contato

**Objetivo:** cadastro manual de WhatsApp/Instagram, categorias próprias, estados brasileiros, Kanban por etapa, fila compartilhada e visual creme/chocolate para celular.

**Arquitetura:** manter JavaScript nativo e Supabase existentes. Acrescentar `source`, `contact_queue` e `lead_category_id` em companies e uma tabela de categorias. A fila referencia o mesmo registro; não copia leads. Manter status antigos compatíveis e adicionar retry, negotiation e won. Novo é a entrada padrão.

**Visual:** creme #f7efdf, papel #fffaf0, chocolate #4b2e23, caramelo #b28a58 e verde #506447. Georgia nos títulos e fonte do sistema nos controles. Colunas horizontais, alça de arraste por Pointer Events, seletor acessível de etapa e menu móvel.

**Escopo:** dist/app.js, core.mjs, store.mjs, detail.mjs, import-records.mjs, módulos de leads sociais, style.css, index.html, schema SQL, scripts/build.mjs, testes e README. Importações devem preservar os campos comerciais.

- [x] Testes de validação, filtros, etapas e preservação na reimportação.
- [x] Schema aditivo, persistência compartilhada e erros sem falso sucesso local.
- [x] Cadastro/edição, categorias, fila, Kanban e navegação móvel.
- [x] Tema retrô, build, testes de navegador desktop e emulação móvel.
- [x] Revisão final e instruções para aplicar o SQL quando o acesso administrativo estiver indisponível.

**Restrições:** sem login, sem credenciais privadas no cliente, sem envio automático de mensagens. Todos com acesso podem consultar e alterar a base. Não publicar sem pedido. O Supabase MCP recusou acesso administrativo; registrar claramente qualquer validação remota não realizada.

## Verificação final

20 testes Node passaram e build concluído. Arraste e seletor testados no navegador; layout conferido a 390 px e desktop. Teste real pelo navegador no Supabase confirmou cadastro WhatsApp/Instagram, categoria, fila de planilha e Instagram, alteração de etapa, histórico e persistência após reload. Fixtures removidas, com zero registros temporários restantes. Sem teste em aparelho físico.

O usuário autorizou usar aqmfakoybvskisduktvo. Projeto reativado e migração create_public_crm_social_leads aplicada. As tabelas preexistentes de outra aplicação foram preservadas; privilégios de sequências limitados às tabelas do CRM. O projeto anterior olhytsvxisvlmilphxic não resolve DNS e não está disponível na conexão; nenhum dado desse banco foi recuperado. A migração do cache agora é marcada por URL do projeto.

Revisão independente concluída: corrigidas reimportação antes do schema, ação de fila no diálogo e histórico na edição manual. Não foi feita publicação.
