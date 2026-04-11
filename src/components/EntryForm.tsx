'use client';

import { useActionState, useState, useMemo } from 'react';
import { Country, State } from 'country-state-city';
import { submitEntry } from '../app/actions';
import { BMW_COLORS, getColorHex, isLightColor } from '../lib/colors';

const INTERIOR_OPTIONS = [
  'Black',
  'Fjord Blue',
  'Fiona Red',
  'Kyalami Orange',
  'Sakhir Orange',
  'Silverstone',
  'Silverstone Grey',
  'Smoke White',
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
const ALL_COUNTRIES = Country.getAllCountries();

// Countries that have state/province data worth showing
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

export default function EntryForm() {
  const [state, action, isPending] = useActionState(submitEntry, {});

  // Color combobox state
  const [colorSearch, setColorSearch] = useState('');
  const [colorValue, setColorValue] = useState('');
  const [showColorDrop, setShowColorDrop] = useState(false);

  // Location cascade state
  const [countryCode, setCountryCode] = useState('US');
  const [stateCode, setStateCode] = useState('');

  // Forum
  const [forum, setForum] = useState('BimmerPost');
  const [forumUsername, setForumUsername] = useState('');

  const filteredColors = useMemo(
    () => COLOR_NAMES.filter((c) => c.toLowerCase().includes(colorSearch.toLowerCase())),
    [colorSearch]
  );

  const states = useMemo(
    () => COUNTRIES_WITH_STATES.has(countryCode) ? State.getStatesOfCountry(countryCode) : [],
    [countryCode]
  );

  const selectedCountry = ALL_COUNTRIES.find((c) => c.isoCode === countryCode);
  const selectedColorHex = colorValue ? getColorHex(colorValue) : null;

  function handleColorSelect(name: string) {
    setColorValue(name);
    setColorSearch(name);
    setShowColorDrop(false);
  }

  return (
    <form action={action} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
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

      {state?.duplicate && (
        <div style={{
          padding: '20px',
          background: 'rgba(234,179,8,0.12)',
          border: '2px solid #eab308',
          borderRadius: 10,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
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
            If you own a second car with this exact spec, click <strong style={{ color: '#fde047' }}>Submit Anyway</strong>. Otherwise, do not resubmit.
          </p>
          <input type="hidden" name="force_submit" value="1" />
          <button
            type="submit"
            style={{
              padding: '10px 20px',
              background: '#854d0e',
              border: '2px solid #eab308',
              borderRadius: 7,
              color: '#fde047',
              fontSize: 14,
              fontWeight: 800,
              cursor: 'pointer',
              alignSelf: 'flex-start',
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

        <div style={fieldStyle}>
          <label style={labelStyle}>Body Style</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {['M3', 'M4'].map((bs) => (
              <label key={bs} style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '8px 12px', background: '#1e2a3a', border: '1px solid #2d3f55',
                borderRadius: 6, cursor: 'pointer', fontSize: 14, color: '#e2e8f0', fontWeight: 600,
              }}>
                <input type="radio" name="body_style" value={bs} defaultChecked={bs === 'M3'} required style={{ marginRight: 6 }} />
                {bs}
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Competition + Drivetrain + Transmission */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
        <div style={fieldStyle}>
          <label style={labelStyle}>Competition Package</label>
          <label style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px',
            background: '#1e2a3a', border: '1px solid #2d3f55', borderRadius: 6,
            cursor: 'pointer', color: '#e2e8f0', fontSize: 14,
          }}>
            <input type="checkbox" name="competition" defaultChecked />
            Competition
          </label>
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle} htmlFor="drivetrain">Drivetrain</label>
          <select id="drivetrain" name="drivetrain" required style={inputStyle}>
            <option value="AWD">AWD (xDrive)</option>
            <option value="RWD">RWD</option>
          </select>
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle} htmlFor="transmission">Transmission</label>
          <select id="transmission" name="transmission" required style={inputStyle}>
            <option value="DCT">DCT (8-Speed Auto)</option>
            <option value="6MT">6MT (Manual)</option>
          </select>
        </div>
      </div>

      {/* Individual Color — combobox */}
      <div style={fieldStyle}>
        <label style={labelStyle}>Individual Color *</label>
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

          {/* Hidden input carries the actual value to the server action */}
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
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div style={fieldStyle}>
          <label style={labelStyle} htmlFor="interior_color">Interior Color</label>
          <select id="interior_color" name="interior_color" style={inputStyle}>
            <option value="">-- Select --</option>
            {INTERIOR_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
            <option value="Other">Other</option>
          </select>
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle} htmlFor="interior_type">Interior Type</label>
          <select id="interior_type" name="interior_type" style={inputStyle}>
            <option value="">-- Select --</option>
            <option value="Full Leather">Full Leather</option>
            <option value="Carbon Buckets">Carbon Buckets</option>
          </select>
        </div>
      </div>

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
      <div style={fieldStyle}>
        <label style={labelStyle}>Location</label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
          {/* Country */}
          <div style={fieldStyle}>
            <label style={{ ...labelStyle, fontSize: 12 }} htmlFor="location_country">Country *</label>
            <select
              id="location_country"
              name="location_country"
              required
              value={countryCode}
              onChange={(e) => { setCountryCode(e.target.value); setStateCode(''); }}
              style={inputStyle}
            >
              {ALL_COUNTRIES.map((c) => (
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
            {states.length > 0 ? (
              <select
                id="location_state"
                name="location_state"
                value={stateCode}
                onChange={(e) => setStateCode(e.target.value)}
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
      </div>

      {/* Forum Source + Username */}
      <div style={fieldStyle}>
        <label style={labelStyle}>Forum</label>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
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

      {/* Turnstile bot protection */}
      <div
        className="cf-turnstile"
        data-sitekey="0x4AAAAAAC6yXfM_xBBaAkKj"
        data-theme="dark"
      />

      <button
        type="submit"
        disabled={isPending || !forumUsername.trim()}
        style={{
          padding: '12px 24px',
          background: isPending || !forumUsername.trim() ? '#374151' : '#1C69D4',
          color: '#ffffff', border: 'none', borderRadius: 8,
          fontSize: 15, fontWeight: 700,
          cursor: isPending || !forumUsername.trim() ? 'not-allowed' : 'pointer',
          alignSelf: 'flex-start', transition: 'background 0.2s',
        }}
      >
        {isPending ? 'Submitting...' : 'Submit Build'}
      </button>
    </form>
  );
}
