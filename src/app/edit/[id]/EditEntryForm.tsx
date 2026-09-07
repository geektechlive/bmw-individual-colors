'use client';

import { useActionState, useState, useMemo, useEffect } from 'react';
import { updateEntry, deleteOwnEntry } from '../../actions';
import { BMW_COLORS, getColorHex, isLightColor } from '../../../lib/colors';
import type { BmwEntry } from '../../../types';

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

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  background: '#1e2a3a',
  border: '1px solid #2d3f55',
  borderRadius: 6,
  color: '#e2e8f0',
  fontSize: 14,
  outline: 'none',
  boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 13,
  fontWeight: 600,
  color: '#94a3b8',
  marginBottom: 4,
};

const fieldStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
};

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
  const [countryCode, setCountryCode] = useState('US');
  const [stateValue, setStateValue] = useState(entry.location_state ?? '');

  useEffect(() => {
    if (foundCountry) setCountryCode(foundCountry.isoCode);
  }, [foundCountry]);

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
    <form action={action} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <input type="hidden" name="id" value={entry.id} />
      <input type="hidden" name="edit_token" value={editToken ?? ''} />
      <input type="hidden" name="exp" value={editExpiry ?? ''} />

      {entry.edit_count > 0 && (
        <p style={{ fontSize: 12, color: '#64748b', margin: 0 }}>
          Edited {entry.edit_count} {entry.edit_count === 1 ? 'time' : 'times'}
          {entry.last_edited_at && (
            <> &middot; last updated {new Date(entry.last_edited_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</>
          )}
        </p>
      )}

      {countryNameMismatch && (
        <div style={{
          padding: '10px 14px',
          background: 'rgba(234,179,8,0.1)',
          border: '1px solid rgba(234,179,8,0.4)',
          borderRadius: 6,
          color: '#fde047',
          fontSize: 13,
        }}>
          Original country &ldquo;{entry.location_country}&rdquo; was not recognized. Please select the correct country below before saving.
        </div>
      )}

      {state?.error && (
        <div style={{
          padding: '12px 16px',
          background: 'rgba(220,38,38,0.15)',
          border: '1px solid rgba(220,38,38,0.4)',
          borderRadius: 8,
          color: '#fca5a5',
          fontSize: 14,
        }}>
          {state.error}
        </div>
      )}

      {/* Model Year + Body Style */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div style={fieldStyle}>
          <label style={labelStyle} htmlFor="model_year">Model Year</label>
          <select id="model_year" name="model_year" required style={inputStyle} defaultValue={entry.model_year}>
            {[2021, 2022, 2023, 2024, 2025, 2026, 2027, 2028, 2029, 2030, 2031, 2032, 2033, 2034, 2035].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>Body Style</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {['M3', 'M4'].map((bs) => (
              <label key={bs} style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '8px 12px', background: '#1e2a3a', border: '1px solid #2d3f55',
                borderRadius: 6, cursor: 'pointer', fontSize: 14, color: '#e2e8f0', fontWeight: 600,
              }}>
                <input
                  type="radio"
                  name="body_style"
                  value={bs}
                  defaultChecked={entry.body_style === bs}
                  required
                  style={{ marginRight: 6 }}
                />
                {bs}
              </label>
            ))}
          </div>
        </div>
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

      {/* Individual Color — combobox */}
      <div style={fieldStyle}>
        <label style={labelStyle} htmlFor="ext_color_search">Individual Color *</label>
        <div style={{ position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {selectedColorHex && (
              <div style={{
                width: 28, height: 28, borderRadius: 4, flexShrink: 0,
                background: selectedColorHex,
                border: '1px solid rgba(255,255,255,0.15)',
                boxShadow: '0 1px 4px rgba(0,0,0,0.4)',
              }} />
            )}
            <input
              type="text"
              id="ext_color_search"
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
              style={{ ...inputStyle, flex: 1 }}
            />
          </div>

          <input type="hidden" name="ext_color" value={colorValue} />

          {showColorDrop && filteredColors.length > 0 && (
            <div style={{
              position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
              background: '#1e2a3a', border: '1px solid #2d3f55', borderRadius: 6,
              maxHeight: 220, overflowY: 'auto', marginTop: 2,
              boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
            }}>
              {filteredColors.map((c) => {
                const hex = getColorHex(c);
                const light = isLightColor(hex);
                return (
                  <div
                    key={c}
                    onMouseDown={() => handleColorSelect(c)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '8px 12px', cursor: 'pointer',
                      borderBottom: '1px solid rgba(255,255,255,0.05)',
                      color: c === colorValue ? '#1C69D4' : '#e2e8f0',
                      background: c === colorValue ? 'rgba(28,105,212,0.1)' : 'transparent',
                    }}
                  >
                    <div style={{
                      width: 20, height: 20, borderRadius: 3, flexShrink: 0,
                      background: hex,
                      border: `1px solid ${light ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.15)'}`,
                    }} />
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

      {/* Interior */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16 }}>
        <div style={fieldStyle}>
          <label style={labelStyle} htmlFor="interior_color">Interior Color</label>
          <select id="interior_color" name="interior_color" style={inputStyle} defaultValue={entry.interior_color ?? ''}>
            <option value="">-- Select --</option>
            {INTERIOR_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
            <option value="Other">Other</option>
          </select>
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle} htmlFor="interior_seats">Seats</label>
          <select id="interior_seats" name="interior_seats" style={inputStyle} defaultValue={entry.interior_seats ?? ''}>
            <option value="">-- Select --</option>
            <option value="Carbon Buckets">Carbon Buckets</option>
            <option value="Comfort Seats">Comfort Seats</option>
          </select>
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle} htmlFor="interior_leather">Leather</label>
          <select id="interior_leather" name="interior_leather" style={inputStyle} defaultValue={entry.interior_leather ?? ''}>
            <option value="">-- Select --</option>
            <option value="Full">Full Leather</option>
            <option value="Extended">Extended Leather</option>
          </select>
        </div>
      </div>

      {/* Wheels */}
      <div style={fieldStyle}>
        <label style={labelStyle} htmlFor="wheels">Wheels</label>
        <select id="wheels" name="wheels" style={inputStyle} defaultValue={entry.wheels ?? ''}>
          <option value="">-- Select --</option>
          {WHEEL_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
          <option value="Other">Other</option>
        </select>
      </div>

      {/* Location */}
      <div style={fieldStyle}>
        <label style={labelStyle}>Location</label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
          <div style={fieldStyle}>
            <label style={{ ...labelStyle, fontSize: 12 }} htmlFor="location_country">Country *</label>
            <select
              id="location_country"
              name="location_country"
              required
              value={countryCode}
              onChange={(e) => { setCountryCode(e.target.value); setStateValue(''); }}
              style={inputStyle}
            >
              {allCountries.map((c) => (
                <option key={c.isoCode} value={c.isoCode}>{c.name}</option>
              ))}
            </select>
            <input type="hidden" name="location_country_name" value={selectedCountry?.name ?? ''} />
          </div>

          <div style={fieldStyle}>
            <label style={{ ...labelStyle, fontSize: 12 }} htmlFor="location_state">
              {countryCode === 'US' ? 'State' : countryCode === 'CA' ? 'Province' : 'Region'}
            </label>
            {states.length > 0 ? (
              <select
                id="location_state"
                name="location_state"
                value={stateValue}
                onChange={(e) => setStateValue(e.target.value)}
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
                value={stateValue}
                onChange={(e) => setStateValue(e.target.value)}
                style={inputStyle}
              />
            )}
          </div>

          <div style={fieldStyle}>
            <label style={{ ...labelStyle, fontSize: 12 }} htmlFor="location_city">City</label>
            <input
              type="text"
              id="location_city"
              name="location_city"
              placeholder="e.g. Austin"
              defaultValue={entry.location_city ?? ''}
              style={inputStyle}
            />
          </div>
        </div>
      </div>

      {/* Forum Source */}
      <div style={fieldStyle}>
        <label style={labelStyle}>Forum</label>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {FORUMS.map((f) => (
            <label key={f.value} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '7px 14px', background: forum === f.value ? 'rgba(28,105,212,0.2)' : '#1e2a3a',
              border: `1px solid ${forum === f.value ? '#1C69D4' : '#2d3f55'}`,
              borderRadius: 20, cursor: 'pointer', fontSize: 13, color: '#e2e8f0',
              transition: 'all 0.15s',
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
      </div>

      {/* Notes */}
      <div style={fieldStyle}>
        <label style={labelStyle} htmlFor="notes">Notes</label>
        <textarea
          id="notes"
          name="notes"
          rows={3}
          placeholder="Any additional details about your build..."
          defaultValue={entry.notes ?? ''}
          style={{ ...inputStyle, resize: 'vertical' }}
        />
      </div>

      <button
        type="submit"
        disabled={isPending}
        style={{
          padding: '12px 24px',
          background: isPending ? '#374151' : '#1C69D4',
          color: '#ffffff',
          border: 'none',
          borderRadius: 8,
          fontSize: 15,
          fontWeight: 700,
          cursor: isPending ? 'not-allowed' : 'pointer',
          alignSelf: 'flex-start',
          transition: 'background 0.2s',
        }}
      >
        {isPending ? 'Saving...' : 'Save Changes'}
      </button>

    </form>

      {/* Delete entry — separate form, must not be nested inside the update form */}
      <div style={{ borderTop: '1px solid #2d3f55', paddingTop: 20 }}>
        {!confirmDelete ? (
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            style={{
              padding: '10px 20px',
              background: 'transparent',
              color: '#ef4444',
              border: '1px solid #ef4444',
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Delete this entry
          </button>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <p style={{ color: '#fca5a5', fontSize: 14, margin: 0 }}>
              This will permanently remove your entry from the registry. Are you sure?
            </p>
            {deleteState?.error && (
              <p style={{ color: '#fca5a5', fontSize: 13, margin: 0 }}>{deleteState.error}</p>
            )}
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <form action={deleteAction}>
                <input type="hidden" name="id" value={entry.id} />
                <input type="hidden" name="edit_token" value={editToken ?? ''} />
                <input type="hidden" name="exp" value={editExpiry ?? ''} />
                <button
                  type="submit"
                  disabled={isDeletePending}
                  style={{
                    padding: '10px 20px',
                    background: isDeletePending ? '#7f1d1d' : '#ef4444',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: 8,
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: isDeletePending ? 'not-allowed' : 'pointer',
                  }}
                >
                  {isDeletePending ? 'Deleting...' : 'Yes, delete it'}
                </button>
              </form>
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                style={{
                  padding: '10px 20px',
                  background: 'transparent',
                  color: '#94a3b8',
                  border: '1px solid #2d3f55',
                  borderRadius: 8,
                  fontSize: 14,
                  cursor: 'pointer',
                }}
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
