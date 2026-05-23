import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import {
  X,
  Phone,
  Globe,
  MapPin,
  Clock,
  User as UserIcon,
  Tag as TagIcon,
  Plus,
  MessageSquare,
  Building2,
  Calendar,
  ChevronRight,
  History,
  Sparkles,
  Zap,
  ShieldCheck,
  Loader2,
  Pencil,
  Trash2,
  Check,
  Lock
} from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetClose
} from '../../components/ui/sheet';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { ScrollArea } from '../../components/ui/scroll-area';
import { Textarea } from '../../components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '../../components/ui/select';
import { useUIStore } from '../../lib/store';
import { useAuth } from '../../lib/auth';
import { getLead, updateLead, addNote, updateNote, deleteNote, createMeeting } from '../../lib/api';

import { cn, safeFormatDate } from '../../lib/utils';
import { toast } from 'sonner';
import { AIPersonalizer } from '../../components/AIPersonalizer';
import { useT } from '../../lib/i18n';

const API_URL = 'http://localhost:3001/api';

export function LeadDrawer() {
  const { user } = useAuth();
  const { selectedLeadId, setSelectedLeadId, isDrawerOpen, setDrawerOpen } = useUIStore();
  const queryClient = useQueryClient();
  const [newNote, setNewNote] = useState('');
  const t = useT();

  // Edit mode states
  const [isEditMode, setIsEditMode] = useState(false);
  const [editBusinessName, setEditBusinessName] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editWebsite, setEditWebsite] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editStatus, setEditStatus] = useState('');

  const updateLeadMutation = useMutation({
    mutationFn: (updatedFields: any) => updateLead(selectedLeadId!, updatedFields),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead', selectedLeadId] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      setIsEditMode(false);
      toast.success(t('ld_updated'));
    },
    onError: () => {
      toast.error(t('ld_update_error'));
    }
  });

  // WhatsApp Message State
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [selectedSequenceId, setSelectedSequenceId] = useState<string>('');
  const [messageContent, setMessageContent] = useState<string>('');
  const [isSending, setIsSending] = useState(false);

  const { data: lead, isLoading } = useQuery({
    queryKey: ['lead', selectedLeadId],
    queryFn: () => getLead(selectedLeadId!),
    enabled: !!selectedLeadId,
  });

  const { data: templates = [] } = useQuery({
    queryKey: ['templates'],
    queryFn: async () => {
      const response = await api.get('/templates');
      return response.data;
    },
    enabled: isDrawerOpen
  });

  const { data: sequences = [] } = useQuery({
    queryKey: ['sequences'],
    queryFn: async () => {
      const response = await api.get('/sequences');
      return response.data;
    },
    enabled: isDrawerOpen
  });

  const noteMutation = useMutation({
    mutationFn: (content: string) => addNote(selectedLeadId!, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead', selectedLeadId] });
      setNewNote('');
    },
  });

  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingNoteContent, setEditingNoteContent] = useState<string>('');

  // Meeting form state
  const [meetingTitle, setMeetingTitle] = useState('');
  const [meetingDate, setMeetingDate] = useState('');
  const [meetingTime, setMeetingTime] = useState('10:00');
  const [meetingNotes, setMeetingNotes] = useState('');

  const meetingMutation = useMutation({
    mutationFn: (data: any) => createMeeting(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead', selectedLeadId] });
      queryClient.invalidateQueries({ queryKey: ['meetings'] });
      setMeetingTitle('');
      setMeetingNotes('');
      toast.success(t('ld_meeting_scheduled', 'Toplantı başarıyla planlandı!'));
    },
    onError: () => {
      toast.error(t('ld_meeting_error', 'Toplantı planlanırken bir hata oluştu.'));
    }
  });

  const editNoteMutation = useMutation({
    mutationFn: ({ noteId, content }: { noteId: string; content: string }) => 
      updateNote(selectedLeadId!, noteId, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead', selectedLeadId] });
      setEditingNoteId(null);
      setEditingNoteContent('');
      toast.success(t('ld_note_updated'));
    },
    onError: () => {
      toast.error(t('ld_note_update_err'));
    }
  });

  const deleteNoteMutation = useMutation({
    mutationFn: (noteId: string) => deleteNote(selectedLeadId!, noteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead', selectedLeadId] });
      toast.success(t('ld_note_deleted'));
    },
    onError: () => {
      toast.error(t('ld_note_del_err'));
    }
  });

  const enrollMutation = useMutation({
    mutationFn: async (sequenceId: string) => {
      return api.post(`/leads/${selectedLeadId}/sequences`, { sequenceId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead', selectedLeadId] });
      toast.success(t('ld_seq_added'));
      setSelectedSequenceId('');
    }
  });

  const analyzeMutation = useMutation({
    mutationFn: async () => {
      if (user && user.plan === 'free') {
        throw new Error('AI Analizi sadece PRO üyelerimiz içindir.');
      }
      return api.post(`/ai/analyze-lead/${selectedLeadId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead', selectedLeadId] });
      toast.success(t('ld_ai_analysis_complete'));
    },
    onError: (err: any) => {
      if (err.message.includes('PRO')) {
        toast.error(err.message, {
          action: {
            label: 'Yükselt',
            onClick: () => window.location.href = '/billing'
          }
        });
      } else {
        toast.error(t('ld_ai_analysis_error'));
      }
    }
  });


  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplateId(templateId);
    const template = templates.find((t: any) => t.id === templateId);
    if (template && lead) {
      let content = template.content;
      const vars = {
        businessName: lead.businessName || '',
        city: lead.city || '',
        category: lead.category || '',
        rating: lead.rating?.toString() || '',
        website: lead.website || '',
        phone: lead.phone || ''
      };

      Object.entries(vars).forEach(([key, value]) => {
        content = content.replace(new RegExp(`{${key}}`, 'g'), value);
      });
      setMessageContent(content);
    }
  };

  const handleSendMessage = async () => {
    if (!messageContent || !lead?.id) return;

    if (user && user.plan === 'free') {
      toast.error('Panel üzerinden WhatsApp mesajı göndermek sadece PRO üyelerimiz içindir.', {
        action: {
          label: 'Yükselt',
          onClick: () => window.location.href = '/billing'
        }
      });
      return;
    }

    setIsSending(true);
    try {
      await api.post('/whatsapp/enqueue', {
        leadId: lead.id,
        content: messageContent
      });
      toast.success(t('ld_msg_enqueued'));
      setMessageContent('');
      setSelectedTemplateId('');
      queryClient.invalidateQueries({ queryKey: ['lead', selectedLeadId] });
    } catch (error) {
      toast.error(t('ld_msg_send_error'));
    } finally {
      setIsSending(false);
    }
  };


  if (!selectedLeadId) return null;

  return (
    <Sheet open={isDrawerOpen} onOpenChange={setDrawerOpen}>
      <SheetContent
        side="right"
        className="sm:max-w-xl p-0 overflow-hidden flex flex-col border-l border-slate-200/60 dark:border-slate-800 bg-slate-50/95 dark:bg-slate-950/95 backdrop-blur-xl shadow-2xl"
      >
        {isLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-slate-400">
            <div className="relative flex items-center justify-center">
              <Loader2 className="animate-spin size-8 text-emerald-500" />
              <div className="absolute size-4 bg-emerald-500/10 rounded-full animate-ping" />
            </div>
            <span className="text-xs font-black tracking-wide text-slate-500 dark:text-slate-400 uppercase">Detaylar Yükleniyor...</span>
          </div>
        ) : lead && (
          <>
            {/* Drawer Premium Header */}
            <div className="p-6 bg-white dark:bg-slate-900/50 border-b border-slate-200/60 dark:border-slate-800 space-y-4 shrink-0 shadow-3xs">
              <div className="flex items-start justify-between">
                <div className="space-y-1.5 flex-1 min-w-0">
                  {isEditMode ? (
                    <div className="space-y-2 mt-1 pr-4">
                      <div className="flex flex-col gap-1">
                        <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">İşletme Adı</label>
                        <input
                          type="text"
                          value={editBusinessName}
                          onChange={(e) => setEditBusinessName(e.target.value)}
                          className="w-full h-8 px-2.5 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 outline-none transition-all"
                          placeholder="İşletme Adı"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Kategori</label>
                        <input
                          type="text"
                          value={editCategory}
                          onChange={(e) => setEditCategory(e.target.value)}
                          className="w-full h-8 px-2.5 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 outline-none transition-all"
                          placeholder="Kategori"
                        />
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2">
                        <div className="bg-emerald-500/10 p-2 rounded-lg border border-emerald-500/20">
                          <Building2 className="size-5 text-emerald-500" />
                        </div>
                        <SheetTitle className="text-xl font-black text-slate-800 dark:text-white dark:text-white tracking-tight truncate leading-tight">
                          {lead.businessName || lead.name}
                        </SheetTitle>
                      </div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">
                        {lead.category || 'Belirtilmemiş Kategori'}
                      </p>
                    </>
                  )}
                </div>
                
                <div className="flex items-center ml-4 shrink-0">
                  {!isEditMode ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setEditBusinessName(lead.businessName || lead.name || '');
                        setEditCategory(lead.category || '');
                        setEditPhone(lead.phone || '');
                        setEditWebsite(lead.website || '');
                        setEditAddress(lead.address || '');
                        setEditStatus(lead.status || 'NEW');
                        setIsEditMode(true);
                      }}
                      className="rounded-full hover:bg-slate-100/80 transition-colors h-9 w-9 p-0 mr-1"
                      title="Bilgileri Düzenle"
                    >
                      <Pencil className="size-4.5 text-slate-500 hover:text-slate-700" />
                    </Button>
                  ) : (
                    <div className="flex items-center gap-1 mr-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsEditMode(false)}
                        className="h-8 text-[11px] font-black text-slate-500 hover:bg-slate-100 rounded-xl px-2.5"
                        disabled={updateLeadMutation.isPending}
                      >
                        İptal
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => {
                          updateLeadMutation.mutate({
                            businessName: editBusinessName,
                            name: editBusinessName,
                            category: editCategory,
                            phone: editPhone,
                            website: editWebsite,
                            address: editAddress,
                            status: editStatus
                          });
                        }}
                        className="h-8 text-[11px] font-black bg-emerald-500 hover:bg-emerald-600 text-black font-extrabold rounded-xl px-3 shadow-md shadow-emerald-500/10"
                        disabled={updateLeadMutation.isPending}
                      >
                        {updateLeadMutation.isPending ? (
                          <Loader2 className="animate-spin size-3" />
                        ) : (
                          <Check className="size-3 mr-0.5" />
                        )}
                        Kaydet
                      </Button>
                    </div>
                  )}
                  <SheetClose>
                    <Button variant="ghost" size="icon" className="rounded-full hover:bg-slate-100/80 transition-colors h-9 w-9 p-0">
                      <X className="size-5 text-slate-500" />
                    </Button>
                  </SheetClose>
                </div>
              </div>

              {/* Status & Custom Tags Row */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                {isEditMode ? (
                  <div className="flex flex-col gap-1 w-full max-w-[200px]">
                    <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Durum (Status)</label>
                    <select
                      value={editStatus}
                      onChange={(e) => setEditStatus(e.target.value)}
                      className="w-full h-8 px-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 outline-none transition-all cursor-pointer"
                    >
                      <option value="NEW">NEW</option>
                      <option value="CONTACTED">CONTACTED</option>
                      <option value="FOLLOW_UP">FOLLOW UP</option>
                      <option value="MEETING_BOOKED">MEETING BOOKED</option>
                      <option value="CLOSED">CLOSED</option>
                    </select>
                  </div>
                ) : (
                  <Badge className={cn(
                    "border-none font-black uppercase text-[9px] px-2.5 py-1 shadow-3xs flex items-center gap-1.5 rounded-full",
                    lead.status === 'NEW' ? 'bg-emerald-500 text-white' :
                      lead.status === 'CONTACTED' ? 'bg-indigo-600 text-white' :
                        lead.status === 'FOLLOW_UP' ? 'bg-amber-500 text-white' :
                          lead.status === 'MEETING_BOOKED' ? 'bg-emerald-600 text-white' :
                            lead.status === 'CLOSED' ? 'bg-purple-600 text-white' : 'bg-slate-500 text-white'
                  )}>
                    <div className="size-1.5 bg-white dark:bg-slate-900/50 rounded-full animate-pulse" />
                    {(lead.status || 'NEW').replace('_', ' ')}
                  </Badge>
                )}
                {lead.tags?.map((tag: any) => (
                  <Badge
                    key={tag.id}
                    style={{ backgroundColor: tag.color + '15', color: tag.color, borderColor: tag.color + '30' }}
                    className="border font-black uppercase text-[9px] px-2.5 py-1 rounded-full shadow-3xs"
                  >
                    <TagIcon className="size-2.5 mr-1" /> {tag.name}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Scrollable Body Content */}
            <ScrollArea className="flex-1 min-h-0">
              <div className="p-6 space-y-6">

                {/* Contact Info Redesigned as Luxury Bordered Cards */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1 p-3.5 bg-white dark:bg-slate-900/50 rounded-xl border border-slate-200/50 dark:border-slate-800 border-l-4 border-l-emerald-500 shadow-3xs hover:shadow-xs transition-shadow duration-300">
                    <div className="flex items-center gap-1.5 text-slate-400">
                      <Phone className="size-3.5 text-emerald-500" />
                      <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Telefon</span>
                    </div>
                    {isEditMode ? (
                      <input
                        type="text"
                        value={editPhone}
                        onChange={(e) => setEditPhone(e.target.value)}
                        className="w-full h-8 px-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 focus:bg-white dark:focus:bg-slate-800 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 outline-none transition-all"
                        placeholder="Telefon Numarası"
                      />
                    ) : (
                      <div className="text-xs font-bold text-slate-700 dark:text-slate-300 select-all">{lead.phone || 'Girilmemiş'}</div>
                    )}
                  </div>

                  <div className="space-y-1 p-3.5 bg-white dark:bg-slate-900/50 rounded-xl border border-slate-200/50 dark:border-slate-800 border-l-4 border-l-emerald-500 shadow-3xs hover:shadow-xs transition-shadow duration-300">
                    <div className="flex items-center gap-1.5 text-slate-400">
                      <Globe className="size-3.5 text-emerald-500" />
                      <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Web Sitesi</span>
                    </div>
                    {isEditMode ? (
                      <input
                        type="text"
                        value={editWebsite}
                        onChange={(e) => setEditWebsite(e.target.value)}
                        className="w-full h-8 px-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 focus:bg-white dark:focus:bg-slate-800 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 outline-none transition-all"
                        placeholder="Web Sitesi URL"
                      />
                    ) : lead.website ? (
                      <a
                        href={lead.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-bold text-emerald-500 truncate block hover:underline hover:text-emerald-400"
                      >
                        {lead.website}
                      </a>
                    ) : (
                      <div className="text-xs font-bold text-slate-400">Girilmemiş</div>
                    )}
                  </div>

                  <div className="col-span-2 space-y-1 p-3.5 bg-white dark:bg-slate-900/50 rounded-xl border border-slate-200/50 dark:border-slate-800 border-l-4 border-l-indigo-500 shadow-3xs hover:shadow-xs transition-shadow duration-300">
                    <div className="flex items-center gap-1.5 text-slate-400">
                      <MapPin className="size-3.5 text-indigo-500" />
                      <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Adres Bilgisi</span>
                    </div>
                    {isEditMode ? (
                      <textarea
                        value={editAddress}
                        onChange={(e) => setEditAddress(e.target.value)}
                        className="w-full min-h-[60px] p-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 focus:bg-white dark:focus:bg-slate-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 outline-none transition-all resize-none"
                        placeholder="Adres Bilgisi"
                      />
                    ) : (
                      <div className="text-xs font-bold text-slate-700 dark:text-slate-300 select-all leading-relaxed">{lead.address || 'Girilmemiş'}</div>
                    )}
                  </div>
                </div>

                {/* AI Intelligence Center */}
                <div className="bg-white dark:bg-slate-900/50 rounded-2xl border border-slate-200/50 dark:border-slate-800 p-5 space-y-4 shadow-3xs">
                  <div className="flex items-center justify-between">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <Sparkles className="size-4 text-emerald-500 animate-pulse" /> AI Zekası & Analiz
                    </h3>
                    {user?.plan === 'free' ? (
                       <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-black text-[8px] uppercase px-2 py-0.5 rounded-full flex items-center gap-1">
                         <Lock className="size-2.5" /> Starter Gerekli
                       </Badge>
                    ) : !lead.aiQualityScore && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 text-[9px] font-black text-emerald-500 uppercase hover:bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-3 transition-colors"
                        onClick={() => analyzeMutation.mutate()}
                        disabled={analyzeMutation.isPending}
                      >
                        {analyzeMutation.isPending ? (
                          <>
                            <Loader2 className="animate-spin size-3 mr-1" />
                            Analiz Ediliyor...
                          </>
                        ) : (
                          'AI Analizi Başlat'
                        )}
                      </Button>
                    )}
                  </div>

                  {user?.plan === 'free' ? (
                     <div className="p-4 text-center bg-slate-50/60 dark:bg-slate-800/50 rounded-xl border border-dashed border-slate-200/80 dark:border-slate-700">
                        <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-2">
                          AI analiz özelliğini kullanabilmek için planınızı en az Starter paketine yükseltin.
                        </p>
                        <Button 
                          onClick={() => window.location.href = '/billing'}
                          className="h-7 text-[8px] font-black uppercase bg-emerald-500 hover:bg-emerald-600 text-black rounded-lg px-2 shadow-xs"
                        >
                          Planları İncele
                        </Button>
                     </div>
                  ) : lead.aiQualityScore ? (
                    <div className="space-y-4 animate-fade-in">
                      <div className="grid grid-cols-3 gap-3">
                        <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20 flex flex-col items-center text-center">
                          <p className="text-[9px] font-black text-emerald-500 uppercase tracking-wider mb-1">Skor</p>
                          <div className="text-lg font-black text-emerald-500">{lead.aiQualityScore}%</div>
                        </div>
                        <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-100/50 flex flex-col items-center text-center">
                          <p className="text-[9px] font-black text-emerald-500 uppercase tracking-wider mb-1">Yanıt İhtimali</p>
                          <div className="text-lg font-black text-emerald-600">{lead.aiResponseLikelihood}%</div>
                        </div>
                        <div className="p-3 bg-purple-50/50 rounded-xl border border-purple-100/50 flex flex-col items-center text-center">
                          <p className="text-[9px] font-black text-purple-500 uppercase tracking-wider mb-1">Uyum Seviyesi</p>
                          <div className="text-xs font-black text-purple-600 uppercase pt-1">{lead.aiOutreachFit}</div>
                        </div>
                      </div>
                      {lead.aiAnalysisSummary && (
                        <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200/50 dark:border-slate-800 relative">
                          <div className="absolute top-2 right-2 text-slate-300">
                            <Sparkles className="size-3" />
                          </div>
                          <p className="text-xs font-bold text-slate-600 dark:text-slate-300 italic leading-relaxed pl-1">
                            "{lead.aiAnalysisSummary}"
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="p-6 text-center bg-slate-50/60 dark:bg-slate-800/50 rounded-xl border border-dashed border-slate-200/80 dark:border-slate-700">
                      <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
                        İşletmenin AI uyumunu, yanıt alma oranını ve özetini görmek için hızlı analiz başlatın.
                      </p>
                    </div>
                  )}
                </div>

                {/* Assignment - Assigned To */}
                <div className="bg-white dark:bg-slate-900/50 rounded-2xl border border-slate-200/50 dark:border-slate-800 p-4 space-y-3 shadow-3xs">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                    <UserIcon className="size-3.5 text-slate-400" /> Sorumlu Kişi
                  </h3>
                  <div className="flex items-center gap-3 p-2 bg-slate-50/50 dark:bg-slate-800/50 rounded-xl border border-slate-200/30 dark:border-slate-700">
                    {lead.assignedTo ? (
                      <>
                        <img
                          src={lead.assignedTo.avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${lead.assignedTo.name}`}
                          className="size-9 rounded-full ring-2 ring-white shadow-3xs"
                          alt=""
                        />
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-slate-800 dark:text-white dark:text-white">{lead.assignedTo.name}</div>
                          <div className="text-[10px] font-medium text-slate-400 truncate">{lead.assignedTo.email}</div>
                        </div>
                      </>
                    ) : (
                      <Button variant="ghost" className="w-full justify-start text-slate-400 italic font-bold text-xs h-9 hover:bg-slate-100/50">
                        Henüz atama yapılmadı...
                      </Button>
                    )}
                  </div>
                </div>

                {/* Apple & Linear Styled Tabs Container */}
                <Tabs defaultValue="notes" className="w-full flex flex-col">
                  <TabsList className="grid w-full grid-cols-4 bg-slate-200/60 p-1 rounded-xl h-11 border border-slate-200/30 shadow-3xs shrink-0">
                    <TabsTrigger value="notes" className="rounded-lg font-bold text-xs data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-sm transition-all duration-300">Notlar</TabsTrigger>
                    <TabsTrigger value="activity" className="rounded-lg font-bold text-xs data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-sm transition-all duration-300">Aktiviteler</TabsTrigger>
                    <TabsTrigger value="whatsapp" className="rounded-lg font-bold text-xs data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-sm transition-all duration-300">WhatsApp</TabsTrigger>
                    <TabsTrigger value="meetings" className="rounded-lg font-bold text-xs data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-sm transition-all duration-300">Toplantı</TabsTrigger>
                  </TabsList>

                  {/* Notes Tab Content */}
                  <TabsContent value="notes" className="space-y-4 pt-4 animate-fade-in">
                    <div className="bg-white dark:bg-slate-900/50 rounded-2xl border border-slate-200/50 dark:border-slate-800 p-4 space-y-3 shadow-3xs">
                      <Textarea
                        placeholder="İşletmeyle ilgili bir not girin..."
                        className="rounded-xl border-slate-200 dark:border-slate-700 focus-visible:ring-4 focus-visible:ring-emerald-500/10 focus-visible:border-emerald-500 min-h-[90px] text-xs font-bold shadow-3xs bg-slate-50/20 dark:bg-slate-800/50"
                        value={newNote}
                        onChange={(e) => setNewNote(e.target.value)}
                      />
                      <Button
                        className="w-full bg-emerald-500 hover:bg-emerald-600 text-black font-extrabold h-10 rounded-xl shadow-lg shadow-emerald-500/15 hover:shadow-emerald-500/25 active:scale-[0.99] transition-all"
                        onClick={() => noteMutation.mutate(newNote)}
                        disabled={!newNote.trim() || noteMutation.isPending}
                      >
                        {noteMutation.isPending ? (
                          <Loader2 className="animate-spin size-4 mr-2" />
                        ) : (
                          <Plus className="size-4 mr-2" />
                        )}
                        Notu Kaydet
                      </Button>
                    </div>

                    <div className="space-y-3">
                      {lead.notes && lead.notes.length > 0 ? (
                        lead.notes.map((note: any) => {
                          const isEditing = editingNoteId === note.id;
                          return (
                            <div 
                              key={note.id} 
                              className="p-4 bg-white dark:bg-slate-900/50 rounded-xl border border-slate-200/40 dark:border-slate-800 shadow-3xs space-y-2 relative group hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-200"
                            >
                              {isEditing ? (
                                <div className="space-y-2 animate-fade-in">
                                  <Textarea
                                    className="rounded-xl border-slate-200 dark:border-slate-700 focus-visible:ring-4 focus-visible:ring-emerald-500/10 focus-visible:border-emerald-500 min-h-[70px] text-xs font-bold shadow-3xs bg-slate-50/20 dark:bg-slate-800/50"
                                    value={editingNoteContent}
                                    onChange={(e) => setEditingNoteContent(e.target.value)}
                                  />
                                  <div className="flex justify-end gap-1.5">
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-7 w-7 p-0 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                                      onClick={() => {
                                        setEditingNoteId(null);
                                        setEditingNoteContent('');
                                      }}
                                    >
                                      <X className="size-3.5" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      className="h-7 px-3 rounded-lg bg-emerald-500 text-black hover:bg-emerald-600 text-[10px] font-extrabold shadow-sm"
                                      onClick={() => editNoteMutation.mutate({ noteId: note.id, content: editingNoteContent })}
                                      disabled={!editingNoteContent.trim() || editNoteMutation.isPending}
                                    >
                                      {editNoteMutation.isPending ? (
                                        <Loader2 className="animate-spin size-3 mr-1" />
                                      ) : (
                                        <Check className="size-3 mr-1" />
                                      )}
                                      Kaydet
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  {/* Hover Actions */}
                                  <div className="absolute right-3 top-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-7 w-7 p-0 rounded-lg text-slate-400 hover:text-emerald-500 hover:bg-emerald-500/10"
                                      onClick={() => {
                                        setEditingNoteId(note.id);
                                        setEditingNoteContent(note.content);
                                      }}
                                    >
                                      <Pencil className="size-3.5" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-7 w-7 p-0 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50/50"
                                      onClick={() => {
                                        if (confirm('Bu notu silmek istediğinize emin misiniz?')) {
                                          deleteNoteMutation.mutate(note.id);
                                        }
                                      }}
                                    >
                                      <Trash2 className="size-3.5" />
                                    </Button>
                                  </div>

                                  <p className="text-xs text-slate-700 dark:text-slate-300 font-semibold leading-relaxed pr-14 whitespace-pre-wrap">{note.content}</p>
                                  <div className="text-[9px] font-black text-slate-400 flex items-center gap-1">
                                    <Clock className="size-3 text-slate-300" /> {safeFormatDate(note.createdAt, 'dd MMM yyyy HH:mm')}
                                  </div>
                                </>
                              )}
                            </div>
                          );
                        })
                      ) : (
                        <div className="p-8 text-center bg-white dark:bg-slate-900/50 border border-slate-200/40 dark:border-slate-800 rounded-2xl shadow-3xs">
                          <p className="text-xs font-bold text-slate-400">Henüz kaydedilmiş not bulunmuyor.</p>
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  {/* Activity Logs (Linear styled Timeline) */}
                  <TabsContent value="activity" className="pt-4 animate-fade-in">
                    <div className="bg-white dark:bg-slate-900/50 rounded-2xl border border-slate-200/50 dark:border-slate-800 p-5 shadow-3xs">
                      {lead.activities && lead.activities.length > 0 ? (
                        <div className="relative pl-6 space-y-6 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-100 dark:before:bg-slate-800">
                          {lead.activities.map((activity: any) => (
                            <div key={activity.id} className="relative">
                              <div className={cn(
                                "absolute -left-[30px] top-0 size-6 rounded-full border-4 border-white flex items-center justify-center shadow-xs",
                                activity.type === 'CREATED' ? 'bg-emerald-500' :
                                  activity.type === 'STATUS_CHANGE' ? 'bg-emerald-500' :
                                    activity.type === 'AUTOMATION_STOPPED' ? 'bg-amber-500' : 'bg-slate-400'
                              )}>
                                <History className="size-3 text-white" />
                              </div>
                              <div className="space-y-1">
                                <p className="text-xs font-bold text-slate-800 dark:text-white dark:text-white leading-tight">{activity.description}</p>
                                <p className="text-[9px] font-black text-slate-400 flex items-center gap-1 mt-0.5">
                                  <Calendar className="size-2.5 text-slate-300" />
                                  {safeFormatDate(activity.createdAt, 'dd MMM yyyy HH:mm')}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-8 text-center">
                          <p className="text-xs font-bold text-slate-400">Aktivite geçmişi bulunmuyor.</p>
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  {/* WhatsApp Hub */}
                  <TabsContent value="whatsapp" className="pt-4 space-y-5 animate-fade-in">

                    {/* Automation Alert Banner */}
                    {lead.leadSequenceStates?.some((s: any) => s.status === 'ACTIVE') && (
                      <div className="p-4 bg-gradient-to-r from-amber-50 to-orange-50/50 rounded-xl border border-amber-100/60 flex items-center justify-between shadow-3xs">
                        <div className="flex items-center gap-3">
                          <div className="bg-amber-500 p-2 rounded-xl text-white shadow-sm shadow-amber-500/20">
                            <Zap className="size-4 animate-bounce" />
                          </div>
                          <div>
                            <p className="text-[10px] font-black text-amber-800 uppercase tracking-wider">Otomasyon Aktif</p>
                            <p className="text-[11px] font-bold text-amber-600 mt-0.5">Dizi: {lead.leadSequenceStates.find((s: any) => s.status === 'ACTIVE').sequence.name}</p>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm" className="h-8 text-[10px] font-black text-amber-700 uppercase hover:bg-amber-100/80 rounded-xl border border-amber-200/50">Durdur</Button>
                      </div>
                    )}

                    {/* Sequence Enrollment */}
                    <div className="space-y-3 p-4 bg-white dark:bg-slate-900/50 rounded-xl border border-slate-200/50 dark:border-slate-800 shadow-3xs">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <Zap size={14} className="text-amber-500" />
                          <h4 className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">WhatsApp Dizi Başlat</h4>
                        </div>
                        {(user?.plan === 'free' || user?.plan === 'starter') && (
                          <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-black text-[8px] uppercase px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Lock className="size-2.5" /> Growth Gerekli
                          </Badge>
                        )}
                      </div>
                      
                      {user?.plan === 'free' || user?.plan === 'starter' ? (
                        <div className="p-3 text-center bg-slate-50/50 dark:bg-slate-800/50 rounded-xl border border-dashed border-slate-200/50 dark:border-slate-700">
                          <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-2">
                            Otomatik takip dizileri Growth paketine özeldir.
                          </p>
                          <Button 
                            onClick={() => window.location.href = '/billing'}
                            className="h-7 text-[8px] font-black uppercase bg-emerald-500 text-black rounded-lg px-2"
                          >
                            Yükselt
                          </Button>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <select
                            value={selectedSequenceId}
                            onChange={(e) => setSelectedSequenceId(e.target.value)}
                            className="flex-1 h-10 px-3 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-50/50 dark:bg-slate-800/50 hover:bg-slate-50 focus:bg-white dark:focus:bg-slate-800 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all cursor-pointer shadow-3xs"
                          >
                            <option value="">Bir dizi seçin...</option>
                            {sequences.map((s: any) => (
                              <option key={s.id} value={s.id}>
                                {s.name}
                              </option>
                            ))}
                          </select>
                          <Button
                            className="bg-amber-500 hover:bg-amber-600 text-white font-bold h-10 text-xs px-5 rounded-xl shadow-md shadow-amber-500/10 active:scale-[0.98] transition-all"
                            disabled={!selectedSequenceId || enrollMutation.isPending}
                            onClick={() => enrollMutation.mutate(selectedSequenceId)}
                          >
                            {enrollMutation.isPending ? (
                              <Loader2 className="animate-spin size-3" />
                            ) : (
                              'Kaydet'
                            )}
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* AI Personalizer Integration */}
                    {user?.plan === 'free' ? (
                      <div className="p-4 bg-white dark:bg-slate-900/50 rounded-xl border border-slate-200/50 dark:border-slate-800 shadow-3xs flex flex-col items-center text-center space-y-2">
                        <Sparkles className="size-5 text-emerald-500/50" />
                        <p className="text-[10px] font-bold text-slate-400">AI Mesaj Kişiselleştirme için Starter plana geçin.</p>
                      </div>
                    ) : (
                      <AIPersonalizer
                        leadId={lead.id}
                        templateContent={messageContent || 'Lütfen önce bir şablon seçin'}
                        onVariationGenerated={setMessageContent}
                      />
                    )}

                    {/* Send Message Section */}
                    <div className="space-y-4 p-4.5 bg-emerald-50/30 rounded-2xl border border-emerald-100/60 shadow-3xs relative overflow-hidden">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <Sparkles className="size-4.5 text-emerald-600 animate-pulse" />
                          <h4 className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">Hızlı Mesaj Gönder</h4>
                        </div>
                        {user?.plan === 'free' && (
                          <Badge className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 font-black text-[8px] uppercase px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Lock className="size-2.5" /> Starter Gerekli
                          </Badge>
                        )}
                      </div>

                      {user?.plan === 'free' ? (
                        <div className="space-y-3 blur-[2px] pointer-events-none select-none">
                          <div className="h-10 w-full bg-white rounded-xl border border-emerald-100" />
                          <div className="h-24 w-full bg-white rounded-xl border border-emerald-100" />
                          <div className="h-11 w-full bg-emerald-600/50 rounded-xl" />
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <select
                            value={selectedTemplateId}
                            onChange={(e) => handleTemplateChange(e.target.value)}
                            className="w-full h-10 px-3 border border-emerald-100 rounded-xl text-xs font-bold text-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 focus:bg-white dark:focus:bg-slate-800 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all cursor-pointer shadow-3xs"
                          >
                            <option value="">Hızlı bir şablon seçin...</option>
                            {templates.map((t: any) => (
                              <option key={t.id} value={t.id}>
                                {t.name}
                              </option>
                            ))}
                          </select>

                          <Textarea
                            placeholder="Mesaj içeriğini buraya girin veya yukarıdan bir şablon seçin..."
                            className="min-h-[110px] rounded-xl border-emerald-100 bg-white dark:bg-slate-800 font-medium text-xs focus:ring-emerald-500/10 focus-visible:ring-4"
                            value={messageContent}
                            onChange={(e) => setMessageContent(e.target.value)}
                          />

                          <Button
                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-11 shadow-lg shadow-emerald-500/15 active:scale-[0.98] transition-all rounded-xl"
                            disabled={!messageContent || isSending || !lead?.phone}
                            onClick={handleSendMessage}
                          >
                            {isSending ? (
                              <div className="flex items-center gap-2 justify-center">
                                <Loader2 className="animate-spin size-4" />
                                Gönderiliyor...
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 justify-center">
                                <MessageSquare className="size-4" />
                                WhatsApp Güvenli Gönder
                              </div>
                            )}
                          </Button>
                          {!lead?.phone && (
                            <div className="p-2.5 bg-red-50 rounded-xl border border-red-100 flex items-center justify-center gap-1.5">
                              <span className="text-[9px] font-black text-red-600 uppercase tracking-wider">İşletmenin Telefonu Yok!</span>
                            </div>
                          )}
                        </div>
                      )}

                      {user?.plan === 'free' && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-white/10 backdrop-blur-[1px] z-10 space-y-3">
                           <p className="text-xs font-black text-emerald-800">
                             Hızlı mesaj gönderme özelliği Starter paketiyle açılır.
                           </p>
                           <Button 
                             onClick={() => window.location.href = '/billing'}
                             className="bg-emerald-500 hover:bg-emerald-600 text-black font-black text-[10px] uppercase h-8 px-4 rounded-xl shadow-lg shadow-emerald-500/20"
                           >
                             Hemen Yükselt
                           </Button>
                        </div>
                      )}
                    </div>

                    {/* Messages Logs History */}
                    <div className="space-y-3">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Mesaj Geçmişi</h4>
                      {lead.messageLogs && lead.messageLogs.length > 0 ? (
                        <div className="space-y-3">
                          {lead.messageLogs.map((log: any) => {
                            const isIncoming = log.direction === 'INCOMING';
                            return (
                              <div
                                key={log.id}
                                className={cn(
                                  "p-4 rounded-xl border flex items-start gap-3 shadow-3xs transition-shadow duration-300",
                                  isIncoming
                                    ? "bg-purple-50/20 border-purple-100/80"
                                    : "bg-white dark:bg-slate-900/50 border-slate-200/50 dark:border-slate-800"
                                )}
                              >
                                <div className={cn(
                                  "p-2 rounded-lg shrink-0 border",
                                  isIncoming
                                    ? "bg-purple-100/50 text-purple-600 border-purple-200/30"
                                    : "bg-emerald-100/50 text-emerald-600 border-emerald-200/30"
                                )}>
                                  <MessageSquare size={14} />
                                </div>
                                <div className="flex-1 min-w-0 space-y-1">
                                  <div className="flex items-center justify-between">
                                    <p className={cn("text-[9px] font-black uppercase tracking-widest", isIncoming ? "text-purple-600" : "text-slate-400")}>
                                      {isIncoming ? 'Gelen Yanıt' : 'Giden İletişim'}
                                    </p>
                                    <span className="text-[9px] font-bold text-slate-400">{safeFormatDate(log.createdAt, 'dd MMM HH:mm')}</span>
                                  </div>
                                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 leading-relaxed break-words">{log.content}</p>
                                  <div className="flex items-center gap-3 pt-1">
                                    <Badge className={cn(
                                      "border-none font-black text-[8px] px-2 py-0.5 rounded-full shadow-3xs",
                                      isIncoming ? "bg-purple-500 text-white" :
                                        log.status === 'READ' ? "bg-emerald-500 text-white" :
                                          log.status === 'SENT' || log.status === 'DELIVERED' ? "bg-emerald-500 text-white" :
                                            log.status === 'FAILED' ? "bg-red-500 text-white" : "bg-amber-500 text-white"
                                    )}>
                                      {isIncoming ? 'ALINDI' : log.status}
                                    </Badge>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="py-10 text-center space-y-3 bg-white dark:bg-slate-900/50 border border-slate-200/50 dark:border-slate-800 rounded-2xl shadow-3xs">
                          <MessageSquare className="size-8 text-slate-300 mx-auto" />
                          <p className="text-xs font-bold text-slate-400">Henüz mesajlaşma kaydı bulunamadı.</p>
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  {/* Meetings Hub */}
                  <TabsContent value="meetings" className="pt-4 space-y-5 animate-fade-in">
                    <div className="bg-white dark:bg-slate-900/50 rounded-2xl border border-slate-200/50 dark:border-slate-800 p-5 space-y-4 shadow-3xs">
                      <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                        <Calendar className="size-3.5 text-amber-500" /> Yeni Toplantı Planla
                      </h3>

                      <div className="space-y-3">
                        <div>
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Konu</label>
                          <input
                            type="text"
                            value={meetingTitle}
                            onChange={(e) => setMeetingTitle(e.target.value)}
                            placeholder="Örn: Demo Toplantısı"
                            className="w-full h-9 px-3 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-50/50 dark:bg-slate-800/50 focus:border-amber-500 outline-none transition-all shadow-3xs"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Tarih</label>
                            <input
                              type="date"
                              value={meetingDate}
                              onChange={(e) => setMeetingDate(e.target.value)}
                              className="w-full h-9 px-3 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-50/50 dark:bg-slate-800/50 focus:border-amber-500 outline-none transition-all shadow-3xs"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Saat</label>
                            <input
                              type="time"
                              value={meetingTime}
                              onChange={(e) => setMeetingTime(e.target.value)}
                              className="w-full h-9 px-3 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-50/50 dark:bg-slate-800/50 focus:border-amber-500 outline-none transition-all shadow-3xs"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Notlar</label>
                          <Textarea
                            placeholder="Toplantı notları..."
                            className="min-h-[70px] rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 font-medium text-xs focus:ring-amber-500/10 focus-visible:ring-4"
                            value={meetingNotes}
                            onChange={(e) => setMeetingNotes(e.target.value)}
                          />
                        </div>

                        <Button
                          className="w-full bg-amber-500 hover:bg-amber-600 text-white font-black h-10 shadow-lg shadow-amber-500/15 active:scale-[0.98] transition-all rounded-xl mt-2"
                          disabled={!meetingTitle || !meetingDate || meetingMutation.isPending}
                          onClick={() => {
                            const fullDate = new Date(`${meetingDate}T${meetingTime}`);
                            meetingMutation.mutate({
                              title: meetingTitle,
                              date: fullDate,
                              relatedLeads: [lead.id],
                              notes: meetingNotes,
                            });
                          }}
                        >
                          {meetingMutation.isPending ? (
                            <Loader2 className="animate-spin size-4 mr-2" />
                          ) : (
                            <Plus className="size-4 mr-2" />
                          )}
                          Toplantıyı Planla
                        </Button>
                      </div>
                    </div>

                    {/* Upcoming meetings for this lead */}
                    <div className="space-y-3">
                       <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Planlanmış Toplantılar</h4>
                       {/* In a real app we'd filter meetings by leadId. 
                          For now we just show a placeholder or if lead has meetings field */}
                       <div className="p-4 bg-white dark:bg-slate-900/50 border border-slate-200/40 dark:border-slate-800 rounded-2xl shadow-3xs text-center">
                          <p className="text-xs font-bold text-slate-400 italic">Google Takvim entegrasyonu aktif olduğunda toplantılarınız otomatik olarak senkronize edilir.</p>
                       </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            </ScrollArea>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
