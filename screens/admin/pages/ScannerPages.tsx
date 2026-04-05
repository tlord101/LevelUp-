import React, { useEffect, useState } from 'react';
import { getFlaggedScans, getScannerInsights, getScannerMetrics, setScannerEnabled } from '../../../services/adminService';
import { PageScaffold, StatCard, Toggle, shellClass, useAdminTheme, Table } from '../components/AdminWidgets';

const ScannerPage: React.FC<{ scanner: 'body' | 'face' | 'food'; title: string }> = ({ scanner, title }) => {
  const theme = useAdminTheme();
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({ total: 0, confidence: 0, enabled: true, limits: { basic: 8, pro: 30, elite: 999 } });
  const [insights, setInsights] = useState<{ flagged: number; lowConfidence: number; trendRows: { date: string; count: number }[] }>({ flagged: 0, lowConfidence: 0, trendRows: [] });

  const load = async () => {
    try {
      const [metricData, insightData] = await Promise.all([getScannerMetrics(scanner), getScannerInsights(scanner)]);
      setMetrics(metricData as any);
      setInsights(insightData as any);
    } finally {
      setLoading(false);
    }
  };
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
        <StatCard title={scanner === 'food' ? 'Allergy flags' : scanner === 'face' ? 'Flagged scans' : 'Low confidence'} value={String(insights.flagged || insights.lowConfidence || 0)} theme={theme} />
        <div className={`${shellClass[theme].card} rounded-3xl p-6`}>
          <p className={`text-sm ${shellClass[theme].subtle}`}>Enabled</p>
          <div className="mt-2"><Toggle checked={metrics.enabled} onChange={onToggle} /></div>
        </div>
      </div>

      <Table
        theme={theme}
        headers={['Date', 'Scans']}
        rows={(insights.trendRows || []).length
          ? insights.trendRows.map((item) => [item.date, String(item.count)])
          : [['No recent trend data', '-']]}
      />

      {loading ? <div className={`${shellClass[theme].card} rounded-3xl p-5`}>Loading scanner metrics...</div> : null}
    </PageScaffold>
  );
};

export const AdminScannerBodyPage: React.FC = () => <ScannerPage scanner="body" title="Body Scanner" />;
export const AdminScannerFacePage: React.FC = () => <ScannerPage scanner="face" title="Face Scanner" />;
export const AdminScannerFoodPage: React.FC = () => <ScannerPage scanner="food" title="Food Scanner" />;

export const AdminScannerFlaggedPage: React.FC = () => {
  const theme = useAdminTheme();
  const [rows, setRows] = useState<any[]>([]);

  useEffect(() => {
    getFlaggedScans().then(setRows).catch((err) => console.error('flagged scans error', err));
  }, []);

  return (
    <PageScaffold title="Flagged Scans" description="Moderation queue for low-confidence and flagged AI scans" theme={theme}>
      <Table
        theme={theme}
        headers={['Type', 'User', 'Confidence', 'Reason', 'Date']}
        rows={rows.length
          ? rows.map((item) => [String(item.scanType).toUpperCase(), item.userId || '-', `${item.confidence || 0}%`, item.reason || 'Needs review', item.created_at ? new Date(item.created_at?.seconds ? item.created_at.seconds * 1000 : item.created_at).toLocaleString() : '-'])
          : [['No flagged scans', '-', '-', '-', '-']]}
      />
    </PageScaffold>
  );
};
