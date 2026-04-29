import { Injectable } from '@angular/core';
import * as joint from '@joint/core';

import { NodeFactoryService } from './node-factory.service';
import { JOINT_META } from '../utils/joint-metadata';
import {
  DepartmentConfig,
  createDefaultDepartmentConfig
} from '../models/department-config.model';
import { NodeBusinessConfig } from '../models/node-business-config.model';

@Injectable({
  providedIn: 'root'
})
export class LaneManagerService {
  private readonly laneHeight = 220;
  private readonly laneInitialWidth = 340;
  private readonly laneStartX = 0;

  constructor(private readonly nodeFactory: NodeFactoryService) {}

  addLane(
    graph: joint.dia.Graph,
    name: string,
    index?: number
  ): joint.dia.Element {
    const lanes = this.getLanes(graph);
    const laneIndex = index ?? lanes.length;
    const y = laneIndex * this.laneHeight;

    const lane = this.nodeFactory.createLane(
      name,
      this.laneStartX,
      y,
      this.laneInitialWidth,
      this.laneHeight
    );

    lane.set(
      JOINT_META.DEPARTMENT_CONFIG,
      createDefaultDepartmentConfig(name)
    );

    lane.addTo(graph);
    this.reflowLanes(graph);

    return lane;
  }

  getLanes(graph: joint.dia.Graph): joint.dia.Element[] {
    return graph
      .getElements()
      .filter(cell => cell.get(JOINT_META.IS_LANE) === true);
  }

  getLaneAtPoint(
    graph: joint.dia.Graph,
    x: number,
    y: number
  ): joint.dia.Element | null {
    const models = graph.findModelsFromPoint({ x, y });

    return (
      models.find(model => model.get(JOINT_META.IS_LANE) === true) ?? null
    );
  }

  embedNodeInLane(
    node: joint.dia.Element,
    lane: joint.dia.Element
  ): void {
    lane.embed(node);
    node.set(JOINT_META.LANE_ID, lane.id);

    if (node.get(JOINT_META.NODE_TYPE) !== 'action') {
      return;
    }

    const departmentConfig = this.getDepartmentConfigFromLane(lane);

    const businessConfig = node.get(
      JOINT_META.BUSINESS_CONFIG
    ) as NodeBusinessConfig | undefined;

    if (!businessConfig) {
      return;
    }

    node.set(JOINT_META.BUSINESS_CONFIG, {
      ...businessConfig,
      assignment: {
        ...businessConfig.assignment,
        targetType: businessConfig.assignment?.targetType ?? 'DEPARTMENT',
        departmentId: departmentConfig.departmentId,
        departmentName: departmentConfig.name,
        roleId:
          businessConfig.assignment?.roleId ??
          departmentConfig.defaultRoleId
      }
    });
  }

  reflowLanes(graph: joint.dia.Graph): void {
    const lanes = this.getLanes(graph);

    lanes
      .sort((a, b) => a.position().y - b.position().y)
      .forEach((lane, index) => {
        const currentSize = lane.size();

        lane.position(this.laneStartX, index * this.laneHeight);
        lane.resize(currentSize.width, this.laneHeight);
      });
  }

  getCanvasHeight(graph: joint.dia.Graph): number {
    return Math.max(
      this.getLanes(graph).length * this.laneHeight,
      1000
    );
  }

  getCanvasWidth(graph: joint.dia.Graph): number {
    const lanes = this.getLanes(graph);

    const maxLaneWidth = lanes.length
      ? Math.max(...lanes.map(lane => lane.size().width))
      : this.laneInitialWidth;

    return maxLaneWidth + 400;
  }

  private getDepartmentConfigFromLane(
    lane: joint.dia.Element
  ): DepartmentConfig {
    const existing = lane.get(
      JOINT_META.DEPARTMENT_CONFIG
    ) as DepartmentConfig | undefined;

    if (existing?.departmentId && existing?.name) {
      return existing;
    }

    const fallbackName =
      lane.attr('label/text') ??
      lane.attr('text/text') ??
      'Departamento';

    const departmentConfig = createDefaultDepartmentConfig(fallbackName);

    lane.set(JOINT_META.DEPARTMENT_CONFIG, departmentConfig);

    return departmentConfig;
  }
}