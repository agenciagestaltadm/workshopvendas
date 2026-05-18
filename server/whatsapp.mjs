import { makeWASocket, useMultiFileAuthState, DisconnectReason } from '@whiskeysockets/baileys';
import QRCode from 'qrcode';
import path from 'path';
import fs from 'fs';
import pino from 'pino';
import { generateCertificatePdfNode } from './certificate.mjs';

const logger = pino({ level: 'silent' });
let sock = null;
let currentQr = null;
let connectionStatus = 'disconnected'; // 'disconnected', 'connecting', 'connected', 'qr'
let certificateJobInterval = null;

export const getWhatsAppStatus = () => {
  return { status: connectionStatus, qr: currentQr };
};

export const startWhatsApp = async () => {
  if (connectionStatus === 'connected' || connectionStatus === 'connecting') return;
  console.log('[WhatsApp] Iniciando conexão...');
  connectionStatus = 'connecting';
  currentQr = null;

  try {
    const authFolder = path.resolve(process.cwd(), 'server', 'auth_info_baileys');
    if (!fs.existsSync(authFolder)) {
      fs.mkdirSync(authFolder, { recursive: true });
    }
    const { state, saveCreds } = await useMultiFileAuthState(authFolder);

    sock = makeWASocket({
      auth: state,
      printQRInTerminal: false,
      logger,
      browser: ['Admin Panel', 'Chrome', '1.0.0']
    });

    sock.ev.on('connection.update', (update) => {
      const { connection, lastDisconnect, qr } = update;
      
      if (qr) {
        currentQr = qr;
        connectionStatus = 'qr';
      }

      if (connection === 'close') {
        const shouldReconnect = lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut;
        console.log(`[WhatsApp] Conexão fechada. Reconectar? ${shouldReconnect}`, lastDisconnect.error);
        connectionStatus = 'disconnected';
        currentQr = null;
        if (shouldReconnect) {
          startWhatsApp();
        } else {
          if (fs.existsSync(authFolder)) {
            fs.rmSync(authFolder, { recursive: true, force: true });
          }
        }
      } else if (connection === 'open') {
        console.log('[WhatsApp] Conexão ABERTA e pronta!');
        connectionStatus = 'connected';
        currentQr = null;
      }
    });

    sock.ev.on('creds.update', saveCreds);
  } catch (error) {
    console.error('Error starting WhatsApp:', error);
    connectionStatus = 'disconnected';
  }
};

export const stopWhatsApp = async () => {
  if (sock) {
    sock.logout();
    sock = null;
  }
  connectionStatus = 'disconnected';
  currentQr = null;
  const authFolder = path.resolve(process.cwd(), 'server', 'auth_info_baileys');
  if (fs.existsSync(authFolder)) {
    fs.rmSync(authFolder, { recursive: true, force: true });
  }
};

export const sendRegistrationMessage = async (phone, name, courseName, qrCodeText) => {
  console.log(`[WhatsApp] Tentando enviar mensagem para: ${phone}, connectionStatus: ${connectionStatus}`);
  if (connectionStatus !== 'connected' || !sock) {
    console.error('[WhatsApp] WhatsApp is not connected.');
    return;
  }

  try {
    const delay = Math.floor(Math.random() * (15000 - 8000 + 1)) + 8000;
    console.log(`[WhatsApp] Aguardando delay de ${delay}ms para ${phone}`);
    await new Promise(resolve => setTimeout(resolve, delay));

    let cleanPhone = phone.replace(/\D/g, '');
    if (!cleanPhone.startsWith('55')) {
      cleanPhone = '55' + cleanPhone;
    }
    
    let numberId = `${cleanPhone}@s.whatsapp.net`;
    
    // Check if the number exists on WhatsApp and get the correct internal JID
    try {
      const [result] = await sock.onWhatsApp(numberId);
      if (result && result.exists) {
        numberId = result.jid;
        console.log(`[WhatsApp] JID resolvido para: ${numberId}`);
      } else {
        console.log(`[WhatsApp] Aviso: número ${numberId} não encontrado no WhatsApp (pode falhar).`);
      }
    } catch (e) {
      console.log(`[WhatsApp] Não foi possível verificar o número:`, e);
    }
    
    let messageContent = {
      caption: `Olá, *${name}*!\n\nSua inscrição no curso *${courseName}* foi confirmada com sucesso.`
    };

    if (qrCodeText) {
      const qrImageBuffer = await QRCode.toBuffer(qrCodeText);
      messageContent = {
        image: qrImageBuffer,
        caption: messageContent.caption + `\n\nAbaixo está o seu QR Code de acesso ao curso. Apresente-o na entrada do evento.`
      };
    } else {
      messageContent = { text: messageContent.caption };
    }

    console.log(`[WhatsApp] Enviando mensagem de fato para ${numberId}...`);
    await sock.sendMessage(numberId, messageContent);
    console.log(`[WhatsApp] Registration message sent to ${phone}`);
  } catch (error) {
    console.error('[WhatsApp] Error sending registration message:', error);
  }
};

export const sendCertificateMessage = async (phone, name, courseName, pdfBuffer) => {
  if (connectionStatus !== 'connected' || !sock) {
    console.error('WhatsApp is not connected.');
    return;
  }

  try {
    let cleanPhone = phone.replace(/\D/g, '');
    if (!cleanPhone.startsWith('55')) {
      cleanPhone = '55' + cleanPhone;
    }
    
    let numberId = `${cleanPhone}@s.whatsapp.net`;
    
    // Check if the number exists on WhatsApp and get the correct internal JID
    try {
      const [result] = await sock.onWhatsApp(numberId);
      if (result && result.exists) {
        numberId = result.jid;
      }
    } catch (e) {
      console.log(`[WhatsApp] Não foi possível verificar o número para certificado:`, e);
    }
    
    const text = `Olá, *${name}*!\n\nParabéns por concluir o curso *${courseName}*!\n\nSegue em anexo o seu certificado de conclusão.`;

    await sock.sendMessage(numberId, {
      document: pdfBuffer,
      mimetype: 'application/pdf',
      fileName: `Certificado_${courseName.replace(/\s+/g, '_')}.pdf`,
      caption: text
    });
    console.log(`Certificate message sent to ${phone}`);
  } catch (error) {
    console.error('Error sending certificate message:', error);
  }
};

export const startCertificateJob = (supabase) => {
  if (certificateJobInterval) clearInterval(certificateJobInterval);

  const runJob = async () => {
    if (connectionStatus !== 'connected' || !sock) return;

    try {
      const { data: settings } = await supabase.rpc('get_site_settings');
      if (!settings || !settings.enable_whatsapp_certificates) return;

      const { data: records, error } = await supabase
        .from('registration_courses')
        .select(`
          id,
          course_id,
          registration_id,
          qr_code,
          registrations!inner (
            name,
            phone,
            document
          ),
          courses!inner (
            name,
            starts_at,
            ends_at,
            hours_label
          )
        `)
        .eq('scanned', true)
        .eq('certificate_sent', false)
        .lt('courses.ends_at', new Date().toISOString());

      if (error) {
        console.error('[WhatsApp] Error fetching records for certificates:', error);
        return;
      }

      if (!records || records.length === 0) return;
      console.log(`[WhatsApp] Encontrados ${records.length} certificados para enviar.`);

      for (const record of records) {
        try {
          const certData = {
            name: record.registrations.name,
            courseName: record.courses.name,
            courseDate: new Date(record.courses.starts_at).toLocaleDateString('pt-BR'),
            courseHoursLabel: record.courses.hours_label,
            themePrimary: settings.theme_primary,
            qrCode: record.qr_code,
          };

          const pdfBuffer = await generateCertificatePdfNode(certData);

          await sendCertificateMessage(
            record.registrations.phone,
            record.registrations.name,
            record.courses.name,
            pdfBuffer
          );

          await supabase
            .from('registration_courses')
            .update({ certificate_sent: true })
            .eq('id', record.id);
            
        } catch (err) {
          console.error(`[WhatsApp] Error processing certificate for registration_course ${record.id}:`, err);
        }
      }
    } catch (e) {
      console.error('[WhatsApp] Error in certificate job:', e);
    }
  };

  certificateJobInterval = setInterval(runJob, 60 * 1000); // run every 1 minute
  // Run once immediately
  setTimeout(runJob, 5000);
};

export const stopCertificateJob = () => {
  if (certificateJobInterval) {
    clearInterval(certificateJobInterval);
    certificateJobInterval = null;
  }
};
