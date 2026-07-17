interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}

const sizes = { sm: 28, md: 40, lg: 64 };
const textSizes = { sm: '22px', md: '30px', lg: '48px' };

const Logo = ({ size = 'md', showText = true }: LogoProps) => {
  const px = sizes[size];

  return (
    <div className="logo-lockup" style={{ gap: size === 'lg' ? 12 : 7 }}>
      <svg
        width={px}
        height={px}
        viewBox="-2 -2 44 44"
        fill="none"
        style={{ overflow: 'visible' }}
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Shackle arch */}
        <path
          d="M12,20 L12,14 A8,9 0 0,0 28,14 L28,20"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Lock body */}
        <rect
          x="5" y="18" width="30" height="20" rx="5" ry="5"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Heart replacing the keyhole */}
        <path
          d="M20,32 C15.5,29 13,27 13,25 C13,23 14.5,22 16.5,22 C18,22 19,23.5 20,25 C21,23.5 22,22 23.5,22 C25.5,22 27,23 27,25 C27,27 24.5,29 20,32 Z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
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
