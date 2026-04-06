import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  AdminEmailSettings,
  AdminEmailTemplate,
  getAdminEmailTemplate,
  getAdminEmailTemplates,
  getAdminSettings,
  saveAdminSettings,
  sendAdminTestEmail,
  upsertAdminEmailTemplate,
} from '../../../services/adminService';
import { PageScaffold, Table, Toast, shellClass, useAdminTheme } from '../components/AdminWidgets';

type SeoSettings = {
  pageTitle: string;
  metaKeywords: string[];
  metaDescription: string;
  socialTitle: string;
  socialDescription: string;
  socialImageUrl: string;
  canonicalUrl: string;
  robots: string;
};

const seoDefaults: SeoSettings = {
  pageTitle: 'LevelUp AI - Fitness, Nutrition and AI Coaching',
  metaKeywords: ['fitness', 'ai coach', 'nutrition', 'body scan'],
  metaDescription: 'LevelUp AI helps users improve fitness, nutrition, and self-care with guided AI tools and progress tracking.',
  socialTitle: 'LevelUp AI',
  socialDescription: 'AI-powered fitness and nutrition support for your daily goals.',
  socialImageUrl: '',
  canonicalUrl: '',
  robots: 'index,follow',
};

const seoTagClass = 'inline-flex items-center gap-2 rounded-full bg-indigo-500/20 px-3 py-1 text-sm text-indigo-100 ring-1 ring-indigo-300/30';

export const AdminSettingsSeoPage: React.FC = () => {
  const theme = useAdminTheme();
  const [settings, setSettings] = useState<SeoSettings>(seoDefaults);
  const [keywordInput, setKeywordInput] = useState('');
  const [toast, setToast] = useState('');

  useEffect(() => {
    getAdminSettings('seo').then((raw: any) => {
      if (!raw) return;
      setSettings({
        ...seoDefaults,
        ...raw,
        metaKeywords: Array.isArray(raw.metaKeywords)
          ? raw.metaKeywords.map((item: any) => String(item).trim()).filter(Boolean)
          : seoDefaults.metaKeywords,
      });
    });
  }, []);

  const removeKeyword = (value: string) => {
    setSettings((prev) => ({
      ...prev,
      metaKeywords: prev.metaKeywords.filter((item) => item !== value),
    }));
  };

  const addKeyword = () => {
    const parsed = keywordInput
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);

    if (!parsed.length) return;

    setSettings((prev) => ({
      ...prev,
      metaKeywords: Array.from(new Set([...prev.metaKeywords, ...parsed])),
    }));
    setKeywordInput('');
  };

  const save = async () => {
    await saveAdminSettings('seo', settings);
    setToast('SEO settings saved');
    setTimeout(() => setToast(''), 1500);
  };

  return (
    <PageScaffold title="SEO Configuration" description="Control meta tags and social sharing from admin" theme={theme}>
      <div className={`${shellClass[theme].card} rounded-3xl p-6 md:p-7`}>
        <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
          <div className="space-y-4">
            <div className="overflow-hidden rounded-2xl border border-white/20 bg-gradient-to-br from-slate-900 to-indigo-900 shadow-xl">
              {settings.socialImageUrl ? (
                <img src={settings.socialImageUrl} alt="Social preview" className="h-56 w-full object-cover" />
              ) : (
                <div className="flex h-56 items-center justify-center text-sm text-slate-300">Social preview image</div>
              )}
            </div>

            <label className="block text-sm font-medium">
              Social image URL
              <input
                value={settings.socialImageUrl}
                onChange={(e) => setSettings((prev) => ({ ...prev, socialImageUrl: e.target.value }))}
                placeholder="https://..."
                className={`${shellClass[theme].input} mt-2 w-full rounded-xl px-3 py-2.5`}
              />
            </label>
          </div>

          <div className="space-y-4">
            <label className="block text-sm font-medium">
              Page title
              <input
                value={settings.pageTitle}
                onChange={(e) => setSettings((prev) => ({ ...prev, pageTitle: e.target.value }))}
                className={`${shellClass[theme].input} mt-2 w-full rounded-xl px-3 py-2.5`}
              />
            </label>

            <div>
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <p className="text-sm font-medium">Meta keywords</p>
                <p className={`text-xs ${shellClass[theme].subtle}`}>Use comma to add multiple</p>
              </div>
              <div className={`${shellClass[theme].input} rounded-xl px-3 py-2`}>
                <div className="mb-2 flex flex-wrap gap-2">
                  {settings.metaKeywords.map((keyword) => (
                    <button key={keyword} type="button" className={seoTagClass} onClick={() => removeKeyword(keyword)}>
                      × {keyword}
                    </button>
                  ))}
                </div>
                <input
                  value={keywordInput}
                  onChange={(e) => setKeywordInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addKeyword();
                    }
                  }}
                  placeholder="Add keyword"
                  className="w-full bg-transparent text-sm outline-none"
                />
              </div>
            </div>

            <label className="block text-sm font-medium">
              Meta description
              <textarea
                value={settings.metaDescription}
                onChange={(e) => setSettings((prev) => ({ ...prev, metaDescription: e.target.value }))}
                className={`${shellClass[theme].input} mt-2 h-24 w-full rounded-xl px-3 py-2.5`}
              />
            </label>

            <label className="block text-sm font-medium">
              Social title
              <input
                value={settings.socialTitle}
                onChange={(e) => setSettings((prev) => ({ ...prev, socialTitle: e.target.value }))}
                className={`${shellClass[theme].input} mt-2 w-full rounded-xl px-3 py-2.5`}
              />
            </label>

            <label className="block text-sm font-medium">
              Social description
              <textarea
                value={settings.socialDescription}
                onChange={(e) => setSettings((prev) => ({ ...prev, socialDescription: e.target.value }))}
                className={`${shellClass[theme].input} mt-2 h-24 w-full rounded-xl px-3 py-2.5`}
              />
            </label>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="block text-sm font-medium">
                Canonical URL
                <input
                  value={settings.canonicalUrl}
                  onChange={(e) => setSettings((prev) => ({ ...prev, canonicalUrl: e.target.value }))}
                  placeholder="https://example.com"
                  className={`${shellClass[theme].input} mt-2 w-full rounded-xl px-3 py-2.5`}
                />
              </label>
              <label className="block text-sm font-medium">
                Robots
                <input
                  value={settings.robots}
                  onChange={(e) => setSettings((prev) => ({ ...prev, robots: e.target.value }))}
                  placeholder="index,follow"
                  className={`${shellClass[theme].input} mt-2 w-full rounded-xl px-3 py-2.5`}
                />
              </label>
            </div>

            <div className="flex gap-2">
              <button type="button" onClick={addKeyword} className="rounded-xl border border-indigo-300/30 px-4 py-2 text-sm">Add Keyword</button>
              <button type="button" onClick={save} className="rounded-xl bg-indigo-500 px-4 py-2 text-sm font-semibold text-indigo-50">Save SEO</button>
            </div>
          </div>
        </div>
      </div>
      {toast ? <Toast message={toast} theme={theme} /> : null}
    </PageScaffold>
  );
};

type GlobalTemplateSettings = {
  fromEmail: string;
  fromName: string;
  emailBody: string;
};

const globalDefaults: GlobalTemplateSettings = {
  fromEmail: '',
  fromName: 'LevelUp Support',
  emailBody: [
    'Hello {{fullname}},',
    '',
    '{{message}}',
    '',
    'Regards,',
    '{{username}}',
  ].join('\n'),
};

const shortcodes: Array<[string, string]> = [
  ['{{fullname}}', 'User Fullname'],
  ['{{username}}', 'User Name'],
  ['{{message}}', 'Message'],
];

const emailCardGlass = 'rounded-2xl border border-white/20 bg-white/8 backdrop-blur-xl';

export const AdminEmailGlobalTemplatePage: React.FC = () => {
  const theme = useAdminTheme();
  const [form, setForm] = useState<GlobalTemplateSettings>(globalDefaults);
  const [toast, setToast] = useState('');

  useEffect(() => {
    getAdminSettings('emailGlobalTemplate').then((raw: any) => {
      if (!raw) return;
      setForm({
        fromEmail: raw.fromEmail || '',
        fromName: raw.fromName || 'LevelUp Support',
        emailBody: raw.emailBody || globalDefaults.emailBody,
      });
    });
  }, []);

  const save = async () => {
    await saveAdminSettings('emailGlobalTemplate', form);
    setToast('Global template saved');
    setTimeout(() => setToast(''), 1400);
  };

  return (
    <PageScaffold title="Global Email Template" description="Base template and shared shortcodes" theme={theme}>
      <div className={`${shellClass[theme].card} rounded-3xl p-6 md:p-7 space-y-6`}>
        <Table theme={theme} headers={['Short Code', 'Description']} rows={shortcodes.map((row) => [row[0], row[1]])} />

        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-sm font-medium">
            Email sent from
            <input
              value={form.fromEmail}
              onChange={(e) => setForm((prev) => ({ ...prev, fromEmail: e.target.value }))}
              placeholder="support@yourdomain.com"
              className={`${shellClass[theme].input} mt-2 w-full rounded-xl px-3 py-2.5`}
            />
          </label>

          <label className="text-sm font-medium">
            Sender name
            <input
              value={form.fromName}
              onChange={(e) => setForm((prev) => ({ ...prev, fromName: e.target.value }))}
              className={`${shellClass[theme].input} mt-2 w-full rounded-xl px-3 py-2.5`}
            />
          </label>
        </div>

        <label className="text-sm font-medium block">
          Email body
          <textarea
            value={form.emailBody}
            onChange={(e) => setForm((prev) => ({ ...prev, emailBody: e.target.value }))}
            className={`${shellClass[theme].input} mt-2 h-72 w-full rounded-xl px-3 py-2.5 font-medium`}
          />
        </label>

        <div className="flex items-center justify-between gap-3">
          <p className={`text-xs ${shellClass[theme].subtle}`}>Use the shortcodes above to inject values dynamically.</p>
          <button type="button" onClick={save} className="rounded-xl bg-indigo-500 px-5 py-2.5 text-sm font-semibold text-indigo-50">Update Template</button>
        </div>
      </div>
      {toast ? <Toast message={toast} theme={theme} /> : null}
    </PageScaffold>
  );
};

const defaultTemplates: AdminEmailTemplate[] = [
  {
    key: 'support-ticket-reply',
    name: 'Support Ticket Reply',
    subject: 'Reply Support Ticket',
    status: 'active',
    body: [
      'A member from our support team has replied to the following ticket:',
      '',
      '[Ticket#{{ticket_id}}] {{ticket_subject}}',
      '',
      'Click here to reply: {{link}}',
      '',
      'Here is the reply:',
      '{{reply}}',
    ].join('\n'),
    variables: [
      { key: '{{ticket_id}}', description: 'Support Ticket ID' },
      { key: '{{ticket_subject}}', description: 'Subject of support ticket' },
      { key: '{{reply}}', description: 'Reply from admin team' },
      { key: '{{link}}', description: 'Ticket URL for reply' },
    ],
  },
  {
    key: 'contact-property-owner',
    name: 'Contact Property Owner',
    subject: 'Contact property owner',
    status: 'active',
    body: [
      'Hi {{owner_name}},',
      '',
      '{{message}}',
      '',
      'Regards,',
      '{{sender_name}}',
    ].join('\n'),
    variables: [
      { key: '{{owner_name}}', description: 'Property owner name' },
      { key: '{{sender_name}}', description: 'Sender display name' },
      { key: '{{message}}', description: 'Email message' },
    ],
  },
];

const ensureDefaultEmailTemplates = async () => {
  const existing = await getAdminEmailTemplates();
  if (existing.length) return existing;

  const created = await Promise.all(defaultTemplates.map((item) => upsertAdminEmailTemplate(item)));
  return created;
};

export const AdminEmailTemplatesPage: React.FC = () => {
  const theme = useAdminTheme();
  const navigate = useNavigate();
  const [rows, setRows] = useState<AdminEmailTemplate[]>([]);
  const [query, setQuery] = useState('');

  useEffect(() => {
    ensureDefaultEmailTemplates().then(setRows).catch((err) => console.error('template load error', err));
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((item) => item.name.toLowerCase().includes(q) || item.subject.toLowerCase().includes(q));
  }, [rows, query]);

  return (
    <PageScaffold title="Email Templates" description="Manage subject lines and template content" theme={theme}>
      <div className={`${shellClass[theme].card} rounded-3xl p-6 md:p-7 space-y-4`}>
        <div className="flex items-center justify-end">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search"
            className={`${shellClass[theme].input} w-full max-w-xs rounded-xl px-3 py-2.5`}
          />
        </div>

        <Table
          theme={theme}
          headers={['Name', 'Subject', 'Status', 'Action']}
          rows={filtered.map((item) => [
            item.name,
            item.subject,
            <span key={`${item.id}-status`} className={`rounded-full px-3 py-1 text-xs font-semibold ${item.status === 'active' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'}`}>
              {item.status === 'active' ? 'Active' : 'Inactive'}
            </span>,
            <button
              key={`${item.id}-action`}
              type="button"
              onClick={() => navigate(`/admin/settings/email/templates/${item.id}`)}
              className="rounded-lg bg-indigo-500 px-3 py-1.5 text-xs font-semibold text-indigo-50"
            >
              Edit
            </button>,
          ])}
        />
      </div>
    </PageScaffold>
  );
};

export const AdminEmailTemplateDetailPage: React.FC = () => {
  const theme = useAdminTheme();
  const params = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [template, setTemplate] = useState<AdminEmailTemplate | null>(null);
  const [testRecipient, setTestRecipient] = useState('');
  const [toast, setToast] = useState('');

  useEffect(() => {
    if (!params.id) return;
    getAdminEmailTemplate(params.id).then((item) => {
      if (!item) {
        navigate('/admin/settings/email/templates', { replace: true });
        return;
      }
      setTemplate(item);
    });
  }, [params.id, navigate]);

  if (!template) {
    return <PageScaffold title="Email Template" description="Loading template" theme={theme}><div className={`${shellClass[theme].card} rounded-3xl p-6`}>Loading...</div></PageScaffold>;
  }

  const save = async () => {
    const saved = await upsertAdminEmailTemplate(template);
    setTemplate(saved);
    setToast('Template updated');
    setTimeout(() => setToast(''), 1500);
  };

  const sendTest = async () => {
    if (!testRecipient.trim()) {
      setToast('Enter recipient first');
      setTimeout(() => setToast(''), 1500);
      return;
    }
    try {
      await sendAdminTestEmail(testRecipient.trim());
      setToast('Test email sent');
    } catch (error: any) {
      setToast(error?.message || 'Unable to send test');
    }
    setTimeout(() => setToast(''), 2000);
  };

  return (
    <PageScaffold title={template.name} description="Edit template details and body" theme={theme}>
      <div className={`${shellClass[theme].card} rounded-3xl p-6 md:p-7 space-y-6`}>
        <div className={emailCardGlass}>
          <Table
            theme={theme}
            headers={['Short Code', 'Description']}
            rows={(template.variables || []).map((item) => [item.key, item.description])}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-sm font-medium">
            Subject
            <input
              value={template.subject}
              onChange={(e) => setTemplate((prev) => (prev ? { ...prev, subject: e.target.value } : prev))}
              className={`${shellClass[theme].input} mt-2 w-full rounded-xl px-3 py-2.5`}
            />
          </label>

          <label className="text-sm font-medium">
            Status
            <select
              value={template.status}
              onChange={(e) => setTemplate((prev) => (prev ? { ...prev, status: e.target.value as 'active' | 'inactive' } : prev))}
              className={`${shellClass[theme].input} mt-2 w-full rounded-xl px-3 py-2.5`}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </label>
        </div>

        <label className="text-sm font-medium block">
          Message
          <textarea
            value={template.body}
            onChange={(e) => setTemplate((prev) => (prev ? { ...prev, body: e.target.value } : prev))}
            className={`${shellClass[theme].input} mt-2 h-72 w-full rounded-xl px-3 py-2.5`}
          />
        </label>

        <div className="grid gap-3 md:grid-cols-[1fr_auto_auto]">
          <input
            value={testRecipient}
            onChange={(e) => setTestRecipient(e.target.value)}
            placeholder="Test recipient"
            className={`${shellClass[theme].input} rounded-xl px-3 py-2.5`}
          />
          <button type="button" onClick={sendTest} className="rounded-xl border border-indigo-300/30 px-4 py-2.5 text-sm">Send Test Mail</button>
          <button type="button" onClick={save} className="rounded-xl bg-indigo-500 px-4 py-2.5 text-sm font-semibold text-indigo-50">Submit</button>
        </div>
      </div>
      {toast ? <Toast message={toast} theme={theme} /> : null}
    </PageScaffold>
  );
};

export const AdminEmailConfigurePage: React.FC = () => {
  const theme = useAdminTheme();
  const [form, setForm] = useState<AdminEmailSettings & { method: 'smtp' | 'mailgun' | 'sendgrid'; encryption: 'ssl' | 'tls' | 'none' }>({
    method: 'smtp',
    smtpHost: 'smtp.gmail.com',
    port: '587',
    gmail: '',
    appPassword: '',
    senderName: 'LevelUp Team',
    deliveryWebhookUrl: '',
    deliveryWebhookApiKey: '',
    welcomeEmailEnabled: true,
    encryption: 'ssl',
  });
  const [testRecipient, setTestRecipient] = useState('');
  const [status, setStatus] = useState('');

  useEffect(() => {
    getAdminSettings('email').then((raw: any) => {
      if (!raw) return;
      setForm((prev) => ({
        ...prev,
        ...raw,
        method: (raw.method as 'smtp' | 'mailgun' | 'sendgrid') || prev.method,
        encryption: (raw.encryption as 'ssl' | 'tls' | 'none') || prev.encryption,
      }));
    });
  }, []);

  const update = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const save = async () => {
    await saveAdminSettings('email', form);
    setStatus('Email configuration updated.');
  };

  const sendTest = async () => {
    if (!testRecipient.trim()) {
      setStatus('Enter a recipient to send test mail.');
      return;
    }

    try {
      await sendAdminTestEmail(testRecipient.trim());
      setStatus('Test mail sent successfully.');
    } catch (error: any) {
      setStatus(error?.message || 'Failed to send test mail.');
    }
  };

  return (
    <PageScaffold title="Email Configuration" description="SMTP and provider settings for outgoing email" theme={theme}>
      <div className={`${shellClass[theme].card} rounded-3xl p-6 md:p-7`}>
        <div className="grid gap-6">
          <div className="grid gap-4 md:grid-cols-[1fr_auto]">
            <label className="text-sm font-medium">
              Email send method
              <select value={form.method} onChange={(e) => update('method', e.target.value as any)} className={`${shellClass[theme].input} mt-2 w-full rounded-xl px-3 py-2.5`}>
                <option value="smtp">SMTP</option>
                <option value="mailgun">Mailgun</option>
                <option value="sendgrid">SendGrid</option>
              </select>
            </label>

            <button type="button" onClick={sendTest} className="self-end rounded-xl bg-sky-500 px-4 py-2.5 text-sm font-semibold text-sky-50">Send Test Mail</button>
          </div>

          <div className={`${emailCardGlass} p-4 md:p-5`}>
            <h3 className="text-2xl font-semibold">SMTP Configuration</h3>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <label className="text-sm font-medium">Host
                <input value={form.smtpHost || ''} onChange={(e) => update('smtpHost', e.target.value)} className={`${shellClass[theme].input} mt-2 w-full rounded-xl px-3 py-2.5`} />
              </label>
              <label className="text-sm font-medium">Port
                <input value={form.port || ''} onChange={(e) => update('port', e.target.value)} className={`${shellClass[theme].input} mt-2 w-full rounded-xl px-3 py-2.5`} />
              </label>
              <label className="text-sm font-medium">Encryption
                <select value={form.encryption} onChange={(e) => update('encryption', e.target.value as any)} className={`${shellClass[theme].input} mt-2 w-full rounded-xl px-3 py-2.5`}>
                  <option value="ssl">SSL</option>
                  <option value="tls">TLS</option>
                  <option value="none">None</option>
                </select>
              </label>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <label className="text-sm font-medium">Username
                <input value={form.gmail || ''} onChange={(e) => update('gmail', e.target.value)} className={`${shellClass[theme].input} mt-2 w-full rounded-xl px-3 py-2.5`} />
              </label>
              <label className="text-sm font-medium">Password
                <input type="password" value={form.appPassword || ''} onChange={(e) => update('appPassword', e.target.value)} className={`${shellClass[theme].input} mt-2 w-full rounded-xl px-3 py-2.5`} />
              </label>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <label className="text-sm font-medium">Sender name
                <input value={form.senderName || ''} onChange={(e) => update('senderName', e.target.value)} className={`${shellClass[theme].input} mt-2 w-full rounded-xl px-3 py-2.5`} />
              </label>
              <label className="text-sm font-medium">Test recipient
                <input value={testRecipient} onChange={(e) => setTestRecipient(e.target.value)} className={`${shellClass[theme].input} mt-2 w-full rounded-xl px-3 py-2.5`} />
              </label>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <label className="text-sm font-medium">Delivery webhook URL
                <input value={form.deliveryWebhookUrl || ''} onChange={(e) => update('deliveryWebhookUrl', e.target.value)} className={`${shellClass[theme].input} mt-2 w-full rounded-xl px-3 py-2.5`} />
              </label>
              <label className="text-sm font-medium">Webhook API key
                <input type="password" value={form.deliveryWebhookApiKey || ''} onChange={(e) => update('deliveryWebhookApiKey', e.target.value)} className={`${shellClass[theme].input} mt-2 w-full rounded-xl px-3 py-2.5`} />
              </label>
            </div>

            <label className="mt-4 flex items-center justify-between rounded-xl border border-white/20 p-3 text-sm">
              Send welcome email on signup
              <input type="checkbox" checked={form.welcomeEmailEnabled !== false} onChange={(e) => update('welcomeEmailEnabled', e.target.checked)} />
            </label>
          </div>

          <button type="button" onClick={save} className="rounded-xl bg-indigo-500 px-5 py-2.5 text-sm font-semibold text-indigo-50">Update</button>
          {status ? <p className={`text-sm ${shellClass[theme].subtle}`}>{status}</p> : null}
        </div>
      </div>
    </PageScaffold>
  );
};
