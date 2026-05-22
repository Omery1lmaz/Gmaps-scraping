import React from 'react';
import { useAuth } from '../../lib/auth';
import { useT } from '../../lib/i18n';
import { ProPlanRestriction } from '../../features/whatsapp/components/ProPlanRestriction';

export function ChatListPage() {
  const { user } = useAuth();
  const t = useT();

  if (user && user.plan === 'free') {
    return <ProPlanRestriction />;
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-black text-white">{t('wp_chats')}</h1>
      <p className="mt-4 text-slate-400">
        Chat list placeholder. Implement chat list UI here.
      </p>
    </div>
  );
}
