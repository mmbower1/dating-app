import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import type { DiscoverFilters } from '../types';

interface Props {
  onClose: () => void;
  onApply: () => void;
}

const GENDERS = ['male', 'female', 'non-binary', 'other'];
const GENDER_LABELS: Record<string, string> = { male: 'Male', female: 'Female', 'non-binary': 'Non-Binary', other: 'Other' };

const ETHNICITIES = ['Asian', 'Black / African American', 'Hispanic / Latino', 'Middle Eastern', 'Native American', 'Pacific Islander', 'White / Caucasian', 'Multiracial', 'Other'];
const RELIGIONS = ['Agnostic', 'Atheist', 'Buddhist', 'Catholic', 'Christian', 'Hindu', 'Jewish', 'Muslim', 'Spiritual', 'Other'];
const DRINKS_OPTS = ['Never', 'Socially', 'Regularly'];
const SMOKES_OPTS = ['Never', 'Socially', 'Regularly'];
const POLITICS_OPTS = ['Very Liberal', 'Liberal', 'Moderate', 'Conservative', 'Very Conservative', 'Apolitical'];
const EDUCATION_OPTS = ["High School", "Some College", "Associate's", "Bachelor's", "Master's", "Doctorate", "Trade School"];
const DISTANCE_OPTS = [10, 25, 50, 100, 150, 200];

function inToDisplay(inches: number) {
  return `${Math.floor(inches / 12)}'${inches % 12}"`;
}

const DEFAULT_FILTERS: DiscoverFilters = {
  ethnicities: [],
  religions: [],
  heightMin: null,
  heightMax: null,
  hasChildren: 'any',
  drinks: [],
  smokes: [],
  politicalAssociations: [],
  educationLevels: [],
  maxDistance: null,
};

const FiltersModal = ({ onClose, onApply }: Props) => {
  const { user, updateUser } = useAuth();

  const [interestedIn, setInterestedIn] = useState<string[]>(user?.interestedIn ?? []);
  const [ageMin, setAgeMin] = useState(user?.agePreference?.min ?? 18);
  const [ageMax, setAgeMax] = useState(user?.agePreference?.max ?? 99);
  const [filters, setFilters] = useState<DiscoverFilters>(user?.filters ?? DEFAULT_FILTERS);
  const [saving, setSaving] = useState(false);

  const toggleGender = (g: string) =>
    setInterestedIn((prev) => prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]);

  const toggleArr = (key: keyof DiscoverFilters, val: string) => {
    setFilters((prev) => {
      const arr = (prev[key] as string[]) ?? [];
      return {
        ...prev,
        [key]: arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val],
      };
    });
  };

  const set = (key: keyof DiscoverFilters, val: unknown) =>
    setFilters((prev) => ({ ...prev, [key]: val }));

  const activeCount = [
    interestedIn.length > 0 && interestedIn.length < 4 ? 1 : 0,
    (ageMin > 18 || ageMax < 99) ? 1 : 0,
    filters.maxDistance != null ? 1 : 0,
    filters.ethnicities.length ? 1 : 0,
    filters.religions.length ? 1 : 0,
    (filters.heightMin != null || filters.heightMax != null) ? 1 : 0,
    filters.hasChildren !== 'any' ? 1 : 0,
    filters.drinks.length ? 1 : 0,
    filters.smokes.length ? 1 : 0,
    filters.politicalAssociations.length ? 1 : 0,
    filters.educationLevels.length ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  const clearAll = () => {
    setInterestedIn([]);
    setAgeMin(18);
    setAgeMax(99);
    setFilters(DEFAULT_FILTERS);
  };

  const apply = async () => {
    setSaving(true);
    try {
      let locationUpdate = {};
      if (filters.maxDistance != null && navigator.geolocation) {
        try {
          const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 })
          );
          locationUpdate = { location: { ...user?.location, lat: pos.coords.latitude, lng: pos.coords.longitude } };
        } catch { /* location denied — distance filter won't apply */ }
      }
      const clampedMin = Math.min(ageMin, ageMax - 1);
      const clampedMax = Math.max(ageMax, ageMin + 1);
      await api.patch('/users/me', {
        interestedIn,
        agePreference: { min: clampedMin, max: clampedMax },
        filters,
        ...locationUpdate,
      });
      updateUser({ interestedIn, agePreference: { min: clampedMin, max: clampedMax }, filters, ...locationUpdate });
      onApply();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="filters-overlay">
      <div className="filters-modal">
        <div className="filters-header">
          <span className="filters-title">Filters {activeCount > 0 && <span className="filter-badge-inline">{activeCount}</span>}</span>
          <button className="filters-clear" onClick={clearAll}>Clear all</button>
          <button className="filters-close" onClick={onClose} aria-label="Close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div className="filters-body">

          {/* Looking for */}
          <section className="filter-section">
            <h3 className="filter-section-title">Looking for</h3>
            <div className="pill-group">
              {GENDERS.map((g) => (
                <button key={g} type="button"
                  className={`pill ${interestedIn.includes(g) ? 'active' : ''}`}
                  onClick={() => toggleGender(g)}>
                  {GENDER_LABELS[g]}
                </button>
              ))}
            </div>
          </section>

          {/* Age range */}
          <section className="filter-section">
            <h3 className="filter-section-title">
              Age range <span className="filter-range-label">{ageMin} – {ageMax === 99 ? '99+' : ageMax}</span>
            </h3>
            <div className="age-sliders">
              <input type="range" min={18} max={80} value={ageMin}
                onChange={(e) => setAgeMin(Math.min(Number(e.target.value), ageMax - 1))} />
              <input type="range" min={18} max={99} value={ageMax}
                onChange={(e) => setAgeMax(Math.max(Number(e.target.value), ageMin + 1))} />
            </div>
            <div className="age-slider-caps"><span>18</span><span>99+</span></div>
          </section>

          {/* Distance */}
          <section className="filter-section">
            <h3 className="filter-section-title">Maximum distance</h3>
            <div className="filter-chips">
              <button type="button"
                className={`chip ${filters.maxDistance === null ? 'active' : ''}`}
                onClick={() => set('maxDistance', null)}>Any</button>
              {DISTANCE_OPTS.map((d) => (
                <button key={d} type="button"
                  className={`chip ${filters.maxDistance === d ? 'active' : ''}`}
                  onClick={() => set('maxDistance', d)}>
                  {d} mi
                </button>
              ))}
            </div>
            {filters.maxDistance != null && (
              <p className="filter-note">Your location will be used when you apply.</p>
            )}
          </section>

          {/* Ethnicity */}
          <section className="filter-section">
            <h3 className="filter-section-title">Ethnicity <span className="filter-optional">optional</span></h3>
            <div className="filter-chips">
              {ETHNICITIES.map((e) => (
                <button key={e} type="button"
                  className={`chip ${filters.ethnicities.includes(e) ? 'active' : ''}`}
                  onClick={() => toggleArr('ethnicities', e)}>{e}</button>
              ))}
            </div>
          </section>

          {/* Religion */}
          <section className="filter-section">
            <h3 className="filter-section-title">Religion <span className="filter-optional">optional</span></h3>
            <div className="filter-chips">
              {RELIGIONS.map((r) => (
                <button key={r} type="button"
                  className={`chip ${filters.religions.includes(r) ? 'active' : ''}`}
                  onClick={() => toggleArr('religions', r)}>{r}</button>
              ))}
            </div>
          </section>

          {/* Height */}
          <section className="filter-section">
            <h3 className="filter-section-title">
              Height <span className="filter-optional">optional</span>
              {(filters.heightMin != null || filters.heightMax != null) && (
                <span className="filter-range-label">
                  {filters.heightMin != null ? inToDisplay(filters.heightMin) : "Any"} – {filters.heightMax != null ? inToDisplay(filters.heightMax) : "Any"}
                </span>
              )}
            </h3>
            <div className="height-row">
              <div className="height-select-wrap">
                <label className="height-label">Min</label>
                <select className="height-select"
                  value={filters.heightMin ?? ''}
                  onChange={(e) => set('heightMin', e.target.value ? Number(e.target.value) : null)}>
                  <option value="">Any</option>
                  {Array.from({ length: 29 }, (_, i) => i + 56).map((h) => (
                    <option key={h} value={h}>{inToDisplay(h)}</option>
                  ))}
                </select>
              </div>
              <span className="height-dash">–</span>
              <div className="height-select-wrap">
                <label className="height-label">Max</label>
                <select className="height-select"
                  value={filters.heightMax ?? ''}
                  onChange={(e) => set('heightMax', e.target.value ? Number(e.target.value) : null)}>
                  <option value="">Any</option>
                  {Array.from({ length: 29 }, (_, i) => i + 56).map((h) => (
                    <option key={h} value={h}>{inToDisplay(h)}</option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          {/* Has children */}
          <section className="filter-section">
            <h3 className="filter-section-title">Has children <span className="filter-optional">optional</span></h3>
            <div className="filter-chips">
              {(['any', 'yes', 'no'] as const).map((v) => (
                <button key={v} type="button"
                  className={`chip ${filters.hasChildren === v ? 'active' : ''}`}
                  onClick={() => set('hasChildren', v)}>
                  {v === 'any' ? "Doesn't matter" : v === 'yes' ? 'Yes' : 'No'}
                </button>
              ))}
            </div>
          </section>

          {/* Drinks */}
          <section className="filter-section">
            <h3 className="filter-section-title">Drinking <span className="filter-optional">optional</span></h3>
            <div className="filter-chips">
              {DRINKS_OPTS.map((d) => (
                <button key={d} type="button"
                  className={`chip ${filters.drinks.includes(d) ? 'active' : ''}`}
                  onClick={() => toggleArr('drinks', d)}>{d}</button>
              ))}
            </div>
          </section>

          {/* Smokes */}
          <section className="filter-section">
            <h3 className="filter-section-title">Smoking <span className="filter-optional">optional</span></h3>
            <div className="filter-chips">
              {SMOKES_OPTS.map((s) => (
                <button key={s} type="button"
                  className={`chip ${filters.smokes.includes(s) ? 'active' : ''}`}
                  onClick={() => toggleArr('smokes', s)}>{s}</button>
              ))}
            </div>
          </section>

          {/* Politics */}
          <section className="filter-section">
            <h3 className="filter-section-title">Politics <span className="filter-optional">optional</span></h3>
            <div className="filter-chips">
              {POLITICS_OPTS.map((p) => (
                <button key={p} type="button"
                  className={`chip ${filters.politicalAssociations.includes(p) ? 'active' : ''}`}
                  onClick={() => toggleArr('politicalAssociations', p)}>{p}</button>
              ))}
            </div>
          </section>

          {/* Education */}
          <section className="filter-section">
            <h3 className="filter-section-title">Education <span className="filter-optional">optional</span></h3>
            <div className="filter-chips">
              {EDUCATION_OPTS.map((e) => (
                <button key={e} type="button"
                  className={`chip ${filters.educationLevels.includes(e) ? 'active' : ''}`}
                  onClick={() => toggleArr('educationLevels', e)}>{e}</button>
              ))}
            </div>
          </section>

        </div>

        <div className="filters-footer">
          <button className="filters-apply" onClick={apply} disabled={saving}>
            {saving ? 'Saving…' : 'Apply filters'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default FiltersModal;
