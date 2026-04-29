import { Injectable } from '@angular/core';
import * as joint from '@joint/core';
import { DiagramNodeType } from '../models/diagram-node-type.type';
import { JOINT_META } from '../utils/joint-metadata';
import '../utils/workflow-shapes';
import { createDefaultNodeBusinessConfig } from '../models/node-business-config.model';

@Injectable({
  providedIn: 'root'
})
export class NodeFactoryService {
  private readonly styles = {
    lane: {
      fill: '#fcfcfc',
      stroke: '#cbd5e1',
      strokeWidth: 2,
      strokeDasharray: '5,5'
    },
    action: {
      fill: '#3b82f6',
      stroke: '#2563eb',
      rx: 10,
      ry: 10
    },
    decision: {
      fill: '#ffffff',
      stroke: '#000000',
      strokeWidth: 2
    },
    sync: {
      fill: '#000000',
      strokeWidth: 0
    },
    text: {
      fontFamily: 'Inter, sans-serif',
      fontSize: 12,
      fontWeight: 'bold'
    },
    link: {
      stroke: '#475569',
      strokeWidth: 2
    }
  } as const;

  createLane(
    name: string,
    x: number,
    y: number,
    width: number,
    height: number,
    maxCanvasWidth = 900
  ): joint.shapes.standard.Rectangle {

    const DEFAULT_WIDTH = 860;
    const MIN_WIDTH = 260;
    const MIN_HEIGHT = 120;
    const RIGHT_MARGIN = 32;

    const availableWidth = maxCanvasWidth - x - RIGHT_MARGIN;

    const FINAL_WIDTH = Math.max(
      MIN_WIDTH,
      Math.min(DEFAULT_WIDTH, availableWidth)
    );

    const FINAL_HEIGHT = Math.max(height, MIN_HEIGHT);

    const lane = new joint.shapes.standard.Rectangle();

    lane.position(x, y);
    lane.resize(FINAL_WIDTH, FINAL_HEIGHT);

    lane.attr({
      body: {
        fill: '#ffffff',
        stroke: '#475569',
        strokeWidth: 2
      },
      label: {
        text: name.toUpperCase(),
        fill: '#0f172a',
        fontSize: 12,
        fontWeight: '700',
        fontFamily: 'Inter, sans-serif',

        x: 18,
        y: FINAL_HEIGHT / 2,

        textAnchor: 'middle',
        textVerticalAnchor: 'middle',

        transform: `rotate(-90, 18, ${FINAL_HEIGHT / 2})`
      }
    });

    lane.set(JOINT_META.NODE_TYPE, 'lane');
    lane.set(JOINT_META.IS_LANE, true);

    return lane;
  }

  createNode(
    type: DiagramNodeType,
    x: number,
    y: number,
    label = ''
  ): joint.dia.Element {
    switch (type) {
      case 'initial':
        return this.createInitialNode(x, y);
      case 'action':
        return this.createActionNode(x, y, label || 'Nueva Tarea');
      case 'decision':
        return this.createDecisionNode(x, y, label || '¿?');
      case 'sync':
        return this.createSyncBar(x, y);
      case 'activityFinal':
        return this.createActivityFinalNode(x, y);
      case 'flowFinal':
        return this.createFlowFinalNode(x, y);
      default:
        throw new Error(`Tipo de nodo no soportado: ${type}`);
    }
  }

  createControlFlow(): joint.shapes.standard.Link {
    const link = new joint.shapes.standard.Link();

    link.router('manhattan');
    link.connector('rounded');

    link.attr({
      line: {
        stroke: '#334155',
        strokeWidth: 2,
        sourceMarker: {
          type: 'none'
        },
        targetMarker: {
          type: 'path',
          d: 'M 10 -5 0 0 10 5 Z',
          fill: '#334155',
          stroke: '#334155'
        }
      }
    });

    link.labels([
      {
        position: 0.5,
        attrs: {
          text: {
            text: '',
            fontSize: 11,
            fontWeight: '500',
            fill: '#475569',
            fontFamily: 'Inter, sans-serif'
          },
          rect: {
            fill: '#ffffff',
            stroke: '#cbd5e1',
            strokeWidth: 1,
            rx: 4,
            ry: 4
          }
        }
      }
    ]);

    link.set(JOINT_META.NODE_TYPE, 'link');
    link.set(JOINT_META.LINK_TYPE, 'controlFlow');

    return link;
  }

  createDefaultLink(): joint.shapes.standard.Link {
    return this.createControlFlow();
  }

  buildLinkLabel(label: string): joint.dia.Link.Label {
    return {
      position: 0.5,
      attrs: {
        labelBody: {
          ref: 'labelText',
          fill: '#ffffff',
          stroke: '#cbd5e1',
          strokeWidth: 1,
          rx: 8,
          ry: 8
        },
        labelText: {
          text: label,
          fill: '#334155',
          fontSize: 11,
          fontFamily: 'Inter, sans-serif',
          fontWeight: '600',
          textAnchor: 'middle',
          textVerticalAnchor: 'middle',
          y: 0
        }
      },
      markup: [
        { tagName: 'rect', selector: 'labelBody' },
        { tagName: 'text', selector: 'labelText' }
      ]
    };
  }

  private createInitialNode(x: number, y: number): joint.shapes.standard.Circle {
    const node = new joint.shapes.standard.Circle();

    node.position(x, y).resize(30, 30).attr({
      body: {
        fill: '#000000',
        stroke: 'none'
      }
    });

    this.setCommonMetadata(node, 'initial');
    this.applyPorts(node, ['out']);

    return node;
  }

  private createActionNode(
  x: number,
  y: number,
  label: string
): joint.shapes.standard.Rectangle {
  const node = new joint.shapes.standard.Rectangle();

  node.position(x, y).resize(150, 60).attr({
    body: this.styles.action,
    label: {
      text: label,
      fill: '#ffffff',
      ...this.styles.text
    }
  });

  this.setCommonMetadata(node, 'action');
  node.set(JOINT_META.BUSINESS_CONFIG, createDefaultNodeBusinessConfig());

  this.applyPorts(node, ['in', 'out']);

  return node;
}

  private createDecisionNode(
    x: number,
    y: number,
    label: string
  ): joint.shapes.standard.Polygon {
    const node = new joint.shapes.standard.Polygon();

    node.position(x, y).resize(60, 60).attr({
      body: {
        ...this.styles.decision,
        refPoints: '0,10 10,0 20,10 10,20'
      },
      label: {
        text: label,
        fill: '#334155',
        refY: -25,
        ...this.styles.text
      }
    });

    this.setCommonMetadata(node, 'decision');
    this.applyPorts(node, ['in', 'out-yes', 'out-no']);

    return node;
  }

  private createSyncBar(
    x: number,
    y: number,
    orientation: 'h' | 'v' = 'h'
  ): joint.shapes.standard.Rectangle {
    const node = new joint.shapes.standard.Rectangle();

    node.position(x, y);
    orientation === 'h' ? node.resize(120, 8) : node.resize(8, 120);

    node.attr({
      body: this.styles.sync
    });

    node.set('orientation', orientation);
    this.setCommonMetadata(node, 'sync');
    this.applyPorts(node, orientation === 'h'
      ? ['in-left', 'in-right', 'out-left', 'out-right']
      : ['in-top', 'in-bottom', 'out-top', 'out-bottom']);

    return node;
  }

  private createActivityFinalNode(
    x: number,
    y: number
  ): joint.dia.Element {
    const node = new (joint.shapes as any).custom.ActivityFinal();

    node.position(x, y);
    node.resize(40, 40);

    this.setCommonMetadata(node, 'activityFinal');
    this.applyPorts(node, ['in']);

    return node;
  }

  private createFlowFinalNode(
    x: number,
    y: number
  ): joint.dia.Element {
    const node = new (joint.shapes as any).custom.FlowFinal();

    node.position(x, y);
    node.resize(30, 30);

    this.setCommonMetadata(node, 'flowFinal');
    this.applyPorts(node, ['in']);

    return node;
  }

  private setCommonMetadata(node: joint.dia.Element, type: DiagramNodeType): void {
    node.set(JOINT_META.NODE_TYPE, type);
    node.set(JOINT_META.IS_LANE, false);
  }

  private applyPorts(node: joint.dia.Element, portNames: string[]): void {
    node.prop('ports/groups', this.buildPortGroups());

    node.addPorts(
      portNames.map((portId) => ({
        id: portId,
        group: this.resolvePortGroup(portId)
      }))
    );
  }

  private buildPortGroups(): Record<string, joint.dia.Element.PortGroup> {
    return {
      top: this.createPortGroup('top'),
      bottom: this.createPortGroup('bottom'),
      left: this.createPortGroup('left'),
      right: this.createPortGroup('right')
    };
  }

  private createPortGroup(position: 'top' | 'bottom' | 'left' | 'right'): joint.dia.Element.PortGroup {
    return {
      position: {
        name: position
      },
      attrs: {
        circle: {
          r: 5,
          magnet: true,
          stroke: '#334155',
          strokeWidth: 2,
          fill: '#ffffff',
          visibility: 'hidden'
        }
      },
      markup: [
        {
          tagName: 'circle',
          selector: 'circle'
        }
      ]
    };
  }

  private resolvePortGroup(portId: string): 'top' | 'bottom' | 'left' | 'right' {
    if (portId.includes('top') || portId === 'in') {
      return 'top';
    }

    if (portId.includes('bottom') || portId === 'out') {
      return 'bottom';
    }

    if (portId.includes('left')) {
      return 'left';
    }

    return 'right';
  }
}