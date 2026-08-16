import React from 'react';
import { Route, Routes } from 'react-router-dom';
import { AppProvider } from './store/AppContext.jsx';
import Layout from './components/Layout.jsx';
import FocusPage from './pages/Focus.jsx';
import TasksPage from './pages/Tasks.jsx';
import StatisticsPage from './pages/Statistics.jsx';
import SettingsPage from './pages/Settings.jsx';

export default function App() {
  return (
    <AppProvider>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<FocusPage />} />
          <Route path="tasks" element={<TasksPage />} />
          <Route path="statistics" element={<StatisticsPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="*" element={<FocusPage />} />
        </Route>
      </Routes>
    </AppProvider>
  );
}
