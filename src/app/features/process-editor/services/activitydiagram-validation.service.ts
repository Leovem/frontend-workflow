import { Injectable } from '@angular/core';
import * as joint from '@joint/core';
import { JOINT_META } from '../utils/joint-metadata';
import { DiagramValidationIssue } from '../models/diagram-validation-issue.model';

@Injectable({
  providedIn: 'root'
})
export class ActivityDiagramValidationService {

  validate(graph: joint.dia.Graph): DiagramValidationIssue[] {
    const issues: DiagramValidationIssue[] = [];
    const elements = graph.getElements();

    for (const element of elements) {
      const nodeType = element.get(JOINT_META.NODE_TYPE);

      // Ignorar lanes
      if (element.get(JOINT_META.IS_LANE) === true) {
        continue;
      }

      const incoming = this.countIncoming(graph, element);
      const outgoing = this.countOutgoing(graph, element);

      switch (nodeType) {
        case 'initial':
          this.validateInitialNode(element, incoming, outgoing, issues);
          break;

        case 'activityFinal':
        case 'flowFinal':
          this.validateFinalNode(element, outgoing, issues);
          break;

        case 'decision':
          this.validateDecisionNode(element, incoming, outgoing, issues);
          break;

        case 'merge':
          this.validateMergeNode(element, incoming, outgoing, issues);
          break;

        case 'fork':
          this.validateForkNode(element, incoming, outgoing, issues);
          break;

        case 'join':
          this.validateJoinNode(element, incoming, outgoing, issues);
          break;

        case 'action':
          this.validateActionNode(element, incoming, outgoing, issues);
          break;
      }

      this.validateIsolatedNode(element, incoming, outgoing, issues);
    }

    return issues;
  }

  private validateInitialNode(
    element: joint.dia.Element,
    incoming: number,
    outgoing: number,
    issues: DiagramValidationIssue[]
  ): void {
    if (incoming > 0) {
      issues.push({
        severity: 'error',
        code: 'INITIAL_HAS_INCOMING',
        message: 'El nodo inicial no debe tener entradas.',
        cellId: element.id.toString()
      });
    }

    if (outgoing === 0) {
      issues.push({
        severity: 'error',
        code: 'INITIAL_WITHOUT_OUTGOING',
        message: 'El nodo inicial debe tener una salida.',
        cellId: element.id.toString()
      });
    }

    if (outgoing > 1) {
      issues.push({
        severity: 'warning',
        code: 'INITIAL_MULTIPLE_OUTGOING',
        message: 'El nodo inicial normalmente debería tener una sola salida.',
        cellId: element.id.toString()
      });
    }
  }

  private validateFinalNode(
    element: joint.dia.Element,
    outgoing: number,
    issues: DiagramValidationIssue[]
  ): void {
    if (outgoing > 0) {
      issues.push({
        severity: 'error',
        code: 'FINAL_HAS_OUTGOING',
        message: 'Un nodo final no debe tener salidas.',
        cellId: element.id.toString()
      });
    }
  }

  private validateDecisionNode(
    element: joint.dia.Element,
    incoming: number,
    outgoing: number,
    issues: DiagramValidationIssue[]
  ): void {
    if (incoming === 0) {
      issues.push({
        severity: 'error',
        code: 'DECISION_WITHOUT_INCOMING',
        message: 'El nodo de decisión debe tener al menos una entrada.',
        cellId: element.id.toString()
      });
    }

    if (outgoing === 0) {
      issues.push({
        severity: 'error',
        code: 'DECISION_WITHOUT_OUTGOING',
        message: 'El nodo de decisión debe tener salidas.',
        cellId: element.id.toString()
      });
    }

    if (outgoing < 2) {
      issues.push({
        severity: 'warning',
        code: 'DECISION_FEW_OUTGOING',
        message: 'Un nodo de decisión normalmente debería tener al menos dos salidas.',
        cellId: element.id.toString()
      });
    }

    if (incoming > 1) {
      issues.push({
        severity: 'warning',
        code: 'DECISION_MULTIPLE_INCOMING',
        message: 'Un nodo de decisión normalmente debería tener una sola entrada.',
        cellId: element.id.toString()
      });
    }
  }

  private validateMergeNode(
    element: joint.dia.Element,
    incoming: number,
    outgoing: number,
    issues: DiagramValidationIssue[]
  ): void {
    if (incoming < 2) {
      issues.push({
        severity: 'warning',
        code: 'MERGE_FEW_INCOMING',
        message: 'Un nodo merge normalmente debería tener dos o más entradas.',
        cellId: element.id.toString()
      });
    }

    if (outgoing === 0) {
      issues.push({
        severity: 'error',
        code: 'MERGE_WITHOUT_OUTGOING',
        message: 'El nodo merge debe tener una salida.',
        cellId: element.id.toString()
      });
    }

    if (outgoing > 1) {
      issues.push({
        severity: 'warning',
        code: 'MERGE_MULTIPLE_OUTGOING',
        message: 'Un nodo merge normalmente debería tener una sola salida.',
        cellId: element.id.toString()
      });
    }
  }

  private validateForkNode(
    element: joint.dia.Element,
    incoming: number,
    outgoing: number,
    issues: DiagramValidationIssue[]
  ): void {
    if (incoming === 0) {
      issues.push({
        severity: 'error',
        code: 'FORK_WITHOUT_INCOMING',
        message: 'El nodo fork debe tener una entrada.',
        cellId: element.id.toString()
      });
    }

    if (incoming > 1) {
      issues.push({
        severity: 'warning',
        code: 'FORK_MULTIPLE_INCOMING',
        message: 'Un nodo fork normalmente debería tener una sola entrada.',
        cellId: element.id.toString()
      });
    }

    if (outgoing < 2) {
      issues.push({
        severity: 'warning',
        code: 'FORK_FEW_OUTGOING',
        message: 'Un nodo fork normalmente debería tener dos o más salidas.',
        cellId: element.id.toString()
      });
    }
  }

  private validateJoinNode(
    element: joint.dia.Element,
    incoming: number,
    outgoing: number,
    issues: DiagramValidationIssue[]
  ): void {
    if (incoming < 2) {
      issues.push({
        severity: 'warning',
        code: 'JOIN_FEW_INCOMING',
        message: 'Un nodo join normalmente debería tener dos o más entradas.',
        cellId: element.id.toString()
      });
    }

    if (outgoing === 0) {
      issues.push({
        severity: 'error',
        code: 'JOIN_WITHOUT_OUTGOING',
        message: 'El nodo join debe tener una salida.',
        cellId: element.id.toString()
      });
    }

    if (outgoing > 1) {
      issues.push({
        severity: 'warning',
        code: 'JOIN_MULTIPLE_OUTGOING',
        message: 'Un nodo join normalmente debería tener una sola salida.',
        cellId: element.id.toString()
      });
    }
  }

  private validateActionNode(
    element: joint.dia.Element,
    incoming: number,
    outgoing: number,
    issues: DiagramValidationIssue[]
  ): void {
    if (incoming === 0) {
      issues.push({
        severity: 'warning',
        code: 'ACTION_WITHOUT_INCOMING',
        message: 'La actividad no tiene flujo de entrada.',
        cellId: element.id.toString()
      });
    }

    if (outgoing === 0) {
      issues.push({
        severity: 'warning',
        code: 'ACTION_WITHOUT_OUTGOING',
        message: 'La actividad no tiene flujo de salida.',
        cellId: element.id.toString()
      });
    }
  }

  private validateIsolatedNode(
    element: joint.dia.Element,
    incoming: number,
    outgoing: number,
    issues: DiagramValidationIssue[]
  ): void {
    if (incoming === 0 && outgoing === 0) {
      issues.push({
        severity: 'warning',
        code: 'ISOLATED_NODE',
        message: 'El nodo está aislado, sin entradas ni salidas.',
        cellId: element.id.toString()
      });
    }
  }

  private countIncoming(graph: joint.dia.Graph, cell: joint.dia.Cell): number {
    return graph.getConnectedLinks(cell, { inbound: true }).length;
  }

  private countOutgoing(graph: joint.dia.Graph, cell: joint.dia.Cell): number {
    return graph.getConnectedLinks(cell, { outbound: true }).length;
  }
}