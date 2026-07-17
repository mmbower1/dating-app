interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}

const sizes = { sm: 28, md: 40, lg: 64 };
const textSizes = { sm: '22px', md: '30px', lg: '48px' };

const heartPath =
  'M20,30 C11,25 5,20 5,16 C5,12 8,10 12.5,10 C15.5,10 18,12 20,15 C22,12 24.5,10 27.5,10 C32,10 35,12 35,16 C35,20 29,25 20,30 Z';

const Logo = ({ size = 'md', showText = true }: LogoProps) => {
  const px = sizes[size];
  const maskId = `heart-mask-${size}`;

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
          {/* Mask: white = show, black = hide. Punches heart-shaped hole so lock only peeks above/below. */}
          <mask id={maskId}>
            <rect x="0" y="0" width="40" height="40" fill="white" />
            <path d={heartPath} fill="black" />
          </mask>
        </defs>

        {/* Lock — visible only where it extends outside the heart */}
        <g
          mask={`url(#${maskId})`}
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {/* Shackle arch (peeks above heart bumps) */}
          <path d="M14,25 L14,14 A6,9 0 0,0 26,14 L26,25" />
          {/* Lock body (peeks below heart tip) */}
          <rect x="10" y="23" width="20" height="14" rx="4" ry="4" />
        </g>

        {/* Heart outline — drawn in front */}
        <path
          d={heartPath}
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      {showText && (
        <span className="logo-text" style={{ fontSize: textSizes[size] }}>
          LoveLocked
        </span>
      )}
    </div>
  );
};

export default Logo;
