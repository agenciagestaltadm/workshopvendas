import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, XCircle, ScanLine, RotateCcw, Keyboard, Camera } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
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

type ScanMode = 'idle' | 'camera' | 'manual';

const QRCodeScanner = () => {
  const [mode, setMode] = useState<ScanMode>('idle');
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  const startScanner = async () => {
    setResult(null);
    setError(null);
    setMode('camera');

    try {
      // Garantir que o container existe no DOM antes de iniciar
      await new Promise((resolve) => setTimeout(resolve, 100));

      const containerEl = document.getElementById('qr-scanner-container');
      if (!containerEl) {
        setError('Container do scanner não encontrado. Recarregue a página.');
        setMode('idle');
        return;
      }

      const scanner = new Html5Qrcode('qr-scanner-container');
      scannerRef.current = scanner;

      const config = {
        fps: 15,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
        disableFlip: false,
        formatsToSupport: [0], // QR_CODE only
        experimentalFeatures: {
          useBarCodeDetectorIfSupported: true,
        },
      };

      // Tentar câmera traseira primeiro, depois qualquer câmera
      let started = false;
      try {
        await scanner.start(
          { facingMode: 'environment' },
          config,
          async (decodedText) => {
            await handleScan(decodedText);
          },
          () => { /* ignorar erros de scan contínuos */ }
        );
        started = true;
      } catch {
        // Fallback: tentar sem facingMode específico
        try {
          await scanner.start(
            { facingMode: 'user' },
            config,
            async (decodedText) => {
              await handleScan(decodedText);
            },
            () => { /* ignorar */ }
          );
          started = true;
        } catch {
          // Último fallback: qualquer câmera disponível
          const devices = await Html5Qrcode.getCameras();
          if (devices && devices.length > 0) {
            await scanner.start(
              devices[0].id,
              config,
              async (decodedText) => {
                await handleScan(decodedText);
              },
              () => { /* ignorar */ }
            );
            started = true;
          }
        }
      }

      if (!started) {
        setError('Nenhuma câmera encontrada. Use a entrada manual.');
        setMode('idle');
      }
    } catch (e) {
      console.error('[QRScanner] Erro:', e);
      setError('Não foi possível acessar a câmera. Use a entrada manual ou verifique as permissões do navegador.');
      setMode('idle');
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        const running = scannerRef.current.isScanning;
        if (running) {
          await scannerRef.current.stop();
        }
      } catch {
        // ignorar
      }
      try {
        scannerRef.current.clear();
      } catch {
        // ignorar
      }
      scannerRef.current = null;
    }
    setMode('idle');
  };

  const handleScan = async (qrCode: string) => {
    await stopScanner();
    await validateCode(qrCode);
  };

  const validateCode = async (code: string) => {
    const trimmed = code.trim();
    if (!trimmed) return;

    console.log('[QRScanner] Validando código:', trimmed);

    setIsValidating(true);
    setResult(null);
    setError(null);

    try {
      const supabase = requireSupabase();
      const { data, error } = await supabase.rpc('validate_and_scan_qr_code', {
        p_qr_code: trimmed,
      });

      console.log('[QRScanner] Resultado da validação:', { data, error });

      if (error) {
        console.error('[QRScanner] Erro RPC:', error);
        setResult({
          valid: false,
          message: error.message || 'Erro ao validar QR Code.',
        });
        return;
      }

      setResult(data as ScanResult);
    } catch (err) {
      console.error('[QRScanner] Erro de conexão:', err);
      setResult({
        valid: false,
        message: 'Erro de conexão. Tente novamente.',
      });
    } finally {
      setIsValidating(false);
    }
  };

  const handleManualSubmit = () => {
    if (!manualCode.trim()) return;
    validateCode(manualCode.trim());
  };

  const reset = () => {
    setResult(null);
    setError(null);
    setManualCode('');
    setMode('idle');
  };

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        try {
          if (scannerRef.current.isScanning) {
            scannerRef.current.stop();
          }
        } catch {
          // ignorar
        }
      }
    };
  }, []);

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-foreground">Scanner de QR Code</h3>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Escaneie ou digite o código para validar o acesso.
          </p>
        </div>
        {mode === 'idle' && !result && (
          <div className="flex gap-2">
            <Button size="sm" onClick={startScanner}>
              <Camera className="mr-2 h-4 w-4" />
              Câmera
            </Button>
            <Button size="sm" variant="outline" onClick={() => setMode('manual')}>
              <Keyboard className="mr-2 h-4 w-4" />
              Digitar
            </Button>
          </div>
        )}
        {mode === 'camera' && (
          <Button size="sm" variant="outline" onClick={stopScanner}>
            Parar Scanner
          </Button>
        )}
      </div>

      {/* Modo câmera */}
      {mode === 'camera' && (
        <div className="mx-auto w-full max-w-sm">
          <div
            id="qr-scanner-container"
            className="overflow-hidden rounded-2xl border border-border"
            style={{ width: '100%', minHeight: '280px' }}
          />
          <p className="mt-2 text-center text-xs text-muted-foreground">
            Posicione o QR Code dentro da área de leitura.
          </p>
        </div>
      )}

      {/* Modo manual */}
      {mode === 'manual' && !result && (
        <div className="rounded-2xl border border-border bg-card p-4 sm:p-6">
          <p className="text-sm text-muted-foreground mb-3">
            Digite o código QR Code manualmente:
          </p>
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              placeholder="QR-xxxx..."
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleManualSubmit()}
              className="flex-1 font-mono"
            />
            <Button
              onClick={handleManualSubmit}
              disabled={!manualCode.trim() || isValidating}
              className="shrink-0"
            >
              {isValidating ? 'Validando...' : 'Validar'}
            </Button>
          </div>
        </div>
      )}

      {/* Validando */}
      {isValidating && (
        <div className="rounded-2xl border border-border bg-card p-6 text-center">
          <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="mt-2 text-sm text-muted-foreground">Validando código...</p>
        </div>
      )}

      {/* Erro */}
      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 sm:p-6 text-center">
          <XCircle className="mx-auto h-8 w-8 text-destructive mb-2" />
          <p className="text-sm font-medium text-destructive">{error}</p>
          <div className="mt-3 flex flex-col sm:flex-row gap-2 justify-center">
            <Button variant="outline" size="sm" onClick={startScanner}>
              <Camera className="mr-2 h-4 w-4" />
              Tentar câmera
            </Button>
            <Button variant="outline" size="sm" onClick={() => { setError(null); setMode('manual'); }}>
              <Keyboard className="mr-2 h-4 w-4" />
              Digitar código
            </Button>
          </div>
        </div>
      )}

      {/* Resultado */}
      {result && (
        <div
          className={[
            'rounded-2xl border p-4 sm:p-6 text-center',
            result.valid
              ? 'border-emerald-500/30 bg-emerald-50'
              : 'border-destructive/30 bg-destructive/5',
          ].join(' ')}
        >
          {result.valid ? (
            <CheckCircle2 className="mx-auto h-10 w-10 sm:h-12 sm:w-12 text-emerald-600 mb-3" />
          ) : (
            <XCircle className="mx-auto h-10 w-10 sm:h-12 sm:w-12 text-destructive mb-3" />
          )}

          <h4
            className={[
              'text-base sm:text-lg font-bold',
              result.valid ? 'text-emerald-700' : 'text-destructive',
            ].join(' ')}
          >
            {result.message}
          </h4>

          {result.valid && (
            <div className="mt-4 text-left space-y-2 max-w-sm mx-auto">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Nome:</span>
                <span className="font-medium text-foreground text-right">{result.name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">E-mail:</span>
                <span className="font-medium text-foreground text-right break-all">{result.email}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Documento:</span>
                <span className="font-medium text-foreground">{result.document}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Curso:</span>
                <span className="font-medium text-foreground text-right">{result.course_name}</span>
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

          <Button className="mt-4 sm:mt-6" onClick={reset}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Escanear próximo
          </Button>
        </div>
      )}
    </div>
  );
};

export default QRCodeScanner;
