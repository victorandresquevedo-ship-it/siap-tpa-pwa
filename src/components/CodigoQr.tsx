import QRCode from 'qrcode';
import { useEffect, useState } from 'react';

/** Código QR generado en el mismo teléfono (funciona sin internet). */
export function CodigoQr({ texto, etiqueta, tamano = 260 }: { texto: string; etiqueta: string; tamano?: number }) {
  const [svg, setSvg] = useState('');

  useEffect(() => {
    let vigente = true;
    QRCode.toString(texto, {
      type: 'svg',
      margin: 2,
      errorCorrectionLevel: 'M',
      color: { dark: '#000000', light: '#ffffff' },
    }).then((s) => vigente && setSvg(s));
    return () => {
      vigente = false;
    };
  }, [texto]);

  return (
    <div
      role="img"
      aria-label={etiqueta}
      className="codigo-qr"
      style={{ width: tamano, maxWidth: '100%', aspectRatio: '1' }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
