import React, { useEffect, useState } from 'react';
import { getScannerMetrics, setScannerEnabled } from '../../../services/adminService';
import { PageScaffold, StatCard, Toggle, shellClass, useAdminTheme, Table } from '../components/AdminWidgets';

const ScannerPage: React.FC<{ scanner: 'body' | 'face' | 'food'; title: string }> = ({ scanner, title }) => {
  const theme = useAdminTheme();
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({ total: 0, confidence: 0, enabled: true, limits: { basic: 8, pro: 30, elite: 999 } });

  const load = () => getScannerMetrics(scanner).then((value) => setMetrics(value as any)).finally(() => setLoading(false));
  useEffect(() => { load(); }, [scanner]);

  const onToggle = async (value: boolean) => {
    setMetrics((prev) => ({ ...prev, enabled: value }));
    await setScannerEnabled(scanner, value);
  };

  return (
    <PageScaffold title={title} description="Live scanner control from admin settings" theme={theme}>
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard title="Total scans" value={String(metrics.total)} theme={theme} />
        <StatCard title="Avg confidence" value={`${metrics.confidence.toFixed(1)}%`} theme={theme} />
        <StatCard title="Daily basic limit" value={String(metrics.limits.basic)} theme={theme} />
        <div className={`${shellClass[theme].card} rounded-2xl p-5`}>
          <p className={`text-sm ${shellClass[theme].subtle}`}>Enabled</p>
          <div className="mt-2"><Toggle checked={metrics.enabled} onChange={onToggle} /></div>
        </div>
      </div>
      {loading ? <div className={`${shellClass[theme].card} rounded-2xl p-4`}>Loading scanner metrics...</div> : null}
    </PageScaffold>
  );
};

export const AdminScannerBodyPage: React.FC = () => <ScannerPage scanner="body" title="Body Scanner" />;
export const AdminScannerFacePage: React.FC = () => <ScannerPage scanner="face" title="Face Scanner" />;
export const AdminScannerFoodPage: React.FC = () => <ScannerPage scanner="food" title="Food Scanner" />;

export const AdminScannerFlaggedPage: React.FC = () => {
  const theme = useAdminTheme();
  return (
    <PageScaffold title="Flagged Scans" description="Queue placeholder for moderation workflow" theme={theme}>
      <Table theme={theme} headers={['Scan', 'Reason', 'Status']} rows={[["No flagged scans", '-', 'Clear']]} />
    </PageScaffold>
  );
};
