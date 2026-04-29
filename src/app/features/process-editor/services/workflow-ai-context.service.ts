import { Injectable } from '@angular/core';
import * as joint from '@joint/core';
import { JOINT_META } from '../utils/joint-metadata';
import { NodeBusinessConfig } from '../models/node-business-config.model';
import { DepartmentConfig } from '../models/department-config.model';

export interface WorkflowAIContext {
  processName: string;
  departments: WorkflowAIContextDepartment[];
  activities: WorkflowAIContextActivity[];
  decisions: WorkflowAIContextDecision[];
  transitions: WorkflowAIContextTransition[];
}

export interface WorkflowAIContextDepartment {
  id: string;
  name: string;
  description?: string;
}

export interface WorkflowAIContextActivity {
  nodeId: string;
  label: string;
  departmentId?: string;
  departmentName?: string;
  description?: string;
  businessConfig?: NodeBusinessConfig;
}

export interface WorkflowAIContextDecision {
  nodeId: string;
  label: string;
}

export interface WorkflowAIContextTransition {
  sourceId: string;
  targetId: string;
  label?: string;
}

@Injectable({
  providedIn: 'root'
})
export class WorkflowAIContextService {
  buildContext(graph: joint.dia.Graph, processName: string): WorkflowAIContext {
    const elements = graph.getElements();
    const links = graph.getLinks();

    const lanes = elements.filter(
      element => element.get(JOINT_META.IS_LANE) === true
    );

    const departments = lanes.map(lane => {
      const departmentConfig = lane.get(
        JOINT_META.DEPARTMENT_CONFIG
      ) as DepartmentConfig | undefined;

      return {
        id: departmentConfig?.departmentId ?? String(lane.id),
        name: departmentConfig?.name ?? this.getElementLabel(lane),
        description: departmentConfig?.description ?? ''
      };
    });

    const activities = elements
      .filter(element => element.get(JOINT_META.NODE_TYPE) === 'action')
      .map(element => {
        const businessConfig = element.get(
          JOINT_META.BUSINESS_CONFIG
        ) as NodeBusinessConfig | undefined;

        const departmentId =
          businessConfig?.assignment?.departmentId ??
          this.getDepartmentIdFromParent(element, graph);

        const department = departments.find(dep => dep.id === departmentId);

        return {
          nodeId: String(element.id),
          label: this.getElementLabel(element),
          departmentId,
          departmentName: department?.name,
          description: businessConfig?.description ?? '',
          businessConfig
        };
      });

    const decisions = elements
  .filter(element => element.get(JOINT_META.NODE_TYPE) === 'decision')
  .map(element => ({
    nodeId: String(element.id),
    label: this.getElementLabel(element)
  }));

const transitions: WorkflowAIContextTransition[] = [];

for (const link of links) {
  const source = link.get('source');
  const target = link.get('target');

  if (!source?.id || !target?.id) {
    continue;
  }

  transitions.push({
    sourceId: String(source.id),
    targetId: String(target.id),
    label: String(link.label(0)?.attrs?.['labelText']?.text ?? '')
  });
}

return {
  processName,
  departments,
  activities,
  decisions,
  transitions
};
  }

  private getDepartmentIdFromParent(
    element: joint.dia.Element,
    graph: joint.dia.Graph
  ): string | undefined {
    const parentId = element.get('parent');

    if (!parentId) {
      return undefined;
    }

    const parent = graph.getCell(parentId);

    if (!parent || parent.get(JOINT_META.IS_LANE) !== true) {
      return undefined;
    }

    const departmentConfig = parent.get(
      JOINT_META.DEPARTMENT_CONFIG
    ) as DepartmentConfig | undefined;

    return departmentConfig?.departmentId ?? String(parent.id);
  }

  private getElementLabel(element: joint.dia.Element): string {
    return (
      element.attr('label/text') ??
      element.attr('text/text') ??
      'Sin nombre'
    );
  }
}