interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}

const sizes = { sm: 28, md: 40, lg: 64 };
const textSizes = { sm: '22px', md: '30px', lg: '48px' };

const Logo = ({ size = 'md', showText = true }: LogoProps) => {
  const px = sizes[size];

  return (
    <div className="logo-lockup" style={{ gap: size === 'lg' ? 12 : 1 }}>
      <svg
        width={px}
        height={px}
        viewBox="0 0 100 110"
        fill="none"
        overflow="visible"
        xmlns="http://www.w3.org/2000/svg"
        style={{ transform: 'translateY(-3px)' }}
      >
        <defs>
          <linearGradient id="lockBodyGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#7eb3f5" />
            <stop offset="100%" stopColor="#b39dfa" />
          </linearGradient>
        </defs>

        {/* Shackle — drawn first so body covers its base */}
        <path
          d="M 26 66 L 26 36 C 26 10 74 10 74 36 L 74 66"
          stroke="#8aacd4"
          strokeWidth="16"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        {/* Body */}
        <rect x="5" y="50" width="90" height="60" rx="13" fill="url(#lockBodyGrad)" />
        {/* Shine highlight */}
        <rect x="11" y="57" width="22" height="8" rx="4" fill="rgba(255,255,255,0.35)" />
        {/* Heart-shaped keyhole */}
        <path
          d="M 50 85 C 43 80 40 77 40 74 C 40 71 42 69.5 45 69.5 C 47 69.5 48.5 72 50 74 C 51.5 72 53 69.5 55 69.5 C 58 69.5 60 71 60 74 C 60 77 57 80 50 85 Z"
          fill="#1e2340"
        />
      </svg>

      {showText && (
        <span className="logo-text" style={{ fontSize: textSizes[size] }}>
          Lockheart
        </span>
      )}
    </div>
  );
};

export default Logo;
