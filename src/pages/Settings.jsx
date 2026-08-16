import React from 'react';
import Card from '../components/ui/Card.jsx';
import AboutFocusFlow from '../components/AboutFocusFlow.jsx';
import TimerSettings from '../components/settings/TimerSettings.jsx';
import SoundSettings from '../components/settings/SoundSettings.jsx';
import NotificationSettings from '../components/settings/NotificationSettings.jsx';
import ThemeSettings from '../components/settings/ThemeSettings.jsx';
import DataSettings from '../components/settings/DataSettings.jsx';

function Section({ title, description, children }) {
  return (
    <Card className="p-6">
      <h2 className="text-lg font-bold text-ink dark:text-white">{title}</h2>
      {description ? <p className="mb-5 mt-0.5 text-sm text-ink-muted dark:text-night-muted">{description}</p> : null}
      {children}
    </Card>
  );
}

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-ink dark:text-white">Settings</h1>
        <p className="text-sm text-ink-muted dark:text-night-muted">
          Everything is saved locally in your browser.
        </p>
      </div>

      <Section title="Timer preferences" description="How your timer behaves between sessions.">
        <TimerSettings />
      </Section>

      <Section title="Sounds" description="Pick what plays when a session ends — or upload your own.">
        <SoundSettings />
      </Section>

      <Section title="Notifications" description="Get alerted when a session completes.">
        <NotificationSettings />
      </Section>

      <Section title="Theme" description="Light or dark — your choice.">
        <ThemeSettings />
      </Section>

      <Section title="Data" description="Your local-first data.">
        <DataSettings />
      </Section>

      <AboutFocusFlow />
    </div>
  );
}
