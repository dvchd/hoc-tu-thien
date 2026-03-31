import { NextRequest, NextResponse } from "next/server";

/**
 * Wraps an API route handler to return a proper JSON 405 response
 * when the request method is not in the allowed list.
 *
 * Usage:
 *   export const GET = withAllowedMethods(["GET"], async (req) => { ... });
 *   export const POST = withAllowedMethods(["POST"], async (req) => { ... });
 *
 * This ensures clients receive a consistent JSON error body instead of
 * Next.js's default HTML 405 page.
 */
export function withAllowedMethods<T extends unknown[]>(
  allowedMethods: string[],
  handler: (req: NextRequest, ...args: T) => Promise<Response>
) {
  return async (req: NextRequest, ...args: T): Promise<Response> => {
    if (!allowedMethods.includes(req.method)) {
      return NextResponse.json(
        {
          error: "Method Not Allowed",
          message: `Phương thức ${req.method} không được hỗ trợ. Vui lòng sử dụng: ${allowedMethods.join(", ")}`,
        },
        { status: 405, headers: { Allow: allowedMethods.join(", ") } }
      );
    }
    return handler(req, ...args);
  };
}

/**
 * Creates a standardized JSON error response for API routes.
 * Ensures consistent error format across all endpoints.
 */
export function errorResponse(message: string, status: number = 400) {
  return NextResponse.json(
    { error: message, message },
    { status }
  );
}
