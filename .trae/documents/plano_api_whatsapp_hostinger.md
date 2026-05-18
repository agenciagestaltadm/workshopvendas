## Resumo

Objetivo: fazer o painel em `https://www.agenciagestalt.com` conseguir acessar a API do WhatsApp em `https://api.agenciagestalt.com` sem `404` nem bloqueio de CORS, permitindo exibir o QR Code e iniciar/parar a conexão com o Baileys.

Critério de sucesso:
- `https://api.agenciagestalt.com/api/whatsapp/status` responde JSON no navegador.
- O response dessa rota inclui `Access-Control-Allow-Origin`.
- O painel admin em `https://www.agenciagestalt.com/admin` consegue consultar status e iniciar conexão.
- Ao clicar em "Iniciar Conexão", o status muda de `disconnected` para `connecting`/`qr` e o QR Code aparece.

## Análise Do Estado Atual

- O frontend já está preparado para usar API em domínio separado por meio de [api.ts](file:///c:/Users/agenc/OneDrive/Desktop/PROJETOS%20GESTALT/workshopdevendas/workshopvendas/src/lib/api.ts).
- As chamadas do WhatsApp já usam `apiFetch(...)` em [SiteSettingsDialog.tsx](file:///c:/Users/agenc/OneDrive/Desktop/PROJETOS%20GESTALT/workshopdevendas/workshopvendas/src/components/admin/SiteSettingsDialog.tsx) e [Register.tsx](file:///c:/Users/agenc/OneDrive/Desktop/PROJETOS%20GESTALT/workshopdevendas/workshopvendas/src/pages/Register.tsx).
- O backend Node já expõe as rotas `/api/whatsapp/status`, `/start`, `/stop` e `/send-registration` em [index.mjs](file:///c:/Users/agenc/OneDrive/Desktop/PROJETOS%20GESTALT/workshopdevendas/workshopvendas/server/index.mjs).
- O backend já define cabeçalhos CORS quando a requisição entra na branch `/api/whatsapp` em [index.mjs](file:///c:/Users/agenc/OneDrive/Desktop/PROJETOS%20GESTALT/workshopdevendas/workshopvendas/server/index.mjs).
- O script de execução da API é `npm start`, que sobe `node server/index.mjs`, conforme [package.json](file:///c:/Users/agenc/OneDrive/Desktop/PROJETOS%20GESTALT/workshopdevendas/workshopvendas/package.json).
- O subdomínio `api.agenciagestalt.com` atualmente aponta para `public_html/api`, ou seja, para conteúdo estático, não para a aplicação Node.
- O erro observado pelo usuário combina `404` e ausência de `Access-Control-Allow-Origin`, o que indica que a resposta está vindo do host estático/Apache da Hostinger, não da aplicação Node.

## Decisões E Premissas

- Decisão: manter o frontend em `www.agenciagestalt.com` e usar `api.agenciagestalt.com` como host dedicado da API Node.
- Decisão: não depender de proxy do Vite em produção.
- Premissa: o plano da Hostinger usado precisa suportar aplicação Node.js; se não suportar, a API deverá ser movida para VPS/serviço Node externo.
- Premissa: o frontend continuará sendo publicado de forma estática, enquanto a API Node ficará em ambiente separado no subdomínio.
- Decisão: a correção principal será de infraestrutura/deploy; o código atual já está próximo do formato necessário.

## Mudanças Propostas

### 1. Vincular `api.agenciagestalt.com` a uma aplicação Node real

Arquivos impactados:
- Nenhum arquivo do repositório nessa etapa; é configuração de hospedagem.

O que fazer:
- Criar ou configurar uma Node App no painel da Hostinger para o subdomínio `api.agenciagestalt.com`.
- Definir uma pasta de aplicação dedicada, fora de `public_html/api`, por exemplo `~/apps/workshop-whatsapp-api`.
- Configurar o startup file como `server/index.mjs`.
- Configurar o comando de inicialização equivalente a `npm start`.

Por quê:
- Enquanto o subdomínio apontar apenas para `public_html/api`, a Hostinger responderá com 404 de arquivo/página, sem passar pela lógica de CORS do Node.

Como verificar:
- Acessar `https://api.agenciagestalt.com/api/whatsapp/status`.
- O retorno esperado é JSON, não página HTML da Hostinger.

### 2. Publicar o projeto da API no diretório da aplicação Node

Arquivos impactados:
- [index.mjs](file:///c:/Users/agenc/OneDrive/Desktop/PROJETOS%20GESTALT/workshopdevendas/workshopvendas/server/index.mjs)
- [whatsapp.mjs](file:///c:/Users/agenc/OneDrive/Desktop/PROJETOS%20GESTALT/workshopdevendas/workshopvendas/server/whatsapp.mjs)
- [certificate.mjs](file:///c:/Users/agenc/OneDrive/Desktop/PROJETOS%20GESTALT/workshopdevendas/workshopvendas/server/certificate.mjs)
- [package.json](file:///c:/Users/agenc/OneDrive/Desktop/PROJETOS%20GESTALT/workshopdevendas/workshopvendas/package.json)
- `package-lock.json`
- pasta `dist`
- demais dependências do runtime do backend

O que fazer:
- Enviar para a pasta da app Node:
  - diretório `server`
  - `package.json`
  - `package-lock.json`
  - `dist`
- Rodar instalação de dependências no ambiente da app Node.
- Rodar build do frontend antes do deploy, para que o mesmo backend possa servir `dist` se necessário.

Por quê:
- O arquivo [index.mjs](file:///c:/Users/agenc/OneDrive/Desktop/PROJETOS%20GESTALT/workshopdevendas/workshopvendas/server/index.mjs) serve tanto a API quanto o `dist`, então a pasta publicada precisa conter ambos.

Como verificar:
- A app Node inicia sem erro.
- Os logs mostram inicialização normal do servidor e, ao chamar `/api/whatsapp/status`, há resposta válida.

### 3. Ajustar variáveis de ambiente do frontend para usar o subdomínio da API

Arquivos impactados:
- `.env` de build do frontend
- [api.ts](file:///c:/Users/agenc/OneDrive/Desktop/PROJETOS%20GESTALT/workshopdevendas/workshopvendas/src/lib/api.ts) já suporta isso, sem mudança obrigatória

O que fazer:
- Garantir no build do frontend:
  - `VITE_API_BASE_URL=https://api.agenciagestalt.com`

Por quê:
- Isso faz `apiFetch('/api/whatsapp/status')` virar `https://api.agenciagestalt.com/api/whatsapp/status`.

Como verificar:
- No DevTools, a request do admin deve sair para `https://api.agenciagestalt.com/api/whatsapp/status`.

### 4. Ajustar variáveis sensíveis do backend

Arquivos impactados:
- `.env` do servidor Node
- possíveis referências futuras no backend

O que fazer:
- Usar no backend:
  - `SUPABASE_SERVICE_ROLE_KEY=...`
- Evitar expor `VITE_SUPABASE_SERVICE_ROLE_KEY` em build do frontend.
- Rotacionar a service role atual do Supabase após a migração, pois ela já apareceu em contexto de trabalho.

Por quê:
- Variáveis com prefixo `VITE_` podem ser embutidas no bundle do frontend.

Como verificar:
- O backend continua conectando ao Supabase.
- O bundle do frontend não contém a service role.

### 5. Confirmar CORS no domínio final

Arquivos impactados:
- [index.mjs](file:///c:/Users/agenc/OneDrive/Desktop/PROJETOS%20GESTALT/workshopdevendas/workshopvendas/server/index.mjs)

O que fazer:
- Validar que as respostas de `/api/whatsapp/*` vindas do Node incluem:
  - `Access-Control-Allow-Origin: *` ou o domínio específico `https://www.agenciagestalt.com`
  - `Access-Control-Allow-Methods`
  - `Access-Control-Allow-Headers`
- Se necessário, restringir `Access-Control-Allow-Origin` para `https://www.agenciagestalt.com` após a estabilização.

Por quê:
- Quando a API responder pelo Node, o CORS deve deixar de falhar.
- O erro atual de CORS é efeito colateral do 404 do host estático.

Como verificar:
- Inspecionar os headers em `https://api.agenciagestalt.com/api/whatsapp/status`.
- Confirmar ausência de erro de CORS no navegador.

### 6. Validar o fluxo completo do QR Code

Arquivos impactados:
- [SiteSettingsDialog.tsx](file:///c:/Users/agenc/OneDrive/Desktop/PROJETOS%20GESTALT/workshopdevendas/workshopvendas/src/components/admin/SiteSettingsDialog.tsx)
- [whatsapp.mjs](file:///c:/Users/agenc/OneDrive/Desktop/PROJETOS%20GESTALT/workshopdevendas/workshopvendas/server/whatsapp.mjs)

O que fazer:
- Abrir o admin.
- Clicar em iniciar conexão.
- Confirmar sequência:
  - `status` retorna `connecting`
  - depois `qr`
  - o valor `qr` chega no frontend
  - o componente `react-qr-code` renderiza normalmente

Por quê:
- Fecha o ciclo entre CORS, API, Baileys e interface.

Como verificar:
- O QR aparece visualmente.
- O endpoint `/api/whatsapp/status` retorna `{"status":"qr","qr":"..."}` enquanto aguarda leitura.

## Sequência De Implementação

1. Confirmar que o plano/host da Hostinger suporta Node App.
2. Criar a aplicação Node para `api.agenciagestalt.com`.
3. Publicar os arquivos do projeto no diretório da app Node.
4. Configurar variáveis de ambiente do backend.
5. Configurar `VITE_API_BASE_URL=https://api.agenciagestalt.com` no frontend e rebuildar.
6. Publicar o novo `dist` do frontend.
7. Reiniciar a app Node.
8. Testar o endpoint `/api/whatsapp/status` diretamente.
9. Testar o admin e o fluxo do QR Code.
10. Rotacionar a service role do Supabase.

## Riscos E Casos De Falha

- Se a Hostinger não oferecer app Node nesse plano, o subdomínio continuará estático e o erro persistirá.
- Se SSL do subdomínio não estiver válido, o navegador bloqueará as requests antes do CORS.
- Se a app Node subir, mas sem `dist`, o backend pode responder API mas falhar ao servir assets/html.
- Se o processo Node estiver dormindo ou sendo reiniciado pela hospedagem compartilhada, o socket do Baileys pode cair mesmo após o CORS ser resolvido.
- Se a pasta de autenticação do Baileys não tiver permissão de escrita, o QR pode não evoluir mesmo com a API acessível.

## Verificação

Verificações manuais obrigatórias:
- Abrir `https://api.agenciagestalt.com/api/whatsapp/status` e confirmar JSON.
- Confirmar response headers com `Access-Control-Allow-Origin`.
- Abrir `https://www.agenciagestalt.com/admin`.
- Confirmar que o erro `Failed to fetch` desapareceu.
- Clicar em iniciar conexão e confirmar:
  - request `POST /api/whatsapp/start` com status 200
  - polling de `GET /api/whatsapp/status` com status 200
  - retorno de `status: "qr"`
  - QR visível na interface

Verificações de observabilidade:
- Conferir logs da app Node na Hostinger.
- Conferir se há criação/uso da pasta `server/auth_info_baileys`.
- Conferir ausência de 404 para `/api/whatsapp/*`.

## Resultado Esperado

Após o deploy correto da aplicação Node no subdomínio `api.agenciagestalt.com`, o erro atual de `404 + CORS` desaparece porque a resposta deixa de vir do host estático da Hostinger e passa a vir da aplicação Node em [index.mjs](file:///c:/Users/agenc/OneDrive/Desktop/PROJETOS%20GESTALT/workshopdevendas/workshopvendas/server/index.mjs), que já contém as rotas e os cabeçalhos necessários para o fluxo do WhatsApp.
