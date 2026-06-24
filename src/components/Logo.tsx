interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}

const sizes = { sm: 28, md: 40, lg: 64 };
const textSizes = { sm: '16px', md: '22px', lg: '36px' };

const Logo = ({ size = 'md', showText = true }: LogoProps) => {
  const px = sizes[size];
  return (
    <div className="logo-lockup" style={{ gap: size === 'lg' ? 14 : 8 }}>
      <svg
        width={px}
        height={px}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Outer circle */}
        <circle cx="20" cy="20" r="18" stroke="currentColor" strokeWidth="2" />
        {/* Vertical meridian */}
        <ellipse cx="20" cy="20" rx="8" ry="18" stroke="currentColor" strokeWidth="1.5" />
        {/* Horizontal parallels */}
        <path d="M2.5 14 Q20 11 37.5 14" stroke="currentColor" strokeWidth="1.5" fill="none" />
        <path d="M2.5 26 Q20 29 37.5 26" stroke="currentColor" strokeWidth="1.5" fill="none" />
        {/* Center dot */}
        <circle cx="20" cy="20" r="2" fill="currentColor" />
      </svg>
      {showText && (
        <span className="logo-text" style={{ fontSize: textSizes[size] }}>
          Atlas
        </span>
      )}
    </div>
  );
};

export default Logo;
