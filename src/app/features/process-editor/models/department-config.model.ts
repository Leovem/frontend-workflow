export interface DepartmentConfig {
  departmentId: string;
  name: string;
  description: string;

  defaultRoleId?: string;
  supervisorUserId?: string;

  allowTaskPool: boolean;
  allowSelfAssign: boolean;
  allowReassign: boolean;
}

export function createDefaultDepartmentConfig(name: string): DepartmentConfig {
  const normalizedName = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
    .replace(/^_+|_+$/g, '');

  return {
    departmentId: `dep_${normalizedName || crypto.randomUUID()}`,
    name,
    description: '',

    defaultRoleId: undefined,
    supervisorUserId: undefined,

    allowTaskPool: true,
    allowSelfAssign: true,
    allowReassign: true
  };
}