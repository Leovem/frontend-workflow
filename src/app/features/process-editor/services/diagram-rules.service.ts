import { Injectable } from '@angular/core';
import * as joint from '@joint/core';
import { JOINT_META } from '../utils/joint-metadata';
import { NodeFactoryService } from './node-factory.service';

@Injectable({
  providedIn: 'root'
})
export class DiagramRulesService {
  constructor(private readonly nodeFactory: NodeFactoryService) {}

  applyDecisionLabels(graph: joint.dia.Graph, decisionCell: joint.dia.Cell): void {
    const nodeType = decisionCell.get(JOINT_META.NODE_TYPE);
    if (nodeType !== 'decision') return;

    const outgoingLinks = graph.getConnectedLinks(decisionCell, { outbound: true });

    if (outgoingLinks.length === 1) {
      outgoingLinks[0].label(0, this.nodeFactory.buildLinkLabel('Sí'));
      return;
    }

    if (outgoingLinks.length >= 2) {
      outgoingLinks[0].label(0, this.nodeFactory.buildLinkLabel('Sí'));
      outgoingLinks[1].label(0, this.nodeFactory.buildLinkLabel('No'));

      for (let i = 2; i < outgoingLinks.length; i++) {
        outgoingLinks[i].label(0, this.nodeFactory.buildLinkLabel(`Rama ${i + 1}`));
      }
    }
  }

  refreshAllDecisionLabels(graph: joint.dia.Graph): void {
    graph.getElements().forEach((cell) => {
      if (cell.get(JOINT_META.NODE_TYPE) === 'decision') {
        this.applyDecisionLabels(graph, cell);
      }
    });
  }
}