import { Injectable, inject } from '@angular/core';
import * as joint from '@joint/core';

import {
  DiagramAiResponse,
  DiagramOperation
} from '../models/ai-diagram.models';

import { DiagramNodeType } from '../models/diagram-node-type.type';
import { NodeFactoryService } from './node-factory.service';
import { LaneManagerService } from './lane-manager.service';
import { DiagramRulesService } from './diagram-rules.service';
import { LinkValidationService } from './link-validation.service';
import { ActivityDiagramValidationService } from './activitydiagram-validation.service';
import { JOINT_META } from '../utils/joint-metadata';

@Injectable({
  providedIn: 'root'
})
export class DiagramAiApplyService {
  private readonly nodeFactory = inject(NodeFactoryService);
  private readonly laneManager = inject(LaneManagerService);
  private readonly diagramRules = inject(DiagramRulesService);
  private readonly linkValidation = inject(LinkValidationService);
  private readonly activityValidation = inject(ActivityDiagramValidationService);

  applyResponse(graph: joint.dia.Graph, response: DiagramAiResponse): void {
    this.applyOperations(graph, response.operations ?? []);
  }

  applyOperations(graph: joint.dia.Graph, operations: DiagramOperation[]): void {
    if (!operations.length) return;

    graph.startBatch('ai-operations');

    try {
      for (const operation of operations) {
        this.applyOperation(graph, operation);
      }

      this.diagramRules.refreshAllDecisionLabels(graph);

      const issues = this.activityValidation.validate(graph);
      const errors = issues.filter(issue => issue.severity === 'error');

      if (errors.length) {
        console.warn('La IA dejó errores de validación:', errors);
      }
    } finally {
      graph.stopBatch('ai-operations');
    }
  }

  private applyOperation(graph: joint.dia.Graph, operation: DiagramOperation): void {
    switch (operation.type) {
      case 'rename_node':
        this.renameNode(graph, operation);
        break;

      case 'move_node':
        this.moveNode(graph, operation);
        break;

      case 'assign_lane':
        this.assignLane(graph, operation);
        break;

      case 'add_node':
        this.addNode(graph, operation);
        break;

      case 'remove_node':
        this.removeNode(graph, operation);
        break;

      case 'create_link':
        this.createLink(graph, operation);
        break;

      case 'remove_link':
        this.removeLink(graph, operation);
        break;

      case 'normalize_layout':
        this.normalizeLayout(graph);
        break;

      default:
        console.warn('Operación IA no reconocida:', operation);
    }
  }

  private renameNode(graph: joint.dia.Graph, operation: DiagramOperation): void {
    if (!operation.node_id || operation.label == null) return;

    const cell = graph.getCell(operation.node_id);
    if (!cell?.isElement()) return;

    cell.attr('label/text', operation.label);
    cell.attr('text/text', operation.label);
  }

  private moveNode(graph: joint.dia.Graph, operation: DiagramOperation): void {
    if (!operation.node_id || operation.x == null || operation.y == null) return;

    const cell = graph.getCell(operation.node_id);
    if (!cell?.isElement()) return;
    if (this.isLane(cell)) return;

    cell.position(operation.x, operation.y);

    if (operation.lane_id) {
      this.assignLane(graph, operation);
      return;
    }

    const lane = this.laneManager.getLaneAtPoint(graph, operation.x, operation.y);

    if (lane) {
      this.embedSafely(cell, lane);
    }
  }

  private assignLane(graph: joint.dia.Graph, operation: DiagramOperation): void {
    if (!operation.node_id || !operation.lane_id) return;

    const node = graph.getCell(operation.node_id);
    const lane = graph.getCell(operation.lane_id);

    if (!node?.isElement() || !lane?.isElement()) return;
    if (this.isLane(node)) return;

    if (!this.isLane(lane)) {
      console.warn('El destino no es una lane:', operation.lane_id);
      return;
    }

    this.embedSafely(node, lane);
  }

  private addNode(graph: joint.dia.Graph, operation: DiagramOperation): void {
    const nodeType = this.toDiagramNodeType(operation.node_type);

    if (!nodeType || nodeType === 'lane' || nodeType === 'link') {
      console.warn('Tipo de nodo IA inválido para add_node:', operation.node_type);
      return;
    }

    const x = operation.x ?? 120;
    const y = operation.y ?? 120;
    const label = operation.label ?? this.defaultLabel(nodeType);

    const node = this.nodeFactory.createNode(nodeType, x, y, label);

    graph.addCell(node);

    const lane = operation.lane_id
      ? graph.getCell(operation.lane_id)
      : this.laneManager.getLaneAtPoint(graph, x, y);

    if (lane?.isElement() && this.isLane(lane)) {
      this.embedSafely(node, lane);
    }
  }

  private removeNode(graph: joint.dia.Graph, operation: DiagramOperation): void {
    if (!operation.node_id) return;

    const cell = graph.getCell(operation.node_id);

    if (!cell?.isElement()) return;

    if (this.isLane(cell)) {
      console.warn('La IA intentó eliminar una lane. Operación bloqueada:', operation);
      return;
    }

    graph.getConnectedLinks(cell).forEach(link => link.remove());

    this.unembedFromCurrentParent(cell);
    cell.remove();
  }

  private createLink(graph: joint.dia.Graph, operation: DiagramOperation): void {
    if (!operation.source_id || !operation.target_id) return;

    const source = graph.getCell(operation.source_id);
    const target = graph.getCell(operation.target_id);

    if (!source?.isElement() || !target?.isElement()) return;

    const validation = this.linkValidation.canConnect(
      graph,
      source,
      target,
      null,
      null,
      null,
      null,
      'body',
      'body'
    );

    if (!validation.valid) {
      console.warn('Link rechazado por validación:', validation.message, operation);
      return;
    }

    const link = this.nodeFactory.createControlFlow();

    link.source({ id: operation.source_id });
    link.target({ id: operation.target_id });

    if (operation.label) {
      link.labels([this.nodeFactory.buildLinkLabel(operation.label)]);
    }

    graph.addCell(link);
  }

  private removeLink(graph: joint.dia.Graph, operation: DiagramOperation): void {
    if (operation.node_id) {
      const cell = graph.getCell(operation.node_id);

      if (cell?.isLink()) {
        cell.remove();
        return;
      }
    }

    if (!operation.source_id || !operation.target_id) return;

    const link = graph.getLinks().find(currentLink => {
      const source = currentLink.source();
      const target = currentLink.target();

      return source.id === operation.source_id &&
        target.id === operation.target_id;
    });

    link?.remove();
  }

  private normalizeLayout(graph: joint.dia.Graph): void {
    this.laneManager.reflowLanes(graph);

    const lanes = this.laneManager
      .getLanes(graph)
      .sort((a, b) => a.position().y - b.position().y);

    for (const lane of lanes) {
      const laneId = String(lane.id);
      const lanePosition = lane.position();

      const children = graph
        .getElements()
        .filter(cell => {
          if (cell.id === lane.id) return false;
          if (this.isLane(cell)) return false;

          return cell.get(JOINT_META.LANE_ID) === laneId ||
            cell.get('laneId') === laneId ||
            cell.get('parent') === laneId;
        })
        .sort((a, b) => a.position().x - b.position().x);

      children.forEach((child, index) => {
        const x = lanePosition.x + 90 + index * 190;
        const y = lanePosition.y + 80;

        child.position(x, y);
        this.embedSafely(child, lane);
      });
    }
  }

  private embedSafely(node: joint.dia.Element, lane: joint.dia.Element): void {
    this.unembedFromCurrentParent(node);

    this.laneManager.embedNodeInLane(node, lane);

    node.set(JOINT_META.LANE_ID, lane.id);
    node.set('laneId', lane.id);
    node.set('parent', lane.id);
  }

  private unembedFromCurrentParent(node: joint.dia.Element): void {
    const parent = node.getParentCell();

    if (parent?.isElement()) {
      parent.unembed(node);
    }
  }

  private isLane(cell: joint.dia.Cell): boolean {
    return cell.get(JOINT_META.IS_LANE) === true ||
      cell.get(JOINT_META.NODE_TYPE) === 'lane' ||
      cell.get('isLane') === true ||
      cell.get('nodeType') === 'lane';
  }

  private toDiagramNodeType(value?: string | null): DiagramNodeType | null {
    switch (value) {
      case 'lane':
      case 'initial':
      case 'action':
      case 'decision':
      case 'sync':
      case 'activityFinal':
      case 'flowFinal':
      case 'link':
        return value;

      default:
        return null;
    }
  }

  private defaultLabel(type: DiagramNodeType): string {
    switch (type) {
      case 'action':
        return 'Nueva tarea';

      case 'decision':
        return '¿Condición?';

      default:
        return '';
    }
  }
}