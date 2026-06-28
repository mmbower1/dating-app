import { useRef, useCallback } from 'react';
import type { User } from '../types';

function scoreColor(score: number): string {
  if (score >= 95) return '#48bb78';
  if (score >= 90) return '#68d391';
  if (score >= 85) return '#9ae05a';
  if (score >= 80) return '#c6e04a';
  if (score >= 75) return '#ecc94b';
  if (score >= 70) return '#ed8936';
  return '#fc8181';
}

function inToDisplay(inches: number) {
  return `${Math.floor(inches / 12)}'${inches % 12}"`;
}

type DetailChip = { label: string; icon: React.ReactNode };

const I = {
  person: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
    </svg>
  ),
  ruler: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21.3 8.7 8.7 21.3c-.99.99-2.59.99-3.58 0l-2.4-2.4c-.99-.99-.99-2.59 0-3.58L15.3 2.7c.99-.99 2.59-.99 3.58 0l2.4 2.4c.99.99.99 2.59 0 3.6Z"/>
      <path d="m7.5 10.5 2 2"/><path d="m10.5 7.5 2 2"/><path d="m13.5 4.5 2 2"/><path d="m4.5 13.5 2 2"/>
    </svg>
  ),
  mapPin: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="3"/>
    </svg>
  ),
  users: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  paw: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="4" r="2"/><circle cx="18" cy="8" r="2"/><circle cx="20" cy="16" r="2"/>
      <path d="M9 10a5 5 0 0 1 5 5v3.5a3.5 3.5 0 0 1-6.84 1.045Q6.52 17.48 4.46 16.84A3.5 3.5 0 0 1 5.5 10Z"/>
      <circle cx="4" cy="8" r="2"/>
    </svg>
  ),
  cupcake: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {/* frosting swirl */}
      <path d="M12 3c-1.2 0-2 .8-2 1.8 0 .7.4 1.2 1 1.5-.6.3-1 .9-1 1.7"/>
      <path d="M12 3c1.2 0 2 .8 2 1.8 0 .7-.4 1.2-1 1.5.6.3 1 .9 1 1.7"/>
      {/* frosting base / cake dome */}
      <path d="M7 8C7 8 7.5 12 12 12s5-4 5-4"/>
      {/* liner */}
      <path d="M6.5 12h11l-1.5 9h-8L6.5 12z"/>
      {/* liner crease line */}
      <line x1="7" y1="16" x2="17" y2="16"/>
    </svg>
  ),
  constellation: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      {/* connecting lines first so dots render on top */}
      <line x1="5" y1="6" x2="13" y2="3"/>
      <line x1="13" y1="3" x2="20" y2="8"/>
      <line x1="20" y1="8" x2="16" y2="17"/>
      <line x1="16" y1="17" x2="8" y2="20"/>
      <line x1="8" y1="20" x2="5" y2="6"/>
      {/* star dots */}
      <circle cx="5"  cy="6"  r="2" fill="currentColor" stroke="none"/>
      <circle cx="13" cy="3"  r="2" fill="currentColor" stroke="none"/>
      <circle cx="20" cy="8"  r="2" fill="currentColor" stroke="none"/>
      <circle cx="16" cy="17" r="2" fill="currentColor" stroke="none"/>
      <circle cx="8"  cy="20" r="2" fill="currentColor" stroke="none"/>
    </svg>
  ),
  graduationCap: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/>
    </svg>
  ),
  briefcase: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="20" height="14" x="2" y="7" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
    </svg>
  ),
  glass: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 22h8"/><path d="M7 10h10"/><path d="M12 15v7"/><path d="m5 3 2 7h10l2-7Z"/>
    </svg>
  ),
  wind: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.7 7.7a2.5 2.5 0 1 1 1.8 4.3H2"/><path d="M9.6 4.6A2 2 0 1 1 11 8H2"/><path d="M12.6 19.4A2 2 0 1 0 14 16H2"/>
    </svg>
  ),
  sparkles: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
      <path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/>
    </svg>
  ),
  landmark: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" x2="21" y1="22" y2="22"/><line x1="6" x2="6" y1="18" y2="11"/>
      <line x1="10" x2="10" y1="18" y2="11"/><line x1="14" x2="14" y1="18" y2="11"/>
      <line x1="18" x2="18" y1="18" y2="11"/><polygon points="12 2 20 7 4 7"/>
    </svg>
  ),
  heart: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
    </svg>
  ),
};

export function buildAbout(p: User): DetailChip[] {
  const chips: DetailChip[] = [];
  chips.push({ label: `${p.age}`, icon: I.cupcake });
  chips.push({ label: p.gender.charAt(0).toUpperCase() + p.gender.slice(1), icon: I.person });
  if (p.height) chips.push({ label: inToDisplay(p.height), icon: I.ruler });
  if (p.location?.city) chips.push({ label: `${p.location.city}${p.location.state ? `, ${p.location.state}` : ''}`, icon: I.mapPin });
  if (p.hasChildren != null) chips.push({ label: p.hasChildren ? 'Has kids' : "Doesn't have kids", icon: I.users });
  if (p.pets) chips.push({ label: p.pets, icon: I.paw });
  if (p.zodiacSign) chips.push({ label: p.zodiacSign, icon: I.constellation });
  return chips;
}

export function buildDetails(p: User): DetailChip[] {
  const chips: DetailChip[] = [];
  if (p.educationLevel) chips.push({ label: p.educationLevel, icon: I.graduationCap });
  if (p.jobTitle) chips.push({ label: p.jobTitle, icon: I.briefcase });
  if (p.drinks) chips.push({ label: `Drinks ${p.drinks.toLowerCase()}`, icon: I.glass });
  if (p.smokes) chips.push({ label: `Smokes ${p.smokes.toLowerCase()}`, icon: I.wind });
  if (p.religion) chips.push({ label: p.religion, icon: I.sparkles });
  if (p.politicalAssociation) chips.push({ label: p.politicalAssociation, icon: I.landmark });
  if (p.familyPlans) chips.push({ label: p.familyPlans, icon: I.heart });
  return chips;
}

const ChipRow = ({ chips }: { chips: DetailChip[] }) => {
  const rowRef = useRef<HTMLDivElement>(null);
  const drag = useRef({ active: false, startX: 0, scrollLeft: 0 });

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    const el = rowRef.current;
    if (!el) return;
    drag.current = { active: true, startX: e.pageX - el.offsetLeft, scrollLeft: el.scrollLeft };
    el.classList.add('dragging');
  }, []);

  const onMouseLeave = useCallback(() => {
    drag.current.active = false;
    rowRef.current?.classList.remove('dragging');
  }, []);

  const onMouseUp = useCallback(() => {
    drag.current.active = false;
    rowRef.current?.classList.remove('dragging');
  }, []);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!drag.current.active) return;
    e.preventDefault();
    const el = rowRef.current;
    if (!el) return;
    const x = e.pageX - el.offsetLeft;
    el.scrollLeft = drag.current.scrollLeft - (x - drag.current.startX) * 1.5;
  }, []);

  return (
    <div
      ref={rowRef}
      className="pcard-detail-chips"
      onMouseDown={onMouseDown}
      onMouseLeave={onMouseLeave}
      onMouseUp={onMouseUp}
      onMouseMove={onMouseMove}
    >
      {chips.map((chip, i) => (
        <span key={chip.label || i} className="pcard-detail-chip">
          {chip.icon && <span className="pcard-chip-icon">{chip.icon}</span>}
          {chip.label}
          {i < chips.length - 1 && <span className="pcard-detail-sep">|</span>}
        </span>
      ))}
    </div>
  );
};

export type LikeSection = 'photo' | 'bio' | 'details';


interface ProfileCardProps {
  profile: User;
  /** Extra class name forwarded to the root pcard-stack div (e.g. exit animation) */
  className?: string;
  /** When provided, renders interactive heart buttons; called with section key */
  onHeart?: (section: LikeSection) => void;
}

const ProfileCard = ({ profile, className, onHeart }: ProfileCardProps) => {
  const about = buildAbout(profile);
  const details = buildDetails(profile);
  const extraPhotos = profile.photos.slice(1);
  const HeartBtn = ({ section, onPhoto = false }: { section: LikeSection; onPhoto?: boolean }) =>
    onHeart ? (
      <button
        className={`heart-btn ${onPhoto ? 'heart-btn--photo' : ''}`}
        onClick={(e) => { e.stopPropagation(); onHeart(section); }}
        aria-label="Like"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
        </svg>
      </button>
    ) : null;

  return (
    <div className={`pcard-stack${className ? ` ${className}` : ''}`}>
      {/* Photo 1 */}
      <div className="pcard-item pcard-item--photo">
        {profile.photos.length > 0 ? (
          <img src={profile.photos[0]} alt={profile.name} className="pcard-photo-img" />
        ) : (
          <div className="pcard-no-photo">{profile.name[0]}</div>
        )}
        <HeartBtn section="photo" onPhoto />
      </div>

      {/* Identity */}
      <div className="pcard-item pcard-item--identity">
        <div className="pcard-name-row">
          <span className="pcard-name">{profile.name}</span>
          <span
            className="pcard-score"
            title="Accountability score"
            style={{
              background: `linear-gradient(var(--bg-card), var(--bg-card)) padding-box, linear-gradient(${scoreColor(profile.accountabilityScore)}, ${scoreColor(profile.accountabilityScore)}) border-box`,
              color: scoreColor(profile.accountabilityScore),
            }}
          >{profile.accountabilityScore}</span>
        </div>
      </div>

      {/* About chips */}
      <div className="pcard-item pcard-item--text">
        <ChipRow chips={about} />
      </div>

      {/* Photo 2 */}
      {extraPhotos[0] && (
        <div className="pcard-item pcard-item--photo">
          <img src={extraPhotos[0]} alt={`${profile.name} 2`} className="pcard-photo-img" />
          <HeartBtn section="photo" onPhoto />
        </div>
      )}

      {/* Bio */}
      {profile.bio && (
        <div className="pcard-item pcard-item--text">
          <p className="pcard-bio">{profile.bio}</p>
        </div>
      )}

      {/* Photo 3 */}
      {extraPhotos[1] && (
        <div className="pcard-item pcard-item--photo">
          <img src={extraPhotos[1]} alt={`${profile.name} 3`} className="pcard-photo-img" />
          <HeartBtn section="photo" onPhoto />
        </div>
      )}

      {/* Lifestyle details — after photo 3 */}
      {details.length > 0 && (
        <div className="pcard-item pcard-item--text">
          <ChipRow chips={details} />
        </div>
      )}

      {/* Photos 4+ */}
      {extraPhotos.slice(2).map((photo, i) => (
        <div key={i} className="pcard-item pcard-item--photo">
          <img src={photo} alt={`${profile.name} ${i + 4}`} className="pcard-photo-img" />
          <HeartBtn section="photo" onPhoto />
        </div>
      ))}

      {/* Hobbies */}
      {profile.hobbies && profile.hobbies.length > 0 && (
        <div className="pcard-item pcard-item--text">
          <p className="pcard-section-label">Hobbies</p>
          <ChipRow chips={profile.hobbies.map((h) => ({ label: h, icon: null }))} />
        </div>
      )}

      {/* Prompts */}
      {profile.prompts?.filter((p) => p.answer.trim()).map((p, i) => (
        <div key={i} className="pcard-item pcard-item--prompt">
          <p className="pcard-prompt-question">{p.question}</p>
          <p className="pcard-prompt-answer">{p.answer}</p>
        </div>
      ))}

      <div style={{ height: 8 }} />
    </div>
  );
};

export default ProfileCard;
