'use client';

import { useState } from 'react';
import type { ReactNode } from 'react';
import ColorCombobox from './ColorCombobox';
import ForumPills from './ForumPills';
import LocationFields from './LocationFields';
import { fieldErrorProps } from './field-error';
import type { LocationState } from './useLocation';
import {
  BASE_VARIANT, COLOR_NAMES, INTERIOR_OPTIONS, MODEL_YEARS, WHEEL_OPTIONS, withCurrentOption,
  type FormDefaults,
} from './options';
import styles from './form.module.css';

interface Props {
  defaults: FormDefaults;
  loc: LocationState;
  /** Name of the field the server error is about, if any (see field-error.ts). */
  errorField: string | null;
  /** The color field's id; edit keeps its original one. */
  colorInputId?: string;
  /** Submit adds the "derived interior type" hidden field; edit never sent it. */
  sendInteriorType?: boolean;
  /** Rendered right after the forum pills (the submit form's username field). */
  afterForum?: (forum: string) => ReactNode;
}

/** The entry fields both forms share. Each form keeps only what differs. */
export default function FormFields({
  defaults, loc, errorField, colorInputId, sendInteriorType = false, afterForum,
}: Props) {
  const [variant, setVariant] = useState(defaults.variant);
  const [transmission, setTransmission] = useState(defaults.transmission);
  const [seats, setSeats] = useState(defaults.interiorSeats);
  const [leather, setLeather] = useState(defaults.interiorLeather);
  const [forum, setForum] = useState(defaults.forum);

  const interiorType = seats === 'Carbon Buckets' ? 'Carbon Buckets' : leather ? 'Full Leather' : '';

  return (
    <>
      <div className={styles.grid2}>
        <div className="field">
          <label className="field-label" htmlFor="model_year">Model Year</label>
          <select
            id="model_year"
            name="model_year"
            required
            className="input"
            defaultValue={defaults.modelYear}
            {...fieldErrorProps('model_year', errorField)}
          >
            {MODEL_YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>

        <fieldset className={`field ${styles.fieldset}`}>
          <legend className={`field-label ${styles.legend}`}>Body Style</legend>
          <div className={styles.row}>
            {['M3', 'M4'].map((bs) => (
              <label key={bs} className={styles.choice}>
                <input type="radio" name="body_style" value={bs} defaultChecked={bs === defaults.bodyStyle} required />
                {bs}
              </label>
            ))}
          </div>
        </fieldset>
      </div>

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
              if (v !== BASE_VARIANT) setTransmission('8AT');
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
            className={`input ${variant !== BASE_VARIANT ? styles.locked : ''}`}
            {...fieldErrorProps('transmission', errorField)}
          >
            <option value="8AT">8AT (8-Speed Auto)</option>
            <option value="6MT">6MT (Manual)</option>
          </select>
        </div>
      </div>

      <ColorCombobox
        colors={COLOR_NAMES}
        initialValue={defaults.extColor}
        inputId={colorInputId}
        errorProps={fieldErrorProps('ext_color', errorField)}
      />

      <div className={styles.gridAuto}>
        <div className="field">
          <label className="field-label" htmlFor="interior_color">Interior Color</label>
          <select id="interior_color" name="interior_color" className="input" defaultValue={defaults.interiorColor}>
            <option value="">-- Select --</option>
            {withCurrentOption(INTERIOR_OPTIONS, defaults.interiorColor).map((s) => <option key={s} value={s}>{s}</option>)}
            <option value="Other">Other</option>
          </select>
        </div>

        <div className="field">
          <label className="field-label" htmlFor="interior_seats">Seats</label>
          <select
            id="interior_seats"
            name="interior_seats"
            value={seats}
            onChange={(e) => setSeats(e.target.value)}
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
            value={leather}
            onChange={(e) => setLeather(e.target.value)}
            className="input"
          >
            <option value="">-- Select --</option>
            <option value="Full">Full Leather</option>
            <option value="Extended">Extended Leather</option>
          </select>
        </div>
      </div>

      {/* Derived from seats/leather, not directly user-editable */}
      {sendInteriorType && <input type="hidden" name="interior_type" value={interiorType} />}

      <div className="field">
        <label className="field-label" htmlFor="wheels">Wheels</label>
        <select id="wheels" name="wheels" className="input" defaultValue={defaults.wheels}>
          <option value="">-- Select --</option>
          {withCurrentOption(WHEEL_OPTIONS, defaults.wheels).map((s) => <option key={s} value={s}>{s}</option>)}
          <option value="Other">Other</option>
        </select>
      </div>

      <LocationFields loc={loc} defaultCity={defaults.city} />

      <div className="field">
        <ForumPills value={forum} onChange={setForum} />
        {afterForum?.(forum)}
      </div>

      <div className="field">
        <label className="field-label" htmlFor="notes">Notes</label>
        <textarea
          id="notes"
          name="notes"
          rows={3}
          placeholder="Any additional details about your build..."
          defaultValue={defaults.notes}
          className={`input ${styles.textarea}`}
          {...fieldErrorProps('notes', errorField)}
        />
      </div>
    </>
  );
}
