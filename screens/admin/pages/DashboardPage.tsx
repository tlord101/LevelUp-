import React, { useEffect, useState } from 'react';
import { Activity, DollarSign, ScanLine, Users } from 'lucide-react';
import { getDashboardMetrics } from '../../../services/adminService';
import { LineChart, PageScaffold, PieChart, StatCard, shellClass, useAdminTheme } from '../components/AdminWidgets';

const DashboardPage: React.FC = () => {
  const theme = useAdminTheme();
  const [metrics, setMetrics] = useState({
    totalUsers: 0,
    active24h: 0,
    active7d: 0,
    totalScans: 0,
    totalRevenue: 0,
    subscriptionBreakdown: { basic: 0, pro: 0, elite: 0 },
    xpSeries: [0, 0, 0, 0, 0, 0, 0],
  });

  useEffect(() => {
    getDashboardMetrics().then(setMetrics).catch((err) => console.error('Dashboard metrics error:', err));
  }, []);

  const totalSubs = Math.max(metrics.totalUsers, 1);

  return (
    <PageScaffold title="Dashboard" description="Welcome back. Here's what's happening with your platform today." theme={theme}>
      <div className="grid gap-6 md:grid-cols-2">
        <StatCard
          title="Total Revenue"
          value={`$${Number(metrics.totalRevenue || 0).toLocaleString()}`}
          trend="+12.5%"
          subtitle="vs last month"
          icon={<DollarSign size={28} />}
          theme={theme}
        />
        <StatCard
          title="Active Users"
          value={String(metrics.active24h)}
          trend="+8.2%"
          subtitle="vs last month"
          icon={<Users size={28} />}
          theme={theme}
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <StatCard
          title="Total Users"
          value={String(metrics.totalUsers)}
          subtitle={`7d active: ${metrics.active7d}`}
          icon={<Activity size={28} />}
          theme={theme}
        />
        <StatCard
          title="Total AI Scans"
          value={String(metrics.totalScans)}
          subtitle="Across body, face and food"
          icon={<ScanLine size={28} />}
          theme={theme}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className={`${shellClass[theme].card} rounded-3xl p-6`}>
          <h3 className="mb-3 font-semibold">XP Activity (7 days)</h3>
          <LineChart points={metrics.xpSeries} />
        </div>
        <div className={`${shellClass[theme].card} rounded-3xl p-6`}>
          <h3 className="mb-3 font-semibold">Subscription Breakdown</h3>
          <PieChart
            slices={[
              { label: 'Basic', value: Math.round((metrics.subscriptionBreakdown.basic / totalSubs) * 100), color: '#334155' },
              { label: 'Pro', value: Math.round((metrics.subscriptionBreakdown.pro / totalSubs) * 100), color: '#10b981' },
              { label: 'Elite', value: Math.round((metrics.subscriptionBreakdown.elite / totalSubs) * 100), color: '#22d3ee' },
            ]}
          />
        </div>
      </div>
    </PageScaffold>
  );
};

export default DashboardPage;
