import type { User } from '../types';

function inToDisplay(inches: number) {
  return `${Math.floor(inches / 12)}'${inches % 12}"`;
}

export function buildAbout(p: User): string[] {
  const chips: string[] = [];
  chips.push(`${p.age}`);
  chips.push(p.gender.charAt(0).toUpperCase() + p.gender.slice(1));
  if (p.height) chips.push(inToDisplay(p.height));
  if (p.location?.city) chips.push(`${p.location.city}${p.location.state ? `, ${p.location.state}` : ''}`);
  if (p.hasChildren != null) chips.push(p.hasChildren ? 'Has kids' : 'No kids');
  if (p.pets) chips.push(p.pets);
  if (p.zodiacSign) chips.push(p.zodiacSign);
  return chips;
}

export function buildDetails(p: User): string[] {
  const chips: string[] = [];
  if (p.educationLevel) chips.push(p.educationLevel);
  if (p.jobTitle) chips.push(p.jobTitle);
  if (p.drinks) chips.push(`Drinks ${p.drinks.toLowerCase()}`);
  if (p.smokes) chips.push(`Smokes ${p.smokes.toLowerCase()}`);
  if (p.religion) chips.push(p.religion);
  if (p.politicalAssociation) chips.push(p.politicalAssociation);
  if (p.familyPlans) chips.push(p.familyPlans);
  return chips;
}

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
          <span className="pcard-score" title="Accountability score">{profile.accountabilityScore}</span>
        </div>
      </div>

      {/* About chips */}
      <div className="pcard-item pcard-item--text">
        <div className="pcard-detail-chips">
          {about.map((label) => (
            <span key={label} className="pcard-detail-chip">{label}</span>
          ))}
        </div>
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

      {/* Photos 3+ */}
      {extraPhotos.slice(1).map((photo, i) => (
        <div key={i} className="pcard-item pcard-item--photo">
          <img src={photo} alt={`${profile.name} ${i + 3}`} className="pcard-photo-img" />
          <HeartBtn section="photo" onPhoto />
        </div>
      ))}

      {/* Lifestyle details */}
      {details.length > 0 && (
        <div className="pcard-item pcard-item--text">
          <div className="pcard-detail-chips">
            {details.map((label) => (
              <span key={label} className="pcard-detail-chip">{label}</span>
            ))}
          </div>
        </div>
      )}

      <div style={{ height: 8 }} />
    </div>
  );
};

export default ProfileCard;
