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
      >
        {/* Shackle — drawn first so body covers its base */}
        <path
          d="M 26 66 L 26 36 C 26 10 74 10 74 36 L 74 66"
          stroke="#8B96A4"
          strokeWidth="16"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        {/* Body */}
        <rect x="5" y="50" width="90" height="60" rx="13" fill="#E4B84B" />
        {/* Shine highlight */}
        <rect x="11" y="57" width="22" height="8" rx="4" fill="rgba(255,255,255,0.42)" />
        {/* Keyhole — circle + tapered slot */}
        <circle cx="50" cy="74" r="9" fill="#2B3341" />
        <path d="M 43 82 L 46 95 L 54 95 L 57 82 Z" fill="#2B3341" />
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
