import React, { useEffect, useState } from 'react';
import { deleteCommunityPost, getBlockedUsers, getCommunityGroups, getCommunityPosts, getCommunityReports, resolveCommunityReport, setUserModerationStatus } from '../../../services/adminService';
import { PageScaffold, Table, shellClass, useAdminTheme } from '../components/AdminWidgets';

export const AdminCommunityPostsPage: React.FC = () => {
  const theme = useAdminTheme();
  const [posts, setPosts] = useState<any[]>([]);

  const load = () => getCommunityPosts().then(setPosts).catch((err) => console.error('posts error', err));
  useEffect(() => { load(); }, []);

  return (
    <PageScaffold title="Posts & Comments" description="Live posts moderation" theme={theme}>
      <Table
        theme={theme}
        headers={['Post', 'Author', 'Likes', 'Actions']}
        rows={posts.map((post) => [
          post.content?.slice(0, 60) || '-',
          post.author_display_name || '-',
          String((post.likes || []).length),
          <div className="flex gap-2">
            <button className="rounded-md bg-rose-500/20 px-2 py-1" onClick={() => deleteCommunityPost(post.id).then(load)}>Remove</button>
            <button className="rounded-md bg-amber-500/20 px-2 py-1" onClick={async () => {
              const targetUser = post.userId || post.user_id;
              if (!targetUser) return;
              await setUserModerationStatus(targetUser, 'shadow-banned', 'Shadow-banned from post moderation panel');
              await load();
            }}>Shadow-ban</button>
          </div>,
        ])}
      />
    </PageScaffold>
  );
};

export const AdminCommunityGroupsPage: React.FC = () => {
  const theme = useAdminTheme();
  const [groups, setGroups] = useState<any[]>([]);
  useEffect(() => { getCommunityGroups().then(setGroups).catch((err) => console.error('groups error', err)); }, []);

  return (
    <PageScaffold title="Groups" description="Live community groups" theme={theme}>
      <Table
        theme={theme}
        headers={['Group', 'Members', 'Owner']}
        rows={groups.map((group) => [group.name || '-', String((group.members || []).length), group.owner_id || '-'])}
      />
    </PageScaffold>
  );
};

export const AdminCommunityReportsPage: React.FC = () => {
  const theme = useAdminTheme();
  const [reports, setReports] = useState<any[]>([]);

  const load = () => getCommunityReports().then(setReports).catch((err) => console.error('reports error', err));
  useEffect(() => { load(); }, []);

  return (
    <PageScaffold title="Reports" description="Moderation reports queue" theme={theme}>
      <Table
        theme={theme}
        headers={['Target', 'Reason', 'Reported By', 'Status', 'Actions']}
        rows={reports.length
          ? reports.map((item) => [
              `${String(item.targetType || 'post').toUpperCase()} • ${item.targetId || '-'}`,
              item.reason || '-',
              item.reportedBy || '-',
              item.status || 'open',
              <div className="flex gap-2">
                <button className="rounded-md bg-emerald-500/20 px-2 py-1" onClick={() => resolveCommunityReport(item.id, 'resolved', 'Resolved by admin').then(load)}>Resolve</button>
                <button className="rounded-md bg-slate-500/20 px-2 py-1" onClick={() => resolveCommunityReport(item.id, 'dismissed', 'Dismissed by admin').then(load)}>Dismiss</button>
              </div>,
            ])
          : [['No reports found', '-', '-', '-', '-']]}
      />
    </PageScaffold>
  );
};

export const AdminCommunityBlockedPage: React.FC = () => {
  const theme = useAdminTheme();
  const [rows, setRows] = useState<any[]>([]);
  const load = () => getBlockedUsers().then(setRows).catch((err) => console.error('blocked users error', err));

  useEffect(() => { load(); }, []);

  return (
    <PageScaffold title="Blocked Users" description="Banned and shadow-banned users" theme={theme}>
      <Table
        theme={theme}
        headers={['User', 'Email', 'Status', 'Reason', 'Actions']}
        rows={rows.length
          ? rows.map((item) => [
              item.display_name || '-',
              item.email || '-',
              item.status || '-',
              item.reason || '-',
              <button className="rounded-md bg-emerald-500/20 px-2 py-1" onClick={() => setUserModerationStatus(item.id, 'active', 'Unblocked by admin').then(load)}>Unblock</button>,
            ])
          : [['No blocked users', '-', '-', '-', '-']]}
      />
    </PageScaffold>
  );
};
