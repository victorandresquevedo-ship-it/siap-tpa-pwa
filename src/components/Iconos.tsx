// Íconos SVG simples (sin librerías externas). Son decorativos: el texto al lado da el significado.

type Props = { size?: number };

const base = (size: number) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
  focusable: false,
});

export const IconoCamion = ({ size = 24 }: Props) => (
  <svg {...base(size)}>
    <path d="M3 6h11v10H3z" />
    <path d="M14 9h4l3 3v4h-7" />
    <circle cx="7" cy="17.5" r="1.8" />
    <circle cx="17" cy="17.5" r="1.8" />
  </svg>
);

export const IconoConsola = ({ size = 24 }: Props) => (
  <svg {...base(size)}>
    <rect x="3" y="4" width="18" height="12" rx="1.5" />
    <path d="M2 20h20" />
    <path d="M7 8h4v4H7zM13 8h4M13 11h4" />
  </svg>
);

export const IconoIndicadores = ({ size = 24 }: Props) => (
  <svg {...base(size)}>
    <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
  </svg>
);

export const IconoReloj = ({ size = 24 }: Props) => (
  <svg {...base(size)}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </svg>
);

export const IconoBalanza = ({ size = 24 }: Props) => (
  <svg {...base(size)}>
    <path d="M12 4v16M5 20h14M6 8h12" />
    <path d="M6 8l-3 6a3 3 0 0 0 6 0zM18 8l-3 6a3 3 0 0 0 6 0z" />
  </svg>
);

export const IconoSenal = ({ size = 24 }: Props) => (
  <svg {...base(size)}>
    <path d="M5 12.5a10 10 0 0 1 14 0M8.5 16a5 5 0 0 1 7 0" />
    <circle cx="12" cy="19.5" r="1" />
  </svg>
);

export const IconoReiniciar = ({ size = 20 }: Props) => (
  <svg {...base(size)}>
    <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
    <path d="M3 3v5h5" />
  </svg>
);

export const IconoVolver = ({ size = 20 }: Props) => (
  <svg {...base(size)}>
    <path d="M15 18l-6-6 6-6" />
  </svg>
);

export const IconoCheck = ({ size = 16 }: Props) => (
  <svg {...base(size)}>
    <path d="M5 12l5 5 9-10" />
  </svg>
);

export const IconoAlerta = ({ size = 16 }: Props) => (
  <svg {...base(size)}>
    <path d="M12 3l10 18H2z" />
    <path d="M12 10v4M12 17.5v.5" />
  </svg>
);

export const IconoAlto = ({ size = 16 }: Props) => (
  <svg {...base(size)}>
    <path d="M8 3h8l5 5v8l-5 5H8l-5-5V8z" />
    <path d="M9 9l6 6M15 9l-6 6" />
  </svg>
);
