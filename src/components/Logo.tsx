interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}

const sizes = { sm: 28, md: 40, lg: 64 };
const textSizes = { sm: '22px', md: '30px', lg: '48px' };

// Heart bumps sit at y=18 so the shackle arch (top at y=4) is clearly visible above them
const heartPath =
  'M20,35 C10,29 5,24 5,20 C5,16 8,14 12.5,14 C15.5,14 18,16 20,19 C22,16 24.5,14 27.5,14 C32,14 35,16 35,20 C35,24 30,29 20,35 Z';

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
          {/* Mask punches a heart-shaped hole so the lock only shows where it extends outside */}
          <mask id={maskId}>
            <rect x="0" y="0" width="40" height="40" fill="white" />
            <path d={heartPath} fill="black" />
          </mask>
        </defs>

        {/* Lock — masked so it only renders outside/above/below the heart */}
        <g
          mask={`url(#${maskId})`}
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {/* Shackle: arch top at y=4, sides emerge above the heart bumps at y=14 */}
          <path d="M13,29 L13,16 A7,12 0 0,0 27,16 L27,29" />
          {/* Body: bottom strip peeks below the heart tip */}
          <rect x="9" y="27" width="22" height="12" rx="4" ry="4" />
        </g>

        {/* Heart outline drawn in front */}
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
