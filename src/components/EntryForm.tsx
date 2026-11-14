'use client';

import { useActionState, useState, useMemo, useEffect, useRef } from 'react';
import type { KeyboardEvent } from 'react';
import { submitEntry } from '../app/actions';
import { BMW_COLORS, getColorHex, isLightColor } from '../lib/colors';
import { cssVars } from '../lib/css-vars';
import styles from './EntryForm.module.css';

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
    <div className="field">
      <label className="field-label" htmlFor="ext_color_input">Individual Color *</label>
      <div className={styles.comboWrap}>
        <div className={styles.comboRow}>
          {selectedHex && (
            <div className={styles.swatch} style={cssVars({ '--p': selectedHex })} />
          )}
          <input
            type="text"
            id="ext_color_input"
            className={`input ${styles.comboInput}`}
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
          />
        </div>

        {/* Hidden input carries the actual value to the server action */}
        <input type="hidden" name="ext_color" value={value} />

        {open && filtered.length > 0 && (
          <div role="listbox" id="ext-color-listbox" className={styles.listbox}>
            {filtered.map((c, i) => {
              const hex = getColorHex(c);
              const light = isLightColor(hex);
              const optionClass = [
                styles.option,
                c === value ? styles.optionSelected : '',
                i === activeIndex ? styles.optionActive : '',
              ].join(' ');
              return (
                <div
                  key={c}
                  id={`ext-color-option-${i}`}
                  role="option"
                  aria-selected={c === value}
                  onMouseDown={() => selectColor(c)}
                  onMouseEnter={() => setActiveIndex(i)}
                  className={optionClass}
                >
                  <div
                    className={`${styles.optionSwatch} ${light ? styles.optionSwatchLight : ''}`}
                    style={cssVars({ '--p': hex })}
                  />
                  <span className={styles.optionName}>{c}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <p className={`field-hint ${styles.hint}`}>
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

  // A server error or duplicate warning means the Turnstile token was consumed
  // server-side, so submits stay disabled until the widget issues a new one.
  // Adjusted during render when a new action result arrives (React's "store
  // the previous value" pattern) rather than via setState inside an effect.
  const [seenState, setSeenState] = useState(state);
  if (state !== seenState) {
    setSeenState(state);
    if (state?.error || state?.duplicate) setNeedsFreshToken(true);
  }

  // Resetting the widget is a side effect on an external system, so it stays in an effect.
  useEffect(() => {
    if ((state?.error || state?.duplicate) && (window as Window & TurnstileWindow).turnstile) {
      (window as Window & TurnstileWindow).turnstile!.reset('.cf-turnstile');
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
    <form action={action} className={styles.form}>
      {state?.error && (
        <div className="alert alert--danger">
          {state.error}
        </div>
      )}

      {state?.duplicate && (
        <div className={styles.dup}>
          <div className={styles.dupHead}>
            <span className={styles.dupIcon}>⚠️</span>
            <span className={styles.dupTitle}>
              POTENTIAL DUPLICATE ENTRY
            </span>
          </div>
          <p className={styles.dupText}>
            {state.duplicateInfo}
          </p>
          <p className={styles.dupSub}>
            If you own a second car with this exact spec, click <strong className={styles.dupStrong}>Submit Anyway</strong>. Otherwise, fix your entry above and use the normal Submit button.
          </p>
          <button
            type="submit"
            name="force_submit"
            value="1"
            disabled={isPending || needsFreshToken}
            className={`btn btn--warn ${styles.dupButton}`}
          >
            Submit Anyway — I own two of this spec
          </button>
        </div>
      )}

      {/* Model Year + Body Style */}
      <div className={styles.grid2}>
        <div className="field">
          <label className="field-label" htmlFor="model_year">Model Year</label>
          <select id="model_year" name="model_year" required className="input">
            {[2021, 2022, 2023, 2024, 2025, 2026, 2027, 2028, 2029, 2030, 2031, 2032, 2033, 2034, 2035].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>

        <fieldset className={`field ${styles.fieldset}`}>
          <legend className={`field-label ${styles.legend}`}>Body Style</legend>
          <div className={styles.row}>
            {['M3', 'M4'].map((bs) => (
              <label key={bs} className={styles.choice}>
                <input type="radio" name="body_style" value={bs} defaultChecked={bs === 'M3'} required />
                {bs}
              </label>
            ))}
          </div>
        </fieldset>
      </div>

      {/* Variant + Transmission */}
      <div className={styles.grid2}>
        <div className="field">
          <label className="field-label" htmlFor="variant">Variant</label>
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
            className="input"
          >
            <option value="Base (RWD)">Base (RWD)</option>
            <option value="Competition">Competition</option>
            <option value="Competition xDrive">Competition xDrive</option>
          </select>
        </div>

        <div className="field">
          <label className="field-label" htmlFor="transmission">Transmission</label>
          <select
            id="transmission"
            name="transmission"
            required
            value={transmission}
            onChange={(e) => setTransmission(e.target.value)}
            className={`input ${variant !== 'Base (RWD)' ? styles.locked : ''}`}
          >
            <option value="8AT">8AT (8-Speed Auto)</option>
            <option value="6MT">6MT (Manual)</option>
          </select>
        </div>
      </div>

      {/* Individual Color — ARIA combobox */}
      <ColorCombobox colors={COLOR_NAMES} />

      {/* Interior */}
      <div className={styles.gridAuto}>
        <div className="field">
          <label className="field-label" htmlFor="interior_color">Interior Color</label>
          <select id="interior_color" name="interior_color" className="input">
            <option value="">-- Select --</option>
            {INTERIOR_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
            <option value="Other">Other</option>
          </select>
        </div>

        <div className="field">
          <label className="field-label" htmlFor="interior_seats">Seats</label>
          <select
            id="interior_seats"
            name="interior_seats"
            value={interiorSeats}
            onChange={(e) => setInteriorSeats(e.target.value)}
            className="input"
          >
            <option value="">-- Select --</option>
            <option value="Carbon Buckets">Carbon Buckets</option>
            <option value="Comfort Seats">Comfort Seats</option>
          </select>
        </div>

        <div className="field">
          <label className="field-label" htmlFor="interior_leather">Leather</label>
          <select
            id="interior_leather"
            name="interior_leather"
            value={interiorLeather}
            onChange={(e) => setInteriorLeather(e.target.value)}
            className="input"
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
      <div className="field">
        <label className="field-label" htmlFor="wheels">Wheels</label>
        <select id="wheels" name="wheels" className="input">
          <option value="">-- Select --</option>
          {WHEEL_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
          <option value="Other">Other</option>
        </select>
      </div>

      {/* Location — Country first, then State, then City */}
      <fieldset className={`field ${styles.fieldset}`}>
        <legend className={`field-label ${styles.legend}`}>Location</legend>
        <div className={styles.gridAutoTight}>
          {/* Country */}
          <div className="field">
            <label className={`field-label ${styles.subLabel}`} htmlFor="location_country">Country *</label>
            <select
              id="location_country"
              name="location_country"
              required
              value={countryCode}
              onChange={(e) => { setCountryCode(e.target.value); setLocationState(''); }}
              className="input"
            >
              {countries.map((c) => (
                <option key={c.isoCode} value={c.isoCode}>{c.name}</option>
              ))}
            </select>
            {/* Send the full country name, not the ISO code */}
            <input type="hidden" name="location_country_name" value={selectedCountry?.name ?? ''} />
          </div>

          {/* State / Province — only shown when country has states */}
          <div className="field">
            <label className={`field-label ${styles.subLabel}`} htmlFor="location_state">
              {countryCode === 'US' ? 'State' : countryCode === 'CA' ? 'Province' : 'Region'}
            </label>
            {showStatesDropdown ? (
              <select
                id="location_state"
                name="location_state"
                value={locationState}
                onChange={(e) => setLocationState(e.target.value)}
                className="input"
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
                className="input"
              />
            )}
          </div>

          {/* City — always free text */}
          <div className="field">
            <label className={`field-label ${styles.subLabel}`} htmlFor="location_city">City</label>
            <input
              type="text"
              id="location_city"
              name="location_city"
              placeholder="e.g. Austin"
              className="input"
            />
          </div>
        </div>
      </fieldset>

      {/* Forum Source + Username */}
      <div className="field">
        <fieldset className={styles.fieldset}>
          <legend className={`field-label ${styles.legend}`}>Forum</legend>
          <div className={`${styles.rowWrap} ${styles.rowWrapSpaced}`}>
            {FORUMS.map((f) => (
              <label key={f.value} className={`${styles.pill} ${forum === f.value ? styles.pillActive : ''}`}>
                <input
                  type="radio"
                  name="source_forum"
                  value={f.value}
                  checked={forum === f.value}
                  onChange={() => setForum(f.value)}
                  className={styles.radioHidden}
                />
                {f.label}
              </label>
            ))}
          </div>
        </fieldset>
        <label className="field-label" htmlFor="forum_username">Forum Username *</label>
        <input
          type="text"
          id="forum_username"
          name="forum_username"
          className="input"
          placeholder={`Your ${forum} username`}
          required
          value={forumUsername}
          onChange={(e) => setForumUsername(e.target.value)}
        />
      </div>

      {/* Notes */}
      <div className="field">
        <label className="field-label" htmlFor="notes">Notes</label>
        <textarea
          id="notes"
          name="notes"
          rows={3}
          placeholder="Any additional details about your build..."
          className={`input ${styles.textarea}`}
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
        className={`btn btn--primary ${styles.submit}`}
      >
        {isPending ? 'Submitting...' : 'Submit Build'}
      </button>
    </form>
  );
}
