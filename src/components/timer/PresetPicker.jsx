import React from 'react';
import clsx from 'clsx';
import { PRESETS } from '../../constants/timer.js';
import { useApp } from '../../store/AppContext.jsx';
import CustomDurations from './CustomDurations.jsx';

export default function PresetPicker() {
  const { state, actions } = useApp();
  const activeId = state.settings.presetId;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4" role="radiogroup" aria-label="Timer preset">
        {Object.values(PRESETS).map((preset) => {
          const active = activeId === preset.id;
          return (
            <button
              key={preset.id}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => actions.setPreset(preset.id)}
              className={clsx(
                'rounded-2xl border p-3 text-left transition',
                active
                  ? 'border-accent/70 bg-accent/5 dark:border-accent/60 dark:bg-accent/10'
                  : 'border-soft-hairline bg-white hover:border-hairline dark:border-night-hairline dark:bg-night-card dark:hover:border-night-muted'
              )}
            >
              <div
                className={clsx(
                  'text-sm font-bold',
                  active ? 'text-accent dark:text-accent-light' : 'text-ink dark:text-white'
                )}
              >
                {preset.name}
              </div>
              <div className="mt-0.5 text-xs text-ink-muted dark:text-night-muted">
                {preset.id === 'custom' ? 'Set your own' : `${preset.focus} / ${preset.shortBreak} / ${preset.longBreak} min`}
              </div>
            </button>
          );
        })}
      </div>

      {activeId === 'custom' ? (
        <div className="rounded-2xl border border-dashed border-hairline p-4 dark:border-night-hairline">
          <CustomDurations />
        </div>
      ) : (
        <p className="text-xs text-ink-muted dark:text-night-muted">
          {PRESETS[activeId]?.description} Long break after every {state.settings.longBreakInterval} focus sessions.
        </p>
      )}
    </div>
  );
}
