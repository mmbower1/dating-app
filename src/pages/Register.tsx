import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Logo from '../components/Logo';
import Footer from '../components/Footer';

const GENDERS = ['male', 'female', 'non-binary', 'other'];

const Register = () => {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    age: '',
    gender: '',
    interestedIn: [] as string[],
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const toggle = (g: string) =>
    setForm((f) => ({
      ...f,
      interestedIn: f.interestedIn.includes(g)
        ? f.interestedIn.filter((x) => x !== g)
        : [...f.interestedIn, g],
    }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.gender) { setError('Please select your gender'); return; }
    if (!form.interestedIn.length) { setError('Please select who you are interested in'); return; }
    setLoading(true);
    try {
      await register({ ...form, age: Number(form.age) });
      navigate('/');
    } catch {
      setError('Registration failed. Email may already be in use.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-content">
        <div className="auth-card">
          <div className="auth-logo">
            <Logo size="lg" showText={true} />
          </div>
          <h1>Create account</h1>
          <p className="auth-subtitle">Real connections start here</p>
          {error && <p className="error">{error}</p>}
          <form onSubmit={handleSubmit}>
            <input
              placeholder="Full name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
            <input
              type="email"
              placeholder="Email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
            <input
              type="password"
              placeholder="Password (min 6 chars)"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
              minLength={6}
            />
            <input
              type="number"
              placeholder="Age"
              value={form.age}
              min={18}
              onChange={(e) => setForm({ ...form, age: e.target.value })}
              required
            />
            <label className="field-label">I am a</label>
            <div className="pill-group">
              {GENDERS.map((g) => (
                <button
                  key={g}
                  type="button"
                  className={`pill ${form.gender === g ? 'active' : ''}`}
                  onClick={() => setForm({ ...form, gender: g })}
                >
                  {g}
                </button>
              ))}
            </div>
            <label className="field-label">Interested in</label>
            <div className="pill-group">
              {GENDERS.map((g) => (
                <button
                  key={g}
                  type="button"
                  className={`pill ${form.interestedIn.includes(g) ? 'active' : ''}`}
                  onClick={() => toggle(g)}
                >
                  {g}
                </button>
              ))}
            </div>
            <button type="submit" disabled={loading}>
              {loading ? 'Creating account...' : 'Get started'}
            </button>
          </form>
          <p className="auth-link">
            Already have an account? <Link to="/login">Sign in</Link>
          </p>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Register;
