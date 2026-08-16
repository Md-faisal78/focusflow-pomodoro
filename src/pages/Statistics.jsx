import React from 'react';
import { useApp } from '../store/AppContext.jsx';
import SummaryCards from '../components/statistics/SummaryCards.jsx';
import WeeklyChart from '../components/statistics/WeeklyChart.jsx';
import RangeStats from '../components/statistics/RangeStats.jsx';
import Heatmap from '../components/statistics/Heatmap.jsx';
import MonthlyTotals from '../components/statistics/MonthlyTotals.jsx';
import Card from '../components/ui/Card.jsx';

export default function StatisticsPage() {
  const { state } = useApp();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-ink dark:text-white">Statistics</h1>
        <p className="text-sm text-ink-muted dark:text-night-muted">Everything about how you focus.</p>
      </div>

      <SummaryCards />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <h2 className="mb-4 text-lg font-bold text-ink dark:text-white">This week</h2>
          <WeeklyChart />
        </Card>
        <Card className="p-6">
          <h2 className="mb-4 text-lg font-bold text-ink dark:text-white">Breakdown</h2>
          <RangeStats />
        </Card>
      </div>

      <Card className="p-6">
        <h2 className="mb-4 text-lg font-bold text-ink dark:text-white">Activity calendar</h2>
        <Heatmap sessions={state.sessions} weeks={53} />
      </Card>

      <Card className="p-6">
        <h2 className="mb-4 text-lg font-bold text-ink dark:text-white">Monthly totals</h2>
        <MonthlyTotals />
      </Card>
    </div>
  );
}
