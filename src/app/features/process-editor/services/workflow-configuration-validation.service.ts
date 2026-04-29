import { Injectable } from '@angular/core';
import * as joint from '@joint/core';
import { JOINT_META } from '../utils/joint-metadata';
import { DiagramValidationIssue } from '../models/diagram-validation-issue.model';
import { NodeBusinessConfig } from '../models/node-business-config.model';
import { DepartmentConfig } from '../models/department-config.model';

@Injectable({
  providedIn: 'root'
})
export class WorkflowConfigurationValidationService {
  validate(graph: joint.dia.Graph): DiagramValidationIssue[] {
    const issues: DiagramValidationIssue[] = [];

    issues.push(...this.validateDepartments(graph));
    issues.push(...this.validateActivities(graph));
    issues.push(...this.validateDecisions(graph));

    return issues;
  }

  private validateDepartments(graph: joint.dia.Graph): DiagramValidationIssue[] {
    const issues: DiagramValidationIssue[] = [];

    const lanes = graph.getElements().filter(
      element => element.get(JOINT_META.IS_LANE) === true
    );

    if (lanes.length === 0) {
      issues.push({
        id: crypto.randomUUID(),
        severity: 'error',
        code: 'NO_DEPARTMENTS',
        message: 'El proceso debe tener al menos un departamento o calle.'
      });
    }

    for (const lane of lanes) {
      const departmentConfig = lane.get(
        JOINT_META.DEPARTMENT_CONFIG
      ) as DepartmentConfig | undefined;

      const label = this.getElementLabel(lane);

      if (!departmentConfig) {
        issues.push({
          id: crypto.randomUUID(),
          severity: 'error',
          code: 'LANE_WITHOUT_DEPARTMENT_CONFIG',
          message: `La calle "${label}" no tiene configuración de departamento.`,
          cellId: String(lane.id),
          nodeLabel: label
        });

        continue;
      }

      if (!departmentConfig.departmentId) {
        issues.push({
          id: crypto.randomUUID(),
          severity: 'error',
          code: 'DEPARTMENT_WITHOUT_ID',
          message: `El departamento "${label}" no tiene identificador interno.`,
          cellId: String(lane.id),
          nodeLabel: label
        });
      }

      if (!departmentConfig.name?.trim()) {
        issues.push({
          id: crypto.randomUUID(),
          severity: 'error',
          code: 'DEPARTMENT_WITHOUT_NAME',
          message: 'Existe una calle sin nombre de departamento.',
          cellId: String(lane.id),
          nodeLabel: label
        });
      }
    }

    return issues;
  }

  private validateActivities(graph: joint.dia.Graph): DiagramValidationIssue[] {
    const issues: DiagramValidationIssue[] = [];

    const activities = graph.getElements().filter(
      element => element.get(JOINT_META.NODE_TYPE) === 'action'
    );

    for (const activity of activities) {
      const label = this.getElementLabel(activity);

      const businessConfig = activity.get(
        JOINT_META.BUSINESS_CONFIG
      ) as NodeBusinessConfig | undefined;

      if (!businessConfig) {
        issues.push({
          id: crypto.randomUUID(),
          severity: 'error',
          code: 'ACTIVITY_WITHOUT_BUSINESS_CONFIG',
          message: `La actividad "${label}" no tiene configuración de negocio.`,
          cellId: String(activity.id),
          nodeLabel: label
        });

        continue;
      }

      const laneId = activity.get(JOINT_META.LANE_ID);

      if (!laneId) {
        issues.push({
          id: crypto.randomUUID(),
          severity: 'error',
          code: 'ACTIVITY_WITHOUT_DEPARTMENT',
          message: `La actividad "${label}" no está asignada a ningún departamento.`,
          cellId: String(activity.id),
          nodeLabel: label
        });
      }

      if (!businessConfig.assignment) {
        issues.push({
          id: crypto.randomUUID(),
          severity: 'error',
          code: 'ACTIVITY_WITHOUT_ASSIGNMENT',
          message: `La actividad "${label}" no tiene responsable configurado.`,
          cellId: String(activity.id),
          nodeLabel: label
        });
      } else {
        this.validateActivityAssignment(
          activity,
          label,
          businessConfig,
          issues
        );
      }

      this.validateActivityForm(activity, label, businessConfig, issues);
      this.validateActivitySla(activity, label, businessConfig, issues);
      this.validateActivityActions(activity, label, businessConfig, issues);
    }

    return issues;
  }

  private validateActivityAssignment(
    activity: joint.dia.Element,
    label: string,
    businessConfig: NodeBusinessConfig,
    issues: DiagramValidationIssue[]
  ): void {
    const assignment = businessConfig.assignment;

    if (!assignment.targetType) {
      issues.push({
        id: crypto.randomUUID(),
        severity: 'error',
        code: 'ASSIGNMENT_WITHOUT_TARGET_TYPE',
        message: `La actividad "${label}" no tiene tipo de responsable.`,
        cellId: String(activity.id),
        nodeLabel: label
      });
    }

    if (
      assignment.targetType === 'DEPARTMENT' &&
      !assignment.departmentId
    ) {
      issues.push({
        id: crypto.randomUUID(),
        severity: 'error',
        code: 'ASSIGNMENT_WITHOUT_DEPARTMENT',
        message: `La actividad "${label}" está asignada por departamento, pero no tiene departmentId.`,
        cellId: String(activity.id),
        nodeLabel: label
      });
    }

    if (
      assignment.targetType === 'ROLE' &&
      !assignment.roleId
    ) {
      issues.push({
        id: crypto.randomUUID(),
        severity: 'warning',
        code: 'ASSIGNMENT_WITHOUT_ROLE',
        message: `La actividad "${label}" está asignada por rol, pero todavía no tiene roleId configurado.`,
        cellId: String(activity.id),
        nodeLabel: label
      });
    }

    if (
      assignment.targetType === 'USER' &&
      !assignment.userId
    ) {
      issues.push({
        id: crypto.randomUUID(),
        severity: 'warning',
        code: 'ASSIGNMENT_WITHOUT_USER',
        message: `La actividad "${label}" está asignada a usuario específico, pero todavía no tiene userId.`,
        cellId: String(activity.id),
        nodeLabel: label
      });
    }
  }

  private validateActivityForm(
    activity: joint.dia.Element,
    label: string,
    businessConfig: NodeBusinessConfig,
    issues: DiagramValidationIssue[]
  ): void {
    if (
      businessConfig.form.required &&
      !businessConfig.form.formId
    ) {
      issues.push({
        id: crypto.randomUUID(),
        severity: 'warning',
        code: 'REQUIRED_FORM_NOT_CREATED',
        message: `La actividad "${label}" requiere formulario, pero todavía no tiene un formulario asociado.`,
        cellId: String(activity.id),
        nodeLabel: label
      });
    }

    if (
      businessConfig.rules.requiresForm &&
      !businessConfig.form.required
    ) {
      issues.push({
        id: crypto.randomUUID(),
        severity: 'warning',
        code: 'FORM_RULE_INCONSISTENCY',
        message: `La actividad "${label}" tiene regla de formulario requerido, pero el formulario no está marcado como requerido.`,
        cellId: String(activity.id),
        nodeLabel: label
      });
    }
  }

  private validateActivitySla(
    activity: joint.dia.Element,
    label: string,
    businessConfig: NodeBusinessConfig,
    issues: DiagramValidationIssue[]
  ): void {
    if (
      businessConfig.sla.enabled &&
      (!businessConfig.sla.durationHours || businessConfig.sla.durationHours <= 0)
    ) {
      issues.push({
        id: crypto.randomUUID(),
        severity: 'error',
        code: 'INVALID_SLA_DURATION',
        message: `La actividad "${label}" tiene SLA activo, pero su duración no es válida.`,
        cellId: String(activity.id),
        nodeLabel: label
      });
    }
  }

  private validateActivityActions(
    activity: joint.dia.Element,
    label: string,
    businessConfig: NodeBusinessConfig,
    issues: DiagramValidationIssue[]
  ): void {
    const actions = businessConfig.actions;

    const hasAtLeastOneAction =
      actions.canComplete ||
      actions.canApprove ||
      actions.canReject ||
      actions.canReturn;

    if (!hasAtLeastOneAction) {
      issues.push({
        id: crypto.randomUUID(),
        severity: 'error',
        code: 'ACTIVITY_WITHOUT_ACTIONS',
        message: `La actividad "${label}" no tiene ninguna acción permitida.`,
        cellId: String(activity.id),
        nodeLabel: label
      });
    }

    if (
      actions.canReject &&
      !businessConfig.rules.requiresObservationOnReject
    ) {
      issues.push({
        id: crypto.randomUUID(),
        severity: 'warning',
        code: 'REJECT_WITHOUT_OBSERVATION_RULE',
        message: `La actividad "${label}" permite rechazar, pero no exige observación al rechazar.`,
        cellId: String(activity.id),
        nodeLabel: label
      });
    }
  }

  private validateDecisions(graph: joint.dia.Graph): DiagramValidationIssue[] {
    const issues: DiagramValidationIssue[] = [];

    const decisions = graph.getElements().filter(
      element => element.get(JOINT_META.NODE_TYPE) === 'decision'
    );

    for (const decision of decisions) {
      const label = this.getElementLabel(decision);
      const outgoingLinks = this.getOutgoingLinks(graph, decision);

      if (outgoingLinks.length < 2) {
        issues.push({
          id: crypto.randomUUID(),
          severity: 'error',
          code: 'DECISION_WITHOUT_MULTIPLE_OUTPUTS',
          message: `La decisión "${label}" debe tener al menos dos salidas.`,
          cellId: String(decision.id),
          nodeLabel: label
        });
      }

      const linksWithoutLabel = outgoingLinks.filter(link => {
        const text = link.label(0)?.attrs?.['labelText']?.text;
        return !text || !String(text).trim();
      });

      if (linksWithoutLabel.length > 0) {
        issues.push({
          id: crypto.randomUUID(),
          severity: 'warning',
          code: 'DECISION_OUTPUT_WITHOUT_LABEL',
          message: `La decisión "${label}" tiene salidas sin etiqueta. Usa etiquetas como "Sí", "No", "Aprobado" o "Rechazado".`,
          cellId: String(decision.id),
          nodeLabel: label
        });
      }
    }

    return issues;
  }

  private getOutgoingLinks(
    graph: joint.dia.Graph,
    element: joint.dia.Element
  ): joint.dia.Link[] {
    return graph.getLinks().filter(link => {
      const source = link.get('source');
      return source?.id === element.id;
    });
  }

  private getElementLabel(element: joint.dia.Element): string {
    return (
      element.attr('label/text') ??
      element.attr('text/text') ??
      'Sin nombre'
    );
  }
}