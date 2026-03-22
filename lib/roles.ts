export type RoleId = 'admin' | 'primary_executive' | 'secondary_executive' | 'customer';

const ROLE_ALIAS_MAP: Record<string, RoleId> = {
  admin: 'admin',
  primaryexecutive: 'primary_executive',
  primary_executive: 'primary_executive',
  secondaryexecutive: 'secondary_executive',
  secondary_executive: 'secondary_executive',
  salesman: 'secondary_executive',
  customer: 'customer',
};

const ROLE_TO_DB_VALUE: Record<RoleId, 'Admin' | 'PrimaryExecutive' | 'SecondaryExecutive' | 'Customer'> = {
  admin: 'Admin',
  primary_executive: 'PrimaryExecutive',
  secondary_executive: 'SecondaryExecutive',
  customer: 'Customer',
};

export function normalizeRoleId(role?: string | null): RoleId | null {
  if (!role) return null;
  const normalized = role.replace(/\s+/g, '').toLowerCase();
  return ROLE_ALIAS_MAP[normalized] || null;
}

export function roleIdToDbRole(roleId: RoleId): 'Admin' | 'PrimaryExecutive' | 'SecondaryExecutive' | 'Customer' {
  return ROLE_TO_DB_VALUE[roleId];
}

export function dbRoleToRoleId(dbRole?: string | null): RoleId | null {
  return normalizeRoleId(dbRole);
}

export function isRoleAllowed(userRole: string, allowedRoles: string[]): boolean {
  const userRoleId = normalizeRoleId(userRole);
  if (!userRoleId) return false;

  return allowedRoles.some((allowedRole) => normalizeRoleId(allowedRole) === userRoleId);
}