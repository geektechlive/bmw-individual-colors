'use client';

import type { LocationState } from './useLocation';
import styles from './form.module.css';

interface Props {
  loc: LocationState;
  defaultCity: string;
}

/** Country first, then state or province, then city. */
export default function LocationFields({ loc, defaultCity }: Props) {
  const regionLabel = loc.countryCode === 'US' ? 'State' : loc.countryCode === 'CA' ? 'Province' : 'Region';
  return (
    <fieldset className={`field ${styles.fieldset}`}>
      <legend className={`field-label ${styles.legend}`}>Location</legend>
      <div className={styles.gridAutoTight}>
        <div className="field">
          <label className={`field-label ${styles.subLabel}`} htmlFor="location_country">Country *</label>
          <select
            id="location_country"
            name="location_country"
            required
            value={loc.countryCode}
            onChange={(e) => loc.setCountryCode(e.target.value)}
            className="input"
          >
            {loc.countries.map((c) => (
              <option key={c.isoCode} value={c.isoCode}>{c.name}</option>
            ))}
          </select>
          {/* Send the full country name, not the ISO code */}
          <input type="hidden" name="location_country_name" value={loc.countryName} />
        </div>

        <div className="field">
          <label className={`field-label ${styles.subLabel}`} htmlFor="location_state">{regionLabel}</label>
          {loc.states.length > 0 ? (
            <select
              id="location_state"
              name="location_state"
              value={loc.stateValue}
              onChange={(e) => loc.setStateValue(e.target.value)}
              className="input"
            >
              <option value="">-- Select --</option>
              {/* Keep a stored value the list doesn't name (e.g. "TX"), or saving would blank it. */}
              {loc.stateValue && !loc.states.some((s) => s.name === loc.stateValue) && (
                <option value={loc.stateValue}>{loc.stateValue}</option>
              )}
              {loc.states.map((s) => (
                <option key={s.isoCode} value={s.name}>{s.name}</option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              id="location_state"
              name="location_state"
              placeholder="Region / Province"
              value={loc.stateValue}
              onChange={(e) => loc.setStateValue(e.target.value)}
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
            defaultValue={defaultCity}
            className="input"
          />
        </div>
      </div>
    </fieldset>
  );
}
