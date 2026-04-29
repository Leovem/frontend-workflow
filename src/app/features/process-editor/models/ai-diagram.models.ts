import { DiagramNodeType } from './diagram-node-type.type';

export interface AiDiagramNode {
  id: string;
  type: DiagramNodeType;
  label?: string;
  laneId?: string | null;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  rawType?: string;
}

export interface AiDiagramEdge {
  id: string;
  type: 'link';
  sourceId: string;
  targetId: string;
  label?: string;
}

export interface AiDiagramPayload {
  nodes: AiDiagramNode[];
  edges: AiDiagramEdge[];
  metadata?: Record<string, unknown>;
}

export interface DiagramInstructionRequest {
  prompt: string;
  diagram: AiDiagramPayload;
}

export interface DiagramNormalizeRequest {
  diagram: AiDiagramPayload;
}

export interface DiagramAnalyzeRequest {
  diagram: AiDiagramPayload;
  goal?: string;
}

export interface DiagramOperation {
  type:
    | 'move_node'
    | 'rename_node'
    | 'add_node'
    | 'remove_node'
    | 'create_link'
    | 'remove_link'
    | 'assign_lane'
    | 'normalize_layout';

  node_id?: string | null;
  source_id?: string | null;
  target_id?: string | null;
  lane_id?: string | null;
  label?: string | null;
  x?: number | null;
  y?: number | null;
  node_type?: string | null;
}

export interface DiagramIssue {
  type: string;
  severity: 'low' | 'medium' | 'high';
  node_id?: string;
  lane_id?: string;
  title: string;
  description: string;
  recommendation?: string;
}

export interface DiagramAiResponse {
  message: string;
  operations: DiagramOperation[];
  notes: string[];
  issues?: DiagramIssue[];
}