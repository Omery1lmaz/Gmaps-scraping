import React, { useCallback, useState, useEffect, useRef } from 'react';
import { 
  ReactFlow, 
  Background, 
  Controls, 
  MiniMap,
  ReactFlowProvider,
  addEdge,
  MarkerType
} from '@xyflow/react';
import type { Edge } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useWorkflowStore } from '../stores/workflowStore';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { 
  Save, Play, PlayCircle, Settings2, Trash2, ArrowLeft, 
  ShieldCheck, Check, Sparkles, Wand2, GitFork, Activity, BrainCircuit,
  Terminal, RotateCcw, HelpCircle, CheckCircle2, AlertCircle, Eye, EyeOff, LayoutGrid, Calendar, Clock, Gauge, Database, Copy, Plus, Download, Upload, Keyboard, Star, X,
  Target, Heart, Smile, Compass, Send, MessageSquare, Zap, Tag, MapPin
} from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from '../lib/router';
import { createSequence, getSequenceDetails, updateSequence, getTemplates } from '../lib/api';
import { toast } from 'sonner';
import { useT } from '../lib/i18n';

// Custom Nodes
import { TriggerNode } from '../components/nodes/TriggerNode';
import { SendMessageNode } from '../components/nodes/SendMessageNode';
import { TimeDelayNode } from '../components/nodes/TimeDelayNode';
import { ConditionNode } from '../components/nodes/ConditionNode';

const nodeTypes = {
  trigger: TriggerNode,
  sendMessage: SendMessageNode,
  timeDelay: TimeDelayNode,
  condition: ConditionNode,
};

function Flow() {
  const t = useT();
  const navigate = useNavigate();
  const { id } = useParams();

  const DAYS = [
    { label: t('day_sun_short'), value: 0 },
    { label: t('day_mon_short'), value: 1 },
    { label: t('day_tue_short'), value: 2 },
    { label: t('day_wed_short'), value: 3 },
    { label: t('day_thu_short'), value: 4 },
    { label: t('day_fri_short'), value: 5 },
    { label: t('day_sat_short'), value: 6 },
  ];

  const MERGE_TAGS = [
    { tag: '{businessName}', label: t('mt_business_name'), desc: t('mt_business_name_desc') },
    { tag: '{city}', label: t('mt_city'), desc: t('mt_city_desc') },
    { tag: '{category}', label: t('mt_category'), desc: t('mt_category_desc') },
    { tag: '{rating}', label: t('mt_rating'), desc: t('mt_rating_desc') },
    { tag: '{website}', label: t('mt_website'), desc: t('mt_website_desc') },
    { tag: '{phone}', label: t('mt_phone'), desc: t('mt_phone_desc') },
  ];

  const HOTKEYS = [
    { keys: 'Ctrl + S', desc: t('hk_save') },
    { keys: 'Ctrl + A', desc: t('hk_align') },
    { keys: 'Ctrl + D', desc: t('hk_duplicate') },
    { keys: 'Del / Backspace', desc: t('hk_delete') },
    { keys: 'Esc', desc: t('hk_close') },
  ];

  const PREBUILT_TEMPLATES = [
    {
      id: 'cold_outreach',
      name: t('tpl_cold_outreach_name'),
      description: t('tpl_cold_outreach_desc'),
      icon: Sparkles,
      color: 'from-blue-500 to-indigo-600',
      nodes: [
        { id: 'trigger-1', type: 'trigger', position: { x: 250, y: 50 }, data: { label: t('tr_trigger') } },
        { id: 'timeDelay-1', type: 'timeDelay', position: { x: 250, y: 180 }, data: { delayHours: 1 } },
        { id: 'sendMessage-1', type: 'sendMessage', position: { x: 250, y: 310 }, data: { templateId: '' } },
        { id: 'condition-1', type: 'condition', position: { x: 250, y: 440 }, data: { conditionType: 'hasReplied' } },
        { id: 'timeDelay-2', type: 'timeDelay', position: { x: 100, y: 580 }, data: { delayHours: 48 } },
        { id: 'sendMessage-2', type: 'sendMessage', position: { x: 100, y: 710 }, data: { templateId: '' } },
      ],
      edges: [
        { id: 'e-t-td1', source: 'trigger-1', target: 'timeDelay-1', animated: true, markerEnd: { type: MarkerType.ArrowClosed, color: '#f59e0b' }, style: { strokeWidth: 2, stroke: '#f59e0b' } },
        { id: 'e-td1-sm1', source: 'timeDelay-1', target: 'sendMessage-1', animated: true, markerEnd: { type: MarkerType.ArrowClosed, color: '#3b82f6' }, style: { strokeWidth: 2, stroke: '#3b82f6' } },
        { id: 'e-sm1-c1', source: 'sendMessage-1', target: 'condition-1', animated: true, markerEnd: { type: MarkerType.ArrowClosed, color: '#a855f7' }, style: { strokeWidth: 2, stroke: '#a855f7' } },
        { id: 'e-c1-td2', source: 'condition-1', sourceHandle: 'no', target: 'timeDelay-2', animated: true, markerEnd: { type: MarkerType.ArrowClosed, color: '#f59e0b' }, style: { strokeWidth: 2, stroke: '#f59e0b' } },
        { id: 'e-td2-sm2', source: 'timeDelay-2', target: 'sendMessage-2', animated: true, markerEnd: { type: MarkerType.ArrowClosed, color: '#3b82f6' }, style: { strokeWidth: 2, stroke: '#3b82f6' } }
      ]
    },
    {
      id: 'feedback_collection',
      name: t('tpl_feedback_name'),
      description: t('tpl_feedback_desc'),
      icon: Star,
      color: 'from-amber-500 to-orange-600',
      nodes: [
        { id: 'trigger-1', type: 'trigger', position: { x: 250, y: 50 }, data: { label: t('tr_trigger') } },
        { id: 'timeDelay-1', type: 'timeDelay', position: { x: 250, y: 180 }, data: { delayHours: 24 } },
        { id: 'sendMessage-1', type: 'sendMessage', position: { x: 250, y: 310 }, data: { templateId: '' } },
        { id: 'condition-1', type: 'condition', position: { x: 250, y: 440 }, data: { conditionType: 'hasReplied' } },
        { id: 'timeDelay-2', type: 'timeDelay', position: { x: 100, y: 580 }, data: { delayHours: 72 } },
        { id: 'sendMessage-2', type: 'sendMessage', position: { x: 100, y: 710 }, data: { templateId: '' } },
      ],
      edges: [
        { id: 'e-t-td1', source: 'trigger-1', target: 'timeDelay-1', animated: true, markerEnd: { type: MarkerType.ArrowClosed, color: '#f59e0b' }, style: { strokeWidth: 2, stroke: '#f59e0b' } },
        { id: 'e-td1-sm1', source: 'timeDelay-1', target: 'sendMessage-1', animated: true, markerEnd: { type: MarkerType.ArrowClosed, color: '#3b82f6' }, style: { strokeWidth: 2, stroke: '#3b82f6' } },
        { id: 'e-sm1-c1', source: 'sendMessage-1', target: 'condition-1', animated: true, markerEnd: { type: MarkerType.ArrowClosed, color: '#a855f7' }, style: { strokeWidth: 2, stroke: '#a855f7' } },
        { id: 'e-c1-td2', source: 'condition-1', sourceHandle: 'no', target: 'timeDelay-2', animated: true, markerEnd: { type: MarkerType.ArrowClosed, color: '#f59e0b' }, style: { strokeWidth: 2, stroke: '#f59e0b' } },
        { id: 'e-td2-sm2', source: 'timeDelay-2', target: 'sendMessage-2', animated: true, markerEnd: { type: MarkerType.ArrowClosed, color: '#3b82f6' }, style: { strokeWidth: 2, stroke: '#3b82f6' } }
      ]
    },
    {
      id: 'welcome_offers',
      name: t('tpl_welcome_name'),
      description: t('tpl_welcome_desc'),
      icon: Sparkles,
      color: 'from-purple-500 to-pink-600',
      nodes: [
        { id: 'trigger-1', type: 'trigger', position: { x: 250, y: 50 }, data: { label: t('tr_trigger') } },
        { id: 'timeDelay-1', type: 'timeDelay', position: { x: 250, y: 180 }, data: { delayHours: 4 } },
        { id: 'sendMessage-1', type: 'sendMessage', position: { x: 250, y: 310 }, data: { templateId: '' } },
      ],
      edges: [
        { id: 'e-t-td1', source: 'trigger-1', target: 'timeDelay-1', animated: true, markerEnd: { type: MarkerType.ArrowClosed, color: '#f59e0b' }, style: { strokeWidth: 2, stroke: '#f59e0b' } },
        { id: 'e-td1-sm1', source: 'timeDelay-1', target: 'sendMessage-1', animated: true, markerEnd: { type: MarkerType.ArrowClosed, color: '#3b82f6' }, style: { strokeWidth: 2, stroke: '#3b82f6' } }
      ]
    }
  ];

  const queryClient = useQueryClient();
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect, setNodes, setEdges } = useWorkflowStore();
  const [name, setName] = useState('');
  const [selectedNode, setSelectedNode] = useState<any>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const loadedSequenceIdRef = useRef<string | null>(null);
  
  // Right-Click Context Menu State
  const [menuPosition, setMenuPosition] = useState<{ x: number; y: number } | null>(null);
  const [menuProjectedPos, setMenuProjectedPos] = useState<{ x: number; y: number } | null>(null);

  // Prebuilt Templates Modal State
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);

  // Advanced Anti-Ban & Scheduler Settings State
  const [sendTimeStart, setSendTimeStart] = useState('09:00');
  const [sendTimeEnd, setSendTimeEnd] = useState('18:00');
  const [activeDays, setActiveDays] = useState<number[]>([1, 2, 3, 4, 5]); // Default Mon-Fri
  const [maxPerDay, setMaxPerDay] = useState<number>(50);
  const [minDelayMinutes, setMinDelayMinutes] = useState<number>(5);
  const [skipReplied, setSkipReplied] = useState(true);
  const [autoStopOnReply, setAutoStopOnReply] = useState(true);

  // Auto enrollment settings
  const [autoEnrollEnabled, setAutoEnrollEnabled] = useState(false);
  const [autoEnrollCategory, setAutoEnrollCategory] = useState('');
  const [autoEnrollCity, setAutoEnrollCity] = useState('');
  const [autoEnrollMinRating, setAutoEnrollMinRating] = useState<number>(0);
  const [autoEnrollHasWebsite, setAutoEnrollHasWebsite] = useState<'all' | 'true' | 'false'>('all');
  const [autoEnrollHasPhone, setAutoEnrollHasPhone] = useState<'all' | 'true' | 'false'>('all');
  const [whatsappSessionId, setWhatsappSessionId] = useState<string | null>(null);
  const [aiReplyEnabled, setAiReplyEnabled] = useState(false);
  const [aiReplyPrompt, setAiReplyPrompt] = useState('');

  // Fetch available WhatsApp sessions
  const { data: sessions = [] } = useQuery({
    queryKey: ['wa-sessions'],
    queryFn: async () => {
      const res = await api.get('/whatsapp/sessions');
      return res.data;
    }
  });

  // AI Copilot Input
  const [aiPrompt, setAiPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  // Simulation Mode State
  const [isSimulating, setIsSimulating] = useState(false);
  const [simActiveNode, setSimActiveNode] = useState<string | null>(null);
  const [simLogs, setSimLogs] = useState<string[]>([]);
  const [simStatus, setSimStatus] = useState<'idle' | 'running' | 'paused' | 'completed'>('idle');
  const [simBranchChoice, setSimBranchChoice] = useState<boolean | null>(null);
  const [simWaitingForChoice, setSimWaitingForChoice] = useState(false);

  // Dynamic Workspace Styling & Theme State (LocalStorage Persisted)
  const [canvasTheme, setCanvasTheme] = useState<'light' | 'dark' | 'blueprint' | 'warm'>(() => {
    try {
      return (localStorage.getItem('gmaps_canvas_theme') as any) || 'light';
    } catch { return 'light'; }
  });
  const [bgVariant, setBgVariant] = useState<'dots' | 'lines' | 'cross'>(() => {
    return (localStorage.getItem('gmaps_canvas_bg_variant') as any) || 'dots';
  });
  const [gridGap, setGridGap] = useState<number>(() => {
    return parseInt(localStorage.getItem('gmaps_canvas_grid_gap') || '20');
  });
  const [gridSize, setGridSize] = useState<number>(() => {
    return parseFloat(localStorage.getItem('gmaps_canvas_grid_size') || '1.5');
  });
  const [showMinimap, setShowMinimap] = useState<boolean>(() => {
    return localStorage.getItem('gmaps_canvas_show_minimap') !== 'false';
  });

  // LocalStorage synchronizer effects
  useEffect(() => {
    localStorage.setItem('gmaps_canvas_theme', canvasTheme);
  }, [canvasTheme]);

  useEffect(() => {
    localStorage.setItem('gmaps_canvas_bg_variant', bgVariant);
  }, [bgVariant]);

  useEffect(() => {
    localStorage.setItem('gmaps_canvas_grid_gap', gridGap.toString());
  }, [gridGap]);

  useEffect(() => {
    localStorage.setItem('gmaps_canvas_grid_size', gridSize.toString());
  }, [gridSize]);

  useEffect(() => {
    localStorage.setItem('gmaps_canvas_show_minimap', showMinimap.toString());
  }, [showMinimap]);

  // Active Selected Node inside reactive nodes state
  const activeNode = nodes.find(n => n.id === selectedNode?.id);

  // Fetch templates for matching
  const { data: templates = [] } = useQuery({
    queryKey: ['templates'],
    queryFn: getTemplates
  });

  // Fetch sequence if editing
  const { data: sequence, isLoading: isSequenceLoading } = useQuery({
    queryKey: ['sequence', id],
    queryFn: () => getSequenceDetails(id as string),
    enabled: !!id,
    refetchInterval: false
  });

  // Mathematical Branching-Aware Auto Align Tree Layout
  const handleAutoAlign = (nodesToAlign?: any[], edgesToAlign?: any[], isSilent = false) => {
    const currentNodes = nodesToAlign || useWorkflowStore.getState().nodes;
    const currentEdges = edgesToAlign || useWorkflowStore.getState().edges;

    const trigger = currentNodes.find(n => n.type === 'trigger');
    if (!trigger) {
      if (!isSilent) {
        toast.error(t('vsb_align_error'));
      }
      return;
    }

    const alignedNodes = JSON.parse(JSON.stringify(currentNodes));
    const visited = new Set<string>();

    const alignNode = (nodeId: string, x: number, y: number) => {
      if (visited.has(nodeId)) return;
      visited.add(nodeId);

      const nodeIdx = alignedNodes.findIndex((n: any) => n.id === nodeId);
      if (nodeIdx === -1) return;

      alignedNodes[nodeIdx].position = { x, y };

      const node = alignedNodes[nodeIdx];
      if (node.type === 'condition') {
        const yesEdge = currentEdges.find(e => e.source === nodeId && e.sourceHandle === 'yes');
        const noEdge = currentEdges.find(e => e.source === nodeId && e.sourceHandle === 'no');

        if (yesEdge) alignNode(yesEdge.target, x - 180, y + 160);
        if (noEdge) alignNode(noEdge.target, x + 180, y + 160);
      } else {
        const edge = currentEdges.find(e => e.source === nodeId);
        if (edge) alignNode(edge.target, x, y + 160);
      }
    };

    alignNode(trigger.id, 250, 50);
    setNodes(alignedNodes);
    if (edgesToAlign) {
      setEdges(edgesToAlign);
    }
    if (!isSilent) {
      toast.success(t('vsb_align_success'));
    }
  };

  // Update Dynamic Node Data Parameters
  const updateNodeData = (nodeId: string, updatedFields: any) => {
    setNodes(nodes.map(n => {
      if (n.id === nodeId) {
        return {
          ...n,
          data: {
            ...n.data,
            ...updatedFields
          }
        };
      }
      return n;
    }));
  };

  // Toggle Day helper
  const handleDayToggle = (dayVal: number) => {
    if (activeDays.includes(dayVal)) {
      setActiveDays(activeDays.filter(d => d !== dayVal));
    } else {
      setActiveDays([...activeDays, dayVal].sort());
    }
  };

  // Copy Merge Tag Helper
  const handleCopyTag = (tag: string) => {
    navigator.clipboard.writeText(tag);
    toast.success(`"${tag}" etiketi kopyalandı! Şablon içeriğinde kullanabilirsiniz.`);
  };

  // Apply Prebuilt Template
  const handleApplyPrebuilt = (tpl: typeof PREBUILT_TEMPLATES[0]) => {
    try {
      const templateNodes = JSON.parse(JSON.stringify(tpl.nodes));
      const templateEdges = JSON.parse(JSON.stringify(tpl.edges));
      
      if (!name.trim()) {
        setName(tpl.name);
      }
      setIsTemplateModalOpen(false);
      
      // Align and apply simultaneously, silencing the alignment toast
      handleAutoAlign(templateNodes, templateEdges, true);
      toast.success(t('tpl_applied_success', tpl.name));
    } catch (err) {
      toast.error(t('vsb_apply_tpl_error'));
    }
  };

  // Export Flow to JSON file
  const handleExportFlow = () => {
    try {
      const flowData = {
        name,
        nodes,
        edges,
        sendTimeStart,
        sendTimeEnd,
        activeDays,
        maxPerDay,
        minDelayMinutes,
        skipReplied,
        autoStopOnReply,
        autoEnrollEnabled,
        autoEnrollCategory,
        autoEnrollCity,
        autoEnrollMinRating,
        autoEnrollHasWebsite,
        autoEnrollHasPhone,
        whatsappSessionId
      };

      const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
        JSON.stringify(flowData, null, 2)
      )}`;
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', jsonString);
      const safeName = name.trim().toLowerCase().replace(/[^a-z0-9]/g, '_') || 'whatsapp_akis';
      downloadAnchor.setAttribute('download', `${safeName}_workflow.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      toast.success(t('vsb_export_success'));
    } catch (err) {
      toast.error(t('vsb_export_error'));
    }
  };

  // Import Flow from JSON file
  const handleImportFlow = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedData = JSON.parse(e.target?.result as string);
        
        if (!importedData.nodes || !Array.isArray(importedData.nodes)) {
          throw new Error(t('vsb_import_invalid'));
        }

        setName(importedData.name || name);
        setSendTimeStart(importedData.sendTimeStart || '09:00');
        setSendTimeEnd(importedData.sendTimeEnd || '18:00');
        setActiveDays(importedData.activeDays || [1, 2, 3, 4, 5]);
        setMaxPerDay(importedData.maxPerDay !== undefined ? importedData.maxPerDay : 50);
        setMinDelayMinutes(importedData.minDelayMinutes !== undefined ? importedData.minDelayMinutes : 5);
        setSkipReplied(importedData.skipReplied !== undefined ? importedData.skipReplied : true);
        setAutoStopOnReply(importedData.autoStopOnReply !== undefined ? importedData.autoStopOnReply : true);
        setAutoEnrollEnabled(importedData.autoEnrollEnabled !== undefined ? importedData.autoEnrollEnabled : false);
        setAutoEnrollCategory(importedData.autoEnrollCategory || '');
        setAutoEnrollCity(importedData.autoEnrollCity || '');
        setAutoEnrollMinRating(importedData.autoEnrollMinRating || 0);
        setAutoEnrollHasWebsite(importedData.autoEnrollHasWebsite || 'all');
        setAutoEnrollHasPhone(importedData.autoEnrollHasPhone || 'all');
        
        setNodes(importedData.nodes);
        setEdges(importedData.edges || []);

        toast.success(t('vsb_import_success'));
      } catch (err: any) {
        toast.error(err.message || t('vsb_import_error'));
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Automatically migrate legacy linear steps to nodes & edges
  const migrateLinearStepsToNodes = (steps: any[]) => {
    const generatedNodes: any[] = [
      {
        id: 'trigger-1',
        type: 'trigger',
        position: { x: 250, y: 50 },
        data: { label: 'Tetikleyici' },
      }
    ];
    const generatedEdges: any[] = [];
    let currentId = 'trigger-1';
    let currentY = 180;

    steps.forEach((step: any, idx: number) => {
      // 1. Time delay node
      const delayId = `timeDelay-gen-${idx}`;
      generatedNodes.push({
        id: delayId,
        type: 'timeDelay',
        position: { x: 250, y: currentY },
        data: { delayHours: step.delayHours || 24 },
      });
      generatedEdges.push({
        id: `edge-gen-delay-${idx}`,
        source: currentId,
        target: delayId,
        animated: true,
        markerEnd: { type: MarkerType.ArrowClosed, color: '#f59e0b' },
        style: { strokeWidth: 2, stroke: '#f59e0b' }
      });
      currentId = delayId;
      currentY += 150;

      // Add a reply condition node for visualization
      const condId = `condition-gen-${idx}`;
      generatedNodes.push({
        id: condId,
        type: 'condition',
        position: { x: 250, y: currentY },
        data: { conditionType: 'hasReplied' },
      });
      generatedEdges.push({
        id: `edge-gen-cond-${idx}`,
        source: currentId,
        target: condId,
        animated: true,
        markerEnd: { type: MarkerType.ArrowClosed, color: '#a855f7' },
        style: { strokeWidth: 2, stroke: '#a855f7' }
      });
      currentId = condId;
      currentY += 150;

      // 2. Send message node
      const msgId = `sendMessage-gen-${idx}`;
      generatedNodes.push({
        id: msgId,
        type: 'sendMessage',
        position: { x: 250, y: currentY },
        data: { templateId: step.templateId?._id || step.templateId?.id || step.templateId },
      });
      generatedEdges.push({
        id: `edge-gen-msg-${idx}`,
        source: currentId,
        sourceHandle: 'no',
        target: msgId,
        animated: true,
        markerEnd: { type: MarkerType.ArrowClosed, color: '#f43f5e' },
        style: { strokeWidth: 2, stroke: '#f43f5e' }
      });
      currentId = msgId;
      currentY += 150;
    });

    return { nodes: generatedNodes, edges: generatedEdges };
  };

  // Populate data when editing existing sequence
  useEffect(() => {
    if (sequence) {
      if (loadedSequenceIdRef.current === sequence._id) {
        return;
      }
      loadedSequenceIdRef.current = sequence._id;

      setName(sequence.name || '');
      setSendTimeStart(sequence.sendTimeStart || '09:00');
      setSendTimeEnd(sequence.sendTimeEnd || '18:00');
      setActiveDays(sequence.activeDays || [1, 2, 3, 4, 5]);
      setMaxPerDay(sequence.maxPerDay !== undefined ? sequence.maxPerDay : 50);
      setMinDelayMinutes(sequence.minDelayMinutes !== undefined ? sequence.minDelayMinutes : 5);
      setSkipReplied(sequence.skipReplied !== undefined ? sequence.skipReplied : true);
      setAutoStopOnReply(sequence.autoStopOnReply !== undefined ? sequence.autoStopOnReply : true);
      setAutoEnrollEnabled(sequence.autoEnrollEnabled !== undefined ? sequence.autoEnrollEnabled : false);
      setAutoEnrollCategory(sequence.autoEnrollCategory || '');
      setAutoEnrollCity(sequence.autoEnrollCity || '');
      setAutoEnrollMinRating(sequence.autoEnrollMinRating || 0);
      setAutoEnrollHasWebsite(sequence.autoEnrollHasWebsite || 'all');
      setAutoEnrollHasPhone(sequence.autoEnrollHasPhone || 'all');
      setWhatsappSessionId(sequence.whatsappSessionId || null);
      setAiReplyEnabled(sequence.aiReplyEnabled || false);
      setAiReplyPrompt(sequence.aiPrompt || '');      
      let loadedNodes: any[] = [];
      let loadedEdges: any[] = [];

      if (sequence.nodes && sequence.nodes.length > 0) {
        loadedNodes = JSON.parse(JSON.stringify(sequence.nodes));
        loadedEdges = JSON.parse(JSON.stringify(sequence.edges || []));
      } else if (sequence.steps && sequence.steps.length > 0) {
        const migrated = migrateLinearStepsToNodes(sequence.steps);
        loadedNodes = migrated.nodes;
        loadedEdges = migrated.edges;
      }

      // If states exist, perform topological traversal to enrich with metrics!
      if (loadedNodes.length > 0 && sequence.states) {
        const states = sequence.states || [];
        
        let currentId = 'trigger-1';
        let stepIdx = 0;
        const visited = new Set<string>();

        while (currentId) {
          if (visited.has(currentId)) break;
          visited.add(currentId);

          const node = loadedNodes.find(n => n.id === currentId);
          if (!node) break;

          if (node.type === 'sendMessage') {
            const successCount = states.filter((s: any) => s.currentStepIndex === stepIdx && s.status === 'COMPLETED').length;
            const failCount = states.filter((s: any) => s.currentStepIndex === stepIdx && s.status === 'FAILED').length;
            
            node.data = {
              ...node.data,
              successCount,
              failCount
            };
            stepIdx++;
          } else if (node.type === 'timeDelay') {
            const activeCount = states.filter((s: any) => s.currentStepIndex === stepIdx && s.status === 'PENDING').length;
            node.data = {
              ...node.data,
              activeCount
            };
          }

          // Find next connected edge
          let edge = loadedEdges.find((e: any) => e.source === currentId);
          if (node.type === 'condition') {
            edge = loadedEdges.find((e: any) => e.source === currentId && e.sourceHandle === 'no') || edge;
          }
          
          if (!edge) break;
          currentId = edge.target;
        }
      }

      if (loadedNodes.length > 0) {
        setNodes(loadedNodes);
        setEdges(loadedEdges);
      }
    } else if (!id) {
      if (loadedSequenceIdRef.current === 'new') {
        return;
      }
      loadedSequenceIdRef.current = 'new';

      setName('');
      setNodes([
        {
          id: 'trigger-1',
          type: 'trigger',
          position: { x: 250, y: 50 },
          data: { label: 'Tetikleyici' },
        }
      ]);
      setEdges([]);
    }
  }, [sequence, id, setNodes, setEdges]);

  // Simulation Logic Flow Runner
  const runSimulationStep = (currentNodeId: string) => {
    setSimActiveNode(currentNodeId);
    const node = nodes.find(n => n.id === currentNodeId);
    if (!node) {
      addSimLog(t('vsb_sim_error'), 'error');
      setSimStatus('completed');
      return;
    }

    // Dynamic highlighters
    setNodes(nodes.map(n => ({
      ...n,
      style: n.id === currentNodeId ? { border: '3px solid #a855f7', boxShadow: '0 0 15px rgba(168, 85, 247, 0.4)' } : {}
    })));

    if (node.type === 'trigger') {
      addSimLog(t('vsb_sim_trigger_run'), 'success');
      setTimeout(() => proceedNext(currentNodeId), 1500);
    } else if (node.type === 'timeDelay') {
      const hours = node.data?.delayHours || 24;
      addSimLog(t('vsb_sim_delay_msg', hours), 'info');
      setTimeout(() => proceedNext(currentNodeId), 2000);
    } else if (node.type === 'sendMessage') {
      const template = templates.find(t => (t._id || t.id) === node.data?.templateId);
      const tempName = template ? template.name : t('smn_not_selected');
      addSimLog(t('vsb_sim_send_msg', tempName), 'info');
      setTimeout(() => {
        addSimLog(t('vsb_sim_msg_sent'), 'success');
        proceedNext(currentNodeId);
      }, 2000);
    } else if (node.type === 'condition') {
      addSimLog(t('vsb_sim_wait_reply'), 'info');
      setSimWaitingForChoice(true);
      setSimStatus('paused');
    }
  };

  const proceedNext = (currentNodeId: string, customBranch?: 'yes' | 'no') => {
    const node = nodes.find(n => n.id === currentNodeId);
    let edge = edges.find(e => e.source === currentNodeId);

    if (node?.type === 'condition') {
      const branch = customBranch || 'no';
      edge = edges.find(e => e.source === currentNodeId && e.sourceHandle === branch);
      
      if (branch === 'yes') {
        addSimLog(t('vsb_sim_replied'), 'success');
        setNodes(nodes.map(n => ({ ...n, style: {} })));
        setSimActiveNode(null);
        setSimStatus('completed');
        return;
      } else {
        addSimLog(t('vsb_sim_no_reply'), 'info');
      }
    }

    if (!edge) {
      addSimLog(t('vsb_sim_completed_log'), 'success');
      setNodes(nodes.map(n => ({ ...n, style: {} })));
      setSimActiveNode(null);
      setSimStatus('completed');
      return;
    }

    // Animate the active edge path
    setEdges(edges.map(e => ({
      ...e,
      animated: true,
      style: e.id === edge.id ? { stroke: '#a855f7', strokeWidth: 4 } : { strokeWidth: 2 }
    })));

    setTimeout(() => {
      runSimulationStep(edge.target);
    }, 1000);
  };

  const handleBranchSelect = (replied: boolean) => {
    setSimWaitingForChoice(false);
    setSimStatus('running');
    proceedNext(simActiveNode!, replied ? 'yes' : 'no');
  };

  const startSimulation = () => {
    const trigger = nodes.find(n => n.type === 'trigger');
    if (!trigger) {
      toast.error(t('vsb_sim_trigger_required'));
      return;
    }
    
    setIsSimulating(true);
    setSimStatus('running');
    setSimLogs([]);
    addSimLog(t('vsb_sim_start_msg'));
    
    runSimulationStep(trigger.id);
  };

  const stopSimulation = () => {
    setIsSimulating(false);
    setSimActiveNode(null);
    setSimStatus('idle');
    setSimWaitingForChoice(false);
    setNodes(nodes.map(n => ({ ...n, style: {} })));
    setEdges(edges.map(e => ({ ...e, animated: false, style: { strokeWidth: 2 } })));
    toast.info(t('vsb_sim_stopped'));
  };

  const addSimLog = (msg: string, type: 'info' | 'success' | 'error' = 'info') => {
    const time = new Date().toLocaleTimeString();
    setSimLogs(prev => [...prev, `[${time}] ${msg}`]);
  };

  // AI Prompt Compiler
  const handleAiGeneration = () => {
    if (!aiPrompt.trim()) return toast.error(t('vsb_ai_prompt_error'));
    
    setIsGenerating(true);
    setTimeout(() => {
      try {
        const promptLower = aiPrompt.toLowerCase();
        
        const newNodes: any[] = [
          {
            id: 'trigger-1',
            type: 'trigger',
            position: { x: 250, y: 50 },
            data: { label: t('tr_trigger') },
          }
        ];
        const newEdges: any[] = [];
        let currentId = 'trigger-1';
        let currentY = 180;
        let generatedCount = 0;

        const sentences = promptLower.split(/[,.+]|ardından|sonra|ve/).map(s => s.trim()).filter(Boolean);

        sentences.forEach((sentence, idx) => {
          const delayMatch = sentence.match(/(\d+)\s*(saat|gün|gun|dakika|dk)/);
          
          if (delayMatch) {
            const val = parseInt(delayMatch[1]);
            const unit = delayMatch[2];
            let hours = val;
            
            if (unit.startsWith('gün') || unit.startsWith('gun')) {
              hours = val * 24;
            } else if (unit.startsWith('dakika') || unit.startsWith('dk')) {
              hours = Math.ceil(val / 60);
            }

            const delayId = `timeDelay-ai-${idx}`;
            newNodes.push({
              id: delayId,
              type: 'timeDelay',
              position: { x: 250, y: currentY },
              data: { delayHours: hours },
            });
            newEdges.push({
              id: `edge-ai-delay-${idx}`,
              source: currentId,
              target: delayId,
              animated: true,
              style: { strokeWidth: 2 }
            });
            currentId = delayId;
            currentY += 150;
            generatedCount++;
          }

          if (sentence.includes('cevap') || sentence.includes('yanıt') || sentence.includes('kontrol')) {
            const condId = `condition-ai-${idx}`;
            newNodes.push({
              id: condId,
              type: 'condition',
              position: { x: 250, y: currentY },
              data: { conditionType: 'hasReplied' },
            });
            newEdges.push({
              id: `edge-ai-cond-${idx}`,
              source: currentId,
              target: condId,
              animated: true,
              style: { strokeWidth: 2 }
            });
            currentId = condId;
            currentY += 150;
            generatedCount++;
          }

          if (sentence.includes('mesaj') || sentence.includes('şablon') || sentence.includes('söyle') || sentence.includes('gönder')) {
            let matchedTemplate = templates[0];
            
            for (const t of templates) {
              const tName = t.name.toLowerCase();
              const words = sentence.split(/\s+/);
              const isMatch = words.some(w => w.length > 3 && tName.includes(w));
              if (isMatch) {
                matchedTemplate = t;
                break;
              }
            }

            if (matchedTemplate) {
              const msgId = `sendMessage-ai-${idx}`;
              newNodes.push({
                id: msgId,
                type: 'sendMessage',
                position: { x: 250, y: currentY },
                data: { templateId: matchedTemplate._id || matchedTemplate.id },
              });

              const prevNode = newNodes[newNodes.length - 2];
              if (prevNode && prevNode.type === 'condition') {
                newEdges.push({
                  id: `edge-ai-msg-${idx}`,
                  source: currentId,
                  sourceHandle: 'no',
                  target: msgId,
                  animated: true,
                  style: { strokeWidth: 2, stroke: '#f43f5e' }
                });
              } else {
                newEdges.push({
                  id: `edge-ai-msg-${idx}`,
                  source: currentId,
                  target: msgId,
                  animated: true,
                  style: { strokeWidth: 2 }
                });
              }
              
              currentId = msgId;
              currentY += 150;
              generatedCount++;
            }
          }
        });

        if (generatedCount === 0) {
          throw new Error(t('vsb_ai_extract_error'));
        }

        setNodes(newNodes);
        setEdges(newEdges);
        toast.success(t('vsb_ai_success'));
        setAiPrompt('');
      } catch (err: any) {
        toast.error(err.message || t('vsb_ai_error'));
      } finally {
        setIsGenerating(false);
      }
    }, 1200);
  };

  // Create Mutation
  const createMutation = useMutation({
    mutationFn: async (data: any) => createSequence(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sequences'] });
      toast.success(t('vsb_create_success'));
      navigate('/sequences');
    },
    onError: () => toast.error(t('vsb_create_error'))
  });

  // Edit Mutation
  const updateMutation = useMutation({
    mutationFn: async (data: any) => updateSequence(id as string, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sequence', id] });
      queryClient.invalidateQueries({ queryKey: ['sequences'] });
      toast.success(t('vsb_update_success'));
      navigate(`/sequences/${id}`);
    },
    onError: () => toast.error(t('vsb_update_error'))
  });

  const isSaving = createMutation.isPending || updateMutation.isPending;

  const handleClearCanvas = () => {
    setNodes([
      { id: 'trigger-1', type: 'trigger', position: { x: 250, y: 50 }, data: { label: t('vsb_trigger_label'), conditionType: 'hasReplied' } }
    ]);
    setEdges([]);
    setSelectedNode(null);
    toast.success(t('vsb_canvas_cleared'));
  };

  // DAG to linear steps compiler with Branching condition support
  const compileWorkflow = (): any[] | null => {
    const trigger = nodes.find(n => n.type === 'trigger');
    if (!trigger) {
      toast.error(t('vsb_compile_trigger_error'));
      return null;
    }

    const steps: any[] = [];
    let currentId = trigger.id;
    let currentDelay = 0;
    const visited = new Set<string>();

    while (currentId) {
      if (visited.has(currentId)) {
        toast.error(t('vsb_compile_loop_error'));
        return null;
      }
      visited.add(currentId);

      const currentNode = nodes.find(n => n.id === currentId);
      if (!currentNode) break;

      if (currentNode.type === 'condition') {
        const edge = edges.find(e => e.source === currentId && e.sourceHandle === 'no');
        if (!edge) {
          toast.error(t('vsb_compile_branch_error'));
          return null;
        }
        currentId = edge.target;
        continue;
      }

      const edge = edges.find(e => e.source === currentId);
      if (!edge) break;

      const nextNode = nodes.find(n => n.id === edge.target);
      if (!nextNode) break;

      if (nextNode.type === 'timeDelay') {
        currentDelay = (nextNode.data as any)?.delayHours || 24;
      } else if (nextNode.type === 'sendMessage') {
        const templateId = nextNode.data?.templateId;
        if (!templateId) {
          toast.error(t('vsb_compile_template_error'));
          return null;
        }
        steps.push({
          templateId,
          delayHours: currentDelay
        });
        currentDelay = 0;
      }

      currentId = nextNode.id;
    }

    if (steps.length === 0) {
      toast.error(t('vsb_compile_empty_error'));
      return null;
    }

    return steps;
  };

  const handleSave = () => {
    if (!name.trim()) {
      return toast.error(t('vsb_save_name_error'));
    }

    const steps = compileWorkflow();
    if (!steps) return;

    const payload = {
      name,
      steps,
      nodes,
      edges,
      sendTimeStart,
      sendTimeEnd,
      activeDays,
      maxPerDay,
      minDelayMinutes,
      skipReplied,
      autoStopOnReply,
      autoEnrollEnabled,
      autoEnrollCategory,
      autoEnrollCity,
      autoEnrollMinRating,
      autoEnrollHasWebsite,
      autoEnrollHasPhone,
      whatsappSessionId,
      aiReplyEnabled,
      aiPrompt: aiReplyPrompt
    };

    if (id) {
      updateMutation.mutate(payload);
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleNodeClick = (_: React.MouseEvent, node: any) => {
    setSelectedNode(node);
    setMenuPosition(null);
  };

  const handlePaneClick = () => {
    setSelectedNode(null);
    setMenuPosition(null); // Close context menu
  };

  // Infinite Canvas Right-Click Menu Trigger
  const onPaneContextMenu = useCallback(
    (event: any) => {
      event.preventDefault();
      if (!reactFlowInstance) return;

      // Project pixel position into infinite flow graph coordinates!
      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      setMenuPosition({ x: event.clientX, y: event.clientY });
      setMenuProjectedPos(position);
    },
    [reactFlowInstance]
  );

  const addNodeAtPosition = (type: string) => {
    if (!menuProjectedPos) return;

    const newNode = {
      id: `${type}-${Date.now()}`,
      type,
      position: menuProjectedPos,
      data: { label: `${type} node`, delayHours: 24, templateId: '', conditionType: 'hasReplied' },
    };

    setNodes([...nodes, newNode]);
    setMenuPosition(null);
    toast.success(t('vsb_node_added'));
  };

  // Keyboard Shortcuts (Hotkeys) Engine
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 1. Save: Ctrl + S or Cmd + S
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }

      // 2. Auto-Align: Ctrl + A or Cmd + A
      if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        const target = e.target as HTMLElement;
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
          e.preventDefault();
          handleAutoAlign();
        }
      }

      // 3. Duplicate Node: Ctrl + D or Cmd + D
      if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        const target = e.target as HTMLElement;
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA' && selectedNode && selectedNode.type !== 'trigger') {
          e.preventDefault();
          const newNode = {
            id: `${selectedNode.type}-${Date.now()}`,
            type: selectedNode.type,
            position: {
              x: selectedNode.position.x + 40,
              y: selectedNode.position.y + 40
            },
            data: JSON.parse(JSON.stringify(selectedNode.data))
          };
          setNodes([...nodes, newNode]);
          toast.success(t('vsb_node_duplicated'));
        }
      }

      // 4. Delete Node: Delete or Backspace
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const target = e.target as HTMLElement;
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA' && selectedNode && selectedNode.type !== 'trigger') {
          e.preventDefault();
          setNodes(nodes.filter(n => n.id !== selectedNode.id));
          setSelectedNode(null);
          toast.info(t('vsb_node_deleted'));
        }
      }

      // 5. Escape: Close context menu, simulation or selection
      if (e.key === 'Escape') {
        setMenuPosition(null);
        setSelectedNode(null);
        setIsTemplateModalOpen(false);
        if (isSimulating) {
          stopSimulation();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [nodes, selectedNode, isSimulating, name, sendTimeStart, sendTimeEnd, activeDays, maxPerDay, minDelayMinutes, skipReplied, autoStopOnReply]);

  // Drag and Drop
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      
      const type = event.dataTransfer.getData('application/reactflow');
      if (!type) return;

      const position = {
        x: event.clientX - 320,
        y: event.clientY - 120,
      };
      
      const newNode = {
        id: `${type}-${Date.now()}`,
        type,
        position,
        data: { label: `${type} node`, delayHours: 24, templateId: '', conditionType: 'hasReplied' },
      };

      setNodes([...nodes, newNode]);
    },
    [nodes, setNodes],
  );

  // Dynamic Class Resolvers for Canvas Themes
  const getCanvasBgClass = () => {
    switch (canvasTheme) {
      case 'dark':
        return 'bg-[#080b10]'; // Deep premium dark grid background
      case 'blueprint':
        return 'bg-[#06142e]'; // High-contrast navy blueprint
      case 'warm':
        return 'bg-[#0f0e0b]'; // Warm dark sepia
      default:
        return 'bg-[#080b10]'; // Default premium dark grid background
    }
  };

  const getGridColor = () => {
    switch (canvasTheme) {
      case 'dark':
        return '#1e293b';
      case 'blueprint':
        return '#172554';
      case 'warm':
        return '#451a03';
      default:
        return '#1e293b';
    }
  };

  if (id && isSequenceLoading) {
    return <div className="py-20 text-center animate-pulse font-black text-slate-400 uppercase tracking-widest">Akış Yükleniyor...</div>;
  }

  return (
    <div className="flex h-screen w-full bg-[#080b10] flex-col md:flex-row overflow-hidden relative" onClick={() => setMenuPosition(null)}>
      {/* Sidebar Toolbar */}
      <div className="w-full md:w-80 bg-[#0c1220]/50 backdrop-blur-sm border-r border-white/5 hover:border-white/15 backdrop-blur-md shadow-xl flex flex-col z-10 shrink-0 h-full" onClick={(e) => e.stopPropagation()}>
        
        {/* Header */}
        <div className="p-4 border-b border-white/5 flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate(id ? `/sequences/${id}` : '/sequences')} 
            className="rounded-full hover:bg-white/5 text-slate-400 hover:text-white shrink-0"
          >
            <ArrowLeft size={18} />
          </Button>
          <div>
            <h2 className="font-black text-white text-sm flex items-center gap-2">
              {t('vsb_canvas_settings')}
            </h2>
            <p className="text-[10px] text-zinc-450 font-bold">{t('vsb_create_with_drag_drop')}</p>
          </div>
        </div>
        
        {/* Scrollable container for settings */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {/* Name input */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-zinc-450 tracking-widest">{t('vsb_sequence_name')}</label>
            <Input 
              placeholder={t('vsb_sequence_name_placeholder')} 
              className="rounded-xl font-bold h-10 border-white/5 bg-white/5 text-white focus:border-emerald-500 focus:ring-emerald-500/20"
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </div>

          {/* WhatsApp Account Selector */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-zinc-450 tracking-widest flex items-center gap-1.5">
              <MessageSquare size={12} className="text-emerald-500" /> {t('vsb_wa_sender')}
            </label>
            <Select 
              value={whatsappSessionId || "default"} 
              onValueChange={(val) => setWhatsappSessionId(val === "default" ? null : val)}
            >
              <SelectTrigger className="h-10 rounded-xl border-white/5 bg-white/5 text-xs font-bold text-white focus:ring-emerald-500/20">
                <SelectValue placeholder={t('vsb_wa_default')} />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-white/10 text-white">
                <SelectItem value="default">{t('vsb_wa_default_option')}</SelectItem>
                {sessions.map((s: any) => (
                  <SelectItem key={s._id} value={s._id}>
                    {s.sessionName} ({s.phoneNumber || 'No Number'})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[9px] font-bold text-slate-500 leading-tight">
              {t('vsb_wa_help')}
            </p>
          </div>

          {/* Yapay Zekâ Şablon Sihirbazı */}
          <div className="bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-500/20 p-4 rounded-2xl space-y-3.5 shadow-md">
            <div className="flex items-center justify-between">
              <h4 className="font-black text-emerald-400 text-[10px] flex items-center gap-1.5 uppercase tracking-wider">
                <Sparkles className="size-4 text-emerald-450 animate-bounce" /> {t('vsb_ai_wizard')}
              </h4>
            </div>
            <p className="text-[9.5px] text-slate-400 font-medium leading-relaxed">
              {t('vsb_ai_wizard_desc')}
            </p>
            <div className="space-y-1.5">
              <textarea 
                value={aiPrompt}
                onChange={e => setAiPrompt(e.target.value)}
                placeholder={t('vsb_ai_wizard_placeholder')}
                rows={3}
                className="w-full rounded-xl font-bold text-xs bg-white/5 border border-white/5 p-2.5 focus:outline-none focus:border-emerald-500 text-slate-100 resize-none text-[10px]"
              />
            </div>
            <Button
              onClick={handleAiGeneration}
              disabled={isGenerating || !aiPrompt.trim()}
              className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-750 text-black font-black text-xs h-9 rounded-xl flex items-center justify-center gap-1.5 shadow-sm shadow-emerald-500/10"
            >
              {isGenerating ? (
                <>
                  <span className="animate-spin size-3.5 border-2 border-black border-t-transparent rounded-full" />
                  {t('vsb_ai_building')}
                </>
              ) : (
                <>
                  <Sparkles size={13} /> {t('vsb_ai_build_btn')}
                </>
              )}
            </Button>
          </div>

          {/* Düğüm Paleti */}
          <div className="space-y-3 pt-2">
            <h4 className="text-[10px] font-black uppercase text-zinc-450 tracking-widest">{t('vsb_node_palette')}</h4>
            <div className="space-y-2">
              {[
                { type: 'sendMessage', label: t('vsb_node_send_message'), desc: t('vsb_node_send_message_desc'), icon: MessageSquare, color: 'text-blue-400 bg-blue-500/10' },
                { type: 'timeDelay', label: t('vsb_node_time_delay'), desc: t('vsb_node_time_delay_desc'), icon: Clock, color: 'text-amber-400 bg-amber-500/10' },
                { type: 'condition', label: t('vsb_node_condition'), desc: t('vsb_node_condition_desc'), icon: GitFork, color: 'text-purple-400 bg-purple-500/10' }
              ].map(node => (
                <div
                  key={node.type}
                  draggable
                  onDragStart={(e) => { e.dataTransfer.setData('application/reactflow', node.type); e.dataTransfer.effectAllowed = 'move'; }}
                  className="flex items-center gap-3 p-3 bg-white/5/40 border border-white/5 hover:border-white/15 rounded-2xl cursor-grab active:cursor-grabbing hover:border-slate-300 dark:border-zinc-700 transition-all group shadow-sm select-none"
                >
                  <div className={`p-2 rounded-xl ${node.color} shrink-0`}>
                    <node.icon size={16} />
                  </div>
                  <div className="min-w-0">
                    <h5 className="font-bold text-xs text-slate-100 group-hover:text-white transition-colors">{node.label}</h5>
                    <p className="text-[9px] text-zinc-455 font-bold truncate">{node.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tuval Görünümü & Temalar */}
          <div className="bg-[#0c1220]/40 border border-white/5 p-4 rounded-2xl space-y-3.5 shadow-inner">
            <h4 className="font-black text-zinc-350 text-[10px] flex items-center gap-1.5 uppercase tracking-wider">
              <LayoutGrid className="size-4 text-emerald-500" /> {t('vsb_canvas_settings')}
            </h4>
            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-zinc-455 uppercase">{t('vsb_canvas_theme')}</label>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { id: 'light', name: t('vsb_theme_light_desc') },
                  { id: 'dark', name: t('vsb_theme_dark_desc') },
                  { id: 'blueprint', name: t('vsb_theme_blueprint_desc') },
                  { id: 'warm', name: t('vsb_theme_warm_desc') }
                ].map(theme => {
                  const isActive = canvasTheme === theme.id;
                  return (
                    <button
                      key={theme.id}
                      onClick={() => setCanvasTheme(theme.id as any)}
                      className={`p-2 rounded-xl border text-[10px] font-bold text-center transition-all ${
                        isActive 
                          ? 'bg-emerald-50 border-emerald-500 text-black shadow-md shadow-emerald-500/10 scale-102 font-black' 
                          : 'bg-white/5 border-white/5 text-slate-100 hover:bg-zinc-800 hover:text-white'
                      }`}
                    >
                      {theme.name}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-zinc-455 uppercase">{t('vsb_canvas_bg')}</label>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { id: 'dots', name: t('vsb_bg_dots') },
                  { id: 'lines', name: t('vsb_bg_lines') },
                  { id: 'cross', name: t('vsb_bg_cross') }
                ].map(v => {
                  const isActive = bgVariant === v.id;
                  return (
                    <button
                      key={v.id}
                      onClick={() => setBgVariant(v.id as any)}
                      className={`p-1.5 rounded-lg border text-[9px] font-black uppercase text-center transition-all ${
                        isActive 
                          ? 'bg-emerald-500 border-emerald-500 text-black shadow-sm' 
                          : 'bg-white/5 border-white/5 text-slate-400 hover:bg-zinc-800 hover:text-white'
                      }`}
                    >
                      {v.name}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-zinc-455 uppercase">{t('vsb_grid_gap')} ({gridGap}px)</label>
                <input 
                  type="range" 
                  min="10" 
                  max="50" 
                  step="5"
                  value={gridGap} 
                  onChange={e => setGridGap(parseInt(e.target.value))}
                  className="w-full accent-emerald-500 cursor-pointer"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black text-zinc-455 uppercase">{t('vsb_grid_size')} ({gridSize}px)</label>
                <input 
                  type="range" 
                  min="0.5" 
                  max="3" 
                  step="0.5"
                  value={gridSize} 
                  onChange={e => setGridSize(parseFloat(e.target.value))}
                  className="w-full accent-emerald-500 cursor-pointer"
                />
              </div>
            </div>
            <div className="space-y-1.5 pt-1.5 border-t border-slate-200/60 dark:border-zinc-800/50">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input 
                  type="checkbox" 
                  checked={showMinimap} 
                  onChange={e => setShowMinimap(e.target.checked)}
                  className="rounded text-emerald-500 focus:ring-emerald-500/20 border-white/5 w-3.5 h-3.5 font-bold"
                />
                <span className="text-[9.5px] font-bold text-slate-100">{t('vsb_show_minimap')}</span>
              </label>
            </div>
          </div>

          {/* Advanced Anti-Ban & Scheduler Settings Panel */}
          <div className="bg-[#0c1220]/40 border border-white/5 p-4 rounded-2xl space-y-3.5 shadow-inner">
            <h4 className="font-black text-slate-100 text-[10px] flex items-center gap-1.5 uppercase tracking-wider">
              <Gauge className="size-4 text-amber-500 animate-pulse" /> {t('vsb_anti_ban_settings')}
            </h4>
            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-zinc-450 uppercase flex items-center gap-1">
                <Clock size={10} /> {t('vsb_send_hours')}
              </label>
              <div className="flex items-center gap-2">
                <Input 
                  type="text" 
                  value={sendTimeStart} 
                  onChange={e => setSendTimeStart(e.target.value)}
                  placeholder="09:00"
                  className="h-8 rounded-lg text-xs font-bold text-center border-white/5 bg-white/5 text-white focus:border-emerald-500 focus:ring-emerald-500/20 w-full"
                />
                <span className="text-xs text-zinc-550 font-bold">-</span>
                <Input 
                  type="text" 
                  value={sendTimeEnd} 
                  onChange={e => setSendTimeEnd(e.target.value)}
                  placeholder="18:00"
                  className="h-8 rounded-lg text-xs font-bold text-center border-white/5 bg-white/5 text-white focus:border-emerald-500 focus:ring-emerald-500/20 w-full"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-zinc-455 uppercase flex items-center gap-1">
                <Calendar size={10} /> {t('vsb_active_days')}
              </label>
              <div className="flex gap-1.5 justify-between">
                {DAYS.map(day => {
                  const isActive = activeDays.includes(day.value);
                  return (
                    <button
                      key={day.value}
                      onClick={() => handleDayToggle(day.value)}
                      className={`w-7 h-7 rounded-lg text-[10px] font-black uppercase transition-all border ${
                        isActive 
                          ? 'bg-amber-500 border-amber-500 text-black shadow-sm' 
                          : 'bg-white/5 border-white/5 text-slate-400 hover:bg-zinc-800 hover:text-white'
                      }`}
                    >
                      {day.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-zinc-455 uppercase">{t('vsb_max_per_day')}</label>
                <Input 
                  type="number" 
                  value={maxPerDay} 
                  onChange={e => setMaxPerDay(parseInt(e.target.value) || 0)}
                  className="h-8 rounded-lg text-xs font-bold border-white/5 bg-white/5 text-white focus:border-emerald-500 focus:ring-emerald-500/20"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black text-zinc-455 uppercase">{t('vsb_min_delay')}</label>
                <Input 
                  type="number" 
                  value={minDelayMinutes} 
                  onChange={e => setMinDelayMinutes(parseInt(e.target.value) || 0)}
                  className="h-8 rounded-lg text-xs font-bold border-white/5 bg-white/5 text-white focus:border-emerald-500 focus:ring-emerald-500/20"
                />
              </div>
            </div>
            <div className="space-y-2 pt-1 border-t border-slate-200/60 dark:border-zinc-800/50">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input 
                  type="checkbox" 
                  checked={autoStopOnReply} 
                  onChange={e => setAutoStopOnReply(e.target.checked)}
                  className="rounded text-amber-500 focus:ring-amber-500/20 border-white/5 bg-white/5 w-3.5 h-3.5"
                />
                <span className="text-[9.5px] font-bold text-slate-100">{t('vsb_stop_on_reply')}</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input 
                  type="checkbox" 
                  checked={skipReplied} 
                  onChange={e => setSkipReplied(e.target.checked)}
                  className="rounded text-amber-500 focus:ring-amber-500/20 border-white/5 bg-white/5 w-3.5 h-3.5"
                />
                <span className="text-[9.5px] font-bold text-slate-100">{t('vsb_skip_replied')}</span>
              </label>
            </div>
          </div>

          {/* Otomatik Katılım Kuralları */}
          <div className="bg-[#0c1220]/40 border border-white/5 p-4 rounded-2xl space-y-3.5 shadow-inner">
            <h4 className="font-black text-zinc-350 text-[10px] flex items-center gap-1.5 uppercase tracking-wider">
              <Zap className="size-4 text-emerald-500 animate-pulse" /> {t('vsb_auto_enroll')}
            </h4>
            <p className="text-[9.5px] font-semibold text-zinc-455 leading-snug">
              {t('vsb_auto_enroll_desc')}
            </p>
            <div className="flex items-center justify-between p-2.5 bg-[#080b10]/60 rounded-xl border border-white/5">
              <span className="text-[10px] font-black text-slate-100 uppercase">{t('vsb_auto_enroll_toggle')}</span>
              <button 
                onClick={() => setAutoEnrollEnabled(!autoEnrollEnabled)}
                className={`w-9 h-5 rounded-full transition-colors relative shrink-0 cursor-pointer ${autoEnrollEnabled ? "bg-emerald-500" : "bg-zinc-800"}`}
                type="button"
              >
                <span className={`absolute top-0.5 size-4 rounded-full bg-white shadow transition-transform ${autoEnrollEnabled ? "translate-x-4" : "translate-x-0"}`} />
              </button>
            </div>
            {autoEnrollEnabled && (
              <div className="space-y-3 pt-2 border-t border-slate-200/60 dark:border-zinc-800/50 animate-in fade-in duration-200">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-zinc-450 uppercase flex items-center gap-1">
                    <Tag size={10} /> {t('vsb_category_match')}
                  </label>
                  <Input 
                    type="text" 
                    value={autoEnrollCategory} 
                    onChange={e => setAutoEnrollCategory(e.target.value)}
                    placeholder={t('vsb_category_placeholder')}
                    className="h-8 rounded-lg text-xs font-bold border-white/5 bg-white/5 text-white focus:border-emerald-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-zinc-455 uppercase flex items-center gap-1">
                    <MapPin size={10} /> {t('vsb_city_match')}
                  </label>
                  <Input 
                    type="text" 
                    value={autoEnrollCity} 
                    onChange={e => setAutoEnrollCity(e.target.value)}
                    placeholder={t('vsb_city_placeholder')}
                    className="h-8 rounded-lg text-xs font-bold border-white/5 bg-white/5 text-white focus:border-emerald-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-zinc-455 uppercase">{t('vsb_min_rating')}</label>
                    <Select
                      value={autoEnrollMinRating.toString()}
                      onValueChange={(val) => setAutoEnrollMinRating(parseFloat(val || "0"))}
                    >
                      <SelectTrigger className="w-full h-8 bg-white/5 border-white/5 text-xs font-semibold text-slate-100">
                        <SelectValue placeholder={t('vsb_rating_all')} />
                      </SelectTrigger>
                      <SelectContent className="bg-white dark:bg-zinc-950 border-white/10 text-slate-100">
                        <SelectItem value="0">{t('vsb_rating_all')}</SelectItem>
                        <SelectItem value="3">3.0+</SelectItem>
                        <SelectItem value="4">4.0+</SelectItem>
                        <SelectItem value="4.5">4.5+</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-zinc-455 uppercase">{t('vsb_has_website')}</label>
                    <Select
                      value={autoEnrollHasWebsite}
                      onValueChange={(val) => setAutoEnrollHasWebsite(val as any || 'all')}
                    >
                      <SelectTrigger className="w-full h-8 bg-white/5 border-white/5 text-xs font-semibold text-slate-100">
                        <SelectValue placeholder={t('vsb_website_any')} />
                      </SelectTrigger>
                      <SelectContent className="bg-white dark:bg-zinc-950 border-white/10 text-slate-100">
                        <SelectItem value="all">{t('vsb_website_any')}</SelectItem>
                        <SelectItem value="true">{t('vsb_website_only_exists')}</SelectItem>
                        <SelectItem value="false">{t('vsb_website_only_not_exists')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-zinc-455 uppercase">{t('vsb_has_phone')}</label>
                  <Select
                    value={autoEnrollHasPhone}
                    onValueChange={(val) => setAutoEnrollHasPhone(val as any || 'all')}
                  >
                    <SelectTrigger className="w-full h-8 bg-white/5 border-white/5 text-xs font-semibold text-slate-100">
                      <SelectValue placeholder={t('vsb_phone_any')} />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-zinc-950 border-white/10 text-slate-100">
                      <SelectItem value="all">{t('vsb_phone_any')}</SelectItem>
                      <SelectItem value="true">{t('vsb_phone_only_exists')}</SelectItem>
                      <SelectItem value="false">{t('vsb_phone_only_not_exists')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>

          {/* AI-Powered Automatic Reply Settings */}
          <div className="bg-[#0c1220]/40 border border-white/5 p-4 rounded-2xl space-y-3.5 shadow-inner">
            <h4 className="font-black text-zinc-350 text-[10px] flex items-center gap-1.5 uppercase tracking-wider">
              <BrainCircuit size={16} className="text-amber-500 animate-pulse" /> AI Yanıtlayıcı (BETA)
            </h4>
            <p className="text-[9.5px] font-semibold text-zinc-455 leading-snug">
              Lead yanıt verdiğinde AI'ın otomatik cevap vermesini sağlayın.
            </p>
            <div className="flex items-center justify-between p-2.5 bg-[#080b10]/60 rounded-xl border border-white/5">
              <span className="text-[10px] font-black text-slate-100 uppercase">Otomatik AI Yanıtı</span>
              <button 
                onClick={() => setAiReplyEnabled(!aiReplyEnabled)}
                className={`w-9 h-5 rounded-full transition-colors relative shrink-0 cursor-pointer ${aiReplyEnabled ? "bg-emerald-500" : "bg-zinc-800"}`}
                type="button"
              >
                <span className={`absolute top-0.5 size-4 rounded-full bg-white shadow transition-transform ${aiReplyEnabled ? "translate-x-4" : "translate-x-0"}`} />
              </button>
            </div>
            {aiReplyEnabled && (
              <div className="space-y-3 pt-2 border-t border-slate-200/60 dark:border-zinc-800/50 animate-in fade-in duration-200">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-zinc-450 uppercase flex items-center gap-1">
                    <Sparkles size={10} /> AI'ı Eğit (Prompt/Talimat)
                  </label>
                  <Textarea 
                    value={aiReplyPrompt} 
                    onChange={e => setAiReplyPrompt(e.target.value)}
                    placeholder="AI'a nasıl davranması gerektiğini söyleyin... (Örn: Nazik ol, randevu almaya çalış, ürün özelliklerini anlat)"
                    className="min-h-[100px] rounded-lg text-xs font-bold border-white/5 bg-white/5 text-white focus:border-emerald-500 py-2.5"
                  />
                  <p className="text-[8px] font-medium text-slate-500 italic">
                    * Müşteriden gelen mesaja göre AI bu talimatları izleyerek cevap üretecektir.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Dinamik Değişkenler */}
          <div className="bg-[#0c1220]/40 border border-white/5 p-4 rounded-2xl space-y-3 shadow-inner">
            <h4 className="font-black text-zinc-350 text-[10px] flex items-center gap-1.5 uppercase tracking-wider">
              <Database className="size-4 text-emerald-500" /> {t('vsb_dynamic_vars')}
            </h4>
            <p className="text-[9.5px] font-semibold text-zinc-455 leading-relaxed">
              {t('vsb_dynamic_vars_desc')}
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              {MERGE_TAGS.map(item => (
                <button
                  key={item.tag}
                  onClick={() => handleCopyTag(item.tag)}
                  className="p-1.5 bg-white/5 border border-white/5 rounded-xl hover:border-emerald-500 text-left transition-all group flex flex-col relative"
                  title={item.desc}
                >
                  <span className="text-[9.5px] font-black text-emerald-450 group-hover:text-emerald-350 flex items-center gap-1">
                    {item.tag}
                  </span>
                  <span className="text-[8px] font-bold text-zinc-550">{item.label}</span>
                  <Copy size={9} className="absolute top-1.5 right-1.5 text-zinc-650 group-hover:text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity animate-in fade-in" />
                </button>
              ))}
            </div>
          </div>

          {/* Klavye Kısayolları */}
          <div className="bg-[#0c1220]/40 border border-white/5 p-4 rounded-2xl space-y-3 shadow-inner">
            <h4 className="font-black text-zinc-350 text-[10px] flex items-center gap-1.5 uppercase tracking-wider">
              <Keyboard className="size-4 text-emerald-500" /> {t('vsb_hotkeys')}
            </h4>
            <div className="space-y-1.5">
              {HOTKEYS.map(hk => (
                <div key={hk.keys} className="flex justify-between items-center gap-2 text-[10px] font-semibold">
                  <span className="text-zinc-455">{hk.desc}</span>
                  <kbd className="px-1.5 py-0.5 bg-white/5 border border-white/5 rounded-md font-mono text-[9px] text-emerald-455 shadow-sm font-bold uppercase select-none">
                    {hk.keys}
                  </kbd>
                </div>
              ))}
            </div>
          </div>

          {/* Telemetri */}
          {id && (
            <div className="bg-emerald-950/20 border border-emerald-500/20 rounded-2xl p-3.5 flex items-center gap-2.5">
              <Activity className="text-emerald-500 size-4.5 animate-pulse shrink-0" />
              <div>
                <p className="text-[10px] font-black text-emerald-400 uppercase tracking-wide">{t('vsb_telemetry_active')}</p>
                <p className="text-[9px] text-emerald-500/70 font-medium">{t('vsb_telemetry_desc')}</p>
              </div>
            </div>
          )}
        </div>

        {/* Action Bar Bottom */}
        <div className="p-4 border-t border-white/5 flex items-center justify-between gap-2.5 shrink-0">
          <Button
            variant="outline"
            onClick={handleClearCanvas}
            className="rounded-xl text-xs font-bold border-white/5 text-slate-400 hover:text-white hover:bg-white/5 flex items-center gap-1 w-full"
            title={t('vsb_reset_canvas')}
          >
            <RotateCcw size={14} /> {t('vsb_clear')}
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="bg-emerald-500 hover:bg-emerald-600 text-black font-black text-xs rounded-xl flex items-center gap-1.5 w-full shadow-md shadow-emerald-500/10"
          >
            {isSaving ? t('vsb_saving') : <><Save size={14} /> {t('vsb_save_changes_btn')}</>}
          </Button>
        </div>
      </div>

        {/* Reactive Advanced Node Customization (Options Sidebar) */}
        {activeNode && activeNode.type !== 'trigger' && (
          <div className="border-t border-white/5 bg-white dark:bg-zinc-950/95 p-4 shrink-0 space-y-3.5 z-20" onClick={(e) => e.stopPropagation()}>
             <div className="flex items-center justify-between">
                <h3 className="text-[10px] font-black uppercase text-slate-100 tracking-wider">{t('vsb_node_settings')}</h3>
                <button 
                  onClick={() => {
                    setNodes(nodes.filter(n => n.id !== activeNode.id));
                    setSelectedNode(null);
                  }}
                  className="text-rose-500 hover:text-rose-455 p-1.5 bg-rose-500/10 rounded-lg transition-colors border border-rose-500/20"
                  title={t('vsb_delete_node')}
                >
                  <Trash2 size={13} />
                </button>
             </div>
             
             {/* Custom Title Input */}
             <div className="space-y-1">
                <label className="text-[9px] font-black text-zinc-450 uppercase">{t('vsb_custom_node_name')}</label>
                <Input
                  value={(activeNode.data as any)?.customLabel || ''}
                  onChange={e => updateNodeData(activeNode.id, { customLabel: e.target.value })}
                  placeholder={activeNode.type === 'sendMessage' ? t('smn_send_message') : activeNode.type === 'timeDelay' ? t('tdn_delay') : t('cn_response_check')}
                  className="h-8 rounded-lg text-xs font-bold border-white/5 bg-white/5 text-white focus:border-emerald-500"
                />
             </div>

             {/* Custom Subtitle/Note Input */}
             <div className="space-y-1">
                <label className="text-[9px] font-black text-zinc-455 uppercase">{t('vsb_node_note')}</label>
                <Input
                  value={(activeNode.data as any)?.customDescription || ''}
                  onChange={e => updateNodeData(activeNode.id, { customDescription: e.target.value })}
                  placeholder={t('vsb_node_note_placeholder')}
                  className="h-8 rounded-lg text-xs font-bold border-white/5 bg-white/5 text-white focus:border-emerald-500"
                />
             </div>

             {/* Accent Color Picker circles */}
             <div className="space-y-1">
                <label className="text-[9px] font-black text-zinc-450 uppercase">{t('vsb_accent_color')}</label>
                <div className="flex gap-1.5 flex-wrap pt-0.5">
                  {['blue', 'emerald', 'amber', 'purple', 'rose', 'indigo', 'pink', 'slate'].map((color) => {
                    const dotBg: any = {
                      blue: 'bg-blue-500',
                      emerald: 'bg-emerald-500',
                      amber: 'bg-amber-500',
                      purple: 'bg-purple-500',
                      rose: 'bg-rose-500',
                      indigo: 'bg-indigo-500',
                      pink: 'bg-pink-500',
                      slate: 'bg-slate-500'
                    };
                    const defaultColor = activeNode.type === 'sendMessage' ? 'blue' : activeNode.type === 'timeDelay' ? 'amber' : 'purple';
                    const isActive = ((activeNode.data as any)?.customColor || defaultColor) === color;
                    return (
                      <button
                        key={color}
                        onClick={() => updateNodeData(activeNode.id, { customColor: color })}
                        className={`w-5 h-5 rounded-full ${dotBg[color]} border-2 transition-all ${
                          isActive ? 'border-zinc-200 scale-110 shadow-md' : 'border-transparent hover:scale-105'
                        }`}
                        title={color}
                      />
                    );
                  })}
                </div>
             </div>

             {/* Icon grid selector */}
             <div className="space-y-1.5">
                <label className="text-[9px] font-black text-zinc-450 uppercase">{t('vsb_node_icon')}</label>
                <div className="grid grid-cols-6 gap-1 bg-white/5 p-1 rounded-xl border border-white/5">
                  {Object.entries(ICON_MAP).map(([key, IconComponent]: any) => {
                    const defaultIcon = activeNode.type === 'sendMessage' ? 'messagesquare' : activeNode.type === 'timeDelay' ? 'clock' : 'gitfork';
                    const isActive = ((activeNode.data as any)?.customIcon || defaultIcon).toLowerCase() === key;
                    return (
                      <button
                        key={key}
                        onClick={() => updateNodeData(activeNode.id, { customIcon: key })}
                        className={`p-1.5 rounded-lg border transition-all flex items-center justify-center ${
                          isActive 
                            ? 'bg-zinc-800 border-slate-300 dark:border-zinc-700 text-white scale-105 shadow-sm' 
                            : 'bg-transparent border-transparent text-zinc-455 hover:bg-zinc-850'
                        }`}
                        title={key}
                      >
                        <IconComponent size={12} />
                      </button>
                    );
                  })}
                </div>
             </div>
          </div>
        )}
      {/* Main Canvas */}
      <div className="flex-1 flex flex-col relative h-full min-h-0" onClick={handlePaneClick}>
        <div className="absolute top-4 right-4 z-10 flex gap-2">
          {/* Prebuilt Templates Library Button */}
          <Button 
            variant="outline"
            className="bg-[#0c1220]/50 backdrop-blur-sm border border-white/5 text-slate-300 hover:text-white hover:bg-white/5 font-bold h-10 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer"
            onClick={(e) => { e.stopPropagation(); setIsTemplateModalOpen(true); }}
            title={t('vsb_templates_desc')}
          >
            <Sparkles size={16} className="text-amber-500 animate-pulse" /> {t('vsb_templates')}
          </Button>

          {/* Export JSON Flow */}
          <Button 
            variant="outline"
            className="bg-[#0c1220]/50 backdrop-blur-sm border border-white/5 text-slate-300 hover:text-white hover:bg-white/5 font-bold h-10 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer"
            onClick={(e) => { e.stopPropagation(); handleExportFlow(); }}
            title={t('hk_save')}
          >
            <Download size={16} /> {t('vsb_export')}
          </Button>

          {/* Import JSON Flow */}
          <Button 
            variant="outline"
            className="bg-[#0c1220]/50 backdrop-blur-sm border border-white/5 text-slate-300 hover:text-white hover:bg-white/5 font-bold h-10 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer"
            onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
            title={t('vsb_import')}
          >
            <Upload size={16} /> {t('vsb_import')}
          </Button>
          <input 
            type="file"
            ref={fileInputRef}
            onChange={handleImportFlow}
            accept=".json"
            className="hidden"
          />

          {/* Mathematical Auto-Align Button */}
          <Button 
            variant="outline"
            className="bg-[#0c1220]/50 backdrop-blur-sm border border-white/5 text-slate-300 hover:text-white hover:bg-white/5 font-bold h-10 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer"
            onClick={(e) => { e.stopPropagation(); handleAutoAlign(); }}
            title={t('hk_align')}
          >
            <LayoutGrid size={16} /> {t('vsb_auto_align')}
          </Button>

          {/* Dry Run Simulation Button */}
          {isSimulating ? (
            <Button 
              className="bg-rose-500 hover:bg-rose-600 text-white font-black h-10 rounded-xl shadow-lg shadow-rose-100 flex items-center justify-center gap-2"
              onClick={(e) => { e.stopPropagation(); stopSimulation(); }}
              title={t('vsb_stop_sim')}
            >
              <EyeOff size={16} /> {t('vsb_stop_sim')}
            </Button>
          ) : (
            <Button 
              className="bg-purple-600 hover:bg-purple-700 text-white font-black h-10 rounded-xl shadow-lg shadow-purple-100 flex items-center justify-center gap-2"
              onClick={(e) => { e.stopPropagation(); startSimulation(); }}
            >
              <Eye size={16} /> {t('vsb_simulate')}
            </Button>
          )}

          <Button 
            className="bg-amber-500 hover:bg-amber-600 text-white font-bold h-10 rounded-xl shadow-lg shadow-amber-500/10 flex items-center justify-center gap-2"
            onClick={(e) => { e.stopPropagation(); handleSave(); }}
            disabled={createMutation.isPending || updateMutation.isPending}
          >
            <Check size={18} /> {id ? t('vsb_save_changes_btn') : t('vsb_save_flow_btn')}
          </Button>
        </div>

        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          onNodeClick={handleNodeClick}
          onPaneClick={handlePaneClick}
          onPaneContextMenu={onPaneContextMenu}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onInit={setReactFlowInstance}
          fitView
          className={getCanvasBgClass()}
        >
          <Background 
            color={getGridColor()} 
            gap={gridGap} 
            size={gridSize} 
            variant={bgVariant as any}
          />
          <Controls className="bg-white dark:bg-slate-900/50 shadow-md border border-slate-100 rounded-lg" />
          {showMinimap && (
            <MiniMap 
              nodeColor={(n) => {
                if (n.type === 'trigger') return '#10b981';
                if (n.type === 'sendMessage') return '#3b82f6';
                if (n.type === 'timeDelay') return '#f59e0b';
                if (n.type === 'condition') return '#a855f7';
                return '#64748b';
              }} 
              className="bg-white dark:bg-slate-900/50 shadow-md border border-slate-100 rounded-lg overflow-hidden" 
            />
          )}
        </ReactFlow>

        {/* Dynamic PROJECTED Right-Click Canvas Context Menu */}
        {menuPosition && (
          <div 
            style={{ top: menuPosition.y, left: menuPosition.x }}
            className="absolute bg-white/95 text-slate-800 rounded-2xl shadow-2xl border border-slate-200/80 p-2 z-50 min-w-[170px] backdrop-blur-md animate-in fade-in zoom-in-95 duration-100 space-y-1"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-2.5 py-1.5 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 flex items-center gap-1.5 mb-1 select-none">
              <Plus size={10} className="text-slate-400" /> {t('vsb_add_node')}
            </div>
            
            <button
              onClick={() => addNodeAtPosition('sendMessage')}
              className="w-full text-left px-2.5 py-2 hover:bg-emerald-500/10/70 text-xs font-bold text-slate-700 rounded-xl transition-all flex items-center gap-2 group"
            >
              <div className="rounded-lg bg-emerald-500/10 p-1 text-emerald-500 group-hover:bg-emerald-500/15/70 transition-colors">
                <PlayCircle size={13} />
              </div>
              <span>{t('smn_send_message')}</span>
            </button>

            <button
              onClick={() => addNodeAtPosition('timeDelay')}
              className="w-full text-left px-2.5 py-2 hover:bg-amber-50/70 text-xs font-bold text-slate-700 rounded-xl transition-all flex items-center gap-2 group"
            >
              <div className="rounded-lg bg-amber-50 p-1 text-amber-600 group-hover:bg-amber-100/70 transition-colors">
                <Settings2 size={13} />
              </div>
              <span>{t('vsb_node_time_delay')}</span>
            </button>

            <button
              onClick={() => addNodeAtPosition('condition')}
              className="w-full text-left px-2.5 py-2 hover:bg-purple-50/70 text-xs font-bold text-slate-700 rounded-xl transition-all flex items-center gap-2 group"
            >
              <div className="rounded-lg bg-purple-50 p-1 text-purple-600 group-hover:bg-purple-100/70 transition-colors">
                <GitFork size={13} />
              </div>
              <span>{t('vsb_node_condition')}</span>
            </button>
          </div>
        )}

        {/* Prebuilt Templates Glassmorphic Modal Store Overlay */}
        <Dialog open={isTemplateModalOpen} onOpenChange={setIsTemplateModalOpen}>
          <DialogContent className="sm:max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl rounded-2xl overflow-hidden flex flex-col max-h-[85vh] p-0">
            <DialogHeader className="p-5 border-b border-slate-100 dark:border-slate-850 bg-gradient-to-r from-slate-50 to-slate-100/50 dark:from-slate-900 dark:to-slate-900/50 flex flex-row items-center gap-2.5 space-y-0 text-left">
              <div className="rounded-2xl bg-amber-500/10 p-2 text-amber-500 shrink-0">
                <Sparkles size={20} className="animate-pulse" />
              </div>
              <div>
                <DialogTitle className="font-black text-slate-800 dark:text-white dark:text-slate-100 text-base">{t('vsb_templates_title')}</DialogTitle>
                <DialogDescription className="text-xs text-slate-400 dark:text-slate-400 font-bold">{t('vsb_templates_desc')}</DialogDescription>
              </div>
            </DialogHeader>

            <div className="p-6 overflow-y-auto space-y-4 max-h-[60vh] custom-scrollbar">
              {PREBUILT_TEMPLATES.map((tpl) => {
                const TplIcon = tpl.icon;
                return (
                  <div 
                    key={tpl.id}
                    className="border border-slate-200 dark:border-slate-850 hover:border-amber-400 dark:hover:border-amber-500 hover:shadow-md rounded-2xl p-4 transition-all group flex flex-col md:flex-row gap-4 justify-between items-start bg-white dark:bg-slate-950"
                  >
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2">
                        <div className={`p-1.5 rounded-lg bg-gradient-to-br ${tpl.color} text-white`}>
                          <TplIcon size={14} />
                        </div>
                        <h4 className="font-black text-slate-800 dark:text-white dark:text-slate-200 text-sm group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                          {tpl.name}
                        </h4>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold leading-relaxed">
                        {tpl.description}
                      </p>
                      
                      {/* Schematic Mini Map representation */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30">
                          {t('tr_trigger')}
                        </span>
                        <span className="text-slate-300 dark:text-slate-650 text-[10px]">➜</span>
                        {tpl.nodes.slice(1).map((n, idx) => {
                          let label = '';
                          let colorClass = '';
                          if (n.type === 'timeDelay') {
                            label = `${n.data.delayHours}${t('tdn_unit_hr').toLowerCase()} ${t('tdn_pending')}`;
                            colorClass = 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border border-amber-100 dark:border-amber-900/30';
                          } else if (n.type === 'sendMessage') {
                            label = t('smn_send_message');
                            colorClass = 'bg-emerald-500/10 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 border border-emerald-500/20 dark:border-blue-900/30';
                          } else if (n.type === 'condition') {
                            label = t('cn_response_check');
                            colorClass = 'bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-400 border border-purple-100 dark:border-purple-900/30';
                          }
                          return (
                            <React.Fragment key={idx}>
                              <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md ${colorClass}`}>
                                {label}
                              </span>
                              {idx < tpl.nodes.slice(1).length - 1 && (
                                <span className="text-slate-300 dark:text-slate-650 text-[10px]">➜</span>
                              )}
                            </React.Fragment>
                          );
                        })}
                      </div>
                    </div>

                    <Button
                      className="bg-slate-900 hover:bg-amber-500 hover:text-white text-white dark:bg-slate-800 dark:hover:bg-amber-500 dark:hover:text-white dark:text-slate-100 font-black text-xs h-9 px-4 rounded-xl shrink-0 mt-2 md:mt-0 transition-all shadow-md group-hover:scale-[1.02]"
                      onClick={() => {
                        handleApplyPrebuilt(tpl);
                        setIsTemplateModalOpen(false);
                      }}
                    >
                      {t('vsb_apply_template')}
                    </Button>
                  </div>
                );
              })}
            </div>

            <div className="p-4 border-t border-slate-100 dark:border-slate-850 bg-slate-50 dark:bg-slate-900/50 text-center">
              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold">
                {t('vsb_apply_template_note')}
              </p>
            </div>
          </DialogContent>
        </Dialog>

        {/* Dynamic Simulation dry-run logger panel overlay */}
        {isSimulating && (
          <div className="absolute bottom-4 left-4 right-4 h-48 bg-slate-900 text-slate-100 rounded-2xl shadow-2xl border border-slate-800 flex flex-col overflow-hidden z-20 transition-all duration-300">
            <div className="px-4 py-2 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Terminal size={14} className="text-purple-400 animate-pulse" />
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-300">{t('vsb_sim_console')}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-purple-500 animate-ping" />
                <span className="text-[9px] font-black uppercase text-purple-400">{t('vsb_sim_status')}: {simStatus.toUpperCase()}</span>
              </div>
            </div>

            <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
              {/* Terminal Logs */}
              <div className="flex-1 p-3 overflow-y-auto font-mono text-[10px] space-y-1 bg-slate-950/80 custom-scrollbar select-none">
                {simLogs.map((log, idx) => (
                  <div key={idx} className="flex gap-2">
                    <span className="text-slate-500 font-bold shrink-0">{`>`}</span>
                    <span className={
                      log.includes('Hata') || log.includes('Error') ? 'text-rose-400 font-semibold' :
                      log.includes('başarıyla') || log.includes('successfully') || log.includes('🟢') ? 'text-emerald-400 font-semibold' :
                      log.includes('🕒') ? 'text-amber-300 font-medium' : 'text-slate-300'
                    }>
                      {log}
                    </span>
                  </div>
                ))}
                {simWaitingForChoice && (
                  <div className="text-purple-400 font-bold animate-pulse">{`> [ETKİLEŞİM BEKLENİYOR] Lütfen sağdaki seçeneklerden birini tıklayın.`}</div>
                )}
              </div>

              {/* Interactive choice selector panel */}
              <div className="w-full md:w-64 bg-slate-900 border-t md:border-t-0 md:border-l border-slate-800 p-4 flex flex-col justify-center items-center gap-3">
                {simWaitingForChoice ? (
                  <>
                    <h5 className="text-[10px] font-black text-slate-300 text-center uppercase tracking-wide flex items-center gap-1.5 justify-center">
                      <HelpCircle size={13} className="text-purple-400" /> {t('vsb_simulation_choice')}
                    </h5>
                    <div className="flex gap-2 w-full">
                      <Button 
                        size="sm"
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] rounded-xl h-8 uppercase"
                        onClick={() => handleBranchSelect(true)}
                      >
                        {t('vsb_sim_yes')}
                      </Button>
                      <Button 
                        size="sm"
                        className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-black text-[10px] rounded-xl h-8 uppercase"
                        onClick={() => handleBranchSelect(false)}
                      >
                        {t('vsb_sim_no')}
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="text-center space-y-2 select-none">
                    {simStatus === 'completed' ? (
                      <div className="flex flex-col items-center gap-1 text-emerald-400">
                        <CheckCircle2 size={24} />
                        <span className="text-[10px] font-black uppercase">{t('vsb_sim_completed')}</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-1 text-purple-400">
                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-purple-500 border-t-transparent" />
                        <span className="text-[10px] font-black uppercase animate-pulse">{t('vsb_sim_running')}</span>
                      </div>
                    )}
                    <Button 
                      size="sm"
                      variant="outline"
                      className="bg-slate-800 hover:bg-slate-700 border-slate-700 hover:border-slate-600 text-slate-300 font-bold text-[9px] rounded-lg h-7 gap-1"
                      onClick={startSimulation}
                    >
                      <RotateCcw size={10} /> {t('vsb_sim_restart')}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function VisualSequenceBuilder() {
  return (
    <ReactFlowProvider>
      <Flow />
    </ReactFlowProvider>
  );
}
