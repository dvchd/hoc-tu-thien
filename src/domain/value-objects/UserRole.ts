// ─── UserRole Value Object ────────────────────────────────────────────────────

export enum UserRole {
  ADMIN = "ADMIN",
  MENTOR = "MENTOR",
  MENTEE = "MENTEE",
}

export const UserRoleLabels: Record<UserRole, string> = {
  [UserRole.ADMIN]: "Quản trị viên",
  [UserRole.MENTOR]: "Người hướng dẫn",
  [UserRole.MENTEE]: "Người học",
};

export const UserRoleColors: Record<UserRole, string> = {
  [UserRole.ADMIN]: "bg-red-100 text-red-700",
  [UserRole.MENTOR]: "bg-amber-100 text-amber-700",
  [UserRole.MENTEE]: "bg-emerald-100 text-emerald-700",
};

export function isValidRole(value: string): value is UserRole {
  return Object.values(UserRole).includes(value as UserRole);
}
