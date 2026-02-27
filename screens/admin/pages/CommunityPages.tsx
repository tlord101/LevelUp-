import React, { useEffect, useState } from 'react';
import { deleteCommunityPost, getCommunityGroups, getCommunityPosts } from '../../../services/adminService';
import { PageScaffold, Table, useAdminTheme } from '../components/AdminWidgets';

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
            <button className="rounded-md bg-amber-500/20 px-2 py-1">Shadow-ban</button>
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
  return <PageScaffold title="Reports" description="Reports collection can be added to moderation pipeline" theme={theme}><div className="bg-white rounded-2xl p-4">No reports document source configured yet.</div></PageScaffold>;
};

export const AdminCommunityBlockedPage: React.FC = () => {
  const theme = useAdminTheme();
  return <PageScaffold title="Blocked Users" description="Use User Management > Banned Users to manage blocked users" theme={theme}><div className="bg-white rounded-2xl p-4">Blocked users are controlled from the users collection status field.</div></PageScaffold>;
};
