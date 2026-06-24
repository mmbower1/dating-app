interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}

const sizes = { sm: 28, md: 40, lg: 64 };
const textSizes = { sm: '22px', md: '30px', lg: '48px' };

const Logo = ({ size = 'md', showText = true }: LogoProps) => {
  const px = sizes[size];
  const id = `pearl-${size}`;

  return (
    <div className="logo-lockup" style={{ gap: size === 'lg' ? 12 : 7 }}>
      <svg
        width={px}
        height={px}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <radialGradient id={id} cx="38%" cy="35%" r="65%">
            <stop offset="0%" stopColor="white" stopOpacity="0.95" />
            <stop offset="45%" stopColor="currentColor" stopOpacity="0.55" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="1" />
          </radialGradient>
        </defs>
        {/* Pearl body */}
        <circle cx="20" cy="20" r="17" fill={`url(#${id})`} />
        {/* Outer ring shimmer */}
        <circle cx="20" cy="20" r="17" stroke="currentColor" strokeWidth="1" opacity="0.4" fill="none" />
        {/* Primary shine highlight */}
        <ellipse cx="14" cy="13" rx="4.5" ry="3" fill="white" opacity="0.7" transform="rotate(-25 14 13)" />
        {/* Secondary small sparkle */}
        <ellipse cx="24" cy="10" rx="1.5" ry="1" fill="white" opacity="0.5" />
      </svg>

      {showText && (
        <span className="logo-text" style={{ fontSize: textSizes[size] }}>
          Pearl
        </span>
      )}
    </div>
  );
};

export default Logo;
