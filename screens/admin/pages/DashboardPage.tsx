import React, { useEffect, useState } from 'react';
import { getDashboardMetrics } from '../../../services/adminService';
import { LineChart, PageScaffold, PieChart, StatCard, shellClass, useAdminTheme } from '../components/AdminWidgets';

const DashboardPage: React.FC = () => {
  const theme = useAdminTheme();
  const [metrics, setMetrics] = useState({
    totalUsers: 0,
    active24h: 0,
    active7d: 0,
    totalScans: 0,
    totalRevenueMock: 0,
    subscriptionBreakdown: { basic: 0, pro: 0, elite: 0 },
    xpSeries: [0, 0, 0, 0, 0, 0, 0],
  });

  useEffect(() => {
    getDashboardMetrics().then(setMetrics).catch((err) => console.error('Dashboard metrics error:', err));
  }, []);

  const totalSubs = Math.max(metrics.totalUsers, 1);

  return (
    <PageScaffold title="Dashboard" description="Live app metrics from database" theme={theme}>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatCard title="Total Users" value={String(metrics.totalUsers)} theme={theme} />
        <StatCard title="Active Users (24h)" value={String(metrics.active24h)} theme={theme} />
        <StatCard title="Active Users (7d)" value={String(metrics.active7d)} theme={theme} />
        <StatCard title="Total AI Scans" value={String(metrics.totalScans)} theme={theme} />
        <StatCard title="Revenue (Mock)" value={`$${metrics.totalRevenueMock.toLocaleString()}`} theme={theme} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className={`${shellClass[theme].card} rounded-2xl p-5`}>
          <h3 className="mb-3 font-semibold">XP Activity (7 days)</h3>
          <LineChart points={metrics.xpSeries} />
        </div>
        <div className={`${shellClass[theme].card} rounded-2xl p-5`}>
          <h3 className="mb-3 font-semibold">Subscription Breakdown</h3>
          <PieChart
            slices={[
              { label: 'Basic', value: Math.round((metrics.subscriptionBreakdown.basic / totalSubs) * 100), color: '#94a3b8' },
              { label: 'Pro', value: Math.round((metrics.subscriptionBreakdown.pro / totalSubs) * 100), color: '#6366f1' },
              { label: 'Elite', value: Math.round((metrics.subscriptionBreakdown.elite / totalSubs) * 100), color: '#22c55e' },
            ]}
          />
        </div>
      </div>
    </PageScaffold>
  );
};

export default DashboardPage;
