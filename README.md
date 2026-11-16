# MAPS-SCRAPER

CRM para importar planilhas de empresas, identificar oportunidades sem site e organizar contatos, respostas e follow-ups.

## WhatsApp, Instagram e fila de contato

As áreas WhatsApp e Instagram permitem cadastro manual com nome, telefone, estado brasileiro, etapa e categoria criada pelo usuário. O telefone é obrigatório para WhatsApp; Instagram pode ser cadastrado antes de obter o telefone. Há botões para copiar o número e abrir a conversa, sem enviar mensagens automaticamente.

O Kanban tem Novo, Contatado, Tentar novamente, Descartado, Negociação / Call e Fechado. Arraste pela alça ⠿ com mouse ou toque; o seletor de etapa oferece uma alternativa por teclado ou toque. Arrastar próximo à borda rola o quadro horizontalmente. Etapas antigas Respondeu e Follow-up continuam preservadas e aparecem como Negociação e Tentar novamente no quadro.

Em **Para contatar**, use **Selecionar da base** para incluir leads de qualquer origem. A seleção referencia a mesma empresa, preservando histórico e origem. Também é possível enviar pela tabela ou pelos detalhes. Remover da fila não exclui o lead. Categorias e estados filtram o quadro; categorias podem ser atribuídas no cadastro ou nos detalhes das empresas importadas.

## Executar e configurar o banco

Execute `npm install`, `npm run build` e `npm run dev`. Abra http://127.0.0.1:4173. Os arquivos de aplicação ficam em `dist/`; o build gera o cliente Supabase e o SQL completo, sem apagar esses arquivos.

O projeto Supabase é definido em `dist/config.mjs`, com URL e chave **publicável**. Nunca use uma chave secreta ou service role nesse arquivo. O projeto precisa estar ativo. Para uma base nova, execute `dist/schema.sql` após o build. Para uma base que já tem o CRM, execute somente `supabase/social-leads.sql`. A atualização é aditiva e mantém os dados existentes.

O acesso é compartilhado e sem login: quem tem acesso ao CRM pode ler e alterar a base. Novos cadastros e alterações exigem confirmação do banco; uma conexão indisponível não é tratada como salvamento compartilhado. Use Atualizar para buscar mudanças feitas por outra pessoa. A última alteração confirmada de cada campo prevalece.

`npm test` valida importação, regiões, cadastro, filtros, preservação de dados comerciais e erros de persistência.

## Países e regiões

Selecione um país na lateral e uma região dentro dele. A seleção acompanha as áreas de prospecção, nichos, contadores e exportação de leads. “Todas as regiões” reúne o país; “Sem região definida” mantém acessíveis registros vazios ou não reconhecidos, sem alterar os dados existentes.

A importação reconhece nomes, siglas e códigos de Estado / região. Um destino opcional preenche apenas linhas sem esse campo; valores desconhecidos ficam preservados para revisão. Nos detalhes é possível alterar a região, ou atribuí-la em lote pela seleção da tabela. O campo `companies.state` existente armazena a escolha no Supabase.

Catálogos: Brasil (26 estados e DF), Estados Unidos (50 estados e DC), Portugal (18 distritos e 2 regiões autônomas), Espanha (17 comunidades e 2 cidades autônomas), Itália (20 regiões), Reino Unido (4 nações), Alemanha (16 estados), Países Baixos (12 províncias e 3 municípios caribenhos), Irlanda (26 condados geográficos), Suíça (26 cantões), Áustria (9 estados).

Referências: [IBGE](https://educa.ibge.gov.br/jovens/conheca-o-brasil/territorio/19637-divisao-territorial.html), [US Census](https://www.census.gov/library/reference/code-lists/ansi/ansi-codes-for-states.html), [Governo de Portugal](https://portugal.gov.pt/gc24/portugal/sobre-portugal), [La Moncloa](https://www.lamoncloa.gob.es/espana/organizacionestado/Paginas/index.aspx), [ISTAT](https://www.istat.it/it/files/2020/04/settimanaEnigmistica_orizzontale.pdf), [GOV.UK](https://www.gov.uk/government/publications/list-of-cities/list-of-cities-html), [Destatis](https://www.destatis.de/DE/Themen/Laender-Regionen/Regionales/Gemeindeverzeichnis/Glossar/bundeslaender.html), [Governo dos Países Baixos](https://www.government.nl/themes/government-and-democracy/public-administration/provinces-municipalities-and-water-authorities), [CSO Irlanda](https://www.cso.ie/en/methods/classifications/csodatastandardsandclassifications/csostatisticalclassifications/csocountyandnutsregionsclassification/), [BFS Suíça](https://dam-api.bfs.admin.ch/hub/api/dam/assets/36390092/master), [Parlamento austríaco](https://www.parlament.gv.at/en/explore/political-system/the-federal-state-of-austria).
