import { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import { 
  Plus, 
  X, 
  MoreHorizontal, 
  MessageSquare, 
  Star, 
  Phone, 
  Globe, 
  MapPin, 
  Sparkles, 
  Settings2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Textarea } from '@/components/ui/textarea'

type Stage = { _id: string; name: string; label: string; icon: string; color: string; order: number; };
type Lead = { 
  _id: string; 
  name: string; 
  status?: string; 
  category?: string; 
  rating?: number; 
  reviews?: number; 
  notes?: string[]; 
  phone?: string; 
  website?: string; 
  email?: string; 
  address?: string; 
  city?: string;
  createdAt?: string;
  aiAnalysis?: {
    score: number;
    potential: 'LOW' | 'MEDIUM' | 'HIGH' | 'GOLDEN';
    reasoning: string;
    suggestedNiche?: string;
    estimatedBudget?: string;
    lastAnalyzed?: Date;
  };
}

export const Pipeline = ({ leads, fetchData }: { leads: Lead[]; fetchData: () => Promise<void> }) => {
  const [stages, setStages] = useState<Stage[]>([]);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isAddStageOpen, setIsAddStageOpen] = useState(false);
  const [newStageLabel, setNewStageLabel] = useState('');
  const [newNote, setNewNote] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => { 
    const init = async () => {
      const res = await axios.get(`${API_BASE_URL}/api/pipeline-stages`);
      if (res.data.length === 0) {
        const defaults = [
          { name: 'BACKLOG', label: 'Backlog', icon: 'Layers', color: 'blue', order: 1 },
          { name: 'TODO', label: 'To Do', icon: 'Clock', color: 'purple', order: 2 },
          { name: 'IN_PROGRESS', label: 'In Progress', icon: 'ArrowRight', color: 'amber', order: 3 },
          { name: 'DONE', label: 'Done', icon: 'CheckCircle2', color: 'emerald', order: 4 },
        ];
        await Promise.all(defaults.map(s => axios.post(`${API_BASE_URL}/api/pipeline-stages`, s)));
        const refreshed = await axios.get(`${API_BASE_URL}/api/pipeline-stages`);
        setStages(refreshed.data);
      } else {
        setStages(res.data);
      }
    };
    init();
  }, []);

  const addStage = async () => {
    if (!newStageLabel.trim()) return;
    try {
      const name = newStageLabel.toUpperCase().replace(/\s+/g, '_');
      await axios.post(`${API_BASE_URL}/api/pipeline-stages`, { 
        label: newStageLabel, 
        name, 
        color: 'blue', 
        order: stages.length + 1 
      });
      const res = await axios.get(`${API_BASE_URL}/api/pipeline-stages`);
      setStages(res.data);
      setNewStageLabel('');
      setIsAddStageOpen(false);
    } catch (err) { console.error(err); }
  };

  const deleteStage = async (id: string) => {
    if (!confirm('Delete this list?')) return;
    await axios.delete(`${API_BASE_URL}/api/pipeline-stages/${id}`);
    setStages(stages.filter(s => s._id !== id));
  };

  const onDragStart = (e: React.DragEvent, leadId: string) => {
    e.dataTransfer.setData('leadId', leadId);
  };

  const onDrop = async (e: React.DragEvent, newStatus: string) => {
    const leadId = e.dataTransfer.getData('leadId');
    await axios.put(`${API_BASE_URL}/api/leads/${leadId}`, { status: newStatus });
    fetchData();
  };

  const addNote = async () => {
    if (!newNote.trim() || !selectedLead) return;
    setIsSaving(true);
    const updatedNotes = [...(selectedLead.notes || []), newNote.trim()];
    const res = await axios.put(`${API_BASE_URL}/api/leads/${selectedLead._id}`, { notes: updatedNotes });
    setSelectedLead(res.data);
    setNewNote('');
    fetchData();
    setIsSaving(false);
  };

  return (
    <div className="h-[calc(100vh-160px)] -m-6 md:-m-10 lg:-m-12 overflow-hidden flex flex-col bg-[#ebedf0] dark:bg-slate-950">
      {/* Trello Top Bar */}
      <div className="px-6 py-3 flex items-center justify-between bg-black/5 dark:bg-white/5 backdrop-blur-sm border-b border-black/5 dark:border-white/5">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
             Sales Board
             <Badge variant="outline" className="text-[10px] font-bold border-slate-300">Public</Badge>
          </h2>
          <div className="h-6 w-[1px] bg-slate-300 dark:bg-slate-800 mx-2" />
          <div className="flex -space-x-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-7 w-7 rounded-full bg-slate-300 dark:bg-slate-800 border-2 border-[#ebedf0] dark:border-slate-950 flex items-center justify-center text-[10px] font-bold">U{i}</div>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
           <Button variant="ghost" size="sm" className="h-8 text-xs font-bold text-slate-600">Share</Button>
           <Button variant="ghost" size="sm" className="h-8 text-xs font-bold text-slate-600"><MoreHorizontal size={16} /></Button>
        </div>
      </div>

      {/* Trello Kanban Workspace */}
      <ScrollArea className="flex-1 w-full whitespace-nowrap">
        <div className="flex items-start gap-3 p-4 h-full">
          {stages.sort((a,b) => a.order - b.order).map(stage => {
            const stageLeads = leads.filter(l => l.status === stage.name);
            return (
              <div 
                key={stage._id} 
                className="w-72 min-w-[288px] bg-[#f1f2f4] dark:bg-slate-900/50 rounded-xl flex flex-col max-h-full shadow-sm"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => onDrop(e, stage.name)}
              >
                {/* List Header */}
                <div className="p-3 pb-2 flex items-center justify-between group">
                  <h3 className="text-sm font-bold text-[#172b4d] dark:text-slate-200 px-2 flex-1 cursor-pointer">
                    {stage.label}
                  </h3>
                  <DropdownMenu>
                    <DropdownMenuTrigger render={<button className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity"><MoreHorizontal size={14} /></button>} />
                    <DropdownMenuContent className="w-48 rounded-lg shadow-xl">
                       <DropdownMenuItem onClick={() => deleteStage(stage._id)} className="text-red-600 font-medium">Delete List</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Vertical Card Scroll */}
                <ScrollArea className="flex-1">
                  <div className="px-3 pb-3 space-y-2">
                    {stageLeads.map(l => (
                      <Card 
                        key={l._id}
                        draggable
                        onDragStart={(e) => onDragStart(e, l._id)}
                        onClick={() => setSelectedLead(l)}
                        className="border-0 shadow-[0_1px_1px_rgba(9,30,66,0.25)] dark:shadow-none dark:border dark:border-slate-800 bg-white dark:bg-slate-900 rounded-lg cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors group active:rotate-1"
                      >
                        <CardContent className="p-2.5 space-y-2">
                          {/* Labels */}
                          <div className="flex flex-wrap gap-1">
                             {l.aiAnalysis?.potential === 'GOLDEN' && <div className="h-2 w-10 rounded-full bg-amber-400" title="Golden Lead" />}
                             {l.aiAnalysis?.potential === 'HIGH' && <div className="h-2 w-10 rounded-full bg-emerald-400" title="High Potential" />}
                             <div className="h-2 w-10 rounded-full bg-blue-400" />
                          </div>
                          
                          <div className="text-sm font-medium text-[#172b4d] dark:text-slate-100 leading-tight">
                            {l.name}
                          </div>

                          {/* Indicators */}
                          <div className="flex items-center gap-3 text-slate-400">
                             {l.notes && l.notes.length > 0 && (
                               <div className="flex items-center gap-1 text-[10px] font-medium">
                                  <MessageSquare size={12} /> {l.notes.length}
                               </div>
                             )}
                             {l.phone && <Phone size={12} />}
                             {l.website && <Globe size={12} />}
                             <div className="flex-1" />
                             {l.aiAnalysis && (
                                <Badge variant="secondary" className="text-[9px] font-black h-4 px-1 rounded-sm bg-slate-100 dark:bg-slate-800 border-0">
                                   {l.aiAnalysis.score}%
                                </Badge>
                             )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>

                {/* List Footer */}
                <div className="p-2">
                  <Button variant="ghost" className="w-full justify-start gap-2 h-9 text-slate-500 font-medium hover:bg-black/5 dark:hover:bg-white/5 rounded-lg text-sm">
                    <Plus size={16} /> Add a card
                  </Button>
                </div>
              </div>
            )
          })}

          {/* Add Another List */}
          <div className="w-72 min-w-[288px]">
            {!isAddStageOpen ? (
              <button 
                onClick={() => setIsAddStageOpen(true)}
                className="w-full h-11 bg-white/50 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 transition-colors rounded-xl flex items-center gap-2 px-4 text-slate-700 dark:text-slate-300 font-bold text-sm shadow-sm border border-black/5 dark:border-white/5"
              >
                <Plus size={18} /> Add another list
              </button>
            ) : (
              <Card className="bg-[#f1f2f4] dark:bg-slate-900 p-2 border-0 shadow-lg animate-in zoom-in-95 duration-200">
                <Input 
                  autoFocus 
                  placeholder="Enter list title..." 
                  className="h-9 text-sm font-bold bg-white dark:bg-slate-800 border-2 border-blue-500 focus-visible:ring-0 mb-2"
                  value={newStageLabel}
                  onChange={e => setNewStageLabel(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addStage()}
                />
                <div className="flex items-center gap-2">
                  <Button size="sm" onClick={addStage} className="bg-blue-600 hover:bg-blue-700 text-white font-bold h-8">Add list</Button>
                  <Button size="sm" variant="ghost" onClick={() => setIsAddStageOpen(false)} className="h-8 w-8 p-0 text-slate-500"><X size={20} /></Button>
                </div>
              </Card>
            )}
          </div>
        </div>
        <ScrollBar orientation="horizontal" className="h-3" />
      </ScrollArea>

      {/* Trello Card Detail Modal */}
      <Dialog open={!!selectedLead} onOpenChange={(open) => !open && setSelectedLead(null)}>
        <DialogContent className="max-w-3xl rounded-xl border-0 shadow-2xl p-0 overflow-hidden max-h-[90vh] bg-[#f4f5f7] dark:bg-slate-950">
          {selectedLead && (
            <div className="flex flex-col h-full">
               {/* Modal Header */}
               <div className="p-6 pb-2 space-y-4">
                  <div className="flex items-start justify-between">
                     <div className="flex items-start gap-4 flex-1">
                        <div className="mt-1 text-slate-600 dark:text-slate-400"><Layers size={24} /></div>
                        <div className="space-y-1">
                           <h2 className="text-xl font-bold text-[#172b4d] dark:text-slate-100">{selectedLead.name}</h2>
                           <p className="text-sm text-slate-500">in list <span className="underline cursor-pointer">{selectedLead.status}</span></p>
                        </div>
                     </div>
                     <Button variant="ghost" onClick={() => setSelectedLead(null)} className="h-8 w-8 rounded-full p-0"><X size={20} /></Button>
                  </div>
               </div>

               {/* Modal Body */}
               <ScrollArea className="flex-1">
                  <div className="p-6 grid grid-cols-1 md:grid-cols-12 gap-8">
                     <div className="md:col-span-8 space-y-8">
                        {/* Description/AI Analysis */}
                        <div className="space-y-4">
                           <div className="flex items-center gap-3">
                              <Sparkles className="text-slate-600 dark:text-slate-400" size={20} />
                              <h3 className="font-bold text-[#172b4d] dark:text-slate-100">AI Insights</h3>
                           </div>
                           <Card className="border-0 shadow-sm rounded-lg p-5 bg-white dark:bg-slate-900">
                              {selectedLead.aiAnalysis ? (
                                <div className="space-y-4">
                                   <div className="flex items-center gap-2">
                                      <Badge className="bg-amber-100 text-amber-700 border-0">{selectedLead.aiAnalysis.potential}</Badge>
                                      <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{selectedLead.aiAnalysis.score}% Quality Score</span>
                                   </div>
                                   <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed italic">"{selectedLead.aiAnalysis.reasoning}"</p>
                                </div>
                              ) : (
                                <p className="text-sm text-slate-400">No AI analysis available for this lead yet.</p>
                              )}
                           </Card>
                        </div>

                        {/* Activity/Notes */}
                        <div className="space-y-4">
                           <div className="flex items-center gap-3">
                              <MessageSquare className="text-slate-600 dark:text-slate-400" size={20} />
                              <h3 className="font-bold text-[#172b4d] dark:text-slate-100">Activity</h3>
                           </div>
                           
                           {/* Add Note */}
                           <div className="flex gap-3">
                              <div className="h-8 w-8 rounded-full bg-slate-300 dark:bg-slate-800 flex items-center justify-center text-xs font-bold">ME</div>
                              <div className="flex-1 space-y-2">
                                 <Textarea 
                                    placeholder="Write a comment..." 
                                    value={newNote}
                                    onChange={e => setNewNote(e.target.value)}
                                    className="min-h-[80px] bg-white dark:bg-slate-900 border-0 shadow-sm text-sm rounded-lg"
                                 />
                                 <Button size="sm" onClick={addNote} disabled={!newNote.trim() || isSaving} className="bg-blue-600 font-bold h-8">Save</Button>
                              </div>
                           </div>

                           {/* Note List */}
                           <div className="space-y-4 pl-11">
                              {selectedLead.notes?.map((n, i) => (
                                <div key={i} className="space-y-1">
                                   <div className="flex items-center gap-2">
                                      <span className="text-sm font-bold text-[#172b4d] dark:text-slate-100">Sales Agent</span>
                                      <span className="text-[10px] text-slate-400">Just now</span>
                                   </div>
                                   <div className="bg-white dark:bg-slate-900 p-3 rounded-lg shadow-sm text-sm text-slate-700 dark:text-slate-300 border-0">
                                      {typeof n === 'string' ? n : (n as any)?.content || ''}
                                   </div>
                                </div>
                              ))}
                           </div>
                        </div>
                     </div>

                     {/* Right Sidebar */}
                     <div className="md:col-span-4 space-y-6">
                        <div className="space-y-2">
                           <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Actions</h4>
                           <div className="space-y-2">
                              <Button variant="outline" className="w-full justify-start gap-2 h-8 text-xs font-bold bg-white/50 dark:bg-white/5 border-0 shadow-sm text-slate-700 dark:text-slate-300">
                                 <Star size={14} /> Join
                              </Button>
                              <Button variant="outline" className="w-full justify-start gap-2 h-8 text-xs font-bold bg-white/50 dark:bg-white/5 border-0 shadow-sm text-slate-700 dark:text-slate-300">
                                 <Settings2 size={14} /> Automation
                              </Button>
                           </div>
                        </div>

                        <div className="space-y-2 pt-4">
                           <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Contact Details</h4>
                           <div className="bg-white dark:bg-slate-900 rounded-lg p-3 space-y-3 shadow-sm">
                              {selectedLead.phone && (
                                <div className="flex items-center gap-3 text-xs font-medium text-slate-600 dark:text-slate-400">
                                   <Phone size={14} className="text-emerald-500" /> {selectedLead.phone}
                                </div>
                              )}
                              {selectedLead.website && (
                                <div className="flex items-center gap-3 text-xs font-medium text-slate-600 dark:text-slate-400 overflow-hidden">
                                   <Globe size={14} className="text-blue-500" /> 
                                   <span className="truncate">{selectedLead.website}</span>
                                </div>
                              )}
                              {selectedLead.address && (
                                <div className="flex items-start gap-3 text-xs font-medium text-slate-600 dark:text-slate-400 leading-relaxed">
                                   <MapPin size={14} className="text-red-500 shrink-0 mt-0.5" /> {selectedLead.address}
                                </div>
                              )}
                           </div>
                        </div>
                     </div>
                  </div>
               </ScrollArea>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

const Layers = (props: any) => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z" />
    <path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65" />
    <path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65" />
  </svg>
)