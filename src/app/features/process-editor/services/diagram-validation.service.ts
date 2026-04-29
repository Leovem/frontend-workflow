import { Injectable } from '@angular/core';
import * as joint from '@joint/core';
import { JOINT_META } from '../utils/joint-metadata';
import { DiagramNodeType } from '../models/diagram-node-type.type';

@Injectable({
  providedIn: 'root'
})
export class DiagramValidationService {
  canDropNodeInLane(nodeType: DiagramNodeType, lane: joint.dia.Element | null): boolean {
    if (!lane) {
      return false;
    }

    if (lane.get(JOINT_META.IS_LANE) !== true) {
      return false;
    }

    return nodeType !== 'lane' && nodeType !== 'link';
  }

  canCreateInitialNode(graph: joint.dia.Graph, lane: joint.dia.Element): boolean {
    const embedded = lane.getEmbeddedCells({ deep: false });
    return !embedded.some(cell => cell.get(JOINT_META.NODE_TYPE) === 'initial');
  }

  validateNewNode(graph: joint.dia.Graph, nodeType: DiagramNodeType, lane: joint.dia.Element | null): { valid: boolean; message?: string } {
    if (!this.canDropNodeInLane(nodeType, lane)) {
      return { valid: false, message: 'Debes soltar el elemento dentro de un Departamento.' };
    }

    if (nodeType === 'initial' && lane && !this.canCreateInitialNode(graph, lane)) {
      return { valid: false, message: 'Solo se permite un nodo inicial por Departamento.' };
    }

    return { valid: true };
  }
}