# Plano de Implementação: Integração com WhatsApp (Baileys) para Mensagens e Certificados

## 1. Resumo
O objetivo é integrar o envio automático de mensagens e certificados via WhatsApp usando a biblioteca Baileys, diretamente pelo servidor Node.js já existente (`server/index.mjs`). A configuração será gerenciada no painel de administração, incluindo a leitura do QR Code para conectar o WhatsApp, além de opções (boolean) para ativar/desativar envios de confirmação e de certificados. O sistema enviará confirmações com 8 a 15 segundos de atraso e os certificados serão enviados de forma automática (através de um job em segundo plano) após o término do curso, apenas para participantes que tiveram sua presença confirmada (QR Code escaneado).

## 2. Análise do Estado Atual
- O sistema possui um backend simples em Node.js (`server/index.mjs`) que serve a aplicação React (Vite).
- A tabela `site_settings` armazena configurações globais.
- A tabela `courses` já possui o campo `ends_at` (data/hora de término).
- A tabela `registration_courses` possui a flag `is_scanned` (para controle de presença).
- O frontend possui o componente `SiteSettingsDialog.tsx` que gerencia as opções do site.
- A geração de certificado já é feita no frontend via `jsPDF`.

## 3. Mudanças Propostas

### Passo 1: Banco de Dados (Supabase)
- **Migração SQL:**
  - Adicionar colunas booleanas na tabela `site_settings`: `enable_whatsapp_messages` (default false) e `enable_whatsapp_certificates` (default false).
  - Adicionar coluna booleana em `registration_courses`: `certificate_sent` (default false), para controlar quais certificados já foram enviados.
  - Atualizar as funções RPC (`get_site_settings`, `update_site_settings`) para contemplar as novas colunas.

### Passo 2: Servidor Node.js (Integração Baileys e API)
- Instalar as dependências `@whiskeysockets/baileys` e `qrcode` no projeto.
- Criar o módulo `server/whatsapp.mjs`:
  - Lógica para iniciar (`startWhatsApp`), parar (`stopWhatsApp`) e checar o status da conexão do Baileys (`getWhatsAppStatus`). A sessão será salva localmente (ex: `server/auth_info_baileys`).
  - Lógica para enviar a mensagem de confirmação de inscrição (`sendRegistrationMessage`), aguardando de 8 a 15 segundos antes do envio e anexando a imagem do QR Code.
  - Lógica de Job em Background (Cron): um `setInterval` que roda a cada 15 minutos, verificando no Supabase cursos já finalizados (`ends_at < NOW()`). Para cada inscrição com `is_scanned = true` e `certificate_sent = false`, irá gerar o PDF do certificado e enviar pelo WhatsApp, atualizando `certificate_sent` para `true`.
- Atualizar `server/index.mjs`:
  - Adicionar rotas da API:
    - `GET /api/whatsapp/status`
    - `POST /api/whatsapp/start`
    - `POST /api/whatsapp/stop`
    - `POST /api/whatsapp/send-registration`

### Passo 3: Frontend (Painel Admin)
- **`SiteSettingsDialog.tsx`**:
  - Criar uma nova aba "WhatsApp".
  - Adicionar as opções de "Ativar envio de mensagens" e "Ativar envio de certificados".
  - Exibir a interface de conexão: mostrar o status (Conectado, Desconectado) em tempo real (via polling do endpoint `GET /api/whatsapp/status`).
  - Exibir o componente de QR Code (`react-qr-code`) para escaneamento pelo celular do admin, caso o status seja aguardando leitura.
  - Botões para Iniciar Conexão e Desconectar.

### Passo 4: Frontend (Fluxo de Inscrição)
- **`Register.tsx`**:
  - Após uma inscrição bem-sucedida, se a configuração `enable_whatsapp_messages` estiver ativa, fazer uma requisição `POST /api/whatsapp/send-registration` passando os dados do participante, nome do curso e o texto do QR Code gerado, para que o backend inicie o processo de envio assíncrono (com o delay de 8-15s).

## 4. Suposições e Decisões
- O Node.js do `server/index.mjs` é o ambiente em execução constante que pode manter a conexão WebSocket do Baileys aberta.
- A geração do certificado PDF para envio automático será replicada/adaptada no Node.js usando `jsPDF` ou envio de um template similar ao que já existe no frontend.
- Caso as configurações de WhatsApp sejam desativadas, a conexão do Baileys será imediatamente encerrada (logout) e o job de certificados será pausado.

## 5. Passos para Verificação
- Acessar o painel Admin, habilitar a função de WhatsApp, gerar o QR Code e escanear com um celular de testes.
- Realizar uma inscrição de teste e verificar se a mensagem chega ao WhatsApp fornecido com o delay esperado e o QR Code em anexo.
- Alterar o `ends_at` de um curso para o passado, marcar o QR Code da inscrição de teste como escaneado (`is_scanned = true`), e aguardar a execução do job automático (ou acioná-lo manualmente) para verificar o recebimento do PDF do certificado.