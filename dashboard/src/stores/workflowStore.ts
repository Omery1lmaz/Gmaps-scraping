import { create } from 'zustand';
import {
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
} from '@xyflow/react';
import type {
  Connection,
  Edge,
  EdgeChange,
  Node,
  NodeChange,
  OnNodesChange,
  OnEdgesChange,
  OnConnect,
} from '@xyflow/react';
import { v4 as uuidv4 } from 'uuid';

export type AppNode = Node;

export type WorkflowState = {
  nodes: AppNode[];
  edges: Edge[];
  selectedVariation: { nodeId: string; index: number; templateId: string } | null;
  selectedNodeForSettings: AppNode | null;
  onNodesChange: OnNodesChange<AppNode>;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;
  addNode: (node: AppNode) => void;
  updateNodeData: (nodeId: string, data: any) => void;
  setNodes: (nodes: AppNode[]) => void;
  setEdges: (edges: Edge[]) => void;
  setSelectedVariation: (variation: { nodeId: string; index: number; templateId: string } | null) => void;
  setSelectedNodeForSettings: (node: AppNode | null) => void;
};

export const useWorkflowStore = create<WorkflowState>((set, get) => ({
  nodes: [],
  edges: [],
  selectedVariation: null,
  selectedNodeForSettings: null,
  
  onNodesChange: (changes: NodeChange<AppNode>[]) => {
    set({
      nodes: applyNodeChanges(changes, get().nodes),
    });
  },
  
  onEdgesChange: (changes: EdgeChange[]) => {
    set({
      edges: applyEdgeChanges(changes, get().edges),
    });
  },
  
  onConnect: (connection: Connection) => {
    set({
      edges: addEdge({ ...connection, animated: true, style: { strokeWidth: 2 } }, get().edges),
    });
  },
  
  addNode: (node: AppNode) => {
    set({
      nodes: [...get().nodes, node],
    });
  },
  
  updateNodeData: (nodeId: string, data: any) => {
    set({
      nodes: get().nodes.map((node) => {
        if (node.id === nodeId) {
          return {
            ...node,
            data: { ...node.data, ...data }
          };
        }
        return node;
      }),
    });
  },

  setNodes: (nodes: AppNode[]) => {
    set({ nodes });
  },

  setEdges: (edges: Edge[]) => {
    set({ edges });
  },

  setSelectedVariation: (variation) => {
    set({ selectedVariation: variation });
  },

  setSelectedNodeForSettings: (node) => {
    set({ selectedNodeForSettings: node });
  },
}));
