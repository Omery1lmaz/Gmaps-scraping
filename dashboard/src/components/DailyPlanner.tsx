import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import axios from 'axios';
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  Phone,
  Globe,
  Mail,
  Search,
  X,
  Clock,
  CheckCircle2,
  MessageSquare,
  ArrowLeft,
  CalendarDays,
  LayoutGrid,
  GripVertical,
  Layers,
  Copy,
  BrainCircuit,
  Loader2,
  MapPin,
  Star,
  ExternalLink,
} from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { API_BASE_URL } from '../config';

type ContactTriState = 'any' | 'has' | 'without';

function buildPlannerFilterPayload(p: {
  sheetSearch: string;
  sheetCategory: string;
  sheetCity: string;
  sheetPhone: ContactTriState;
  sheetWebsite: ContactTriState;
  sheetEmail: ContactTriState;
  sheetMinRating: string;
  sheetMinReviews: string;
}): Record<string, string> {
  const o: Record<string, string> = {};
  const q = p.sheetSearch.trim();
  if (q) o.search = q;
  if (p.sheetCategory !== '__all__') o.category = p.sheetCategory;
  if (p.sheetCity !== '__all__') o.city = p.sheetCity;
  if (p.sheetPhone === 'has') o.hasPhone = 'true';
  if (p.sheetPhone === 'without') o.withoutPhone = 'true';
  if (p.sheetWebsite === 'has') o.hasWebsite = 'true';
  if (p.sheetWebsite === 'without') o.withoutWebsite = 'true';
  if (p.sheetEmail === 'has') o.hasEmail = 'true';
  if (p.sheetEmail === 'without') o.withoutEmail = 'true';
  if (p.sheetMinRating.trim()) o.minRating = p.sheetMinRating.trim();
  if (p.sheetMinReviews.trim()) o.minReviews = p.sheetMinReviews.trim();
  return o;
}

type Lead = {
  _id: string;
  name: string;
  category?: string;
  phone?: string;
  website?: string;
  email?: string;
  status?: string;
  city?: string;
  address?: string;
  description?: string;
  url?: string;
  rating?: number;
  reviews?: number;
  notes?: string[];
  aiAnalysis?: {
    score?: number;
    potential?: string;
    reasoning?: string;
    suggestedNiche?: string;
    estimatedBudget?: string;
  };
};

type DailyPlan = {
  _id: string;
  title: string;
  date: string;
  relatedLeads: Lead[];
  notes: string;
  outcome?: 'SUCCESS' | 'FAILED' | 'PENDING';
};

type ColumnDef = {
  id: string;
  title: string;
  leadIds: string[];
};

type PlannerClone = {
  id: string;
  name: string;
  columns: ColumnDef[];
};

type BoardPersist = {
  clones: PlannerClone[];
  activeCloneId: string;
};

const STORAGE_PREFIX = 'dailyPlannerBoards:v1:';

function dateKeyFromParts(year: number, month: number, day: number) {
  const m = String(month + 1).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${year}-${m}-${d}`;
}

function defaultColumns(): ColumnDef[] {
  return [
    { id: 'col-backlog', title: 'Yapılacak', leadIds: [] },
    { id: 'col-calling', title: 'Aranıyor', leadIds: [] },
    { id: 'col-follow', title: 'Takip', leadIds: [] },
    { id: 'col-done', title: 'Tamamlandı', leadIds: [] },
  ];
}

function newClone(name: string, seedColumns?: ColumnDef[]): PlannerClone {
  return {
    id: crypto.randomUUID(),
    name,
    columns: seedColumns
      ? seedColumns.map((c) => ({ ...c, leadIds: [...c.leadIds] }))
      : defaultColumns().map((c) => ({ ...c, leadIds: [] })),
  };
}

function loadBoard(dateKey: string): BoardPersist | null {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + dateKey);
    if (!raw) return null;
    return JSON.parse(raw) as BoardPersist;
  } catch {
    return null;
  }
}

function saveBoard(dateKey: string, state: BoardPersist) {
  localStorage.setItem(STORAGE_PREFIX + dateKey, JSON.stringify(state));
}

function removeLeadFromAllClones(clones: PlannerClone[], leadId: string): PlannerClone[] {
  return clones.map((cl) => ({
    ...cl,
    columns: cl.columns.map((col) => ({
      ...col,
      leadIds: col.leadIds.filter((id) => id !== leadId),
    })),
  }));
}

/** Every meeting lead id appears in at most one column of this clone; unassigned → backlog */
function mergeMeetingLeadsIntoClone(clone: PlannerClone, meetingLeadIds: string[]): PlannerClone {
  const assigned = new Set(clone.columns.flatMap((c) => c.leadIds));
  const backlog = clone.columns.find((c) => c.id === 'col-backlog');
  if (!backlog) return clone;

  const toAdd = meetingLeadIds.filter((id) => !assigned.has(id));
  if (toAdd.length === 0) return clone;

  return {
    ...clone,
    columns: clone.columns.map((col) =>
      col.id === 'col-backlog'
        ? { ...col, leadIds: [...col.leadIds, ...toAdd] }
        : col
    ),
  };
}

/** Drop leads that were removed from the meeting API from column lists */
function pruneRemovedLeads(clone: PlannerClone, validIds: Set<string>): PlannerClone {
  return {
    ...clone,
    columns: clone.columns.map((col) => ({
      ...col,
      leadIds: col.leadIds.filter((id) => validIds.has(id)),
    })),
  };
}

export const DailyPlanner = ({
  leads,
  categories = [],
  cities = [],
  plannerJump = null,
  onPlannerJumpHandled,
  addLeadsToPlannerDay,
}: {
  leads: Lead[];
  categories?: string[];
  cities?: string[];
  plannerJump?: { version: number; y: number; m: number; d: number } | null;
  onPlannerJumpHandled?: () => void;
  addLeadsToPlannerDay: (leadIds: string[], target: Date) => Promise<void>;
}) => {
  const [plans, setPlans] = useState<DailyPlan[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [view, setView] = useState<'CALENDAR' | 'DETAIL'>('CALENDAR');
  const [searchQuery, setSearchQuery] = useState('');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetCategory, setSheetCategory] = useState<string>('__all__');
  const [sheetCity, setSheetCity] = useState<string>('__all__');
  const [sheetSearch, setSheetSearch] = useState('');
  const [sheetPhone, setSheetPhone] = useState<ContactTriState>('any');
  const [sheetWebsite, setSheetWebsite] = useState<ContactTriState>('any');
  const [sheetEmail, setSheetEmail] = useState<ContactTriState>('any');
  const [sheetMinRating, setSheetMinRating] = useState('');
  const [sheetMinReviews, setSheetMinReviews] = useState('');
  const [sheetLeads, setSheetLeads] = useState<Lead[]>([]);
  const [sheetLoading, setSheetLoading] = useState(false);
  const [sheetSelectedIds, setSheetSelectedIds] = useState<Set<string>>(new Set());
  const [sheetBatchAdding, setSheetBatchAdding] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [boardState, setBoardState] = useState<BoardPersist | null>(null);
  const [leadDetailOpen, setLeadDetailOpen] = useState(false);
  const [leadDetail, setLeadDetail] = useState<Lead | null>(null);
  const [leadDetailLoading, setLeadDetailLoading] = useState(false);
  const [newNoteDraft, setNewNoteDraft] = useState('');
  const cardPointerStartRef = useRef<{ x: number; y: number } | null>(null);

  const statuses = ['NEW', 'SEARCHED', 'CONTACTED', 'FOLLOW_UP', 'CLOSED', 'LOST'];

  const dateKey =
    selectedDay != null ? dateKeyFromParts(currentDate.getFullYear(), currentDate.getMonth(), selectedDay) : null;

  const fetchPlans = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/meetings`);
      setPlans(res.data);
    } catch (err) {
      console.error('Failed to fetch plans:', err);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  useEffect(() => {
    if (!plannerJump || !onPlannerJumpHandled) return;
    const { y, m, d } = plannerJump;
    setCurrentDate(new Date(y, m, 1));
    setSelectedDay(d);
    setView('DETAIL');
    void fetchPlans().finally(() => {
      onPlannerJumpHandled();
    });
  }, [plannerJump?.version]);

  const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const openDayDetail = (day: number) => {
    setSelectedDay(day);
    setView('DETAIL');
  };

  const getDayPlan = (day: number) => {
    const d = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    return plans.find((p) => {
      const planDate = new Date(p.date);
      return (
        planDate.getDate() === d.getDate() &&
        planDate.getMonth() === d.getMonth() &&
        planDate.getFullYear() === d.getFullYear()
      );
    });
  };

  const selectedPlan = selectedDay ? getDayPlan(selectedDay) : null;
  const meetingLeadIds = useMemo(
    () => selectedPlan?.relatedLeads.map((l) => l._id) ?? [],
    [selectedPlan]
  );

  /** Load board from localStorage, merge API leads into active clone; runs when day/plan changes — not on each drag */
  useEffect(() => {
    if (view !== 'DETAIL' || !dateKey) return;

    const meetingIds = selectedPlan?.relatedLeads.map((l) => l._id) ?? [];
    const valid = new Set(meetingIds);

    let persisted = loadBoard(dateKey);
    if (!persisted || persisted.clones.length === 0) {
      const first = newClone('Pano 1');
      persisted = { clones: [first], activeCloneId: first.id };
    }

    const merged: BoardPersist = {
      ...persisted,
      clones: persisted.clones.map((cl) => {
        let c = selectedPlan ? pruneRemovedLeads(cl, valid) : cl;
        if (cl.id === persisted.activeCloneId) {
          c = mergeMeetingLeadsIntoClone(c, meetingIds);
        }
        return c;
      }),
    };

    saveBoard(dateKey, merged);
    setBoardState(merged);
  }, [view, dateKey, selectedPlan?._id, meetingLeadIds.join('|')]);

  const persistBoard = useCallback(
    (updater: (prev: BoardPersist) => BoardPersist) => {
      if (!dateKey) return;
      setBoardState((prev) => {
        if (!prev) return prev;
        const next = updater(prev);
        saveBoard(dateKey, next);
        return next;
      });
    },
    [dateKey]
  );

  const activeClone = boardState?.clones.find((c) => c.id === boardState.activeCloneId);

  const addLeadToPlan = async (leadId: string) => {
    if (!selectedDay) return;
    const target = new Date(currentDate.getFullYear(), currentDate.getMonth(), selectedDay);
    try {
      await addLeadsToPlannerDay([leadId], target);
      await fetchPlans();
      setSearchQuery('');
    } catch (err) {
      console.error('Failed to add lead to plan:', err);
    }
  };

  const addSheetSelectionToPlan = async () => {
    if (!selectedDay || sheetSelectedIds.size === 0) return;
    const target = new Date(currentDate.getFullYear(), currentDate.getMonth(), selectedDay);
    setSheetBatchAdding(true);
    try {
      await addLeadsToPlannerDay(Array.from(sheetSelectedIds), target);
      await fetchPlans();
      setSheetSelectedIds(new Set());
      setSheetOpen(false);
    } catch (err) {
      console.error('Batch add to plan failed:', err);
    } finally {
      setSheetBatchAdding(false);
    }
  };

  const removeLeadFromPlan = async (leadId: string) => {
    const existingPlan = getDayPlan(selectedDay!);
    if (!existingPlan) return;

    try {
      const updatedLeads = existingPlan.relatedLeads.filter((l) => l._id !== leadId).map((l) => l._id);
      await axios.put(`${API_BASE_URL}/api/meetings/${existingPlan._id}`, {
        relatedLeads: updatedLeads,
      });
      await fetchPlans();
      if (dateKey && boardState) {
        const next: BoardPersist = {
          ...boardState,
          clones: removeLeadFromAllClones(boardState.clones, leadId),
        };
        saveBoard(dateKey, next);
        setBoardState(next);
      }
    } catch (err) {
      console.error('Failed to remove lead from plan:', err);
    }
  };

  const updateLeadStatus = async (leadId: string, status: string) => {
    try {
      await axios.put(`${API_BASE_URL}/api/leads/${leadId}`, { status });
      await fetchPlans();
      if (leadDetail?._id === leadId) {
        try {
          const res = await axios.get<Lead>(`${API_BASE_URL}/api/leads/${leadId}`);
          setLeadDetail(res.data);
        } catch {
          /* ignore */
        }
      }
    } catch (err) {
      console.error('Failed to update lead status:', err);
    }
  };

  const updatePlanNotes = async (notes: string) => {
    const existingPlan = getDayPlan(selectedDay!);
    if (!existingPlan) return;

    try {
      await axios.put(`${API_BASE_URL}/api/meetings/${existingPlan._id}`, { notes });
      setPlans((p) => p.map((x) => (x._id === existingPlan._id ? { ...x, notes } : x)));
    } catch (err) {
      console.error('Failed to update notes:', err);
    }
  };

  const getLeadById = useCallback(
    (id: string): Lead | undefined => {
      const fromPlan = selectedPlan?.relatedLeads.find((l) => l._id === id);
      const fromPool = leads.find((l) => l._id === id);
      return fromPlan || fromPool;
    },
    [selectedPlan, leads]
  );

  const openLeadDetail = async (leadId: string) => {
    setLeadDetailOpen(true);
    setLeadDetailLoading(true);
    setNewNoteDraft('');
    try {
      const res = await axios.get<Lead>(`${API_BASE_URL}/api/leads/${leadId}`);
      setLeadDetail(res.data);
    } catch {
      const fallback = getLeadById(leadId);
      setLeadDetail(fallback ? { ...fallback } : null);
    } finally {
      setLeadDetailLoading(false);
    }
  };

  const appendLeadNote = async () => {
    if (!leadDetail || !newNoteDraft.trim()) return;
    try {
      const notes = [...(leadDetail.notes ?? []), newNoteDraft.trim()];
      const res = await axios.put(`${API_BASE_URL}/api/leads/${leadDetail._id}`, { notes });
      const updated = res.data.lead || res.data;
      if (updated) setLeadDetail(updated);
      setNewNoteDraft('');
      await fetchPlans();
    } catch (err) {
      console.error('Failed to save note:', err);
    }
  };

  const moveLeadBetweenColumns = (
    leadId: string,
    fromColumnId: string,
    toColumnId: string,
    cloneId: string
  ) => {
    if (fromColumnId === toColumnId) return;
    persistBoard((prev) => ({
      ...prev,
      clones: prev.clones.map((cl) => {
        if (cl.id !== cloneId) return cl;
        return {
          ...cl,
          columns: cl.columns.map((col) => {
            if (col.id === fromColumnId) {
              return { ...col, leadIds: col.leadIds.filter((id) => id !== leadId) };
            }
            if (col.id === toColumnId) {
              const without = col.leadIds.filter((id) => id !== leadId);
              return { ...col, leadIds: [...without, leadId] };
            }
            return col;
          }),
        };
      }),
    }));
  };

  const addClone = () => {
    persistBoard((prev) => {
      const n = prev.clones.length + 1;
      const clone = newClone(`Pano ${n}`);
      return {
        clones: [...prev.clones, clone],
        activeCloneId: clone.id,
      };
    });
  };

  const duplicateActiveClone = () => {
    if (!activeClone) return;
    persistBoard((prev) => {
      const copy = newClone(`${activeClone.name} (kopya)`, activeClone.columns);
      return {
        clones: [...prev.clones, copy],
        activeCloneId: copy.id,
      };
    });
  };

  const renameActiveClone = () => {
    if (!activeClone) return;
    const name = window.prompt('Pano adı', activeClone.name);
    if (!name?.trim()) return;
    persistBoard((prev) => ({
      ...prev,
      clones: prev.clones.map((cl) => (cl.id === prev.activeCloneId ? { ...cl, name: name.trim() } : cl)),
    }));
  };

  const fetchSheetLeads = async () => {
    setSheetLoading(true);
    try {
      const params = new URLSearchParams({
        page: '1',
        limit: '80',
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });
      const filters = buildPlannerFilterPayload({
        sheetSearch,
        sheetCategory,
        sheetCity,
        sheetPhone,
        sheetWebsite,
        sheetEmail,
        sheetMinRating,
        sheetMinReviews,
      });
      Object.entries(filters).forEach(([k, v]) => params.append(k, v));
      const res = await axios.get(`${API_BASE_URL}/api/leads?${params.toString()}`);
      const list = res.data.leads ?? res.data;
      setSheetLeads(Array.isArray(list) ? list : []);
      setAiSummary(null);
    } catch (err) {
      console.error('Sheet leads fetch failed:', err);
      setSheetLeads([]);
    } finally {
      setSheetLoading(false);
    }
  };

  const runAiPlanner = async () => {
    setAiLoading(true);
    try {
      const filters = buildPlannerFilterPayload({
        sheetSearch,
        sheetCategory,
        sheetCity,
        sheetPhone,
        sheetWebsite,
        sheetEmail,
        sheetMinRating,
        sheetMinReviews,
      });
      const res = await axios.post(`${API_BASE_URL}/api/ai/planner-suggest-leads`, {
        prompt:
          aiPrompt.trim() ||
          'Bugün telefon veya ziyaret ile ulaşmak için öncelikli, yüksek potansiyelli işletmeleri seç.',
        excludeIds: meetingLeadIds,
        filters,
        limit: 50,
        candidatePool: 120,
      });
      setSheetLeads(Array.isArray(res.data.leads) ? res.data.leads : []);
      setAiSummary(typeof res.data.aiSummary === 'string' ? res.data.aiSummary : null);
    } catch (err) {
      console.error('AI planner failed:', err);
      setAiSummary(null);
    } finally {
      setAiLoading(false);
    }
  };

  const sheetBootRef = useRef(false);
  useEffect(() => {
    if (sheetOpen) {
      setSheetSelectedIds(new Set());
      if (!sheetBootRef.current) {
        sheetBootRef.current = true;
        void fetchSheetLeads();
      }
    } else {
      sheetBootRef.current = false;
    }
  }, [sheetOpen]);

  const visibleSheetLeads = useMemo(
    () => sheetLeads.filter((l) => !meetingLeadIds.includes(l._id)),
    [sheetLeads, meetingLeadIds]
  );

  const toggleSheetLeadSelect = useCallback((id: string) => {
    setSheetSelectedIds((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }, []);

  const selectAllVisibleSheetLeads = () => {
    setSheetSelectedIds(new Set(visibleSheetLeads.map((l) => l._id)));
  };

  const clearSheetSelection = () => setSheetSelectedIds(new Set());

  const filteredLeadsQuick = leads
    .filter((l) => {
      if (!selectedDay) return false;
      const q = searchQuery.trim().toLowerCase();
      return (
        l.name.toLowerCase().includes(q) &&
        !getDayPlan(selectedDay)?.relatedLeads.some((rl) => rl._id === l._id)
      );
    })
    .slice(0, 8);

  const monthNames = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];
  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const onDragStartCard = (e: React.DragEvent, leadId: string, columnId: string) => {
    e.dataTransfer.setData('application/json', JSON.stringify({ leadId, columnId }));
    e.dataTransfer.effectAllowed = 'move';
  };

  const onDropOnColumn = (e: React.DragEvent, targetColumnId: string) => {
    e.preventDefault();
    const raw = e.dataTransfer.getData('application/json');
    if (!raw || !boardState?.activeCloneId) return;
    try {
      const { leadId, columnId } = JSON.parse(raw) as { leadId: string; columnId: string };
      moveLeadBetweenColumns(leadId, columnId, targetColumnId, boardState.activeCloneId);
    } catch {
      /* ignore */
    }
  };

  if (view === 'DETAIL' && selectedDay) {
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 min-w-0">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="flex flex-wrap items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setView('CALENDAR')}
              className="h-11 w-11 shrink-0 rounded-2xl bg-white dark:bg-slate-900 shadow-sm border border-slate-200 dark:border-slate-800"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="min-w-0">
              <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white md:text-3xl">
                {selectedDay} {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
              </h2>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <CalendarDays size={14} className="text-blue-500" />
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
                  Trello tarzı günlük pano
                </p>
                <Badge variant="secondary" className="gap-1 font-semibold">
                  <LayoutGrid size={12} />
                  {activeClone?.name ?? 'Pano'}
                </Badge>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl border-slate-200 font-bold shadow-sm dark:border-slate-800"
              onClick={() => setView('CALENDAR')}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Takvime dön
            </Button>
            <Button
              size="sm"
              className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 font-bold text-white shadow-lg shadow-blue-500/25 hover:from-blue-700 hover:to-indigo-700"
              onClick={() => setSheetOpen(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              İşletme ekle
            </Button>
            <Button
              size="sm"
              variant="secondary"
              className="rounded-xl bg-emerald-50 font-bold text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-400"
              onClick={() => {
                if (window.confirm('Bu günü tamamlamak istediğinize emin misiniz?')) {
                  setView('CALENDAR');
                }
              }}
            >
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Günü tamamla
            </Button>
          </div>
        </div>

        {/* Clone tabs */}
        {boardState && (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Tabs
              value={boardState.activeCloneId}
              onValueChange={(id) => {
                persistBoard((prev) => ({ ...prev, activeCloneId: id }));
              }}
              className="w-full min-w-0"
            >
              <div className="flex items-center gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <Layers className="h-4 w-4 shrink-0 text-slate-400" />
                <TabsList className="inline-flex h-auto min-h-10 flex-nowrap justify-start gap-1 rounded-2xl bg-slate-200/60 p-1.5 dark:bg-slate-800/80">
                  {boardState.clones.map((cl) => (
                    <TabsTrigger
                      key={cl.id}
                      value={cl.id}
                      className="shrink-0 rounded-xl px-4 py-2 text-xs font-bold uppercase tracking-wide data-[state=active]:bg-white data-[state=active]:shadow-md dark:data-[state=active]:bg-slate-700"
                    >
                      {cl.name}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>
            </Tabs>
            <div className="flex shrink-0 flex-wrap gap-2">
              <Button variant="outline" size="sm" className="rounded-xl font-semibold" onClick={addClone}>
                <Plus className="mr-1.5 h-4 w-4" />
                Yeni pano
              </Button>
              <Button variant="outline" size="sm" className="rounded-xl font-semibold" onClick={duplicateActiveClone}>
                <Copy className="mr-1.5 h-4 w-4" />
                Panoyu çoğalt
              </Button>
              <Button variant="ghost" size="sm" className="rounded-xl font-semibold" onClick={renameActiveClone}>
                Adı düzenle
              </Button>
            </div>
          </div>
        )}

        {/* Quick search row (calendar-style) */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Hızlı ara…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-11 rounded-2xl border-slate-200 bg-white pl-10 dark:border-slate-800 dark:bg-slate-900"
          />
          {searchQuery && filteredLeadsQuick.length > 0 && (
            <div className="absolute left-0 right-0 top-12 z-40 rounded-2xl border border-slate-100 bg-white p-2 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
              {filteredLeadsQuick.map((l) => (
                <button
                  key={l._id}
                  type="button"
                  onClick={() => addLeadToPlan(l._id)}
                  className="flex w-full items-center justify-between rounded-xl p-3 text-left hover:bg-blue-50 dark:hover:bg-blue-900/20"
                >
                  <div>
                    <div className="text-sm font-bold text-slate-900 dark:text-slate-100">{l.name}</div>
                    <div className="text-[10px] font-bold uppercase text-slate-400">{l.category || 'Kategori yok'}</div>
                  </div>
                  <Plus size={16} className="text-blue-500" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Trello board */}
        <div className="flex gap-4 overflow-x-auto pb-4 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:[scrollbar-width:thin] md:[&::-webkit-scrollbar]:block">
          {activeClone?.columns.map((col) => (
            <div
              key={col.id}
              className="flex w-[min(100vw-2rem,20rem)] shrink-0 flex-col rounded-[28px] border border-slate-200/80 bg-slate-100/70 dark:border-slate-800 dark:bg-slate-900/40"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => onDropOnColumn(e, col.id)}
            >
              <div className="flex items-center justify-between border-b border-slate-200/60 px-4 py-3 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <div className={`h-2 w-2 rounded-full ${col.id === 'col-backlog' ? 'bg-slate-400' :
                      col.id === 'col-calling' ? 'bg-amber-500' :
                        col.id === 'col-follow' ? 'bg-blue-500' : 'bg-emerald-500'
                    }`} />
                  <span className="text-sm font-black uppercase tracking-tight text-slate-700 dark:text-slate-200">
                    {col.title}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Badge variant="secondary" className="h-5 px-1.5 text-[10px] font-bold">
                    {col.leadIds.length}
                  </Badge>
                  <DropdownMenu>
                    <DropdownMenuTrigger render={
                      <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800">
                        <GripVertical className="h-3.5 w-3.5 text-slate-400" />
                      </Button>
                    } />

                    <DropdownMenuContent align="end" className="w-48 rounded-xl">
                      <div className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">Hepsini Taşı</div>
                      {activeClone.columns.filter(c => c.id !== col.id).map(targetCol => (
                        <DropdownMenuItem
                          key={targetCol.id}
                          onClick={() => {
                            persistBoard(prev => ({
                              ...prev,
                              clones: prev.clones.map(cl => {
                                if (cl.id !== prev.activeCloneId) return cl;
                                return {
                                  ...cl,
                                  columns: cl.columns.map(c => {
                                    if (c.id === col.id) return { ...c, leadIds: [] };
                                    if (c.id === targetCol.id) return { ...c, leadIds: [...c.leadIds, ...col.leadIds] };
                                    return c;
                                  })
                                };
                              })
                            }));
                          }}
                          className="text-xs font-semibold"
                        >
                          {targetCol.title} sütununa
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
              <ScrollArea className="max-h-[calc(100vh-320px)] px-3 pb-3 pt-2">
                <div className="space-y-2">
                  {col.leadIds.map((leadId) => {
                    const lead = getLeadById(leadId);
                    if (!lead) return null;
                    return (
                      <Card
                        key={`${col.id}-${leadId}`}
                        draggable
                        onDragStart={(e) => onDragStartCard(e, leadId, col.id)}
                        onPointerDown={(e) => {
                          cardPointerStartRef.current = { x: e.clientX, y: e.clientY };
                        }}
                        onClick={(e) => {
                          if ((e.target as HTMLElement).closest('[data-card-interactive]')) return;
                          const start = cardPointerStartRef.current;
                          if (!start) return;
                          if (Math.abs(e.clientX - start.x) > 12 || Math.abs(e.clientY - start.y) > 12) return;
                          void openLeadDetail(lead._id);
                        }}
                        className="cursor-grab border border-slate-200/80 bg-white shadow-sm active:cursor-grabbing dark:border-slate-700 dark:bg-slate-800/80"
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start gap-2">
                            <span data-card-interactive className="mt-0.5 inline-flex shrink-0">
                              <GripVertical className="h-4 w-4 text-slate-300" />
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-start justify-between gap-1">
                                <h5 className="truncate text-sm font-bold text-slate-900 dark:text-slate-100">{lead.name}</h5>
                                {lead.rating && (
                                  <div className="flex shrink-0 items-center gap-0.5 text-[10px] font-bold text-amber-500">
                                    <Star size={10} className="fill-current" />
                                    {lead.rating}
                                  </div>
                                )}
                              </div>

                              <div className="mt-0.5 flex items-center gap-2">
                                {lead.category && (
                                  <span className="truncate text-[10px] font-bold uppercase tracking-tight text-slate-400">
                                    {lead.category.replace(/[0-9]/g, '').trim()}
                                  </span>
                                )}
                              </div>

                              {lead.phone && String(lead.phone).trim() ? (
                                <a
                                  data-card-interactive
                                  href={`tel:${lead.phone}`}
                                  className="mt-1.5 block truncate font-mono text-xs font-bold tracking-tight text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {lead.phone}
                                </a>
                              ) : (
                                <p className="mt-1.5 text-[10px] font-medium text-slate-300 italic">Telefon eklenmemiş</p>
                              )}

                              <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                                <DropdownMenu>
                                  <DropdownMenuTrigger>
                                    <Badge

                                      data-card-interactive
                                      variant="outline"
                                      className={`cursor-pointer border-none px-2 py-0.5 text-[9px] font-black uppercase shadow-none ring-1 ring-inset ${lead.status === 'CLOSED' ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-900/20 dark:text-emerald-400' :
                                          lead.status === 'LOST' ? 'bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-900/20 dark:text-red-400' :
                                            lead.status === 'CONTACTED' ? 'bg-blue-50 text-blue-700 ring-blue-600/20 dark:bg-blue-900/20 dark:text-blue-400' :
                                              'bg-slate-50 text-slate-600 ring-slate-500/20 dark:bg-slate-800 dark:text-slate-400'
                                        }`}
                                    >
                                      {lead.status || 'NEW'}
                                    </Badge>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent className="rounded-xl">
                                    {statuses.map((s) => (
                                      <DropdownMenuItem
                                        key={s}
                                        onClick={() => updateLeadStatus(lead._id, s)}
                                        className="text-[10px] font-bold"
                                      >
                                        {s}
                                      </DropdownMenuItem>
                                    ))}
                                  </DropdownMenuContent>
                                </DropdownMenu>

                                {lead.city && (
                                  <span className="inline-flex items-center gap-0.5 text-[9px] font-bold uppercase text-slate-400">
                                    <MapPin size={9} />
                                    {lead.city}
                                  </span>
                                )}
                              </div>
                              <div className="mt-3.5 flex flex-wrap items-center gap-1 border-t border-slate-100 pt-3 dark:border-slate-800">
                                {lead.phone && (
                                  <Button
                                    data-card-interactive
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      window.open(`tel:${lead.phone}`, '_self');
                                    }}
                                  >
                                    <Phone size={12} />
                                  </Button>
                                )}
                                {lead.website && (
                                  <Button
                                    data-card-interactive
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      window.open(lead.website, '_blank');
                                    }}
                                  >
                                    <Globe size={12} />
                                  </Button>
                                )}
                                {lead.aiAnalysis?.score != null && (
                                  <div className="ml-auto flex items-center gap-1 rounded-lg bg-indigo-50 px-1.5 py-0.5 text-[9px] font-black text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400">
                                    <BrainCircuit size={10} />
                                    {lead.aiAnalysis.score}
                                  </div>
                                )}
                                <Button
                                  data-card-interactive
                                  variant="ghost"
                                  size="icon"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    void removeLeadFromPlan(lead._id);
                                  }}
                                  className="ml-1 h-7 w-7 rounded-lg text-slate-300 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950/30"
                                >
                                  <X size={12} />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                  {col.leadIds.length === 0 && (
                    <p className="px-2 py-8 text-center text-xs font-bold uppercase tracking-widest text-slate-400">
                      Kart sürükleyin veya işletme ekleyin
                    </p>
                  )}
                </div>
              </ScrollArea>
            </div>
          ))}

          {/* Notes column */}
          <div className="flex w-[min(100vw-2rem,22rem)] shrink-0 flex-col rounded-[28px] border border-blue-200/60 bg-gradient-to-b from-blue-50/90 to-white dark:border-blue-900/40 dark:from-blue-950/40 dark:to-slate-900">
            <div className="flex items-center gap-2 border-b border-blue-100/50 px-4 py-3 dark:border-blue-900/30">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400">
                <MessageSquare className="h-4 w-4" />
              </div>
              <span className="text-sm font-black uppercase tracking-tight text-blue-900 dark:text-blue-200">
                Strateji & Notlar
              </span>
            </div>
            <div className="flex flex-1 flex-col p-4">
              <Textarea
                placeholder="Bugünün stratejisi, hatırlatmalar, script…"
                className="min-h-[280px] flex-1 resize-none rounded-2xl border-blue-100/50 bg-white/50 p-4 text-sm font-medium leading-relaxed shadow-sm focus:bg-white dark:border-blue-900/30 dark:bg-slate-950/30 dark:focus:bg-slate-950"
                value={selectedPlan?.notes || ''}
                onChange={(e) => updatePlanNotes(e.target.value)}
              />
              <div className="mt-4 flex items-center gap-2 px-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                <Clock size={12} className="text-blue-500" /> Bulut ile senkronize ediliyor
              </div>
              <div className="mt-6 overflow-hidden rounded-[24px] bg-gradient-to-br from-blue-600 to-indigo-700 p-5 text-white shadow-xl shadow-blue-500/20">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20">
                    <CheckCircle2 size={14} className="text-white" />
                  </div>
                  <p className="text-sm font-black uppercase tracking-tight">Günlük hedef</p>
                </div>
                <p className="mt-3 text-xs font-medium leading-relaxed text-blue-50/80">
                  Bu tarihte <span className="font-bold text-white">{selectedPlan?.relatedLeads.length ?? 0}</span> işletme planlandı. Başarılar dileriz!
                </p>
              </div>
            </div>
          </div>
        </div>

        <Dialog
          open={leadDetailOpen}
          onOpenChange={(open) => {
            setLeadDetailOpen(open);
            if (!open) setLeadDetail(null);
          }}
        >
          <DialogContent className="max-h-[min(90vh,800px)] gap-0 overflow-hidden p-0 sm:max-w-2xl">
            {leadDetailLoading ? (
              <div className="flex flex-col items-center justify-center gap-3 py-24">
                <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
                <p className="text-sm font-semibold text-slate-500">Yükleniyor…</p>
              </div>
            ) : leadDetail ? (
              <>
                <DialogHeader className="border-b border-slate-100 p-6 text-left dark:border-slate-800">
                  <DialogTitle className="text-xl font-bold leading-snug pr-8">{leadDetail.name}</DialogTitle>
                  <DialogDescription className="flex flex-wrap items-center gap-2 pt-2">
                    {leadDetail.category && (
                      <Badge variant="outline" className="font-semibold uppercase">
                        {leadDetail.category}
                      </Badge>
                    )}
                    {leadDetail.city && (
                      <span className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-400">
                        <MapPin className="h-3.5 w-3.5" />
                        {leadDetail.city}
                      </span>
                    )}
                    {leadDetail.rating != null && (
                      <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400">
                        <Star className="h-3.5 w-3.5 fill-current" />
                        {leadDetail.rating}
                        {leadDetail.reviews != null ? ` (${leadDetail.reviews} yorum)` : ''}
                      </span>
                    )}
                  </DialogDescription>
                </DialogHeader>

                <ScrollArea className="max-h-[55vh] px-6">
                  <div className="space-y-5 py-5 pr-3">
                    <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/40">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">İletişim</p>
                      <div className="mt-3 space-y-2 text-sm">
                        {leadDetail.phone && String(leadDetail.phone).trim() ? (
                          <a
                            href={`tel:${leadDetail.phone}`}
                            className="flex items-center gap-2 font-mono font-semibold text-emerald-700 hover:underline dark:text-emerald-400"
                          >
                            <Phone className="h-4 w-4 shrink-0" />
                            {leadDetail.phone}
                          </a>
                        ) : (
                          <p className="text-slate-500">Kayıtlı telefon yok</p>
                        )}
                        {leadDetail.email && (
                          <a
                            href={`mailto:${leadDetail.email}`}
                            className="flex items-center gap-2 break-all text-blue-600 hover:underline dark:text-blue-400"
                          >
                            <Mail className="h-4 w-4 shrink-0" />
                            {leadDetail.email}
                          </a>
                        )}
                        {leadDetail.website && (
                          <a
                            href={leadDetail.website}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-2 break-all text-blue-600 hover:underline dark:text-blue-400"
                          >
                            <Globe className="h-4 w-4 shrink-0" />
                            {leadDetail.website}
                          </a>
                        )}
                        {leadDetail.url && (
                          <a
                            href={leadDetail.url}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-2 text-xs text-slate-600 hover:text-blue-600 dark:text-slate-400"
                          >
                            <ExternalLink className="h-4 w-4 shrink-0" />
                            Google Maps
                          </a>
                        )}
                      </div>
                    </div>

                    {leadDetail.address && (
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Adres</p>
                        <p className="mt-1.5 text-sm leading-relaxed text-slate-700 dark:text-slate-300">{leadDetail.address}</p>
                      </div>
                    )}

                    {leadDetail.description && (
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Açıklama</p>
                        <p className="mt-1.5 max-h-36 overflow-y-auto text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                          {leadDetail.description}
                        </p>
                      </div>
                    )}

                    {leadDetail.aiAnalysis?.reasoning && (
                      <div className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-4 dark:border-indigo-900/50 dark:bg-indigo-950/30">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-300">
                          AI analizi
                          {leadDetail.aiAnalysis.potential && (
                            <Badge className="ml-2 bg-indigo-600 text-[10px]">{leadDetail.aiAnalysis.potential}</Badge>
                          )}
                        </p>
                        <p className="mt-2 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                          {leadDetail.aiAnalysis.reasoning}
                        </p>
                      </div>
                    )}

                    <Separator />

                    <div className="flex flex-col">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Notlar</p>
                      <div className="mt-2 space-y-2">
                        {(leadDetail.notes ?? []).length === 0 ? (
                          <p className="text-sm text-slate-500">Henüz not eklenmemiş.</p>
                        ) : (
                          <ul className="space-y-2">
                            {(leadDetail.notes ?? []).map((n, i) => {
                              const text = typeof n === 'string' ? n : (n as any)?.content || '';
                              return (
                                <li
                                  key={`${i}-${text.slice(0, 24)}`}
                                  className="rounded-xl border border-slate-100 bg-white px-3 py-2 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
                                >
                                  {text}
                                </li>
                              );
                            })}
                          </ul>
                        )}
                      </div>
                      <Textarea
                        placeholder="Yeni not yazın…"
                        value={newNoteDraft}
                        onChange={(e) => setNewNoteDraft(e.target.value)}
                        className="mt-3 min-h-[100px] resize-none rounded-xl"
                      />
                    </div>
                  </div>
                </ScrollArea>

                <DialogFooter className="border-t border-slate-100 p-4 dark:border-slate-800">
                  <Button type="button" variant="outline" className="rounded-xl" onClick={() => setLeadDetailOpen(false)}>
                    Kapat
                  </Button>
                  <Button
                    type="button"
                    className="rounded-xl bg-blue-600 hover:bg-blue-700"
                    disabled={!newNoteDraft.trim()}
                    onClick={() => void appendLeadNote()}
                  >
                    Notu kaydet
                  </Button>
                </DialogFooter>
              </>
            ) : (
              <div className="p-12 text-center text-sm text-slate-500">Kayıt bulunamadı.</div>
            )}
          </DialogContent>
        </Dialog>

        {/* Wide add-business sheet */}
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetContent
            side="right"
            showCloseButton
            className="flex w-full flex-col gap-0 border-l border-slate-200 p-0 dark:border-slate-800 sm:max-w-none md:w-[min(100vw-1rem,56rem)] lg:w-[min(100vw-1rem,64rem)]"
          >
            <SheetHeader className="space-y-1 border-b border-slate-100 p-6 text-left dark:border-slate-800">
              <SheetTitle className="text-xl font-bold">İşletme ekle</SheetTitle>
              <SheetDescription>
                Sunucu tarafı filtrelerle veritabanından çekilir; AI önce aday havuzunu filtrelerle daraltır sonra öncelik
                sırası önerir. Eklemek için satıra tıklayın.
              </SheetDescription>
            </SheetHeader>

            <ScrollArea className="flex max-h-[calc(100vh-8rem)] flex-1 flex-col">
              <div className="space-y-6 p-6">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="relative sm:col-span-2 lg:col-span-3">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      placeholder="İsim veya adres ara…"
                      value={sheetSearch}
                      onChange={(e) => setSheetSearch(e.target.value)}
                      className="h-12 rounded-xl border-slate-200 pl-10 dark:border-slate-700"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      Kategori
                    </label>
                    <Select
                      value={sheetCategory}
                      onValueChange={(v) => {
                        if (v != null) setSheetCategory(v);
                      }}
                    >
                      <SelectTrigger className="h-12 w-full rounded-xl font-semibold">
                        <SelectValue placeholder="Tümü" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="__all__">Tüm kategoriler</SelectItem>
                        {categories.map((c) => (
                          <SelectItem key={c} value={c}>
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      Şehir
                    </label>
                    <Select
                      value={sheetCity}
                      onValueChange={(v) => {
                        if (v != null) setSheetCity(v);
                      }}
                    >
                      <SelectTrigger className="h-12 w-full rounded-xl font-semibold">
                        <SelectValue placeholder="Tümü" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="__all__">Tüm şehirler</SelectItem>
                        {cities.map((c) => (
                          <SelectItem key={c} value={c}>
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      Telefon
                    </label>
                    <Select
                      value={sheetPhone}
                      onValueChange={(v) => {
                        if (v === 'any' || v === 'has' || v === 'without') setSheetPhone(v);
                      }}
                    >
                      <SelectTrigger className="h-12 w-full rounded-xl font-semibold">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="any">Fark etmez</SelectItem>
                        <SelectItem value="has">Numara var</SelectItem>
                        <SelectItem value="without">Numara yok</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      Web sitesi
                    </label>
                    <Select
                      value={sheetWebsite}
                      onValueChange={(v) => {
                        if (v === 'any' || v === 'has' || v === 'without') setSheetWebsite(v);
                      }}
                    >
                      <SelectTrigger className="h-12 w-full rounded-xl font-semibold">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="any">Fark etmez</SelectItem>
                        <SelectItem value="has">Site var</SelectItem>
                        <SelectItem value="without">Site yok</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      E-posta
                    </label>
                    <Select
                      value={sheetEmail}
                      onValueChange={(v) => {
                        if (v === 'any' || v === 'has' || v === 'without') setSheetEmail(v);
                      }}
                    >
                      <SelectTrigger className="h-12 w-full rounded-xl font-semibold">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="any">Fark etmez</SelectItem>
                        <SelectItem value="has">E-posta var</SelectItem>
                        <SelectItem value="without">E-posta yok</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      Min. puan
                    </label>
                    <Input
                      type="number"
                      min={0}
                      max={5}
                      step={0.1}
                      placeholder="Örn. 4"
                      value={sheetMinRating}
                      onChange={(e) => setSheetMinRating(e.target.value)}
                      className="h-12 rounded-xl"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      Min. yorum
                    </label>
                    <Input
                      type="number"
                      min={0}
                      placeholder="Örn. 10"
                      value={sheetMinReviews}
                      onChange={(e) => setSheetMinReviews(e.target.value)}
                      className="h-12 rounded-xl"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    className="rounded-xl font-semibold"
                    onClick={() => void fetchSheetLeads()}
                    disabled={sheetLoading}
                  >
                    {sheetLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Yükleniyor…
                      </>
                    ) : (
                      'Filtreleri uygula'
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-xl font-semibold"
                    onClick={() => {
                      setSheetSearch('');
                      setSheetCategory('__all__');
                      setSheetCity('__all__');
                      setSheetPhone('any');
                      setSheetWebsite('any');
                      setSheetEmail('any');
                      setSheetMinRating('');
                      setSheetMinReviews('');
                      setAiSummary(null);
                      void (async () => {
                        setSheetLoading(true);
                        try {
                          const params = new URLSearchParams({
                            page: '1',
                            limit: '80',
                            sortBy: 'createdAt',
                            sortOrder: 'desc',
                          });
                          const res = await axios.get(`${API_BASE_URL}/api/leads?${params.toString()}`);
                          const list = res.data.leads ?? res.data;
                          setSheetLeads(Array.isArray(list) ? list : []);
                        } catch (err) {
                          console.error(err);
                          setSheetLeads([]);
                        } finally {
                          setSheetLoading(false);
                        }
                      })();
                    }}
                  >
                    Sıfırla
                  </Button>
                </div>

                <Separator />

                <div className="space-y-3 rounded-2xl border border-indigo-100 bg-indigo-50/40 p-4 dark:border-indigo-900/40 dark:bg-indigo-950/20">
                  <div className="flex items-center gap-2 text-sm font-bold text-indigo-900 dark:text-indigo-100">
                    <BrainCircuit className="h-5 w-5" />
                    AI ile önceliklendir
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Üstteki filtrelerle oluşturulan havuzdan model en uygun sıralamayı çıkarır (OpenRouter / OPENROUTER_API_KEY).
                    İsterseniz niyetinizi yazın.
                  </p>
                  <Textarea
                    placeholder='Örn: "Web sitesi olmayan ama telefonu olan işletmelere önce ara; Antalya öncelikli."'
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    className="min-h-[88px] resize-none rounded-xl border-indigo-100 bg-white dark:border-indigo-900 dark:bg-slate-950"
                  />
                  <Button
                    type="button"
                    className="rounded-xl bg-indigo-600 font-semibold hover:bg-indigo-700"
                    onClick={() => void runAiPlanner()}
                    disabled={aiLoading || sheetLoading}
                  >
                    {aiLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        AI sıralıyor…
                      </>
                    ) : (
                      <>
                        <BrainCircuit className="mr-2 h-4 w-4" />
                        AI ile işletme öner
                      </>
                    )}
                  </Button>
                  {aiSummary && (
                    <p className="rounded-xl bg-white/90 p-3 text-sm leading-relaxed text-slate-700 shadow-sm dark:bg-slate-900 dark:text-slate-200">
                      {aiSummary}
                    </p>
                  )}
                </div>

                <Separator />

                <div className="space-y-2 pb-10">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
                      Sonuçlar ({visibleSheetLeads.length})
                      {sheetSelectedIds.size > 0 && (
                        <span className="ml-2 text-blue-600 dark:text-blue-400">
                          · {sheetSelectedIds.size} seçili
                        </span>
                      )}
                    </span>
                    {visibleSheetLeads.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="rounded-lg text-xs font-semibold"
                          onClick={selectAllVisibleSheetLeads}
                        >
                          Görünenleri seç
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="rounded-lg text-xs font-semibold"
                          onClick={clearSheetSelection}
                        >
                          Seçimi temizle
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          className="rounded-lg bg-blue-600 text-xs font-semibold hover:bg-blue-700"
                          disabled={sheetSelectedIds.size === 0 || sheetBatchAdding || !selectedDay}
                          onClick={() => void addSheetSelectionToPlan()}
                        >
                          {sheetBatchAdding ? (
                            <>
                              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                              Ekleniyor…
                            </>
                          ) : (
                            <>Seçilenleri güne ekle ({sheetSelectedIds.size})</>
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                  {sheetLoading && visibleSheetLeads.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-2 py-20 text-slate-400">
                      <Loader2 className="h-8 w-8 animate-spin" />
                      <span className="text-sm font-semibold">Liste yükleniyor…</span>
                    </div>
                  ) : visibleSheetLeads.length === 0 ? (
                    <div className="py-16 text-center text-sm font-semibold text-slate-400">
                      Bu filtrelere uygun işletme yok veya hepsi zaten bu güne ekli.
                    </div>
                  ) : (
                    visibleSheetLeads.map((l) => {
                      const hasTel = !!(l.phone && String(l.phone).trim());
                      const hasSite = !!(l.website && String(l.website).trim());
                      const hasEm = !!(l.email && String(l.email).trim());
                      const checked = sheetSelectedIds.has(l._id);
                      return (
                        <div
                          key={l._id}
                          role="button"
                          tabIndex={0}
                          onClick={() => toggleSheetLeadSelect(l._id)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              toggleSheetLeadSelect(l._id);
                            }
                          }}
                          className={`flex w-full cursor-pointer items-start gap-3 rounded-2xl border p-4 text-left transition hover:border-blue-200 hover:bg-blue-50/50 dark:hover:border-blue-800 dark:hover:bg-blue-950/30 ${checked
                              ? 'border-blue-300 bg-blue-50/60 dark:border-blue-800 dark:bg-blue-950/40'
                              : 'border-slate-100 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-900/50'
                            }`}
                        >
                          <div
                            className="pt-0.5"
                            onClick={(e) => e.stopPropagation()}
                            onKeyDown={(e) => e.stopPropagation()}
                          >
                            <Checkbox
                              checked={checked}
                              onCheckedChange={() => toggleSheetLeadSelect(l._id)}
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="font-bold text-slate-900 dark:text-slate-100">{l.name}</div>
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {l.category && (
                                <Badge variant="outline" className="text-[10px] font-bold uppercase">
                                  {l.category}
                                </Badge>
                              )}
                              {l.city && <Badge variant="secondary">{l.city}</Badge>}
                              <Badge
                                variant={hasTel ? 'default' : 'destructive'}
                                className="text-[10px] font-semibold"
                              >
                                {hasTel ? 'Tel var' : 'Tel yok'}
                              </Badge>
                              <Badge
                                variant={hasSite ? 'default' : 'outline'}
                                className="text-[10px] font-semibold"
                              >
                                {hasSite ? 'Web var' : 'Web yok'}
                              </Badge>
                              <Badge variant={hasEm ? 'default' : 'outline'} className="text-[10px] font-semibold">
                                {hasEm ? 'E-posta var' : 'E-posta yok'}
                              </Badge>
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 shrink-0 rounded-xl text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/40"
                            title="Sadece bunu ekle"
                            onClick={(e) => {
                              e.stopPropagation();
                              void addLeadToPlan(l._id);
                              setSheetOpen(false);
                            }}
                          >
                            <Plus className="h-5 w-5" />
                          </Button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </ScrollArea>
          </SheetContent>
        </Sheet>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-3xl font-bold tracking-tight text-transparent">
            Daily Planner
          </h2>
          <p className="mt-1 text-sm font-medium uppercase tracking-widest text-muted-foreground opacity-70">
            Günlük görüşmeleri Trello panosuyla yönet
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="h-11 rounded-xl border-slate-200 font-bold text-slate-600 shadow-sm dark:border-slate-800"
            onClick={() => {
              setCurrentDate(new Date());
              openDayDetail(new Date().getDate());
            }}
          >
            Bugün
          </Button>
        </div>
      </div>

      <Card className="overflow-hidden rounded-[40px] border-0 bg-white shadow-2xl shadow-slate-200/50 dark:bg-slate-900 dark:shadow-none">
        <CardHeader className="border-b border-slate-50 p-8 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-black text-slate-900 dark:text-slate-100">
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </h3>
            <div className="flex gap-2">
              <Button variant="ghost" size="icon" onClick={handlePrevMonth} className="h-10 w-10 rounded-xl hover:bg-slate-100">
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" onClick={handleNextMonth} className="h-10 w-10 rounded-xl hover:bg-slate-100">
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="grid grid-cols-7 border-b border-slate-50 dark:border-slate-800">
            {dayLabels.map((day) => (
              <div
                key={day}
                className="border-r border-slate-50 py-4 text-center text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 last:border-r-0 dark:border-slate-800"
              >
                {day}
              </div>
            ))}
          </div>
          <div className="grid min-h-[600px] grid-cols-7">
            {Array.from({ length: 42 }).map((_, i) => {
              const day = i - firstDayOfMonth(currentDate.getFullYear(), currentDate.getMonth()) + 1;
              const isCurrentMonth = day > 0 && day <= daysInMonth(currentDate.getFullYear(), currentDate.getMonth());
              const plan = isCurrentMonth ? getDayPlan(day) : null;
              const isToday =
                isCurrentMonth &&
                day === new Date().getDate() &&
                currentDate.getMonth() === new Date().getMonth() &&
                currentDate.getFullYear() === new Date().getFullYear();

              return (
                <div
                  key={i}
                  role="button"
                  tabIndex={0}
                  onClick={() => isCurrentMonth && openDayDetail(day)}
                  onKeyDown={(e) => {
                    if (isCurrentMonth && (e.key === 'Enter' || e.key === ' ')) {
                      e.preventDefault();
                      openDayDetail(day);
                    }
                  }}
                  className={`group relative min-h-[120px] cursor-pointer border-b border-r border-slate-50 p-4 transition-colors last:border-r-0 hover:bg-slate-50/50 dark:border-slate-800 dark:hover:bg-slate-800/20 ${!isCurrentMonth ? 'bg-slate-50/30 opacity-30 dark:bg-slate-900/30' : ''}`}
                >
                  <span
                    className={`text-sm font-bold ${isToday ? 'flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-white' : 'text-slate-400'}`}
                  >
                    {isCurrentMonth ? day : ''}
                  </span>

                  {plan && plan.relatedLeads.length > 0 && (
                    <div className="mt-2 space-y-1">
                      <div className="rounded-lg border border-blue-100 bg-blue-50 p-1.5 dark:border-blue-800 dark:bg-blue-900/30">
                        <div className="flex items-center gap-1 text-[10px] font-black text-blue-700 dark:text-blue-400">
                          <Clock size={10} /> {plan.relatedLeads.length} işletme
                        </div>
                      </div>
                      {plan.relatedLeads.slice(0, 2).map((lead, li) => (
                        <div key={li} className="truncate px-1 text-[9px] font-bold text-slate-500">
                          • {lead.name}
                        </div>
                      ))}
                      {plan.relatedLeads.length > 2 && (
                        <div className="px-1 text-[9px] font-bold text-slate-400">
                          + {plan.relatedLeads.length - 2} daha
                        </div>
                      )}
                    </div>
                  )}

                  {isCurrentMonth && (
                    <button
                      type="button"
                      className="absolute bottom-2 right-2 rounded-lg bg-slate-100 p-1.5 text-slate-400 opacity-0 transition-opacity hover:bg-blue-600 hover:text-white group-hover:opacity-100 dark:bg-slate-800"
                      onClick={(e) => {
                        e.stopPropagation();
                        openDayDetail(day);
                      }}
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
