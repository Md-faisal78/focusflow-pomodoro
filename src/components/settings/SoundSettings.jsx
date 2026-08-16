import React, { useRef, useState } from 'react';
import clsx from 'clsx';
import { BUILT_IN_SOUNDS, DEFAULT_SOUND_ID, MAX_CUSTOM_SOUND_BYTES } from '../../constants/sounds.js';
import { useApp } from '../../store/AppContext.jsx';
import { isCustomSoundSelection } from '../../services/sounds.js';
import Toggle from '../ui/Toggle.jsx';
import Button from '../ui/Button.jsx';
import IconButton from '../ui/IconButton.jsx';
import Icon from '../ui/Icon.jsx';

function formatBytes(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function SoundSettings() {
  const { state, actions } = useApp();
  const s = state.settings;
  const selected = s.selectedSound || DEFAULT_SOUND_ID;
  const selectedIsCustom = isCustomSoundSelection(selected);
  const fileInputRef = useRef(null);
  const [uploadError, setUploadError] = useState('');
  const [uploading, setUploading] = useState(false);

  async function handleFile(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    setUploadError('');
    if (!file) return;
    if (!file.type.startsWith('audio/')) {
      setUploadError('Please choose an audio file (MP3, WAV, OGG, M4A, …).');
      return;
    }
    if (file.size > MAX_CUSTOM_SOUND_BYTES) {
      setUploadError('That file is too large — keep custom sounds under 5 MB.');
      return;
    }
    setUploading(true);
    try {
      await actions.addCustomSound(file);
      setUploadError('');
    } catch {
      setUploadError('Could not save that sound. Please try another file.');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="font-semibold text-ink dark:text-white">Play sounds</p>
          <p className="text-sm text-ink-muted dark:text-night-muted">Play a sound when a session ends.</p>
        </div>
        <Toggle checked={s.soundEnabled} onChange={(v) => actions.setSetting({ soundEnabled: v })} label="Play sounds" />
      </div>

      <div>
        <p className="mb-2 font-semibold text-ink dark:text-white">Built-in sounds</p>
        <ul className="space-y-2">
          {BUILT_IN_SOUNDS.map((sound) => {
            const active = !selectedIsCustom && selected === sound.id;
            return (
              <li
                key={sound.id}
                className={clsx(
                  'flex items-center gap-3 rounded-xl border p-3 transition',
                  active
                    ? 'border-accent/70 bg-accent/5 dark:bg-accent/10'
                    : 'border-soft-hairline dark:border-night-hairline'
                )}
              >
                <button
                  type="button"
                  onClick={() => actions.setSetting({ selectedSound: sound.id })}
                  className="min-w-0 flex-1 text-left"
                >
                  <span className={clsx('block font-semibold', active ? 'text-accent dark:text-accent-light' : 'text-ink dark:text-white')}>
                    {sound.name}
                  </span>
                  <span className="block text-xs text-ink-muted dark:text-night-muted">{sound.description}</span>
                </button>
                <IconButton icon="play" label={`Preview ${sound.name}`} onClick={() => actions.previewSound(sound.id)} size={15} />
                {active ? <Icon name="check" size={18} className="shrink-0 text-accent dark:text-accent-light" /> : null}
              </li>
            );
          })}
        </ul>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between gap-3">
          <div>
            <p className="font-semibold text-ink dark:text-white">Custom sounds</p>
            <p className="text-sm text-ink-muted dark:text-night-muted">
              Upload your own sound (max 5 MB) and it will be stored locally.
            </p>
          </div>
          <input ref={fileInputRef} type="file" accept="audio/*" className="hidden" onChange={handleFile} />
          <Button variant="secondary" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
            <Icon name="upload" size={16} />
            {uploading ? 'Uploading…' : 'Upload sound'}
          </Button>
        </div>

        {uploadError ? <p className="mb-2 text-sm font-medium text-accent dark:text-accent-light">{uploadError}</p> : null}

        {state.customSounds.length === 0 ? (
          <p className="rounded-xl border border-dashed border-hairline p-4 text-center text-sm text-ink-muted dark:border-night-hairline dark:text-night-muted">
            No custom sounds yet.
          </p>
        ) : (
          <ul className="space-y-2">
            {state.customSounds.map((sound) => {
              const sel = `custom:${sound.id}`;
              const active = selected === sel;
              return (
                <li
                  key={sound.id}
                  className={clsx(
                    'flex items-center gap-3 rounded-xl border p-3 transition',
                    active
                      ? 'border-accent/70 bg-accent/5 dark:bg-accent/10'
                      : 'border-soft-hairline dark:border-night-hairline'
                  )}
                >
                  <Icon name="music" size={16} className="shrink-0 text-ink-disabled dark:text-night-muted" />
                  <button type="button" onClick={() => actions.setSetting({ selectedSound: sel })} className="min-w-0 flex-1 text-left">
                    <span className={clsx('block truncate font-semibold', active ? 'text-accent dark:text-accent-light' : 'text-ink dark:text-white')}>
                      {sound.name}
                    </span>
                    <span className="block text-xs text-ink-muted dark:text-night-muted">{formatBytes(sound.size)} · uploaded locally</span>
                  </button>
                  <IconButton icon="play" label={`Preview ${sound.name}`} onClick={() => actions.previewSound(sel)} size={15} />
                  <IconButton
                    icon="trash"
                    label={`Delete ${sound.name}`}
                    onClick={() => actions.deleteCustomSound(sound.id)}
                    size={15}
                    className="hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600 dark:hover:border-rose-500/40 dark:hover:bg-rose-500/10 dark:hover:text-rose-400"
                  />
                  {active ? <Icon name="check" size={18} className="shrink-0 text-accent dark:text-accent-light" /> : null}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
