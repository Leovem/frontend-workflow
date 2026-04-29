import { Injectable } from '@angular/core';
import {
  AiDiagramEdge,
  AiDiagramNode,
  AiDiagramPayload
} from '../models/ai-diagram.models';
import { DiagramNodeType } from '../models/diagram-node-type.type';

@Injectable({
  providedIn: 'root'
})
export class DiagramAiMapperService {

  fromGraphJson(graphJson: unknown): AiDiagramPayload {
    const typedGraph = graphJson as { cells?: unknown[] };
    const cells = Array.isArray(typedGraph?.cells) ? typedGraph.cells : [];

    const nodes: AiDiagramNode[] = [];
    const edges: AiDiagramEdge[] = [];

    for (const rawCell of cells) {
      const cell = rawCell as Record<string, any>;

      if (this.isLinkCell(cell)) {
        edges.push(this.mapLink(cell));
        continue;
      }

      if (this.isLaneCell(cell)) {
        nodes.push(this.mapLane(cell));
        continue;
      }

      nodes.push(this.mapNode(cell));
    }

    return {
      nodes,
      edges,
      metadata: {
        source: 'jointjs',
        version: 1,
        totalCells: cells.length,
        totalNodes: nodes.length,
        totalEdges: edges.length
      }
    };
  }

  private isLaneCell(cell: Record<string, any>): boolean {
    return cell['isLane'] === true || cell['nodeType'] === 'lane';
  }

  private isLinkCell(cell: Record<string, any>): boolean {
    return cell['nodeType'] === 'link' || cell['type'] === 'standard.Link';
  }

  private mapLane(cell: Record<string, any>): AiDiagramNode {
    return {
      id: String(cell['id'] ?? ''),
      type: 'lane',
      label: this.extractLabel(cell),
      x: this.asNumber(cell['position']?.['x']),
      y: this.asNumber(cell['position']?.['y']),
      width: this.asNumber(cell['size']?.['width']),
      height: this.asNumber(cell['size']?.['height']),
      rawType: this.asString(cell['type'])
    };
  }

  private mapNode(cell: Record<string, any>): AiDiagramNode {
    const nodeType = this.normalizeNodeType(cell['nodeType']);

    return {
      id: String(cell['id'] ?? ''),
      type: nodeType,
      label: this.extractLabel(cell),
      laneId: this.extractLaneId(cell),
      x: this.asNumber(cell['position']?.['x']),
      y: this.asNumber(cell['position']?.['y']),
      width: this.asNumber(cell['size']?.['width']),
      height: this.asNumber(cell['size']?.['height']),
      rawType: this.asString(cell['type'])
    };
  }

  private mapLink(cell: Record<string, any>): AiDiagramEdge {
    return {
      id: String(cell['id'] ?? ''),
      type: 'link',
      sourceId: this.asString(cell['source']?.['id']),
      targetId: this.asString(cell['target']?.['id']),
      label: this.extractLinkLabel(cell)
    };
  }

  private extractLaneId(cell: Record<string, any>): string | null {
    const laneId = cell['laneId'] ?? cell['parent'] ?? null;
    return laneId ? String(laneId) : null;
  }

  private extractLabel(cell: Record<string, any>): string {
    return this.asString(
      cell['attrs']?.['label']?.['text'] ??
      cell['attrs']?.['text']?.['text'] ??
      ''
    );
  }

  private extractLinkLabel(cell: Record<string, any>): string {
    const labels = cell['labels'];

    if (!Array.isArray(labels) || labels.length === 0) {
      return '';
    }

    const firstLabel = labels[0];

    return this.asString(
      firstLabel?.['attrs']?.['labelText']?.['text'] ??
      firstLabel?.['attrs']?.['text']?.['text'] ??
      ''
    );
  }

  private normalizeNodeType(value: unknown): DiagramNodeType {
    const nodeType = this.asString(value);

    switch (nodeType) {
      case 'lane':
      case 'initial':
      case 'action':
      case 'decision':
      case 'sync':
      case 'activityFinal':
      case 'flowFinal':
      case 'link':
        return nodeType;
      default:
        return 'action';
    }
  }

  private asString(value: unknown): string {
    return typeof value === 'string' ? value : '';
  }

  private asNumber(value: unknown): number | undefined {
    return typeof value === 'number' ? value : undefined;
  }
}