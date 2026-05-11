import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, XCircle, ScanLine, RotateCcw } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { requireSupabase } from '@/lib/supabase';

type ScanResult = {
  valid: boolean;
  reason?: string;
  message: string;
  name?: string;
  email?: string;
  phone?: string;
  document?: string;
  course_name?: string;
  course_starts_at?: string;
  course_time_label?: string;
  scanned_at?: string;
};

const QRCodeScanner = () => {
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const startScanner = async () => {
    setResult(null);
    setError(null);
    setScanning(true);

    try {
      const scanner = new Html5Qrcode('qr-scanner-container');
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        async (decodedText) => {
          await handleScan(decodedText);
        },
        () => {
          // ignorar erros de scan contínuos
        }
      );
    } catch (e) {
      setError('Não foi possível acessar a câmera. Verifique as permissões do navegador.');
      setScanning(false);
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
      } catch {
        // ignorar
      }
      scannerRef.current = null;
    }
    setScanning(false);
  };

  const handleScan = async (qrCode: string) => {
    await stopScanner();

    try {
      const supabase = requireSupabase();
      const { data, error } = await supabase.rpc('validate_and_scan_qr_code', {
        p_qr_code: qrCode,
      });

      if (error) {
        setResult({
          valid: false,
          message: error.message || 'Erro ao validar QR Code.',
        });
        return;
      }

      setResult(data as ScanResult);
    } catch (e) {
      setResult({
        valid: false,
        message: 'Erro de conexão. Tente novamente.',
      });
    }
  };

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        try {
          scannerRef.current.stop();
        } catch {
          // ignorar
        }
      }
    };
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-foreground">Scanner de QR Code</h3>
          <p className="text-sm text-muted-foreground">
            Aponte a câmera para o QR Code do participante para validar o acesso.
          </p>
        </div>
        {!scanning && !result && (
          <Button onClick={startScanner}>
            <ScanLine className="mr-2 h-4 w-4" />
            Iniciar Scanner
          </Button>
        )}
        {scanning && (
          <Button variant="outline" onClick={stopScanner}>
            Parar Scanner
          </Button>
        )}
      </div>

      {scanning && (
        <div className="mx-auto max-w-sm">
          <div
            ref={containerRef}
            id="qr-scanner-container"
            className="overflow-hidden rounded-2xl border border-border"
            style={{ width: '100%', minHeight: '300px' }}
          />
          <p className="mt-3 text-center text-xs text-muted-foreground">
            Posicione o QR Code dentro da área de leitura.
          </p>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center">
          <XCircle className="mx-auto h-8 w-8 text-destructive mb-2" />
          <p className="text-sm font-medium text-destructive">{error}</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={startScanner}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Tentar novamente
          </Button>
        </div>
      )}

      {result && (
        <div
          className={[
            'rounded-2xl border p-6 text-center',
            result.valid
              ? 'border-emerald-500/30 bg-emerald-50'
              : 'border-destructive/30 bg-destructive/5',
          ].join(' ')}
        >
          {result.valid ? (
            <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600 mb-3" />
          ) : (
            <XCircle className="mx-auto h-12 w-12 text-destructive mb-3" />
          )}

          <h4
            className={[
              'text-lg font-bold',
              result.valid ? 'text-emerald-700' : 'text-destructive',
            ].join(' ')}
          >
            {result.message}
          </h4>

          {result.valid && (
            <div className="mt-4 text-left space-y-2 max-w-sm mx-auto">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Nome:</span>
                <span className="font-medium text-foreground">{result.name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">E-mail:</span>
                <span className="font-medium text-foreground">{result.email}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Documento:</span>
                <span className="font-medium text-foreground">{result.document}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Curso:</span>
                <span className="font-medium text-foreground">{result.course_name}</span>
              </div>
              {result.course_time_label && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Horário:</span>
                  <span className="font-medium text-foreground">{result.course_time_label}</span>
                </div>
              )}
              <div className="pt-2">
                <Badge className="bg-emerald-600 text-white">Acesso liberado</Badge>
              </div>
            </div>
          )}

          {!result.valid && result.reason === 'ALREADY_SCANNED' && result.scanned_at && (
            <p className="mt-2 text-sm text-muted-foreground">
              Já escaneado em: {new Date(result.scanned_at).toLocaleString('pt-BR')}
            </p>
          )}

          <Button className="mt-6" onClick={startScanner}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Escanear próximo
          </Button>
        </div>
      )}
    </div>
  );
};

export default QRCodeScanner;
