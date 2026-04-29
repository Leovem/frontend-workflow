export type AssignmentTargetType = 'DEPARTMENT' | 'ROLE' | 'USER';

export type AssignmentMode = 'POOL' | 'AUTO_BALANCED' | 'SPECIFIC_USER';

export interface NodeBusinessConfig {
  description: string;

  assignment: NodeAssignmentConfig;
  form: NodeFormConfig;
  sla: NodeSlaConfig;
  actions: NodeActionConfig;
  rules: NodeRuleConfig;
}

export interface NodeAssignmentConfig {
  targetType: AssignmentTargetType;

  departmentId?: string;
  roleId?: string;
  userId?: string;

  assignmentMode: AssignmentMode;

  allowSelfAssign: boolean;
  allowReassign: boolean;
}

export interface NodeFormConfig {
  formId?: string;
  required: boolean;
}

export interface NodeSlaConfig {
  enabled: boolean;
  durationHours: number;
}

export interface NodeActionConfig {
  canComplete: boolean;
  canApprove: boolean;
  canReject: boolean;
  canReturn: boolean;
}

export interface NodeRuleConfig {
  requiresForm: boolean;
  requiresAttachment: boolean;
  requiresObservationOnReject: boolean;
}

export function createDefaultNodeBusinessConfig(): NodeBusinessConfig {
  return {
    description: '',

    assignment: {
      targetType: 'DEPARTMENT',
      departmentId: undefined,
      roleId: undefined,
      userId: undefined,
      assignmentMode: 'POOL',
      allowSelfAssign: true,
      allowReassign: true
    },

    form: {
      formId: undefined,
      required: true
    },

    sla: {
      enabled: false,
      durationHours: 24
    },

    actions: {
      canComplete: true,
      canApprove: false,
      canReject: false,
      canReturn: false
    },

    rules: {
      requiresForm: true,
      requiresAttachment: false,
      requiresObservationOnReject: true
    }
  };
}