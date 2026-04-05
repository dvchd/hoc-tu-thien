/**
 * POST /api/admin/charity-accounts/[id]/verify
 *   Khởi tạo probe payment 1,000 VND → trả về thông tin QR để admin chuyển khoản
 *
 * PATCH /api/admin/charity-accounts/[id]/verify
 *   Xác nhận admin đã chuyển → poll TN App → cập nhật verificationStatus
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { createUseCases } from "@/lib/container";
import { UserRole } from "@/domain/value-objects/UserRole";

// POST → Khởi tạo xác thực (tạo probe payment + trả về QR)
export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== UserRole.ADMIN) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { initiateCharityAccountVerification } = createUseCases();
    const info = await initiateCharityAccountVerification.execute({
      accountId: params.id,
      adminId: session.user.id,
    });

    return NextResponse.json({ success: true, verification: info }, { status: 200 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Lỗi hệ thống";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

// PATCH → Xác nhận đã chuyển khoản → poll TN App
export async function PATCH(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== UserRole.ADMIN) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { confirmCharityAccountVerification } = createUseCases();
    const result = await confirmCharityAccountVerification.execute({
      accountId: params.id,
      adminId: session.user.id,
    });

    const statusCode = result.success ? 200 : 202; // 202 Accepted = "giao dịch chưa tìm thấy, thử lại sau"
    return NextResponse.json(result, { status: statusCode });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Lỗi hệ thống";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
