import React from 'react';
import { Layers, UserPlus, Edit2 } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { cn } from '../../../lib/utils';
import { useT } from '../../../lib/i18n';

interface SessionManagerProps {
  sessions: any[];
  selectedSessionId: string | null;
  setSelectedSessionId: (id: string | null) => void;
  sessionStatuses: Record<string, string>;
  sessionInfos: Record<string, any>;
  editingSessionId: string | null;
  setEditingSessionId: (id: string | null) => void;
  editName: string;
  setEditName: (name: string) => void;
  handleRename: (sessionId: string) => void;
  deleteSession: (sessionId: string) => void;
  logoutSession: (sessionId: string) => void;
  onAddNewSession: () => void;
  setSelectedChatId: (id: string | null) => void;
  currentLimit: number;
}

export function SessionManager({
  sessions,
  selectedSessionId,
  setSelectedSessionId,
  sessionStatuses,
  sessionInfos,
  editingSessionId,
  setEditingSessionId,
  editName,
  setEditName,
  handleRename,
  deleteSession,
  logoutSession,
  onAddNewSession,
  setSelectedChatId,
  currentLimit
}: SessionManagerProps) {
  const t = useT();

  return (
    <div className="rounded-2xl border border-white/5 hover:border-white/10 bg-[#0c1220]/40 backdrop-blur-sm p-4.5 shadow-lg space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-black text-white flex items-center gap-2">
          <Layers size={16} className="text-emerald-500" />
          <span>{t('wp_whatsapp_accounts')} ({sessions.length} / {currentLimit === 10 ? '∞' : currentLimit})</span>
        </h3>
        <Button
          size="sm"
          onClick={onAddNewSession}
          className="h-8.5 bg-emerald-500 hover:bg-emerald-600 text-black font-black text-[11px] rounded-xl px-3.5 gap-1.5 transition active:scale-95 duration-200 shadow-md shadow-emerald-500/10"
        >
          <UserPlus size={13} />
          {t('wp_add_new_account')}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {sessions.map((session: any) => {
          const isSelected = selectedSessionId === session._id;
          const sessStatus = sessionStatuses[session._id] || session.status || 'DISCONNECTED';
          const sessInfo = sessionInfos[session._id] || (session.status === 'CONNECTED' ? { phoneNumber: session.phoneNumber, pushName: session.pushName } : null);
          const isEditing = editingSessionId === session._id;

          return (
            <div
              key={session._id}
              onClick={() => {
                if (!isEditing) {
                  setSelectedSessionId(session._id);
                  setSelectedChatId(null);
                }
              }}
              className={cn(
                "relative flex flex-col p-4 rounded-2xl border transition-all duration-300 cursor-pointer shadow-lg",
                isSelected
                  ? "border-emerald-500/50 bg-emerald-500/10 shadow-emerald-500/20"
                  : "border-white/5 bg-[#0c1220]/60 hover:bg-white/5 hover:border-white/20"
              )}
            >
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex items-center gap-2 min-w-0">
                  <div className={cn(
                    "flex items-center justify-center size-8 rounded-full font-black text-xs",
                    isSelected ? "bg-emerald-500 text-white" : "bg-slate-800 text-slate-400"
                  )}>
                    {session.sessionName?.charAt(0).toUpperCase() || 'W'}
                  </div>
                  {isEditing ? (
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="h-8 w-24 text-xs bg-slate-950 border-white/10"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleRename(session._id);
                        if (e.key === 'Escape') setEditingSessionId(null);
                      }}
                      autoFocus
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <span className="text-sm font-bold text-white truncate">{session.sessionName || t('wp_account')}</span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      setEditingSessionId(session._id); 
                      setEditName(session.sessionName); 
                    }}
                    className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400"
                  >
                    <Edit2 size={12} />
                  </button>
                </div>
              </div>

              <div className="flex-1 space-y-1 mb-3">
                <p className="text-[11px] text-slate-400">{sessInfo?.phoneNumber ? `+${sessInfo.phoneNumber}` : t('wp_number_not_linked')}</p>
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-300">
                  <span className={cn("size-2 rounded-full", sessStatus === 'CONNECTED' ? "bg-emerald-500" : sessStatus === 'QR_READY' ? "bg-amber-400" : "bg-rose-500")} />
                  {sessStatus === 'CONNECTED' ? t('wp_active') : sessStatus === 'QR_READY' ? t('wp_qr_ready') : t('wp_disconnected')}
                </div>
              </div>

              <div className="flex items-center gap-2 pt-3 border-t border-white/5">
                 <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(t('wp_confirm_remove'))) {
                        deleteSession(session._id);
                      }
                    }}
                    className="flex-1 py-1.5 text-[10px] font-bold rounded-lg bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 transition"
                 >
                   {t('wp_remove_account')}
                 </button>
                 {sessStatus === 'CONNECTED' && (
                   <button
                      onClick={(e) => { e.stopPropagation(); logoutSession(session._id); }}
                      className="flex-1 py-1.5 text-[10px] font-bold rounded-lg bg-slate-700/50 text-slate-300 hover:bg-slate-700 transition"
                   >
                     {t('wp_disconnect')}
                   </button>
                 )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
