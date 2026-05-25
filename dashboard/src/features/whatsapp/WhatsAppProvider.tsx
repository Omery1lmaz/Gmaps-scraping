import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '../../lib/auth';
import { api } from '../../lib/api';
import { toast } from 'sonner';
import { MessageSquare, AlertCircle, Zap } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface WhatsAppContextType {
  status: string;
  qrCode: string | null;
  connect: (sessionId: string) => void;
  disconnect: (sessionId: string) => void;
  isConnected: boolean;
  unreadCount: number;
  setUnreadCount: React.Dispatch<React.SetStateAction<number>>;
  selectedSessionId: string | null;
  setSelectedSessionId: (id: string | null) => void;
  connectMutation: any;
  disconnectMutation: any;
}

const WhatsAppContext = createContext<WhatsAppContextType | undefined>(undefined);

const WA_ENGINE_URL = import.meta.env.VITE_WA_ENGINE_URL || 'http://localhost:3002';

export function WhatsAppProvider({ children }: { children: React.ReactNode }) {
  const { user, token } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [status, setStatus] = useState<string>('DISCONNECTED');
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(user?.id || null);
  const queryClient = useQueryClient();
  const userId = user?.id;

  const connectMutation = useMutation({
    mutationFn: (sessionId: string) => api.post(`/whatsapp/connect/${sessionId}?force=true`),
    onSuccess: () => {
      setQrCode(null);
      queryClient.invalidateQueries({ queryKey: ['whatsapp-status'] });
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: (sessionId: string) => api.post(`/whatsapp/disconnect/${sessionId}`),
    onSuccess: () => {
      setQrCode(null);
      setStatus('DISCONNECTED');
      queryClient.invalidateQueries({ queryKey: ['whatsapp-status'] });
      toast.success('Bağlantı sıfırlandı');
    },
  });

  // Request browser notification permission
  useEffect(() => {
    if ('Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission().then(permission => {
          if (permission === 'granted') {
            console.log('[WhatsApp-Provider] Notification permission granted.');
          }
        });
      }
    }
  }, []);

  // Fetch initial unread count
  useEffect(() => {
    if (userId && token) {
      const fetchUnread = async () => {
        try {
          const res = await api.get('/whatsapp/unread-count');
          setUnreadCount(res.data.count);
        } catch (e) {}
      };
      fetchUnread();
    }
  }, [userId, token]);

  useEffect(() => {
    if (!userId || !token) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
      return;
    }

    console.log('[WhatsApp-Provider] Initializing global socket connection...');
    const newSocket = io(WA_ENGINE_URL, {
      reconnectionAttempts: 5,
      reconnectionDelay: 3000,
    });
    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('[WhatsApp-Socket] Connected to engine');
      setIsConnected(true);
      newSocket.emit('join', { userId, token, sessionId: selectedSessionId });
    });

    newSocket.on('disconnect', () => {
      console.log('[WhatsApp-Socket] Disconnected');
      setIsConnected(false);
    });

    // Listen for incoming messages from leads for global notifications
    newSocket.on('incoming_message', (data: { 
      sessionId?: string;
      leadId: string | null; 
      businessName: string; 
      content: string; 
      timestamp: string 
    }) => {
      console.log('[WhatsApp-Socket] Incoming message from:', data.businessName);
      
      // Update unread count locally
      setUnreadCount(prev => (prev || 0) + 1);

      // Browser notification
      if (Notification.permission === 'granted' && document.visibilityState !== 'visible') {
        const notification = new Notification(data.businessName, {
          body: data.content,
          icon: '/favicon.svg',
          tag: data.leadId || 'unknown',
        });

        notification.onclick = () => {
          window.focus();
          const queryParam = data.sessionId ? `?sessionId=${data.sessionId}` : '';
          if (data.leadId) {
            window.location.href = `/whatsapp/${data.leadId}${queryParam}`;
          } else {
            window.location.href = `/whatsapp${queryParam}`;
          }
          notification.close();
        };
      }

      // Play a subtle notification sound if possible
      try {
        const audio = new Audio('/notification.mp3');
        audio.play().catch(() => {});
      } catch (e) {}

      toast.custom((t) => (
        <div 
          className="bg-[#0c1220] border border-emerald-500/30 p-4 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex items-start gap-4 animate-in slide-in-from-right duration-500 cursor-pointer hover:bg-[#121a2d] transition-colors"
          onClick={() => {
            const queryParam = data.sessionId ? `?sessionId=${data.sessionId}` : '';
            if (data.leadId) {
              window.location.href = `/whatsapp/${data.leadId}${queryParam}`;
            } else {
              window.location.href = `/whatsapp${queryParam}`;
            }
            toast.dismiss(t);
          }}
        >
          <div className="w-12 h-12 bg-emerald-500/10 text-emerald-500 rounded-xl flex items-center justify-center border border-emerald-500/20 shrink-0 shadow-lg shadow-emerald-500/5">
            <MessageSquare size={24} className="animate-pulse" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
               <h4 className="text-sm font-black text-white uppercase tracking-tight truncate">{data.businessName}</h4>
               <span className="text-[9px] font-black text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded-md border border-emerald-500/20">YENİ</span>
            </div>
            <p className="text-xs text-slate-400 font-bold line-clamp-2 mt-1 leading-relaxed">
              {data.content}
            </p>
            <div className="flex items-center gap-2 mt-2.5">
               <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Yanıtla</span>
               <span className="text-[8px] text-slate-600">•</span>
               <span className="text-[9px] font-bold text-slate-500 italic">Hemen şimdi</span>
            </div>
          </div>
        </div>
      ), { duration: 8000, position: 'top-right' });

      // Invalidate relevant queries globally
      queryClient.invalidateQueries({ queryKey: ['wa-chats'] });
      if (data.leadId) {
        queryClient.invalidateQueries({ queryKey: ['lead', data.leadId] });
      }
      queryClient.invalidateQueries({ queryKey: ['wa-messages'] });
    });

    // Listen for generic whatsapp_message for real-time list updates
    newSocket.on('whatsapp_message', (data: any) => {
      console.log('[WhatsApp-Socket] Real-time message sync event');
      queryClient.invalidateQueries({ queryKey: ['wa-chats'] });
      queryClient.invalidateQueries({ queryKey: ['wa-messages'] });
    });

    newSocket.on('qr', (data) => {
      if (data.qr) {
        setQrCode(data.qr);
        setStatus('QR_READY');
      }
    });

    newSocket.on('authenticated', () => {
      setStatus('AUTHENTICATED');
      setQrCode(null);
    });

    newSocket.on('ready', (data) => {
      setStatus('CONNECTED');
      setQrCode(null);
      queryClient.invalidateQueries({ queryKey: ['whatsapp-status'] });
    });

    newSocket.on('wa_error', (data) => {
      toast.error(data.message || 'WhatsApp hatası oluştu');
      setStatus('ERROR');
    });

    return () => {
      newSocket.close();
    };
  }, [userId, token, selectedSessionId, queryClient]);

  return (
    <WhatsAppContext.Provider value={{ 
      status, 
      qrCode, 
      connect: (id) => connectMutation.mutate(id),
      disconnect: (id) => disconnectMutation.mutate(id),
      isConnected, 
      unreadCount, 
      setUnreadCount,
      selectedSessionId,
      setSelectedSessionId,
      connectMutation,
      disconnectMutation
    }}>
      {children}
    </WhatsAppContext.Provider>
  );
}

export function useWhatsApp() {
  const context = useContext(WhatsAppContext);
  if (context === undefined) {
    throw new Error('useWhatsApp must be used within a WhatsAppProvider');
  }
  return context;
}
