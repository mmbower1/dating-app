import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Logo from '../components/Logo';

const GENDERS = ['male', 'female', 'non-binary', 'other'];
const GENDER_LABELS: Record<string, string> = {
  male: 'Male', female: 'Female', 'non-binary': 'Non-Binary', other: 'Other',
};
const GENDER_ICONS = {
  male: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="10" cy="14" r="5"/><line x1="21" y1="3" x2="15" y2="9"/><polyline points="15 3 21 3 21 9"/>
    </svg>
  ),
  female: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="5"/><line x1="12" y1="13" x2="12" y2="21"/><line x1="9" y1="18" x2="15" y2="18"/>
    </svg>
  ),
  'non-binary': (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4"/><line x1="12" y1="2" x2="12" y2="8"/><line x1="12" y1="16" x2="12" y2="22"/>
      <line x1="9" y1="5" x2="15" y2="5"/>
    </svg>
  ),
  other: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
  ),
};

const CheckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);

const EyeIcon = ({ open }: { open: boolean }) =>
  open ? (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  ) : (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  );

function calcAge(dob: string): number {
  if (!dob) return 0;
  const d = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - d.getFullYear();
  const m = today.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age--;
  return age;
}

const TOTAL_STEPS = 6;

const Register = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    name: '',
    dateOfBirth: '',
    gender: '',
    interestedIn: [] as string[],
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const age = calcAge(form.dateOfBirth);
  const maxDob = new Date(new Date().setFullYear(new Date().getFullYear() - 18))
    .toISOString().split('T')[0];

  const canContinue = (): boolean => {
    switch (step) {
      case 0: return form.name.trim().length >= 2;
      case 1: return !!form.dateOfBirth && age >= 18;
      case 2: return !!form.gender;
      case 3: return form.interestedIn.length > 0;
      case 4: return /\S+@\S+\.\S+/.test(form.email);
      case 5: return (
        form.password.length >= 8 &&
        /[0-9]/.test(form.password) &&
        /[^A-Za-z0-9]/.test(form.password) &&
        form.password === form.confirmPassword
      );
      default: return false;
    }
  };

  const handleNext = async () => {
    setError('');
    if (step < TOTAL_STEPS - 1) { setStep(s => s + 1); return; }
    setLoading(true);
    try {
      await register({
        name: form.name,
        email: form.email,
        password: form.password,
        age,
        dateOfBirth: form.dateOfBirth,
        gender: form.gender,
        interestedIn: form.interestedIn,
        phone: form.phone,
      });
      navigate('/');
    } catch {
      setError('Registration failed. That email may already be in use.');
    } finally {
      setLoading(false);
    }
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && canContinue()) handleNext();
  };

  const toggle = (g: string) =>
    setForm(f => ({
      ...f,
      interestedIn: f.interestedIn.includes(g)
        ? f.interestedIn.filter(x => x !== g)
        : [...f.interestedIn, g],
    }));

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <>
            <h2 className="reg-question">What's your name?</h2>
            <p className="reg-subtitle">Your first name is how matches will see you.</p>
            <input
              className="reg-input"
              placeholder="First name"
              value={form.name}
              autoFocus
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              onKeyDown={onKey}
            />
          </>
        );

      case 1:
        return (
          <>
            <h2 className="reg-question">When's your birthday?</h2>
            <p className="reg-subtitle">Lockheart is for adults 18 and up.</p>
            {form.dateOfBirth && age >= 18 && (
              <div className="reg-age-display">{age}</div>
            )}
            <input
              className="reg-input"
              type="date"
              value={form.dateOfBirth}
              max={maxDob}
              onChange={e => setForm(f => ({ ...f, dateOfBirth: e.target.value }))}
            />
            {form.dateOfBirth && age < 18 && (
              <p className="reg-error-inline">You must be 18 or older to join.</p>
            )}
          </>
        );

      case 2:
        return (
          <>
            <h2 className="reg-question">I am a...</h2>
            <p className="reg-subtitle">This helps us find the right people for you.</p>
            <div className="reg-options">
              {GENDERS.map(g => (
                <button
                  key={g}
                  type="button"
                  className={`reg-option ${form.gender === g ? 'selected' : ''}`}
                  onClick={() => setForm(f => ({ ...f, gender: g }))}
                >
                  <span className="reg-option-icon">{GENDER_ICONS[g as keyof typeof GENDER_ICONS]}</span>
                  <span className="reg-option-label">{GENDER_LABELS[g]}</span>
                  <span className={`reg-option-check ${form.gender === g ? 'checked' : ''}`}>
                    {form.gender === g && <CheckIcon />}
                  </span>
                </button>
              ))}
            </div>
          </>
        );

      case 3:
        return (
          <>
            <h2 className="reg-question">I'm open to...</h2>
            <p className="reg-subtitle">Select all that apply.</p>
            <div className="reg-options">
              {GENDERS.map(g => (
                <button
                  key={g}
                  type="button"
                  className={`reg-option ${form.interestedIn.includes(g) ? 'selected' : ''}`}
                  onClick={() => toggle(g)}
                >
                  <span className="reg-option-icon">{GENDER_ICONS[g as keyof typeof GENDER_ICONS]}</span>
                  <span className="reg-option-label">{GENDER_LABELS[g]}</span>
                  <span className={`reg-option-check ${form.interestedIn.includes(g) ? 'checked' : ''}`}>
                    {form.interestedIn.includes(g) && <CheckIcon />}
                  </span>
                </button>
              ))}
            </div>
          </>
        );

      case 4:
        return (
          <>
            <h2 className="reg-question">What's your email?</h2>
            <p className="reg-subtitle">We'll use it to keep your account safe. No spam.</p>
            <input
              className="reg-input"
              type="email"
              placeholder="your@email.com"
              value={form.email}
              autoFocus
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              onKeyDown={onKey}
            />
            <input
              className="reg-input"
              type="tel"
              placeholder="Phone number (optional)"
              value={form.phone}
              onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
              onKeyDown={onKey}
            />
          </>
        );

      case 5: {
        const pw = form.password;
        const rules = [
          { label: 'At least 8 characters', met: pw.length >= 8 },
          { label: 'Contains a number',      met: /[0-9]/.test(pw) },
          { label: 'Contains a symbol',      met: /[^A-Za-z0-9]/.test(pw) },
        ];
        return (
          <>
            <h2 className="reg-question">Create a password</h2>
            <p className="reg-subtitle">Make it something only you'd know.</p>
            <div className="reg-pw-wrap">
              <input
                className="reg-input"
                type={showPassword ? 'text' : 'password'}
                placeholder="Password"
                value={form.password}
                autoFocus
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                onKeyDown={onKey}
              />
              <button type="button" className="reg-eye-btn" onClick={() => setShowPassword(v => !v)}>
                <EyeIcon open={showPassword} />
              </button>
            </div>
            {pw.length > 0 && (
              <ul className="reg-pw-rules">
                {rules.map(r => (
                  <li key={r.label} className={r.met ? 'met' : ''}>
                    <span className="reg-pw-rule-dot" />
                    {r.label}
                  </li>
                ))}
              </ul>
            )}
            <div className="reg-pw-wrap">
              <input
                className="reg-input"
                type={showConfirm ? 'text' : 'password'}
                placeholder="Confirm password"
                value={form.confirmPassword}
                onChange={e => setForm(f => ({ ...f, confirmPassword: e.target.value }))}
                onKeyDown={onKey}
              />
              <button type="button" className="reg-eye-btn" onClick={() => setShowConfirm(v => !v)}>
                <EyeIcon open={showConfirm} />
              </button>
            </div>
            {form.confirmPassword && form.password !== form.confirmPassword && (
              <p className="reg-error-inline">Passwords don't match.</p>
            )}
          </>
        );
      }

      default:
        return null;
    }
  };

  return (
    <div className="reg-wizard">

      {/* Progress bar */}
      <div className="reg-progress-track">
        <div
          className="reg-progress-fill"
          style={{ width: `${((step + 1) / TOTAL_STEPS) * 100}%` }}
        />
      </div>

      {/* Back button */}
      <button
        className="reg-back-btn"
        onClick={() => step === 0 ? navigate('/') : setStep(s => s - 1)}
        aria-label="Back"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 12H5M12 5l-7 7 7 7"/>
        </svg>
      </button>

      {/* Card */}
      <div className="reg-card">
        <div className="reg-card-header">
          <Logo size="sm" showText={true} />
          <span className="reg-step-label">{step + 1} / {TOTAL_STEPS}</span>
        </div>

        <div className="reg-step-body" key={step}>
          {renderStep()}
          {error && <p className="reg-error-inline" style={{ marginTop: 12 }}>{error}</p>}
        </div>

        <button
          className="reg-continue-btn"
          disabled={!canContinue() || loading}
          onClick={handleNext}
        >
          {step === TOTAL_STEPS - 1
            ? (loading ? 'Creating account…' : 'Create account')
            : 'Continue'}
        </button>
      </div>

      <p className="reg-signin-hint">
        Already have an account? <Link to="/login">Sign in</Link>
      </p>

    </div>
  );
};

export default Register;
