import { jsPDF } from 'jspdf';

export type CertificateData = {
  name: string;
  courseName: string;
  courseDate: string;
  courseEndDate?: string | null;
  courseTimeLabel?: string | null;
  courseHoursLabel?: string | null;
  logoUrl?: string | null;
  qrCode?: string | null;
  themePrimary?: string | null;
  themeAccent?: string | null;
  signatureUrl?: string | null;
};

/** Converte hex (#3b82f6) para [r, g, b] */
function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '').trim();
  const normalized = clean.length === 3 ? clean.split('').map((c) => `${c}${c}`).join('') : clean;
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) return [59, 130, 246];
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  return [r, g, b];
}

function lightenRgb(r: number, g: number, b: number, factor: number = 0.7): [number, number, number] {
  return [
    Math.round(r + (255 - r) * factor),
    Math.round(g + (255 - g) * factor),
    Math.round(b + (255 - b) * factor),
  ];
}

function darkenRgb(r: number, g: number, b: number, factor: number = 0.3): [number, number, number] {
  return [
    Math.round(r * (1 - factor)),
    Math.round(g * (1 - factor)),
    Math.round(b * (1 - factor)),
  ];
}

export const generateCertificatePdf = async (data: CertificateData): Promise<Blob> => {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth(); // 297mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 210mm
  const centerX = pageWidth / 2;

  // Cores do tema
  const [primaryR, primaryG, primaryB] = hexToRgb(data.themePrimary ?? '#3b82f6');
  const [lightR, lightG, lightB] = lightenRgb(primaryR, primaryG, primaryB, 0.8);
  const [darkR, darkG, darkB] = darkenRgb(primaryR, primaryG, primaryB, 0.4);
  const [veryLightR, veryLightG, veryLightB] = lightenRgb(primaryR, primaryG, primaryB, 0.92);

  // ===== FUNDO =====
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');

  // Gradiente sutil no topo
  for (let i = 0; i < 35; i++) {
    const alpha = 0.025 * (1 - i / 35);
    doc.setFillColor(
      Math.round(255 * (1 - alpha) + veryLightR * alpha),
      Math.round(255 * (1 - alpha) + veryLightG * alpha),
      Math.round(255 * (1 - alpha) + veryLightB * alpha)
    );
    doc.rect(0, i, pageWidth, 1, 'F');
  }

  // Gradiente sutil na base
  for (let i = 0; i < 25; i++) {
    const alpha = 0.025 * (1 - i / 25);
    doc.setFillColor(
      Math.round(255 * (1 - alpha) + veryLightR * alpha),
      Math.round(255 * (1 - alpha) + veryLightG * alpha),
      Math.round(255 * (1 - alpha) + veryLightB * alpha)
    );
    doc.rect(0, pageHeight - i, pageWidth, 1, 'F');
  }

  // ===== BORDA DECORATIVA =====
  doc.setDrawColor(primaryR, primaryG, primaryB);
  doc.setLineWidth(1.8);
  doc.rect(10, 10, pageWidth - 20, pageHeight - 20);

  doc.setDrawColor(lightR, lightG, lightB);
  doc.setLineWidth(0.5);
  doc.rect(14, 14, pageWidth - 28, pageHeight - 28);

  // ===== CANTONEIRAS =====
  const cSize = 14;
  const cOff = 10;
  doc.setDrawColor(primaryR, primaryG, primaryB);
  doc.setLineWidth(1.5);

  // Superior esquerdo
  doc.line(cOff, cOff + cSize, cOff, cOff);
  doc.line(cOff, cOff, cOff + cSize, cOff);
  // Superior direito
  doc.line(pageWidth - cOff - cSize, cOff, pageWidth - cOff, cOff);
  doc.line(pageWidth - cOff, cOff, pageWidth - cOff, cOff + cSize);
  // Inferior esquerdo
  doc.line(cOff, pageHeight - cOff - cSize, cOff, pageHeight - cOff);
  doc.line(cOff, pageHeight - cOff, cOff + cSize, pageHeight - cOff);
  // Inferior direito
  doc.line(pageWidth - cOff, pageHeight - cOff - cSize, pageWidth - cOff, pageHeight - cOff);
  doc.line(pageWidth - cOff - cSize, pageHeight - cOff, pageWidth - cOff, pageHeight - cOff);

  // ===== POSICIONAMENTO PROGRESSIVO =====
  let y = 22; // posicao Y atual, comecando abaixo da borda

  // ===== LOGO =====
  if (data.logoUrl) {
    try {
      const img = await loadImage(data.logoUrl);
      const imgWidth = 50;
      const imgHeight = Math.min((img.height / img.width) * imgWidth, 20);
      doc.addImage(img, 'PNG', centerX - imgWidth / 2, y, imgWidth, imgHeight);
      y += imgHeight + 6;
    } catch {
      y += 10;
    }
  } else {
    y += 10;
  }

  // ===== TITULO "CERTIFICADO" =====
  y += 4;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(26);
  doc.setTextColor(darkR, darkG, darkB);
  doc.text('CERTIFICADO', centerX, y, { align: 'center' });

  // Subtitulo
  y += 7;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(primaryR, primaryG, primaryB);
  doc.text('DE CONCLUSÃO', centerX, y, { align: 'center' });

  // Linha decorativa dupla
  y += 5;
  doc.setDrawColor(primaryR, primaryG, primaryB);
  doc.setLineWidth(0.8);
  doc.line(centerX - 50, y, centerX + 50, y);
  y += 2;
  doc.setDrawColor(lightR, lightG, lightB);
  doc.setLineWidth(0.3);
  doc.line(centerX - 45, y, centerX + 45, y);

  // ===== BLOCO CENTRAL - Calcular para centralizar verticalmente =====
  // Estimativa da altura do bloco central (de "Certificamos que" ate carga horaria)
  // "Certificamos que" + nome + linha + "concluiu..." + curso + data + carga = ~60mm
  const centralBlockHeight = 60;
  const availableHeight = pageHeight - y - 40; // 40mm reservados para assinatura/rodape
  const verticalPadding = Math.max((availableHeight - centralBlockHeight) / 2, 6);
  y += verticalPadding;

  // "Certificamos que"
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(13);
  doc.setTextColor(100, 116, 139);
  doc.text('Certificamos que', centerX, y, { align: 'center' });

  // Nome do participante
  y += 10;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(24);
  doc.setTextColor(darkR, darkG, darkB);
  doc.text(data.name.toUpperCase(), centerX, y, { align: 'center' });

  // Linha decorativa sob o nome
  y += 4;
  const nameWidth = doc.getTextWidth(data.name.toUpperCase());
  const lineHalf = Math.min(nameWidth / 2 + 12, 75);
  doc.setDrawColor(primaryR, primaryG, primaryB);
  doc.setLineWidth(0.5);
  doc.line(centerX - lineHalf, y, centerX + lineHalf, y);

  // "concluiu com exito o curso"
  y += 9;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);
  doc.setTextColor(71, 85, 105);
  doc.text('concluiu com êxito o curso', centerX, y, { align: 'center' });

  // Nome do curso
  y += 9;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(17);
  doc.setTextColor(darkR, darkG, darkB);
  doc.text(`"${data.courseName}"`, centerX, y, { align: 'center' });

  // Data
  y += 10;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(100, 116, 139);
  doc.text(`Realizado em ${data.courseDate}`, centerX, y, { align: 'center' });

  // Carga horaria
  y += 7;
  const hoursLabel = data.courseHoursLabel || '8h';
  doc.text(`Carga horária: ${hoursLabel}`, centerX, y, { align: 'center' });

  // ===== SEPARADOR DECORATIVO =====
  y += 10;
  doc.setDrawColor(lightR, lightG, lightB);
  doc.setLineWidth(0.3);
  doc.line(centerX - 60, y, centerX - 8, y);
  doc.line(centerX + 8, y, centerX + 60, y);
  doc.setFillColor(primaryR, primaryG, primaryB);
  doc.circle(centerX, y, 1.2, 'F');

  // ===== ASSINATURA =====
  // Posicionar a assinatura na parte inferior, com espaco adequado
  const signLineY = pageHeight - 38;

  if (data.signatureUrl) {
    try {
      const sigImg = await loadImage(data.signatureUrl);
      const sigWidth = 40;
      const sigHeight = Math.min((sigImg.height / sigImg.width) * sigWidth, 16);
      doc.addImage(sigImg, 'PNG', centerX - sigWidth / 2, signLineY - sigHeight - 1, sigWidth, sigHeight);
    } catch {
      // Fallback: sem imagem
    }
  }

  // Linha da assinatura
  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(0.3);
  doc.line(centerX - 40, signLineY, centerX + 40, signLineY);

  // Texto "Assinatura da Coordenacao"
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text('Assinatura da Coordenação', centerX, signLineY + 5, { align: 'center' });

  // Data de emissao
  const today = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text(`Emitido em ${today}`, centerX, signLineY + 10, { align: 'center' });

  // ===== QR CODE =====
  if (data.qrCode) {
    try {
      const qrImg = await generateQrCodeDataUrl(data.qrCode);
      const qrSize = 20;
      const qrX = pageWidth - 50;
      const qrY = pageHeight - 55;

      // Fundo branco
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(qrX - 2, qrY - 2, qrSize + 4, qrSize + 10, 2, 2, 'F');

      // Borda sutil
      doc.setDrawColor(lightR, lightG, lightB);
      doc.setLineWidth(0.3);
      doc.roundedRect(qrX - 2, qrY - 2, qrSize + 4, qrSize + 10, 2, 2, 'S');

      doc.addImage(qrImg, 'PNG', qrX, qrY, qrSize, qrSize);

      doc.setFontSize(5);
      doc.setTextColor(148, 163, 184);
      doc.text('Código de verificação', qrX + qrSize / 2, qrY + qrSize + 3, { align: 'center' });

      doc.setFontSize(4.5);
      doc.text(data.qrCode, qrX + qrSize / 2, qrY + qrSize + 6, { align: 'center', maxWidth: qrSize + 4 });
    } catch {
      // ignora erro de QR code
    }
  }

  return doc.output('blob');
};

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

async function generateQrCodeDataUrl(text: string): Promise<string> {
  const size = 200;
  const url = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(text)}`;
  const img = await loadImage(url);
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas not supported');
  ctx.drawImage(img, 0, 0);
  return canvas.toDataURL('image/png');
}
