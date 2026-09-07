'use client';

import { useActionState, useState, useMemo, useEffect, useRef } from 'react';
import type { KeyboardEvent } from 'react';
import { submitEntry } from '../app/actions';
import { BMW_COLORS, getColorHex, isLightColor } from '../lib/colors';

// Cloudflare Turnstile attaches a global widget API and invokes our named
// callbacks via the data-callback/data-*-callback attributes. This is a
// local, self-contained type — deliberately not shared with FlagButton's
// global Window augmentation, so this component doesn't depend on it.
interface TurnstileWindow {
  __entryFormTsSuccess?: (token: string) => void;
  __entryFormTsExpired?: () => void;
  __entryFormTsError?: () => void;
  turnstile?: { reset: (selector: string) => void };
}

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '0x4AAAAAAC6yXfM_xBBaAkKj';

const INTERIOR_OPTIONS = [
  'Black', 'Fjord Blue', 'Fiona Red', 'Ivory White', 'Kyalami Orange',
  'Sakhir Orange', 'Silverstone', 'Silverstone Grey', 'Tartufo Brown',
];

const WHEEL_OPTIONS = [
  '824M', '825M', '825M Orbit Grey', '825M Silver', '826M',
  '826M Bi-Color', '827M', '963M', '1000M', '1000M Gold/Bronze',
];

const FORUMS = [
  { value: 'BimmerPost', label: 'BimmerPost' },
  { value: 'M3Post', label: 'M3Post' },
  { value: 'F80Post', label: 'F80Post' },
  { value: 'Other', label: 'Other' },
];

const COLOR_NAMES = Object.keys(BMW_COLORS).sort();

// Countries that have state/province data worth showing
const COUNTRIES_WITH_STATES = new Set([
  'US', 'CA', 'AU', 'DE', 'GB', 'FR', 'JP', 'CN', 'BR', 'MX', 'IN', 'IT', 'ES', 'NL', 'CH', 'AT', 'BE', 'PL', 'CZ', 'SE', 'NO', 'DK', 'NZ',
]);

type CountryOption = { isoCode: string; name: string };
type StateOption = { isoCode: string; name: string };

// Small static list for first paint; the full country-state-city dataset is
// dynamically imported in a useEffect so it never lands in the initial bundle.
const INITIAL_COUNTRIES: CountryOption[] = [
  { isoCode: 'US', name: 'United States' }, { isoCode: 'CA', name: 'Canada' },
  { isoCode: 'GB', name: 'United Kingdom' }, { isoCode: 'DE', name: 'Germany' },
  { isoCode: 'AU', name: 'Australia' }, { isoCode: 'JP', name: 'Japan' },
  { isoCode: 'FR', name: 'France' }, { isoCode: 'IT', name: 'Italy' },
  { isoCode: 'ES', name: 'Spain' }, { isoCode: 'NL', name: 'Netherlands' },
  { isoCode: 'CH', name: 'Switzerland' }, { isoCode: 'AT', name: 'Austria' },
  { isoCode: 'BE', name: 'Belgium' }, { isoCode: 'SE', name: 'Sweden' },
  { isoCode: 'PL', name: 'Poland' },
];

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 12px', background: '#1e2a3a', border: '1px solid #2d3f55',
  borderRadius: 6, color: '#e2e8f0', fontSize: 14, outline: 'none', boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 13, fontWeight: 600, color: '#94a3b8', marginBottom: 4,
};

const legendStyle: React.CSSProperties = { ...labelStyle, padding: 0, border: 0 };
const fieldsetResetStyle: React.CSSProperties = { border: 'none', margin: 0, padding: 0 };
const fieldStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 4 };

/** ARIA combobox: free-text input with a filtered dropdown of known colors. */
function ColorCombobox({ colors }: { colors: string[] }) {
  const [search, setSearch] = useState('');
  const [value, setValue] = useState('');
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const filtered = useMemo(
    () => colors.filter((c) => c.toLowerCase().includes(search.toLowerCase())),
    [colors, search]
  );

  function selectColor(name: string) {
    setValue(name);
    setSearch(name);
    setOpen(false);
    setActiveIndex(-1);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!open) {
        setOpen(true);
        setActiveIndex(filtered.length > 0 ? 0 : -1);
        return;
      }
      setActiveIndex((i) => (filtered.length === 0 ? -1 : (i + 1) % filtered.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!open) {
        setOpen(true);
        setActiveIndex(filtered.length > 0 ? filtered.length - 1 : -1);
        return;
      }
      setActiveIndex((i) => (filtered.length === 0 ? -1 : i <= 0 ? filtered.length - 1 : i - 1));
    } else if (e.key === 'Enter') {
      if (open && activeIndex >= 0 && filtered[activeIndex]) {
        e.preventDefault();
        selectColor(filtered[activeIndex]);
      }
    } else if (e.key === 'Escape' && open) {
      e.preventDefault();
      setOpen(false);
      setActiveIndex(-1);
    }
  }

  const selectedHex = value ? getColorHex(value) : null;
  const activeOptionId =
    activeIndex >= 0 && filtered[activeIndex] ? `ext-color-option-${activeIndex}` : undefined;

  return (
    <div style={fieldStyle}>
      <label style={labelStyle} htmlFor="ext_color_input">Individual Color *</label>
      <div style={{ position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {selectedHex && (
            <div style={{ width: 28, height: 28, borderRadius: 4, flexShrink: 0, background: selectedHex, border: '1px solid rgba(255,255,255,0.15)', boxShadow: '0 1px 4px rgba(0,0,0,0.4)' }} />
          )}
          <input
            type="text"
            id="ext_color_input"
            placeholder="Type to search or enter a color name..."
            value={search}
            autoComplete="off"
            role="combobox"
            aria-expanded={open}
            aria-controls="ext-color-listbox"
            aria-autocomplete="list"
            aria-haspopup="listbox"
            aria-activedescendant={activeOptionId}
            onChange={(e) => {
              const v = e.target.value;
              setSearch(v);
              setValue(v);
              setOpen(true);
              setActiveIndex(-1);
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            onKeyDown={handleKeyDown}
            style={{ ...inputStyle, flex: 1 }}
          />
        </div>

        {/* Hidden input carries the actual value to the server action */}
        <input type="hidden" name="ext_color" value={value} />

        {open && filtered.length > 0 && (
          <div
            role="listbox"
            id="ext-color-listbox"
            style={{
              position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50, background: '#1e2a3a',
              border: '1px solid #2d3f55', borderRadius: 6, maxHeight: 220, overflowY: 'auto',
              marginTop: 2, boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
            }}
          >
            {filtered.map((c, i) => {
              const hex = getColorHex(c);
              const light = isLightColor(hex);
              const active = i === activeIndex;
              return (
                <div
                  key={c}
                  id={`ext-color-option-${i}`}
                  role="option"
                  aria-selected={c === value}
                  onMouseDown={() => selectColor(c)}
                  onMouseEnter={() => setActiveIndex(i)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', cursor: 'pointer',
                    borderBottom: '1px solid rgba(255,255,255,0.05)', color: c === value ? '#1C69D4' : '#e2e8f0',
                    background: active ? 'rgba(255,255,255,0.06)' : c === value ? 'rgba(28,105,212,0.1)' : 'transparent',
                  }}
                >
                  <div style={{ width: 20, height: 20, borderRadius: 3, flexShrink: 0, background: hex, border: `1px solid ${light ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.15)'}` }} />
                  <span style={{ fontSize: 14 }}>{c}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <p style={{ fontSize: 12, color: '#64748b', margin: 0 }}>
        Select from the list or type a custom color name if yours isn&apos;t listed.
      </p>
    </div>
  );
}

export default function EntryForm() {
  const [state, action, isPending] = useActionState(submitEntry, {});

  // Location cascade state
  const [countryCode, setCountryCode] = useState('US');
  const [locationState, setLocationState] = useState('');
  const [countries, setCountries] = useState<CountryOption[]>(INITIAL_COUNTRIES);
  const [states, setStates] = useState<StateOption[]>([]);
  const [csModuleReady, setCsModuleReady] = useState(false);
  const csModuleRef = useRef<typeof import('country-state-city') | null>(null);

  // Variant + transmission
  const [variant, setVariant] = useState('Competition');
  const [transmission, setTransmission] = useState('8AT');

  // Interior — tracked to derive the interior_type hidden field
  const [interiorSeats, setInteriorSeats] = useState('');
  const [interiorLeather, setInteriorLeather] = useState('');

  // Forum
  const [forum, setForum] = useState('BimmerPost');
  const [forumUsername, setForumUsername] = useState('');

  // Turnstile: the server consumes the token on every submitEntry call, even
  // when it just returns an error or a duplicate warning. Once that happens
  // the rendered widget's token is stale, so both submit buttons are disabled
  // until a fresh token comes back via the widget's data-callback.
  const [needsFreshToken, setNeedsFreshToken] = useState(false);

  // Load the full country-state-city dataset off the critical path.
  useEffect(() => {
    let cancelled = false;
    import('country-state-city').then((mod) => {
      if (cancelled) return;
      csModuleRef.current = mod;
      setCountries(mod.Country.getAllCountries().map((c) => ({ isoCode: c.isoCode, name: c.name })));
      setCsModuleReady(true);
    });
    return () => { cancelled = true; };
  }, []);

  // Load states for the selected country once the dataset is available, and
  // again whenever the selected country changes.
  useEffect(() => {
    if (!csModuleRef.current) return;
    setStates(
      csModuleRef.current.State.getStatesOfCountry(countryCode).map((s) => ({ isoCode: s.isoCode, name: s.name }))
    );
  }, [countryCode, csModuleReady]);

  // Register the Turnstile callbacks once on mount.
  useEffect(() => {
    (window as Window & TurnstileWindow).__entryFormTsSuccess = () => setNeedsFreshToken(false);
    (window as Window & TurnstileWindow).__entryFormTsExpired = () => setNeedsFreshToken(true);
    (window as Window & TurnstileWindow).__entryFormTsError = () => setNeedsFreshToken(true);
  }, []);

  // Reset the widget whenever the server comes back with an error or a
  // duplicate warning — the token it already had was consumed server-side.
  // setNeedsFreshToken(true) here is intentional — we're responding to an
  // external state change (server response) and there's no dependency cycle risk.
  useEffect(() => {
    if ((state?.error || state?.duplicate) && (window as Window & TurnstileWindow).turnstile) {
      (window as Window & TurnstileWindow).turnstile!.reset('.cf-turnstile');
      setNeedsFreshToken(true);
    }
  }, [state?.error, state?.duplicate]);

  const showStatesDropdown = COUNTRIES_WITH_STATES.has(countryCode) && states.length > 0;
  const selectedCountry = countries.find((c) => c.isoCode === countryCode);

  const interiorType = interiorSeats === 'Carbon Buckets'
    ? 'Carbon Buckets'
    : interiorLeather
      ? 'Full Leather'
      : '';

  const submitDisabled = isPending || !forumUsername.trim() || needsFreshToken;

  return (
    <form action={action} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {state?.error && (
        <div style={{
          padding: '12px 16px', background: 'rgba(220,38,38,0.15)', border: '1px solid rgba(220,38,38,0.4)',
          borderRadius: 8, color: '#fca5a5', fontSize: 14,
        }}>
          {state.error}
        </div>
      )}

      {state?.duplicate && (
        <div style={{
          padding: '20px', background: 'rgba(234,179,8,0.12)', border: '2px solid #eab308',
          borderRadius: 10, display: 'flex', flexDirection: 'column', gap: 12,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 24 }}>⚠️</span>
            <span style={{ color: '#fde047', fontSize: 17, fontWeight: 800, letterSpacing: '-0.01em' }}>
              POTENTIAL DUPLICATE ENTRY
            </span>
          </div>
          <p style={{ margin: 0, color: '#fef08a', fontSize: 14, lineHeight: 1.5 }}>
            {state.duplicateInfo}
          </p>
          <p style={{ margin: 0, color: '#ca8a04', fontSize: 13 }}>
            If you own a second car with this exact spec, click <strong style={{ color: '#fde047' }}>Submit Anyway</strong>. Otherwise, fix your entry above and use the normal Submit button.
          </p>
          <button
            type="submit"
            name="force_submit"
            value="1"
            disabled={isPending || needsFreshToken}
            style={{
              padding: '10px 20px', background: isPending || needsFreshToken ? '#4b3a12' : '#854d0e',
              border: '2px solid #eab308', borderRadius: 7, color: '#fde047', fontSize: 14, fontWeight: 800,
              cursor: isPending || needsFreshToken ? 'not-allowed' : 'pointer',
              opacity: isPending || needsFreshToken ? 0.6 : 1, alignSelf: 'flex-start',
            }}
          >
            Submit Anyway — I own two of this spec
          </button>
        </div>
      )}

      {/* Model Year + Body Style */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div style={fieldStyle}>
          <label style={labelStyle} htmlFor="model_year">Model Year</label>
          <select id="model_year" name="model_year" required style={inputStyle}>
            {[2021, 2022, 2023, 2024, 2025, 2026, 2027, 2028, 2029, 2030, 2031, 2032, 2033, 2034, 2035].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>

        <fieldset style={{ ...fieldStyle, ...fieldsetResetStyle }}>
          <legend style={legendStyle}>Body Style</legend>
          <div style={{ display: 'flex', gap: 8 }}>
            {['M3', 'M4'].map((bs) => (
              <label key={bs} style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px 12px',
                background: '#1e2a3a', border: '1px solid #2d3f55', borderRadius: 6, cursor: 'pointer', fontSize: 14, color: '#e2e8f0', fontWeight: 600,
              }}>
                <input type="radio" name="body_style" value={bs} defaultChecked={bs === 'M3'} required style={{ marginRight: 6 }} />
                {bs}
              </label>
            ))}
          </div>
        </fieldset>
      </div>

      {/* Variant + Transmission */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div style={fieldStyle}>
          <label style={labelStyle} htmlFor="variant">Variant</label>
          <select
            id="variant"
            name="variant"
            required
            value={variant}
            onChange={(e) => {
              const v = e.target.value;
              setVariant(v);
              if (v !== 'Base (RWD)') setTransmission('8AT');
            }}
            style={inputStyle}
          >
            <option value="Base (RWD)">Base (RWD)</option>
            <option value="Competition">Competition</option>
            <option value="Competition xDrive">Competition xDrive</option>
          </select>
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle} htmlFor="transmission">Transmission</label>
          <select
            id="transmission"
            name="transmission"
            required
            value={transmission}
            onChange={(e) => setTransmission(e.target.value)}
            style={{
              ...inputStyle,
              opacity: variant !== 'Base (RWD)' ? 0.5 : 1,
              pointerEvents: variant !== 'Base (RWD)' ? 'none' : 'auto',
            }}
          >
            <option value="8AT">8AT (8-Speed Auto)</option>
            <option value="6MT">6MT (Manual)</option>
          </select>
        </div>
      </div>

      {/* Individual Color — ARIA combobox */}
      <ColorCombobox colors={COLOR_NAMES} />

      {/* Interior */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16 }}>
        <div style={fieldStyle}>
          <label style={labelStyle} htmlFor="interior_color">Interior Color</label>
          <select id="interior_color" name="interior_color" style={inputStyle}>
            <option value="">-- Select --</option>
            {INTERIOR_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
            <option value="Other">Other</option>
          </select>
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle} htmlFor="interior_seats">Seats</label>
          <select
            id="interior_seats"
            name="interior_seats"
            value={interiorSeats}
            onChange={(e) => setInteriorSeats(e.target.value)}
            style={inputStyle}
          >
            <option value="">-- Select --</option>
            <option value="Carbon Buckets">Carbon Buckets</option>
            <option value="Comfort Seats">Comfort Seats</option>
          </select>
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle} htmlFor="interior_leather">Leather</label>
          <select
            id="interior_leather"
            name="interior_leather"
            value={interiorLeather}
            onChange={(e) => setInteriorLeather(e.target.value)}
            style={inputStyle}
          >
            <option value="">-- Select --</option>
            <option value="Full">Full Leather</option>
            <option value="Extended">Extended Leather</option>
          </select>
        </div>
      </div>

      {/* Derived from seats/leather — not directly user-editable */}
      <input type="hidden" name="interior_type" value={interiorType} />

      {/* Wheels */}
      <div style={fieldStyle}>
        <label style={labelStyle} htmlFor="wheels">Wheels</label>
        <select id="wheels" name="wheels" style={inputStyle}>
          <option value="">-- Select --</option>
          {WHEEL_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
          <option value="Other">Other</option>
        </select>
      </div>

      {/* Location — Country first, then State, then City */}
      <fieldset style={{ ...fieldStyle, ...fieldsetResetStyle }}>
        <legend style={legendStyle}>Location</legend>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
          {/* Country */}
          <div style={fieldStyle}>
            <label style={{ ...labelStyle, fontSize: 12 }} htmlFor="location_country">Country *</label>
            <select
              id="location_country"
              name="location_country"
              required
              value={countryCode}
              onChange={(e) => { setCountryCode(e.target.value); setLocationState(''); }}
              style={inputStyle}
            >
              {countries.map((c) => (
                <option key={c.isoCode} value={c.isoCode}>{c.name}</option>
              ))}
            </select>
            {/* Send the full country name, not the ISO code */}
            <input type="hidden" name="location_country_name" value={selectedCountry?.name ?? ''} />
          </div>

          {/* State / Province — only shown when country has states */}
          <div style={fieldStyle}>
            <label style={{ ...labelStyle, fontSize: 12 }} htmlFor="location_state">
              {countryCode === 'US' ? 'State' : countryCode === 'CA' ? 'Province' : 'Region'}
            </label>
            {showStatesDropdown ? (
              <select
                id="location_state"
                name="location_state"
                value={locationState}
                onChange={(e) => setLocationState(e.target.value)}
                style={inputStyle}
              >
                <option value="">-- Select --</option>
                {states.map((s) => (
                  <option key={s.isoCode} value={s.name}>{s.name}</option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                id="location_state"
                name="location_state"
                placeholder="Region / Province"
                value={locationState}
                onChange={(e) => setLocationState(e.target.value)}
                style={inputStyle}
              />
            )}
          </div>

          {/* City — always free text */}
          <div style={fieldStyle}>
            <label style={{ ...labelStyle, fontSize: 12 }} htmlFor="location_city">City</label>
            <input
              type="text"
              id="location_city"
              name="location_city"
              placeholder="e.g. Austin"
              style={inputStyle}
            />
          </div>
        </div>
      </fieldset>

      {/* Forum Source + Username */}
      <div style={fieldStyle}>
        <fieldset style={fieldsetResetStyle}>
          <legend style={legendStyle}>Forum</legend>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
            {FORUMS.map((f) => (
              <label key={f.value} style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px',
                background: forum === f.value ? 'rgba(28,105,212,0.2)' : '#1e2a3a',
                border: `1px solid ${forum === f.value ? '#1C69D4' : '#2d3f55'}`,
                borderRadius: 20, cursor: 'pointer', fontSize: 13, color: '#e2e8f0', transition: 'all 0.15s',
              }}>
                <input
                  type="radio"
                  name="source_forum"
                  value={f.value}
                  checked={forum === f.value}
                  onChange={() => setForum(f.value)}
                  style={{ display: 'none' }}
                />
                {f.label}
              </label>
            ))}
          </div>
        </fieldset>
        <label style={labelStyle} htmlFor="forum_username">Forum Username *</label>
        <input
          type="text"
          id="forum_username"
          name="forum_username"
          placeholder={`Your ${forum} username`}
          required
          value={forumUsername}
          onChange={(e) => setForumUsername(e.target.value)}
          style={inputStyle}
        />
      </div>

      {/* Notes */}
      <div style={fieldStyle}>
        <label style={labelStyle} htmlFor="notes">Notes</label>
        <textarea
          id="notes"
          name="notes"
          rows={3}
          placeholder="Any additional details about your build..."
          style={{ ...inputStyle, resize: 'vertical' }}
        />
      </div>

      {/* Turnstile bot protection — script tag is loaded once in the root layout */}
      <div
        className="cf-turnstile"
        data-sitekey={TURNSTILE_SITE_KEY}
        data-theme="dark"
        data-callback="__entryFormTsSuccess"
        data-expired-callback="__entryFormTsExpired"
        data-error-callback="__entryFormTsError"
      />

      <button
        type="submit"
        disabled={submitDisabled}
        style={{
          padding: '12px 24px', background: submitDisabled ? '#374151' : '#1C69D4',
          color: '#ffffff', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 700,
          cursor: submitDisabled ? 'not-allowed' : 'pointer',
          alignSelf: 'flex-start', transition: 'background 0.2s',
        }}
      >
        {isPending ? 'Submitting...' : 'Submit Build'}
      </button>
    </form>
  );
}
