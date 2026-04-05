"use client";

import { useSession } from "next-auth/react";
import { useEffect, useRef } from "react";
import { UserRole } from "@/domain/value-objects/UserRole";

/**
 * Invisible component that keeps the NextAuth JWT session in sync with the DB.
 *
 * Problem: When an admin approves a Mentor application, the user's role in the
 * DB changes from MENTEE → MENTOR. The JWT still carries the old role until it
 * expires or the 5-minute refresh interval elapses. Because the Sidebar/TopBar
 * read their role from the *server-fetched* props (which ARE fresh), the menu
 * will already look correct — but every API route that checks `session.user.role`
 * still sees the stale JWT role.
 *
 * This component receives the DB-fresh role from the server layout and, when it
 * differs from the JWT session role, calls `update()` from useSession() to
 * force NextAuth to re-read the DB and rewrite the JWT cookie.
 */
export function SessionRefresher({
  dbRole,
  dbStatus,
}: {
  dbRole: UserRole;
  dbStatus?: string | null;
}) {
  const { data: session, update } = useSession();
  const lastSyncedRole = useRef<string | null>(null);

  useEffect(() => {
    if (!session?.user) return;

    const sessionRole = session.user.role as string;
    const sessionStatus = (session.user.status as string) ?? null;

    // Only trigger once per role change to avoid infinite update loops
    if (
      (sessionRole !== dbRole || sessionStatus !== dbStatus) &&
      lastSyncedRole.current !== dbRole
    ) {
      lastSyncedRole.current = dbRole;
      update({}).catch((err: unknown) => {
        console.warn("[SessionRefresher] Failed to update session:", err);
      });
    }
  }, [session, dbRole, dbStatus, update]);

  return null;
}
