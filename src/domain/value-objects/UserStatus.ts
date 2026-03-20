// ─── UserStatus Value Object ──────────────────────────────────────────────────

export enum UserStatus {
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE",
  SUSPENDED = "SUSPENDED",
}

export const UserStatusLabels: Record<UserStatus, string> = {
  [UserStatus.ACTIVE]: "Hoạt động",
  [UserStatus.INACTIVE]: "Không hoạt động",
  [UserStatus.SUSPENDED]: "Bị tạm đình chỉ",
};

export const UserStatusColors: Record<UserStatus, string> = {
  [UserStatus.ACTIVE]: "bg-green-100 text-green-700",
  [UserStatus.INACTIVE]: "bg-gray-100 text-gray-600",
  [UserStatus.SUSPENDED]: "bg-red-100 text-red-700",
};
