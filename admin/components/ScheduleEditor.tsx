'use client';

import { DAY_NAMES, type Slot } from '../lib/types';

const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0]; // Monday first

/** Weekly OPD timings; a day can have several windows (e.g. morning and evening). */
export function ScheduleEditor({ value, onChange }: { value: Slot[]; onChange: (slots: Slot[]) => void }) {
  const update = (index: number, patch: Partial<Slot>) =>
    onChange(value.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  const remove = (index: number) => onChange(value.filter((_, i) => i !== index));
  const add = (day: number) => onChange([...value, { day, start: '09:00', end: '13:00' }]);

  return (
    <div className="schedule">
      {WEEK_ORDER.map((day) => {
        const windows = value.map((s, i) => ({ s, i })).filter(({ s }) => s.day === day);
        return (
          <div key={day} className="schedule-day">
            <div className="schedule-name">{DAY_NAMES[day]}</div>
            <div className="schedule-windows">
              {windows.length === 0 && <span className="cell-sub">Off</span>}
              {windows.map(({ s, i }) => (
                <span key={i} className="schedule-window">
                  <input type="time" value={s.start} onChange={(e) => update(i, { start: e.target.value })} />
                  –
                  <input type="time" value={s.end} onChange={(e) => update(i, { end: e.target.value })} />
                  <button type="button" className="icon-btn" aria-label="Remove" onClick={() => remove(i)}>×</button>
                </span>
              ))}
              <button type="button" className="link-btn" onClick={() => add(day)}>+ time</button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
