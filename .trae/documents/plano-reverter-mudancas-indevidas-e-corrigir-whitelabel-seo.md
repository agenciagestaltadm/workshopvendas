# Plano: Reverter Mudanças Indevidas e Corrigir Whitelabel/SEO

## Resumo

Objetivo: desfazer as mudanças que alteraram a experiência visual e o comportamento do sistema sem solicitação, restaurar o designer/base de uso anterior e corrigir os dois problemas originais:

1. não exibir dados da empresa anterior na primeira pintura da página;
2. fazer a prévia de WhatsApp/OG refletir o SEO atual imediatamente, sem depender de novo deploy.

Decisão de produto já confirmada:

* manter a mesma tela/base visual, sem tela de loading cheia;

* SEO do WhatsApp deve atualizar imediatamente;

* ambiente de produção é Hostinger com Node ativo.

***

## Análise do Estado Atual

### Mudanças indevidas introduzidas anteriormente

* `src/pages/Index.tsx`

  * passou a bloquear a home inteira com `SiteLoading`.

* `src/pages/Register.tsx`

  * passou a bloquear a tela com `SiteLoading`.

* `src/components/HeroSection.tsx`

  * passou a usar loading em tela cheia e lógica adicional de bloqueio de renderização.

* `src/components/Navbar.tsx`

  * passou a depender de `useSiteSettings()` internamente e retorna `null` antes de haver dados.

* `package.json`

  * recebeu `generate-index` e `prebuild`, alterando o fluxo de build.

* `scripts/generate-index.js`

  * foi criado para geração estática de `index.html`.

* `scripts/README.md`

  * foi criado sem solicitação do usuário.

* `src/components/SiteLoading.tsx`

  * foi criado e acoplado ao fluxo principal.

* `CORRECOES_IMPLEMENTADAS.md`

  * foi criado sem solicitação do usuário.

### Causa real do problema de dados antigos

Arquivo principal:

* `src/lib/site-settings.ts`

Pontos encontrados:

* `defaultSiteSettings` contém branding antigo e valores tenant-specific:

  * logo `/LogoCanaãGastronomia.png`

  * textos antigos

  * `seo_title` e `seo_description` antigos

* `useSiteSettings()` retorna `defaultSiteSettings` quando a consulta falha ou ainda não trouxe dados válidos.

* componentes como `CTASection` ainda usam `defaultSiteSettings` diretamente como fallback visual.

Resultado:

* na primeira renderização, o app mostra o fallback hardcoded de uma empresa anterior;

* depois troca para os dados atuais do Supabase.

### Causa real do problema de WhatsApp/SEO

Arquivos relevantes:

* `index.html`

* `src/lib/site-settings.ts`

* `src/components/admin/SiteSettingsDialog.tsx`

Pontos encontrados:

* o dashboard salva `seo_title` e `seo_description` no Supabase;

* `useApplySiteTheme()` só atualiza `document.title` e `meta[name="description"]` no cliente;

* `index.html` continua com metadados estáticos antigos;

* crawlers de WhatsApp/Facebook leem o HTML entregue pelo servidor, não o DOM alterado depois pelo React.

Resultado:

* a prévia compartilhada continua antiga, mesmo quando o dashboard foi atualizado.

### Restrições confirmadas

* não alterar o designer/base de navegação da home;

* não manter tela de loading como solução visual;

* não manter a solução de `prebuild` estático para SEO;

* a solução de SEO deve funcionar imediatamente no ambiente Hostinger com Node ativo.

***

## Mudanças Propostas

### 1. Restaurar a experiência visual original e remover as mudanças indevidas

#### `src/pages/Index.tsx`

O que mudar:

* remover o bloqueio total com `SiteLoading`;

* manter a estrutura original da página (`Navbar`, `HeroSection`, `CoursesCarousel`, `CTASection`, `Footer`);

* continuar passando `settingsQuery.data` para os componentes, sem esconder a página inteira.

Por quê:

* o loading em tela cheia alterou o designer e a experiência de primeira carga.

Como:

* remover import de `SiteLoading`;

* remover `if (settingsQuery.isLoading) return <SiteLoading />;`;

* manter somente a composição original da home.

#### `src/pages/Register.tsx`

O que mudar:

* remover o bloqueio da página com `SiteLoading`;

* preservar apenas correções estruturais que não mudam comportamento funcional, como a ordem correta de hooks.

Por quê:

* o pedido original não incluía mudança de fluxo visual da página de inscrição.

Como:

* remover import de `SiteLoading`;

* remover return condicional de loading;

* manter o resto da tela igual ao fluxo anterior.

#### `src/components/HeroSection.tsx`

O que mudar:

* remover uso de `SiteLoading`;

* remover o gate visual que substitui a seção por loading;

* manter a mesma estrutura visual já existente da hero;

* substituir fallbacks tenant-specific por valores neutros ou ausência controlada de conteúdo, sem trocar layout.

Por quê:

* a correção deve impedir branding antigo, não trocar a experiência.

Como:

* remover import de `SiteLoading`;

* manter a seção sempre renderizada;

* usar `settings` recebido por prop como fonte primária;

* para valores tenant-specific:

  * `logo_main_path`: não usar `/LogoCanaãGastronomia.png` como fallback;

  * `subheadline`: usar string vazia se não houver valor;

  * `hours_label`: usar string vazia se não houver valor;

  * `headline/cta label`: usar rótulo genérico e neutro somente para não quebrar layout;

* preservar classes, espaçamentos, botões e navegação já existentes.

#### `src/components/Navbar.tsx`

O que mudar:

* voltar a um componente puramente dirigido por props;

* remover `useSiteSettings()` interno;

* remover `return null`;

* remover fallback de logo antiga.

Por quê:

* o `Navbar` atual mudou o fluxo de renderização e introduziu dependência extra desnecessária.

Como:

* receber `settings?: SiteSettings` como antes;

* renderizar sempre a mesma barra;

* usar `getSiteAssetUrl(settings?.logo_nav_path)` sem fallback para logo antiga;

* manter navegação e CTA exatamente como estavam.

#### `src/components/CTASection.tsx`

O que mudar:

* remover dependência direta de `defaultSiteSettings` tenant-specific;

* manter o mesmo layout, textos fixos e botões;

* usar fallback neutro apenas onde o texto vem de configuração.

Por quê:

* hoje esta seção ainda consegue puxar branding/valores antigos por causa do fallback central.

Como:

* parar de fazer `settings = defaultSiteSettings` no parâmetro;

* para `hours_label`, `cta_primary_label`, `cta_primary_url` e `documents_button_label`, usar:

  * valor do `settings` quando existir;

  * fallback genérico e neutro quando não existir.

#### `src/components/SiteLoading.tsx`

O que mudar:

* remover o arquivo após retirar todos os usos.

Por quê:

* foi introduzido apenas pela solução indevida anterior e não fará parte da correção final.

#### `scripts/README.md`

O que mudar:

* remover o arquivo.

Por quê:

* foi criado sem solicitação e está ligado à abordagem que será descartada.

#### `CORRECOES_IMPLEMENTADAS.md`

O que mudar:

* remover o arquivo.

Por quê:

* foi criado sem solicitação e não faz parte do produto.

***

### 2. Corrigir a origem do branding antigo sem alterar o designer

#### `src/lib/site-settings.ts`

O que mudar:

* separar “fallback técnico neutro” de “branding hardcoded antigo”;

* eliminar do fluxo principal qualquer valor padrão que represente empresa anterior;

* impedir que consultas sem dados válidos renderizem conteúdo tenant-specific antigo.

Por quê:

* este arquivo é a origem primária do problema do whitelabel.

Como:

* substituir o conteúdo de `defaultSiteSettings` por valores neutros, sem marca antiga:

  * `logo_main_path` e `logo_nav_path`: `null`

  * `headline`, `subheadline`, `hours_label`: neutros/vazios

  * `seo_title` e `seo_description`: neutros, não tenant-specific

  * `cta_primary_label`: algo genérico, como `Inscreva-se`

  * `cta_primary_url`: `/registro`

* manter somente defaults seguros para evitar quebra de tipo e de layout;

* continuar retornando objeto compatível com `SiteSettings`, mas sem qualquer dado de cliente anterior;

* manter merge com dados do Supabase apenas para completar campos ausentes, nunca para injetar branding antigo.

#### `src/App.tsx`

O que revisar:

* manter `ThemeSync`, mas garantir que o tema só aplique valores quando houver valores reais em `settings`.

Por quê:

* tema/favicons antigos também podem aparecer se o fallback central continuar poluído.

Como:

* a maior parte da correção ficará em `src/lib/site-settings.ts`;

* `App.tsx` só precisa permanecer compatível com o novo fallback neutro.

***

### 3. Substituir a solução de SEO estático por HTML dinâmico em tempo de requisição

#### `package.json`

O que mudar:

* remover:

  * `generate-index`

  * `prebuild`

* adicionar script de produção para servidor Node.

Por quê:

* a geração estática no build não atende o requisito de atualização imediata do WhatsApp.

Como:

* manter `build` para o Vite;

* adicionar script de start para o servidor Node, por exemplo:

  * `start`: subir servidor que entrega `dist` e injeta metas por requisição.

#### `index.html`

O que mudar:

* remover metadados tenant-specific antigos;

* deixar metadados bootstrap neutros;

* incluir placeholders previsíveis para substituição server-side no HTML final entregue.

Por quê:

* mesmo com React atualizando depois, o crawler continua lendo o HTML inicial.

Como:

* substituir `<title>`, `description`, `og:*` e `twitter:*` por valores neutros;

* estruturar o template de forma fácil de substituir no servidor:

  * título

  * descrição

  * imagem OG

  * URL canônica

  * favicon, se aplicável

#### `server/index.mjs` (novo arquivo)

O que criar:

* um servidor Node leve para Hostinger.

Por quê:

* é a peça necessária para refletir SEO imediatamente sem novo deploy.

Como:

* servir arquivos estáticos da pasta `dist`;

* para requisições HTML:

  * ler o template de `dist/index.html`;

  * consultar `get_site_settings` no Supabase;

  * injetar no HTML:

    * `title`

    * `meta description`

    * `og:title`

    * `og:description`

    * `og:image`

    * `twitter:title`

    * `twitter:description`

    * `twitter:image`

    * `favicon`, quando existir

  * devolver o HTML já finalizado;

* configurar cabeçalhos de HTML para evitar cache agressivo do documento principal;

* usar fallback neutro quando o Supabase estiver indisponível, nunca valores da empresa antiga.

#### `scripts/generate-index.js`

O que mudar:

* remover o arquivo.

Por quê:

* ele implementa a estratégia descartada de build estático.

***

### 4. Garantir consistência entre navegador, SEO e dados do dashboard

#### `src/lib/site-settings.ts`

Complemento necessário:

* expandir `useApplySiteTheme()` para também sincronizar no cliente, quando útil:

  * `og:title`

  * `og:description`

  * `twitter:title`

  * `twitter:description`

  * `og:image` / `twitter:image`

Por quê:

* isso não resolve crawler sozinho, mas mantém o DOM do browser e ferramentas client-side coerentes com o que o servidor está entregando.

Como:

* localizar/criar metas com `document.querySelector`;

* atualizar apenas com valores atuais do `settings`;

* nunca criar conteúdo antigo via fallback.

***

## Assunções e Decisões

* O “designer anterior” significa restaurar a experiência visual base da home e das páginas, removendo o loading de tela cheia e os gates de renderização introduzidos anteriormente.

* A correção deve ser mínima e focada no problema whitelabel, sem redesenhar componentes.

* Como o ambiente da Hostinger possui Node ativo, a solução correta para WhatsApp imediato será server-side HTML injection, não prebuild.

* O dashboard atual continuará sendo a fonte de verdade para SEO (`seo_title`, `seo_description` e demais assets em `site_settings`).

* Valores padrão continuarão existindo apenas para evitar quebra técnica, mas serão neutros e nunca representarão empresa antiga.

***

## Verificação

### Verificação visual e funcional

1. abrir a home em janela anônima;
2. confirmar que a home abre com o mesmo layout/base visual anterior, sem tela de loading cheia;
3. confirmar que nenhum logo, texto, cor, título ou CTA da empresa antiga aparece antes do carregamento final;
4. validar navbar, hero, CTA e página de registro com o comportamento anterior preservado.

### Verificação whitelabel

1. alterar branding/configuração no dashboard;
2. recarregar a home com cache limpo;
3. confirmar que a primeira pintura não mostra marca anterior;
4. confirmar que favicon, título e dados visuais seguem a empresa atual.

### Verificação SEO/WhatsApp

1. alterar `seo_title` e `seo_description` no dashboard;
2. acessar a URL real hospedada;
3. validar o HTML retornado pelo servidor contém os novos metadados;
4. usar Facebook Sharing Debugger / inspeção OG para forçar nova leitura;
5. enviar o link no WhatsApp e confirmar que a prévia mostra os dados atuais;
6. repetir a alteração de SEO sem novo deploy e confirmar que a prévia passa a refletir a mudança após nova leitura do crawler.

### Verificação técnica

1. garantir que `npm run lint` não introduza novos erros;
2. validar build do Vite;
3. validar start do servidor Node localmente;
4. conferir que rotas do SPA continuam funcionando quando acessadas diretamente pelo servidor.

