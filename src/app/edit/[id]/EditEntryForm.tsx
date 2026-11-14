'use client';

import { useActionState, useState, useMemo, useEffect } from 'react';
import { updateEntry, deleteOwnEntry } from '../../actions';
import { BMW_COLORS, getColorHex, isLightColor } from '../../../lib/colors';
import type { BmwEntry } from '../../../types';
import { cssVars } from '../../../lib/css-vars';
import styles from '../../../components/EntryForm.module.css';

type CountryOption = { isoCode: string; name: string };
type StateOption = { isoCode: string; name: string };

// Small static list so the initial render doesn't pull in the full
// country-state-city dataset. The full list (needed for editing entries
// outside these common countries) loads lazily via dynamic import below.
const COMMON_COUNTRIES: CountryOption[] = [
  { isoCode: 'US', name: 'United States' },
  { isoCode: 'CA', name: 'Canada' },
  { isoCode: 'GB', name: 'United Kingdom' },
  { isoCode: 'AU', name: 'Australia' },
  { isoCode: 'DE', name: 'Germany' },
  { isoCode: 'FR', name: 'France' },
  { isoCode: 'JP', name: 'Japan' },
  { isoCode: 'CN', name: 'China' },
  { isoCode: 'BR', name: 'Brazil' },
  { isoCode: 'MX', name: 'Mexico' },
  { isoCode: 'IN', name: 'India' },
  { isoCode: 'IT', name: 'Italy' },
  { isoCode: 'ES', name: 'Spain' },
  { isoCode: 'NL', name: 'Netherlands' },
  { isoCode: 'CH', name: 'Switzerland' },
];

const INTERIOR_OPTIONS = [
  'Black',
  'Fjord Blue',
  'Fiona Red',
  'Ivory White',
  'Kyalami Orange',
  'Sakhir Orange',
  'Silverstone',
  'Silverstone Grey',
  'Tartufo Brown',
];

const WHEEL_OPTIONS = [
  '824M',
  '825M',
  '825M Orbit Grey',
  '825M Silver',
  '826M',
  '826M Bi-Color',
  '827M',
  '963M',
  '1000M',
  '1000M Gold/Bronze',
];

const FORUMS = [
  { value: 'BimmerPost', label: 'BimmerPost' },
  { value: 'M3Post',     label: 'M3Post' },
  { value: 'F80Post',    label: 'F80Post' },
  { value: 'Other',      label: 'Other' },
];

const COLOR_NAMES = Object.keys(BMW_COLORS).sort();

const COUNTRIES_WITH_STATES = new Set([
  'US', 'CA', 'AU', 'DE', 'GB', 'FR', 'JP', 'CN', 'BR', 'MX', 'IN', 'IT', 'ES', 'NL', 'CH', 'AT', 'BE', 'PL', 'CZ', 'SE', 'NO', 'DK', 'NZ',
]);


interface Props {
  entry: BmwEntry;
  editToken: string | undefined;
  editExpiry: string | undefined;
}

function entryToVariant(entry: BmwEntry): string {
  if (!entry.competition) return 'Base (RWD)';
  if (entry.drivetrain === 'AWD' || entry.drivetrain.includes('xDrive')) return 'Competition xDrive';
  return 'Competition';
}

export default function EditEntryForm({ entry, editToken, editExpiry }: Props) {
  const [state, action, isPending] = useActionState(updateEntry, {});
  const [deleteState, deleteAction, isDeletePending] = useActionState(deleteOwnEntry, {});

  // Variant + transmission
  const [variant, setVariant] = useState(() => entryToVariant(entry));
  const [transmission, setTransmission] = useState(entry.transmission || '8AT');

  // Color combobox — prefilled
  const [colorSearch, setColorSearch] = useState(entry.ext_color);
  const [colorValue, setColorValue] = useState(entry.ext_color);
  const [showColorDrop, setShowColorDrop] = useState(false);

  // Full country-state-city dataset — loaded lazily on mount to keep it out
  // of the initial bundle; falls back to the small COMMON_COUNTRIES list
  // until it resolves.
  const [csc, setCsc] = useState<typeof import('country-state-city') | null>(null);
  useEffect(() => {
    let cancelled = false;
    import('country-state-city').then((mod) => {
      if (!cancelled) setCsc(mod);
    });
    return () => { cancelled = true; };
  }, []);

  const fullCountries = useMemo<CountryOption[] | null>(
    () => (csc ? csc.Country.getAllCountries() : null),
    [csc]
  );
  const allCountries: CountryOption[] = fullCountries ?? COMMON_COUNTRIES;

  // Location cascade — reverse-lookup ISO code from stored country name (case-insensitive fallback).
  // Resolution only runs once the full country list has loaded; entries whose
  // country isn't in COMMON_COUNTRIES stay on the 'US' default until then.
  const foundCountry = useMemo(() => {
    if (!fullCountries) return undefined;
    return (
      fullCountries.find((c) => c.name === entry.location_country) ??
      fullCountries.find((c) => c.name.toLowerCase() === (entry.location_country ?? '').toLowerCase())
    );
  }, [fullCountries, entry.location_country]);

  const countryNameMismatch = !!fullCountries && !foundCountry && !!entry.location_country;
  // Derived, not synced in an effect: the user's pick wins, then the entry's
  // resolved country once the full list loads, then the 'US' default.
  const [chosenCountryCode, setCountryCode] = useState<string | null>(null);
  const countryCode = chosenCountryCode ?? foundCountry?.isoCode ?? 'US';
  const [stateValue, setStateValue] = useState(entry.location_state ?? '');

  // Forum
  const [forum, setForum] = useState(entry.source_forum ?? 'BimmerPost');

  // Delete confirmation
  const [confirmDelete, setConfirmDelete] = useState(false);

  const filteredColors = useMemo(
    () => COLOR_NAMES.filter((c) => c.toLowerCase().includes(colorSearch.toLowerCase())),
    [colorSearch]
  );

  const states: StateOption[] = useMemo(
    () => (csc && COUNTRIES_WITH_STATES.has(countryCode) ? csc.State.getStatesOfCountry(countryCode) : []),
    [csc, countryCode]
  );

  const selectedCountry = allCountries.find((c) => c.isoCode === countryCode);
  const selectedColorHex = colorValue ? getColorHex(colorValue) : null;

  function handleColorSelect(name: string) {
    setColorValue(name);
    setColorSearch(name);
    setShowColorDrop(false);
  }

  return (
    <>
    <form action={action} className={styles.form}>
      <input type="hidden" name="id" value={entry.id} />
      <input type="hidden" name="edit_token" value={editToken ?? ''} />
      <input type="hidden" name="exp" value={editExpiry ?? ''} />

      {entry.edit_count > 0 && (
        <p className={`field-hint ${styles.hint}`}>
          Edited {entry.edit_count} {entry.edit_count === 1 ? 'time' : 'times'}
          {entry.last_edited_at && (
            <> &middot; last updated {new Date(entry.last_edited_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</>
          )}
        </p>
      )}

      {countryNameMismatch && (
        <div className="alert alert--warn">
          Original country &ldquo;{entry.location_country}&rdquo; was not recognized. Please select the correct country below before saving.
        </div>
      )}

      {state?.error && (
        <div className="alert alert--danger">
          {state.error}
        </div>
      )}

      {/* Model Year + Body Style */}
      <div className={styles.grid2}>
        <div className="field">
          <label className="field-label" htmlFor="model_year">Model Year</label>
          <select id="model_year" name="model_year" required className="input" defaultValue={entry.model_year}>
            {[2021, 2022, 2023, 2024, 2025, 2026, 2027, 2028, 2029, 2030, 2031, 2032, 2033, 2034, 2035].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>

        <div className="field">
          <label className="field-label">Body Style</label>
          <div className={styles.row}>
            {['M3', 'M4'].map((bs) => (
              <label key={bs} className={styles.choice}>
                <input
                  type="radio"
                  name="body_style"
                  value={bs}
                  defaultChecked={entry.body_style === bs}
                  required
                />
                {bs}
              </label>
            ))}
          </div>
        </div>
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

      {/* Individual Color — combobox */}
      <div className="field">
        <label className="field-label" htmlFor="ext_color_search">Individual Color *</label>
        <div className={styles.comboWrap}>
          <div className={styles.comboRow}>
            {selectedColorHex && (
              <div className={styles.swatch} style={cssVars({ '--p': selectedColorHex })} />
            )}
            <input
              type="text"
              id="ext_color_search"
              className={`input ${styles.comboInput}`}
              placeholder="Type to search or enter a color name..."
              value={colorSearch}
              autoComplete="off"
              onChange={(e) => {
                setColorSearch(e.target.value);
                setColorValue(e.target.value);
                setShowColorDrop(true);
              }}
              onFocus={() => setShowColorDrop(true)}
              onBlur={() => setTimeout(() => setShowColorDrop(false), 150)}
            />
          </div>

          <input type="hidden" name="ext_color" value={colorValue} />

          {showColorDrop && filteredColors.length > 0 && (
            <div className={styles.listbox}>
              {filteredColors.map((c) => {
                const hex = getColorHex(c);
                const light = isLightColor(hex);
                return (
                  <div
                    key={c}
                    onMouseDown={() => handleColorSelect(c)}
                    className={`${styles.option} ${c === colorValue ? styles.optionSelected : ''}`}
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

      {/* Interior */}
      <div className={styles.gridAuto}>
        <div className="field">
          <label className="field-label" htmlFor="interior_color">Interior Color</label>
          <select id="interior_color" name="interior_color" className="input" defaultValue={entry.interior_color ?? ''}>
            <option value="">-- Select --</option>
            {INTERIOR_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
            <option value="Other">Other</option>
          </select>
        </div>

        <div className="field">
          <label className="field-label" htmlFor="interior_seats">Seats</label>
          <select id="interior_seats" name="interior_seats" className="input" defaultValue={entry.interior_seats ?? ''}>
            <option value="">-- Select --</option>
            <option value="Carbon Buckets">Carbon Buckets</option>
            <option value="Comfort Seats">Comfort Seats</option>
          </select>
        </div>

        <div className="field">
          <label className="field-label" htmlFor="interior_leather">Leather</label>
          <select id="interior_leather" name="interior_leather" className="input" defaultValue={entry.interior_leather ?? ''}>
            <option value="">-- Select --</option>
            <option value="Full">Full Leather</option>
            <option value="Extended">Extended Leather</option>
          </select>
        </div>
      </div>

      {/* Wheels */}
      <div className="field">
        <label className="field-label" htmlFor="wheels">Wheels</label>
        <select id="wheels" name="wheels" className="input" defaultValue={entry.wheels ?? ''}>
          <option value="">-- Select --</option>
          {WHEEL_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
          <option value="Other">Other</option>
        </select>
      </div>

      {/* Location */}
      <div className="field">
        <label className="field-label">Location</label>
        <div className={styles.gridAutoTight}>
          <div className="field">
            <label className={`field-label ${styles.subLabel}`} htmlFor="location_country">Country *</label>
            <select
              id="location_country"
              name="location_country"
              required
              value={countryCode}
              onChange={(e) => { setCountryCode(e.target.value); setStateValue(''); }}
              className="input"
            >
              {allCountries.map((c) => (
                <option key={c.isoCode} value={c.isoCode}>{c.name}</option>
              ))}
            </select>
            <input type="hidden" name="location_country_name" value={selectedCountry?.name ?? ''} />
          </div>

          <div className="field">
            <label className={`field-label ${styles.subLabel}`} htmlFor="location_state">
              {countryCode === 'US' ? 'State' : countryCode === 'CA' ? 'Province' : 'Region'}
            </label>
            {states.length > 0 ? (
              <select
                id="location_state"
                name="location_state"
                value={stateValue}
                onChange={(e) => setStateValue(e.target.value)}
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
                value={stateValue}
                onChange={(e) => setStateValue(e.target.value)}
                className="input"
              />
            )}
          </div>

          <div className="field">
            <label className={`field-label ${styles.subLabel}`} htmlFor="location_city">City</label>
            <input
              type="text"
              id="location_city"
              name="location_city"
              placeholder="e.g. Austin"
              defaultValue={entry.location_city ?? ''}
              className="input"
            />
          </div>
        </div>
      </div>

      {/* Forum Source */}
      <div className="field">
        <label className="field-label">Forum</label>
        <div className={styles.rowWrap}>
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
      </div>

      {/* Notes */}
      <div className="field">
        <label className="field-label" htmlFor="notes">Notes</label>
        <textarea
          id="notes"
          name="notes"
          rows={3}
          placeholder="Any additional details about your build..."
          defaultValue={entry.notes ?? ''}
          className={`input ${styles.textarea}`}
        />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className={`btn btn--primary ${styles.submit}`}
      >
        {isPending ? 'Saving...' : 'Save Changes'}
      </button>

    </form>

      {/* Delete entry — separate form, must not be nested inside the update form */}
      <div className={styles.deleteZone}>
        {!confirmDelete ? (
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="btn btn--danger"
          >
            Delete this entry
          </button>
        ) : (
          <div className={styles.deleteConfirm}>
            <p className={styles.dangerText}>
              This will permanently remove your entry from the registry. Are you sure?
            </p>
            {deleteState?.error && (
              <p className={styles.dangerTextSm}>{deleteState.error}</p>
            )}
            <div className={styles.deleteRow}>
              <form action={deleteAction}>
                <input type="hidden" name="id" value={entry.id} />
                <input type="hidden" name="edit_token" value={editToken ?? ''} />
                <input type="hidden" name="exp" value={editExpiry ?? ''} />
                <button
                  type="submit"
                  disabled={isDeletePending}
                  className={`btn ${styles.deleteSolid}`}
                >
                  {isDeletePending ? 'Deleting...' : 'Yes, delete it'}
                </button>
              </form>
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="btn"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
