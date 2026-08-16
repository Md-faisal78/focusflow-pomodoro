import { useEffect, useState } from 'react';
import { useApp } from '../store/AppContext.jsx';

/** Resolves the effective dark-mode state (theme setting + system preference). */
export function useIsDark() {
  const { state } = useApp();
  const [systemDark, setSystemDark] = useState(
    () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-color-scheme: dark)').matches
  );

  useEffect(() => {
    const mq = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
    const onChange = (e) => setSystemDark(e.matches);
    mq?.addEventListener?.('change', onChange);
    return () => mq?.removeEventListener?.('change', onChange);
  }, []);

  return state.theme === 'dark' || (state.theme === 'system' && systemDark);
}
