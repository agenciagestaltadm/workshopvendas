# Plano de Resolução: Envio de Certificado pelo WhatsApp

## Resumo
Corrigir o problema de envio do certificado após o término do curso. O sistema estava salvando o status de "escaneado" em uma coluna do banco de dados, mas o "robô" de envios do WhatsApp estava lendo outra coluna, causando uma falha silenciosa.

## Análise do Estado Atual
- A tabela `registration_courses` possui duas colunas semelhantes: `is_scanned` e `scanned`.
- O scanner (Painel Admin) atualizava apenas `scanned = true`.
- O robô que verifica o fim do curso e envia o certificado estava buscando por `is_scanned = true` (ou vice-versa), gerando divergência.
- O campo `certificate_sent` já existe e evita envios duplicados, mas não estava sendo alcançado devido à divergência de colunas.

## Mudanças Propostas
1. **Unificar as colunas no Banco de Dados (RPC)**
   - Editar a função `validate_and_scan_qr_code` no Supabase para que, ao escanear o QR Code na portaria, o sistema atualize as duas colunas (`scanned` e `is_scanned`) para `true`.
   - Isso garante compatibilidade com o frontend (página de certificados) e com o backend (WhatsApp).

2. **Ajustar o Job do WhatsApp (`server/whatsapp.mjs`)**
   - Garantir que a query do Supabase filtre corretamente pelas inscrições escaneadas.
   - Manter a verificação rigorosa `eq('certificate_sent', false)` para barrar 100% qualquer envio duplicado.
   - Manter a regra `.lt('courses.ends_at', new Date().toISOString())` para enviar apenas quando o curso tiver terminado de fato.

3. **Reiniciar o Servidor**
   - Garantir que não haja conflitos de sessão com o WhatsApp (erro `Stream Errored (conflict)`).

## Suposições e Decisões
- O erro de "não envio" foi unicamente causado pela divergência do nome da coluna. A geração do PDF e a API do WhatsApp estão funcionando corretamente.
- A sessão do WhatsApp caiu porque o botão "Desconectar" foi clicado durante os testes; basta conectar novamente.

## Verificação
1. O administrador irá reconectar o WhatsApp no painel.
2. Fazer uma nova inscrição e escanear o QR Code no painel.
3. Aguardar o término do curso (data/hora).
4. O sistema deve disparar o PDF automaticamente para o WhatsApp e atualizar `certificate_sent` para `true`.