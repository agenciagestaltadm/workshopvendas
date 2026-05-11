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
};

export const generateCertificatePdf = async (data: CertificateData): Promise<Blob> => {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const centerX = pageWidth / 2;

  // Fundo
  doc.setFillColor(250, 250, 252);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');

  // Borda decorativa
  doc.setDrawColor(59, 130, 246);
  doc.setLineWidth(1.5);
  doc.rect(10, 10, pageWidth - 20, pageHeight - 20);
  doc.setLineWidth(0.5);
  doc.rect(13, 13, pageWidth - 26, pageHeight - 26);

  // Logo
  if (data.logoUrl) {
    try {
      const img = await loadImage(data.logoUrl);
      const imgWidth = 50;
      const imgHeight = (img.height / img.width) * imgWidth;
      doc.addImage(img, 'PNG', centerX - imgWidth / 2, 22, imgWidth, imgHeight);
    } catch {
      // ignora erro de logo
    }
  }

  // Título
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(32);
  doc.setTextColor(30, 41, 59);
  doc.text('CERTIFICADO DE CONCLUSÃO', centerX, 60, { align: 'center' });

  // Linha decorativa
  doc.setDrawColor(59, 130, 246);
  doc.setLineWidth(0.8);
  doc.line(centerX - 60, 65, centerX + 60, 65);

  // Texto principal
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(16);
  doc.setTextColor(71, 85, 105);

  const text = `Certificamos que`;
  doc.text(text, centerX, 85, { align: 'center' });

  // Nome do participante
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(24);
  doc.setTextColor(30, 41, 59);
  doc.text(data.name, centerX, 100, { align: 'center' });

  // Detalhes do curso
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(14);
  doc.setTextColor(71, 85, 105);

  const courseText = `concluiu com êxito o curso`;
  doc.text(courseText, centerX, 115, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(30, 41, 59);
  doc.text(data.courseName, centerX, 125, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(13);
  doc.setTextColor(71, 85, 105);

  const dateText = `realizado em ${data.courseDate}`;
  doc.text(dateText, centerX, 138, { align: 'center' });

  const hoursText = `com carga horária de ${data.courseHoursLabel || '8h'}`;
  doc.text(hoursText, centerX, 146, { align: 'center' });

  // QR Code
  if (data.qrCode) {
    try {
      const qrImg = await generateQrCodeDataUrl(data.qrCode);
      doc.addImage(qrImg, 'PNG', pageWidth - 45, pageHeight - 55, 25, 25);
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(data.qrCode, pageWidth - 32.5, pageHeight - 26, { align: 'center', maxWidth: 30 });
    } catch {
      // ignora erro de QR code
    }
  }

  // Assinatura
  doc.setDrawColor(100, 116, 139);
  doc.setLineWidth(0.3);
  doc.line(centerX - 50, pageHeight - 35, centerX + 50, pageHeight - 35);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(100, 116, 139);
  doc.text('Assinatura da Coordenação', centerX, pageHeight - 28, { align: 'center' });

  // Data de emissão
  const today = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
  doc.setFontSize(9);
  doc.text(`Emitido em ${today}`, centerX, pageHeight - 18, { align: 'center' });

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
  // Usar a API de QR code do Google Charts como fallback simples
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
