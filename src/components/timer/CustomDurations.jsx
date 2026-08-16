import React, { useEffect, useState } from 'react';
import { MAX_SESSION_MINUTES, MIN_SESSION_MINUTES } from '../../constants/timer.js';
import { useApp } from '../../store/AppContext.jsx';
import { clamp } from '../../utils/time.js';

function DurationField({ label, hint, value, onChange }) {
  const [text, setText] = useState(String(value));
  useEffect(() => setText(String(value)), [value]);

  return (
    <label className="block">
      <span className="label">{label}</span>
      <div className="relative">
        <input
          type="number"
          min={MIN_SESSION_MINUTES}
          max={MAX_SESSION_MINUTES}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            const n = parseInt(e.target.value, 10);
            if (!Number.isNaN(n)) onChange(clamp(n, MIN_SESSION_MINUTES, MAX_SESSION_MINUTES));
          }}
          onBlur={() => setText(String(value))}
          className="input pr-12"
          aria-label={label}
        />
        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-medium text-ink-disabled">
          min
        </span>
      </div>
      <span className="mt-1 block text-[11px] text-ink-muted dark:text-night-muted">{hint}</span>
    </label>
  );
}

export default function CustomDurations() {
  const { state, actions } = useApp();
  const { focus, shortBreak, longBreak } = state.settings.customDurations;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <DurationField
        label="Focus duration"
        hint="How long each focus session lasts."
        value={focus}
        onChange={(focus) => actions.setCustomDurations({ focus })}
      />
      <DurationField
        label="Short break"
        hint="Break after each focus session."
        value={shortBreak}
        onChange={(shortBreak) => actions.setCustomDurations({ shortBreak })}
      />
      <DurationField
        label="Long break"
        hint="Break after every long-break interval."
        value={longBreak}
        onChange={(longBreak) => actions.setCustomDurations({ longBreak })}
      />
    </div>
  );
}
