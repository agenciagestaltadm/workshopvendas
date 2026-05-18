import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';

function hexToRgb(hex) {
  const clean = hex.replace('#', '').trim();
  const normalized = clean.length === 3 ? clean.split('').map((c) => `${c}${c}`).join('') : clean;
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) return [59, 130, 246];
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  return [r, g, b];
}

function lightenRgb(r, g, b, factor = 0.7) {
  return [
    Math.round(r + (255 - r) * factor),
    Math.round(g + (255 - g) * factor),
    Math.round(b + (255 - b) * factor),
  ];
}

function darkenRgb(r, g, b, factor = 0.3) {
  return [
    Math.round(r * (1 - factor)),
    Math.round(g * (1 - factor)),
    Math.round(b * (1 - factor)),
  ];
}

export const generateCertificatePdfNode = async (data) => {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const centerX = pageWidth / 2;

  const [primaryR, primaryG, primaryB] = hexToRgb(data.themePrimary ?? '#3b82f6');
  const [lightR, lightG, lightB] = lightenRgb(primaryR, primaryG, primaryB, 0.8);
  const [darkR, darkG, darkB] = darkenRgb(primaryR, primaryG, primaryB, 0.4);
  const [veryLightR, veryLightG, veryLightB] = lightenRgb(primaryR, primaryG, primaryB, 0.92);

  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');

  for (let i = 0; i < 35; i++) {
    const alpha = 0.025 * (1 - i / 35);
    doc.setFillColor(
      Math.round(255 * (1 - alpha) + veryLightR * alpha),
      Math.round(255 * (1 - alpha) + veryLightG * alpha),
      Math.round(255 * (1 - alpha) + veryLightB * alpha)
    );
    doc.rect(0, i, pageWidth, 1, 'F');
  }

  for (let i = 0; i < 25; i++) {
    const alpha = 0.025 * (1 - i / 25);
    doc.setFillColor(
      Math.round(255 * (1 - alpha) + veryLightR * alpha),
      Math.round(255 * (1 - alpha) + veryLightG * alpha),
      Math.round(255 * (1 - alpha) + veryLightB * alpha)
    );
    doc.rect(0, pageHeight - i, pageWidth, 1, 'F');
  }

  doc.setDrawColor(primaryR, primaryG, primaryB);
  doc.setLineWidth(1.8);
  doc.rect(10, 10, pageWidth - 20, pageHeight - 20);

  doc.setDrawColor(lightR, lightG, lightB);
  doc.setLineWidth(0.5);
  doc.rect(14, 14, pageWidth - 28, pageHeight - 28);

  const cSize = 14;
  const cOff = 10;
  doc.setDrawColor(primaryR, primaryG, primaryB);
  doc.setLineWidth(1.5);
  doc.line(cOff, cOff + cSize, cOff, cOff);
  doc.line(cOff, cOff, cOff + cSize, cOff);
  doc.line(pageWidth - cOff - cSize, cOff, pageWidth - cOff, cOff);
  doc.line(pageWidth - cOff, cOff, pageWidth - cOff, cOff + cSize);
  doc.line(cOff, pageHeight - cOff - cSize, cOff, pageHeight - cOff);
  doc.line(cOff, pageHeight - cOff, cOff + cSize, pageHeight - cOff);
  doc.line(pageWidth - cOff, pageHeight - cOff - cSize, pageWidth - cOff, pageHeight - cOff);
  doc.line(pageWidth - cOff - cSize, pageHeight - cOff, pageWidth - cOff, pageHeight - cOff);

  let y = 35; 

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(26);
  doc.setTextColor(darkR, darkG, darkB);
  doc.text('CERTIFICADO', centerX, y, { align: 'center' });

  y += 7;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(primaryR, primaryG, primaryB);
  doc.text('DE CONCLUSÃO', centerX, y, { align: 'center' });

  y += 5;
  doc.setDrawColor(primaryR, primaryG, primaryB);
  doc.setLineWidth(0.8);
  doc.line(centerX - 50, y, centerX + 50, y);
  y += 2;
  doc.setDrawColor(lightR, lightG, lightB);
  doc.setLineWidth(0.3);
  doc.line(centerX - 45, y, centerX + 45, y);

  y += 20;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(13);
  doc.setTextColor(100, 116, 139);
  doc.text('Certificamos que', centerX, y, { align: 'center' });

  y += 10;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(24);
  doc.setTextColor(darkR, darkG, darkB);
  doc.text(data.name.toUpperCase(), centerX, y, { align: 'center' });

  y += 4;
  const nameWidth = doc.getTextWidth(data.name.toUpperCase());
  const lineHalf = Math.min(nameWidth / 2 + 12, 75);
  doc.setDrawColor(primaryR, primaryG, primaryB);
  doc.setLineWidth(0.5);
  doc.line(centerX - lineHalf, y, centerX + lineHalf, y);

  y += 9;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);
  doc.setTextColor(71, 85, 105);
  doc.text('concluiu com êxito o curso', centerX, y, { align: 'center' });

  y += 9;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(17);
  doc.setTextColor(darkR, darkG, darkB);
  doc.text(`"${data.courseName}"`, centerX, y, { align: 'center' });

  y += 10;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(100, 116, 139);
  doc.text(`Realizado em ${data.courseDate}`, centerX, y, { align: 'center' });

  y += 7;
  const hoursLabel = data.courseHoursLabel || '8h';
  doc.text(`Carga horária: ${hoursLabel}`, centerX, y, { align: 'center' });

  y += 10;
  doc.setDrawColor(lightR, lightG, lightB);
  doc.setLineWidth(0.3);
  doc.line(centerX - 60, y, centerX - 8, y);
  doc.line(centerX + 8, y, centerX + 60, y);
  doc.setFillColor(primaryR, primaryG, primaryB);
  doc.circle(centerX, y, 1.2, 'F');

  const signLineY = pageHeight - 38;

  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(0.3);
  doc.line(centerX - 40, signLineY, centerX + 40, signLineY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text('Assinatura da Coordenação', centerX, signLineY + 5, { align: 'center' });

  const today = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text(`Emitido em ${today}`, centerX, signLineY + 10, { align: 'center' });

  if (data.qrCode) {
    try {
      const qrDataUrl = await QRCode.toDataURL(data.qrCode);
      const qrSize = 20;
      const qrX = pageWidth - 50;
      const qrY = pageHeight - 55;

      doc.setFillColor(255, 255, 255);
      doc.roundedRect(qrX - 2, qrY - 2, qrSize + 4, qrSize + 10, 2, 2, 'F');

      doc.setDrawColor(lightR, lightG, lightB);
      doc.setLineWidth(0.3);
      doc.roundedRect(qrX - 2, qrY - 2, qrSize + 4, qrSize + 10, 2, 2, 'S');

      doc.addImage(qrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize);

      doc.setFontSize(5);
      doc.setTextColor(148, 163, 184);
      doc.text('Código de verificação', qrX + qrSize / 2, qrY + qrSize + 3, { align: 'center' });

      doc.setFontSize(4.5);
      doc.text(data.qrCode, qrX + qrSize / 2, qrY + qrSize + 6, { align: 'center', maxWidth: qrSize + 4 });
    } catch {
    }
  }

  const arrayBuffer = doc.output('arraybuffer');
  return Buffer.from(arrayBuffer);
};
