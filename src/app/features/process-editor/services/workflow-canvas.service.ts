import { Injectable } from '@angular/core';
import * as joint from '@joint/core';

import { NodeFactoryService } from './node-factory.service';
import { JOINT_META } from '../utils/joint-metadata';
import { LinkValidationService } from './link-validation.service';
import { DiagramRulesService } from './diagram-rules.service';
import '../utils/workflow-shapes';

@Injectable({
  providedIn: 'root'
})
export class WorkflowCanvasService {
  private readonly graph = new joint.dia.Graph({}, {
    cellNamespace: joint.shapes
  });

  private paper!: joint.dia.Paper;
  private linkModeEnabled = false;
  private graphRulesRegistered = false;

  constructor(
    private readonly nodeFactory: NodeFactoryService,
    private readonly linkValidation: LinkValidationService,
    private readonly diagramRules: DiagramRulesService
  ) {}

  getGraph(): joint.dia.Graph {
    return this.graph;
  }

  getPaper(): joint.dia.Paper {
    return this.paper;
  }

  setLinkMode(enabled: boolean): void {
    this.linkModeEnabled = enabled;
    this.setAllBodiesMagnet(enabled);
    this.setAllPortsVisibility('hidden');
  }

  setupPaper(element: HTMLElement, width: number, height: number): joint.dia.Paper {
    this.paper = new joint.dia.Paper({
      el: element,
      model: this.graph,
      width,
      height,
      gridSize: 10,
      drawGrid: { name: 'mesh', color: '#e2e8f0' },
      background: { color: '#ffffff' },

      cellViewNamespace: joint.shapes,

      embeddingMode: true,
      findParentBy: 'bbox',
      snapLinks: { radius: 40 },
      linkPinning: false,
      markAvailable: true,

      interactive: (cellView) => {
        if (cellView.model.get(JOINT_META.IS_LANE) === true) {
          return {
            elementMove: false,
            labelMove: false
          };
        }

        if (cellView.model.isLink()) {
          return {
            linkMove: true,
            labelMove: true,
            arrowheadMove: true,
            vertexMove: true
          };
        }

        return true;
      },

      validateEmbedding: (childView, parentView) => {
        return parentView.model.get(JOINT_META.IS_LANE) === true &&
          childView.model.get(JOINT_META.IS_LANE) !== true;
      },

      validateMagnet: (cellView, magnet) => {
        if (cellView.model.get(JOINT_META.IS_LANE) === true) {
          return false;
        }

        const selector = magnet?.getAttribute('joint-selector');

        if (this.linkModeEnabled && selector === 'body') {
          return true;
        }

        const portGroup = magnet?.getAttribute('port-group');

        if (!portGroup) {
          return false;
        }

        return this.linkValidation.isOutputPortGroup(portGroup);
      },

      validateConnection: (
        sourceView,
        sourceMagnet,
        targetView,
        targetMagnet
      ) => {
        if (!sourceView || !targetView || !sourceMagnet || !targetMagnet) {
          return false;
        }

        return this.linkValidation.canConnect(
          this.graph,
          sourceView.model,
          targetView.model,
          sourceMagnet.getAttribute('port'),
          targetMagnet.getAttribute('port'),
          sourceMagnet.getAttribute('port-group'),
          targetMagnet.getAttribute('port-group'),
          sourceMagnet.getAttribute('joint-selector'),
          targetMagnet.getAttribute('joint-selector')
        ).valid;
      },

      defaultLink: () => this.nodeFactory.createControlFlow()
    });

    this.registerPaperEvents();
    this.registerGraphRulesOnce();

    return this.paper;
  }

  resizePaper(width: number, height: number): void {
    if (this.paper) {
      this.paper.setDimensions(width, height);
    }
  }

  clear(): void {
    this.graph.clear();
  }

  getLocalPointFromClient(clientX: number, clientY: number): { x: number; y: number } {
    if (!this.paper) {
      return { x: 0, y: 0 };
    }

    const rect = this.paper.el.getBoundingClientRect();

    return {
      x: clientX - rect.left + this.paper.el.scrollLeft,
      y: clientY - rect.top + this.paper.el.scrollTop
    };
  }

  private setAllBodiesMagnet(enabled: boolean): void {
    if (!this.paper) return;

    this.graph.getElements().forEach((element: joint.dia.Element) => {
      if (element.get(JOINT_META.IS_LANE) === true) return;

      const view = this.paper.findViewByModel(element) as joint.dia.ElementView | null;
      if (!view) return;

      const body = view.el.querySelector('[joint-selector="body"]');
      if (!body) return;

      (body as SVGElement).setAttribute('magnet', enabled ? 'true' : 'false');
      (body as SVGElement).style.cursor = enabled ? 'crosshair' : 'move';
    });
  }

  private setAllPortsVisibility(visibility: 'visible' | 'hidden'): void {
    if (!this.paper) return;

    this.graph.getElements().forEach((element: joint.dia.Element) => {
      if (element.get(JOINT_META.IS_LANE) === true) return;

      const view = this.paper.findViewByModel(element) as joint.dia.ElementView | null;
      if (!view) return;

      this.togglePortsVisibility(view, visibility);
    });
  }

  private registerGraphRulesOnce(): void {
    if (this.graphRulesRegistered) return;

    this.graphRulesRegistered = true;

    this.graph.on('add', (cell: joint.dia.Cell) => {
      if (cell.isElement() && this.linkModeEnabled) {
        this.syncElementMagnet(cell as joint.dia.Element);
      }

      if (cell.get(JOINT_META.NODE_TYPE) !== 'link') return;

      const sourceId = cell.get('source')?.id;
      if (!sourceId) return;

      const sourceCell = this.graph.getCell(sourceId);
      if (!sourceCell) return;

      this.diagramRules.applyDecisionLabels(this.graph, sourceCell);
    });

    this.graph.on('remove', (cell: joint.dia.Cell) => {
      if (cell.get(JOINT_META.NODE_TYPE) !== 'link') return;

      this.diagramRules.refreshAllDecisionLabels(this.graph);
    });

    this.graph.on('change:parent', (cell: joint.dia.Cell) => {
      this.syncNodeLaneBusinessData(cell);
    });
  }

  private registerPaperEvents(): void {
    this.paper.on('element:mouseenter', (elementView: joint.dia.ElementView) => {
      if (!this.linkModeEnabled) {
        this.togglePortsVisibility(elementView, 'visible');
      }
    });

    this.paper.on('element:mouseleave', (elementView: joint.dia.ElementView) => {
      this.togglePortsVisibility(elementView, 'hidden');
    });
  }

  private syncNodeLaneBusinessData(cell: joint.dia.Cell): void {
    if (!cell.isElement()) return;
    if (cell.get(JOINT_META.IS_LANE) === true) return;

    const parentId = cell.get('parent');

    if (!parentId) {
      cell.unset(JOINT_META.LANE_ID);
      return;
    }

    const parent = this.graph.getCell(parentId);

    if (!parent || parent.get(JOINT_META.IS_LANE) !== true) {
      cell.unset(JOINT_META.LANE_ID);
      return;
    }

    cell.set(JOINT_META.LANE_ID, parent.id);

    const departmentConfig = parent.get(JOINT_META.DEPARTMENT_CONFIG);
    const businessConfig = cell.get(JOINT_META.BUSINESS_CONFIG);

    if (!departmentConfig || !businessConfig?.assignment) {
      return;
    }

    cell.set(JOINT_META.BUSINESS_CONFIG, {
      ...businessConfig,
      assignment: {
        ...businessConfig.assignment,
        targetType: businessConfig.assignment.targetType ?? 'DEPARTMENT',
        departmentId: departmentConfig.departmentId
      }
    });
  }

  private syncElementMagnet(element: joint.dia.Element): void {
    if (!this.paper) return;
    if (element.get(JOINT_META.IS_LANE) === true) return;

    const view = this.paper.findViewByModel(element) as joint.dia.ElementView | null;
    if (!view) return;

    const body = view.el.querySelector('[joint-selector="body"]');
    if (!body) return;

    (body as SVGElement).setAttribute('magnet', this.linkModeEnabled ? 'true' : 'false');
    (body as SVGElement).style.cursor = this.linkModeEnabled ? 'crosshair' : 'move';
  }

  private togglePortsVisibility(
    elementView: joint.dia.ElementView,
    visibility: 'visible' | 'hidden'
  ): void {
    const ports = elementView.el.querySelectorAll('[port] circle');

    ports.forEach((port) => {
      (port as SVGElement).setAttribute('visibility', visibility);
    });
  }
}