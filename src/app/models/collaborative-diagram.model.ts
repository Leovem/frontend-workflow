export interface CollaborativeDiagramState {
  lanes: CollaborativeCellJson[];
  nodes: CollaborativeCellJson[];
  links: CollaborativeCellJson[];
  updatedAt?: string;
  updatedBy?: string;
}

export interface CollaborativeCellJson {
  id?: string | number;
  type?: string;
  position?: {
    x: number;
    y: number;
  };
  size?: {
    width: number;
    height: number;
  };
  attrs?: Record<string, any>;
  source?: any;
  target?: any;
  vertices?: any[];
  labels?: any[];
  z?: number;
  [key: string]: any;
}

export const EMPTY_COLLABORATIVE_DIAGRAM_STATE: CollaborativeDiagramState = {
  lanes: [],
  nodes: [],
  links: []
};