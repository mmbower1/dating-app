import { useState, useRef, useCallback } from 'react';
import type { FormEvent, ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import type { User } from '../types';
import ProfileCard from '../components/ProfileCard';
import LocationPicker from '../components/LocationPicker';

function scoreColor(score: number): string {
  if (score >= 95) return '#48bb78';
  if (score >= 90) return '#68d391';
  if (score >= 85) return '#9ae05a';
  if (score >= 80) return '#c6e04a';
  if (score >= 75) return '#ecc94b';
  if (score >= 70) return '#ed8936';
  return '#fc8181';
}

function urlBase64ToUint8Array(base64: string) {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(b64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

function inToDisplay(inches: number) {
  return `${Math.floor(inches / 12)}'${inches % 12}"`;
}

const GENDERS = ['male', 'female', 'non-binary', 'other'];
const GENDER_LABELS: Record<string, string> = { male: 'Men', female: 'Women', 'non-binary': 'Non-Binary', other: 'Other' };

const HOBBIES = [
  'Art', 'Cars', 'Cooking', 'Cycling', 'Dancing',
  'Gaming', 'Gardening', 'Gym', 'Hiking', 'Movies', 'Music',
  'Photography', 'Reading', 'Sports', 'Swimming', 'Traveling', 'Volunteering',
  'Writing', 'Yoga',
];

const PROMPT_QUESTIONS = [
  "The most spontaneous thing I've done...",
  "My ideal Sunday looks like...",
  "I'm looking for someone who...",
  "Two truths and a lie...",
  "My love language is...",
  "The way to win me over...",
  "I geek out on...",
  "My simple pleasures...",
  "A life goal of mine...",
  "My most controversial opinion...",
  "Something I never get tired of...",
  "The key to my heart...",
  "I'll know it's a match when...",
  "My biggest green flag...",
  "A perfect date looks like...",
  "I'm most proud of...",
  "The best trip I've taken...",
  "Change my mind on...",
];

const ChevronIcon = ({ open }: { open: boolean }) => (
  <svg
    width="18" height="18" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
    style={{ transform: open ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }}
  >
    <polyline points="9 18 15 12 9 6"/>
  </svg>
);

const Section = ({
  label, open, onToggle, children,
}: {
  label: string; open: boolean; onToggle: () => void; children: React.ReactNode;
}) => (
  <div className="profile-accordion">
    <button type="button" className={`profile-accordion-btn${open ? ' open' : ''}`} onClick={onToggle}>
      <span>{label}</span>
      <ChevronIcon open={open} />
    </button>
    {open && <div className="profile-accordion-body">{children}</div>}
  </div>
);

const Profile = () => {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState(user?.name || '');
  const [age, setAge] = useState(user?.age ?? 18);
  const [bio, setBio] = useState(user?.bio || '');
  const [pronouns, setPronouns] = useState(user?.pronouns || '');
  const [sexuality, setSexuality] = useState(user?.sexuality || '');
  const [interestedIn, setInterestedIn] = useState<string[]>(user?.interestedIn ?? []);
  const [height, setHeight] = useState<string>(user?.height ? String(user.height) : '');
  const [ethnicity, setEthnicity] = useState(user?.ethnicity || '');
  const [hometown, setHometown] = useState(user?.hometown || '');
  const [locationCity, setLocationCity] = useState(user?.location?.city || '');
  const [locationState, setLocationState] = useState(user?.location?.state || '');
  const [locationLat, setLocationLat] = useState<number | null>(user?.location?.lat ?? null);
  const [locationLng, setLocationLng] = useState<number | null>(user?.location?.lng ?? null);
  const [zodiacSign, setZodiacSign] = useState(user?.zodiacSign || '');
  const [pets, setPets] = useState(user?.pets || '');
  const [hasChildren, setHasChildren] = useState(
    user?.hasChildren == null ? '' : user.hasChildren ? 'yes' : 'no'
  );
  const [familyPlans, setFamilyPlans] = useState(user?.familyPlans || '');
  const [jobTitle, setJobTitle] = useState(user?.jobTitle || '');
  const [work, setWork] = useState(user?.work || '');
  const [school, setSchool] = useState(user?.school || '');
  const [educationLevel, setEducationLevel] = useState(user?.educationLevel || '');
  const [drinks, setDrinks] = useState(user?.drinks || '');
  const [smokes, setSmokes] = useState(user?.smokes || '');
  const [religion, setReligion] = useState(user?.religion || '');
  const [politicalAssociation, setPoliticalAssociation] = useState(user?.politicalAssociation || '');
  const [languages, setLanguages] = useState(user?.languages || '');
  const [hobbies, setHobbies] = useState<string[]>(user?.hobbies ?? []);
  const [prompts, setPrompts] = useState<{ question: string; answer: string }[]>(user?.prompts ?? []);

  // Accordion open state
  const [openAbout, setOpenAbout] = useState(false);
  const [openPhysical, setOpenPhysical] = useState(false);
  const [openLocation, setOpenLocation] = useState(false);
  const [openFamily, setOpenFamily] = useState(false);
  const [openCareer, setOpenCareer] = useState(false);
  const [openLifestyle, setOpenLifestyle] = useState(false);
  const [openPrompts, setOpenPrompts] = useState(true);
  const [showPromptPicker, setShowPromptPicker] = useState(false);

  const [showPreview, setShowPreview] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [notifStatus, setNotifStatus] = useState<'idle' | 'enabled' | 'denied'>('idle');
  const fileRef = useRef<HTMLInputElement>(null);

  const toggleInterest = (g: string) =>
    setInterestedIn((prev) => prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]);

  const save = async (e: FormEvent) => {
    e.preventDefault();
    const patch: Partial<User> & { location?: { city: string; state: string } } = {
      name, age: Number(age), bio, pronouns, sexuality, interestedIn,
      height: height ? Number(height) : null,
      ethnicity, hometown,
      location: { city: locationCity, state: locationState, lat: locationLat, lng: locationLng },
      zodiacSign, pets,
      hasChildren: hasChildren === '' ? null : hasChildren === 'yes',
      familyPlans, jobTitle, work, school, educationLevel,
      drinks, smokes, religion, politicalAssociation, languages,
      hobbies, prompts,
    };
    await api.patch<User>('/users/me', patch);
    updateUser(patch);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError('');
    setUploading(true);
    try {
      const form = new FormData();
      form.append('photo', file);
      const res = await api.post<{ url: string; photos: string[] }>('/users/upload-photo', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      updateUser({ photos: res.data.photos });
    } catch {
      setUploadError('Upload failed. Make sure Cloudinary is configured.');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const removePhoto = async (url: string) => {
    const res = await api.delete<{ photos: string[] }>('/users/photo', { data: { url } });
    updateUser({ photos: res.data.photos });
  };

  const dragIndex = useRef<number | null>(null);
  const onDragStart = useCallback((i: number) => { dragIndex.current = i; }, []);
  const onDrop = useCallback(async (dropIndex: number) => {
    if (dragIndex.current === null || dragIndex.current === dropIndex) return;
    const reordered = [...(user?.photos ?? [])];
    const [moved] = reordered.splice(dragIndex.current, 1);
    reordered.splice(dropIndex, 0, moved);
    dragIndex.current = null;
    updateUser({ photos: reordered });
    await api.patch('/users/photos/reorder', { photos: reordered });
  }, [user?.photos, updateUser]);

  const enableNotifications = async () => {
    if (!('Notification' in window) || !('serviceWorker' in navigator)) { setNotifStatus('denied'); return; }
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') { setNotifStatus('denied'); return; }
    try {
      const sw = await navigator.serviceWorker.register('/sw.js');
      const { data } = await api.get<{ key: string }>('/users/vapid-public-key');
      const subscription = await sw.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(data.key),
      });
      await api.post('/users/push-subscribe', subscription.toJSON());
      setNotifStatus('enabled');
    } catch { setNotifStatus('denied'); }
  };

  const addPrompt = (question: string) => {
    setPrompts((prev) => [...prev, { question, answer: '' }]);
    setShowPromptPicker(false);
  };

  const removePrompt = (i: number) =>
    setPrompts((prev) => prev.filter((_, idx) => idx !== i));

  const updatePromptAnswer = (i: number, answer: string) =>
    setPrompts((prev) => prev.map((p, idx) => idx === i ? { ...p, answer } : p));

  const usedQuestions = new Set(prompts.map((p) => p.question));
  const availableQuestions = PROMPT_QUESTIONS.filter((q) => !usedQuestions.has(q));

  if (!user) return null;

  return (
    <div className="profile-page">
      <div className="profile-header">
        <button className="profile-preview-btn" onClick={() => setShowPreview(true)} aria-label="Preview profile">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
            <circle cx="12" cy="12" r="3"/>
          </svg>
        </button>
        <button className="profile-settings-btn" onClick={() => navigate('/settings')} aria-label="Settings">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </svg>
        </button>
        <div className="profile-avatar">
          {user.photos[0] ? <img src={user.photos[0]} alt={user.name} /> : <div className="no-photo-lg">{user.name[0]}</div>}
        </div>
        <h2>{user.name}, {user.age}</h2>
      </div>

      {/* Photos */}
      <div className="photo-section">
        <h3 className="section-title">Photos</h3>
        <div className="photo-grid">
          {user.photos.map((url, i) => (
            <div
              key={url}
              className="photo-thumb"
              draggable
              onDragStart={() => onDragStart(i)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => onDrop(i)}
            >
              <img src={url} alt="profile" />
              <button className="photo-remove" onClick={() => removePhoto(url)} title="Remove">✕</button>
            </div>
          ))}
          {user.photos.length < 6 && (
            <button className="photo-add" onClick={() => fileRef.current?.click()} disabled={uploading}>
              {uploading ? '...' : '+'}
            </button>
          )}
        </div>
        <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} />
        {uploadError && <p className="upload-error">{uploadError}</p>}
        <p className="photo-hint">{user.photos.length}/6 photos</p>
      </div>

      {/* Accountability */}
      <div className="accountability-card">
        <h3>Accountability Score</h3>
        <div
          className="score-ring"
          style={{
            color: scoreColor(user.accountabilityScore),
            borderColor: scoreColor(user.accountabilityScore),
            background: `${scoreColor(user.accountabilityScore)}18`,
          }}
        >
          {user.accountabilityScore}
        </div>
        <p className="score-tip">Respond to messages and close conversations gracefully — this raises your score and improves your visibility.</p>
      </div>

      <form className="profile-form" onSubmit={save}>

        {/* Bio always visible */}
        <p className="profile-section-header">About me</p>
        <label className="field-label">Bio</label>
        <textarea value={bio} onChange={(e) => setBio(e.target.value)} maxLength={500} rows={4} placeholder="Tell people about yourself..." />

        <Section label="Details" open={openAbout} onToggle={() => setOpenAbout((v) => !v)}>
          <div className="profile-selects-row">
            <div className="profile-select-wrap">
              <label className="field-label">Name</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
            </div>
            <div className="profile-select-wrap">
              <label className="field-label">Age</label>
              <input type="number" min={18} max={99} value={age} onChange={(e) => setAge(Number(e.target.value))} />
            </div>
          </div>

          <div className="profile-selects-row">
            <div className="profile-select-wrap">
              <label className="field-label">Pronouns</label>
              <select className="profile-select" value={pronouns} onChange={(e) => setPronouns(e.target.value)}>
                <option value="">Select…</option>
                {['He/Him','She/Her','They/Them','He/They','She/They','Ze/Zir','Other'].map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div className="profile-select-wrap">
              <label className="field-label">Gender</label>
              <input type="text" value={user.gender} readOnly className="profile-input-readonly" />
            </div>
          </div>

          <div className="profile-selects-row">
            <div className="profile-select-wrap">
              <label className="field-label">Sexuality</label>
              <select className="profile-select" value={sexuality} onChange={(e) => setSexuality(e.target.value)}>
                <option value="">Select…</option>
                {['Straight','Gay','Lesbian','Bisexual','Pansexual','Asexual','Queer','Other'].map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="profile-select-wrap">
              <label className="field-label">Zodiac sign</label>
              <select className="profile-select" value={zodiacSign} onChange={(e) => setZodiacSign(e.target.value)}>
                <option value="">Select…</option>
                {['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'].map((z) => <option key={z} value={z}>{z}</option>)}
              </select>
            </div>
          </div>

          <label className="field-label">Interested in</label>
          <div className="pill-group">
            {GENDERS.map((g) => (
              <button key={g} type="button" className={`pill ${interestedIn.includes(g) ? 'active' : ''}`} onClick={() => toggleInterest(g)}>
                {GENDER_LABELS[g]}
              </button>
            ))}
          </div>
        </Section>

        <Section label="Physical" open={openPhysical} onToggle={() => setOpenPhysical((v) => !v)}>
          <div className="profile-selects-row">
            <div className="profile-select-wrap">
              <label className="field-label">Height</label>
              <select className="profile-select" value={height} onChange={(e) => setHeight(e.target.value)}>
                <option value="">Select…</option>
                {Array.from({ length: 29 }, (_, i) => i + 56).map((h) => <option key={h} value={h}>{inToDisplay(h)}</option>)}
              </select>
            </div>
            <div className="profile-select-wrap">
              <label className="field-label">Ethnicity</label>
              <select className="profile-select" value={ethnicity} onChange={(e) => setEthnicity(e.target.value)}>
                <option value="">Select…</option>
                {['Asian','Black / African American','Hispanic / Latino','Middle Eastern','Native American','Pacific Islander','White / Caucasian','Multiracial','Other'].map((e) => <option key={e} value={e}>{e}</option>)}
              </select>
            </div>
          </div>

        </Section>

        <Section label="Location" open={openLocation} onToggle={() => setOpenLocation((v) => !v)}>
          <LocationPicker
            city={locationCity}
            state={locationState}
            lat={locationLat}
            lng={locationLng}
            onChange={(city, state, lat, lng) => {
              setLocationCity(city);
              setLocationState(state);
              setLocationLat(lat);
              setLocationLng(lng);
            }}
          />
          <div className="profile-select-wrap" style={{ marginTop: 16 }}>
            <label className="field-label">Hometown</label>
            <input type="text" value={hometown} onChange={(e) => setHometown(e.target.value)} placeholder="Where you grew up" />
          </div>
        </Section>

        <Section label="Family" open={openFamily} onToggle={() => setOpenFamily((v) => !v)}>
          <div className="profile-selects-row">
            <div className="profile-select-wrap">
              <label className="field-label">Children</label>
              <select className="profile-select" value={hasChildren} onChange={(e) => setHasChildren(e.target.value)}>
                <option value="">Select…</option>
                <option value="yes">Has kids</option>
                <option value="no">Doesn't have kids</option>
              </select>
            </div>
            <div className="profile-select-wrap">
              <label className="field-label">Family plans</label>
              <select className="profile-select" value={familyPlans} onChange={(e) => setFamilyPlans(e.target.value)}>
                <option value="">Select…</option>
                {['Want kids','Open to kids',"Don't want kids",'Not sure'].map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
          </div>

          <div className="profile-select-wrap">
            <label className="field-label">Pets</label>
            <select className="profile-select" value={pets} onChange={(e) => setPets(e.target.value)}>
              <option value="">Select…</option>
              {['Dog','Cat','Dog & Cat','Birds','Fish','Reptile','No pets','Other'].map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        </Section>

        <Section label="Career & Education" open={openCareer} onToggle={() => setOpenCareer((v) => !v)}>
          <div className="profile-selects-row">
            <div className="profile-select-wrap">
              <label className="field-label">Job title</label>
              <input type="text" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} placeholder="What you do" />
            </div>
            <div className="profile-select-wrap">
              <label className="field-label">Company</label>
              <input type="text" value={work} onChange={(e) => setWork(e.target.value)} placeholder="Where you work" />
            </div>
          </div>

          <div className="profile-selects-row">
            <div className="profile-select-wrap">
              <label className="field-label">School</label>
              <input type="text" value={school} onChange={(e) => setSchool(e.target.value)} placeholder="School attended" />
            </div>
            <div className="profile-select-wrap">
              <label className="field-label">Education level</label>
              <select className="profile-select" value={educationLevel} onChange={(e) => setEducationLevel(e.target.value)}>
                <option value="">Select…</option>
                {["High School","Some College","Associate's","Bachelor's","Master's","Doctorate","Trade School"].map((e) => <option key={e} value={e}>{e}</option>)}
              </select>
            </div>
          </div>
        </Section>

        <Section label="Lifestyle" open={openLifestyle} onToggle={() => setOpenLifestyle((v) => !v)}>
          <div className="profile-selects-row">
            <div className="profile-select-wrap">
              <label className="field-label">Drinking</label>
              <select className="profile-select" value={drinks} onChange={(e) => setDrinks(e.target.value)}>
                <option value="">Select…</option>
                {['Never','Socially','Regularly'].map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div className="profile-select-wrap">
              <label className="field-label">Smoking</label>
              <select className="profile-select" value={smokes} onChange={(e) => setSmokes(e.target.value)}>
                <option value="">Select…</option>
                {['Never','Socially','Regularly'].map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div className="profile-selects-row">
            <div className="profile-select-wrap">
              <label className="field-label">Religious beliefs</label>
              <select className="profile-select" value={religion} onChange={(e) => setReligion(e.target.value)}>
                <option value="">Select…</option>
                {['Agnostic','Atheist','Buddhist','Catholic','Christian','Hindu','Jewish','Muslim','Spiritual','Other'].map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div className="profile-select-wrap">
              <label className="field-label">Politics</label>
              <select className="profile-select" value={politicalAssociation} onChange={(e) => setPoliticalAssociation(e.target.value)}>
                <option value="">Select…</option>
                {['Very Liberal','Liberal','Moderate','Conservative','Very Conservative','Apolitical'].map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>

          <div className="profile-select-wrap">
            <label className="field-label">Languages spoken</label>
            <input type="text" value={languages} onChange={(e) => setLanguages(e.target.value)} placeholder="e.g. English, Spanish" />
          </div>

          <div>
            <label className="field-label">Hobbies</label>
            <div className="pill-group" style={{ marginTop: 8 }}>
              {HOBBIES.map((h) => (
                <button
                  key={h}
                  type="button"
                  className={`pill ${hobbies.includes(h) ? 'active' : ''}`}
                  onClick={() => setHobbies((prev) => prev.includes(h) ? prev.filter((x) => x !== h) : [...prev, h])}
                >
                  {h}
                </button>
              ))}
            </div>
          </div>
        </Section>

        {/* ── Prompts ───────────────────────── */}
        <p className="profile-section-header" style={{ marginTop: 24 }}>Prompts</p>
        <p className="profile-prompts-hint">Answer up to 3 questions — your answers appear on your profile card for people to see.</p>

        <Section
          label={prompts.length > 0 ? `Your prompts (${prompts.length}/3)` : 'Add prompts'}
          open={openPrompts}
          onToggle={() => setOpenPrompts((v) => !v)}
        >
          {prompts.map((p, i) => (
            <div key={i} className="prompt-card">
              <div className="prompt-card-header">
                <span className="prompt-card-question">{p.question}</span>
                <button
                  type="button"
                  className="prompt-card-remove"
                  onClick={() => removePrompt(i)}
                  aria-label="Remove prompt"
                >✕</button>
              </div>
              <textarea
                className="prompt-card-textarea"
                placeholder="Your answer..."
                maxLength={200}
                rows={3}
                value={p.answer}
                onChange={(e) => updatePromptAnswer(i, e.target.value)}
              />
              <span className="prompt-char-count">{p.answer.length}/200</span>
            </div>
          ))}

          {prompts.length < 3 && (
            <div className="prompt-add-wrap">
              <button
                type="button"
                className="prompt-add-btn"
                onClick={() => setShowPromptPicker((v) => !v)}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                Add a prompt
              </button>
              {showPromptPicker && (
                <div className="prompt-picker">
                  {availableQuestions.map((q) => (
                    <button
                      key={q}
                      type="button"
                      className="prompt-picker-option"
                      onClick={() => addPrompt(q)}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </Section>

        <button type="submit" style={{ marginTop: 16 }}>{saved ? 'Saved!' : 'Save changes'}</button>
      </form>

      {notifStatus === 'idle' && (
        <button className="notif-btn" onClick={enableNotifications}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
          Enable notifications
        </button>
      )}
      {notifStatus === 'enabled' && <p className="notif-ok">✓ Notifications enabled</p>}
      {notifStatus === 'denied' && <p className="notif-denied">Notifications blocked — enable in browser settings</p>}

      <div className="profile-footer-links">
        <a href="mailto:support@lovelockedapp.com" className="profile-footer-link">Contact Us</a>
        <span className="profile-footer-dot">·</span>
        <a href="/privacy" className="profile-footer-link">Privacy Policy</a>
        <span className="profile-footer-dot">·</span>
        <a href="/terms" className="profile-footer-link">Terms of Service</a>
      </div>
      <p className="profile-footer-copy">© {new Date().getFullYear()} LoveLocked. All rights reserved.</p>

      {showPreview && (
        <div className="preview-overlay">
          <div className="preview-overlay-header">
            <span className="preview-overlay-label">Your profile preview</span>
            <button className="preview-close-btn" onClick={() => setShowPreview(false)}>✕ Close</button>
          </div>
          <div className="preview-scroll">
            <ProfileCard profile={user} />
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
