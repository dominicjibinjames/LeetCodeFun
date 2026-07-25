import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

/** Routes that require a signed-in user (progress / secrets / push). */
const PROTECTED_API_PREFIXES = [
  "/api/problems/",
  "/api/user/",
  "/api/queue",
  "/api/activity/",
  "/api/push/",
];

function isProtectedApi(pathname: string): boolean {
  if (pathname.startsWith("/api/auth")) return false;
  if (pathname.startsWith("/api/cron")) return false;
  return PROTECTED_API_PREFIXES.some((p) => pathname.startsWith(p));
}

/** Methods that mutate progress — guests may GET some public AI only after auth+key on route itself. */
function requiresSession(pathname: string, method: string): boolean {
  if (!isProtectedApi(pathname)) return false;
  // Gemini routes still need a user (for their key); guests get 401 from the route.
  if (pathname.includes("/attempt") || pathname.includes("/reset")) return true;
  if (pathname.startsWith("/api/user/")) return true;
  if (pathname.startsWith("/api/push/")) return true;
  if (pathname === "/api/queue" || pathname.startsWith("/api/activity")) return true;
  if (
    pathname.includes("/use-cases") ||
    pathname.includes("/nudge") ||
    pathname.includes("/chat") ||
    pathname.includes("/feedback")
  ) {
    return true;
  }
  // problem reset etc.
  if (method !== "GET" && pathname.startsWith("/api/problems/")) return true;
  return false;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/art") ||
    pathname.startsWith("/lottie") ||
    pathname === "/favicon.ico" ||
    pathname === "/sw.js"
  ) {
    return NextResponse.next();
  }

  // Pages are open to guests; only certain APIs need a session.
  if (!pathname.startsWith("/api/") || !requiresSession(pathname, request.method)) {
    return NextResponse.next();
  }

  const cookieNames = request.cookies.getAll().map((c) => c.name);
  const isHttps = request.nextUrl.protocol === "https:";
  // Auth.js prefixes the session cookie with `__Secure-` on HTTPS.
  const secureCookie =
    cookieNames.some(
      (n) =>
        n === "__Secure-authjs.session-token" ||
        n.startsWith("__Secure-authjs.session-token."),
    ) || isHttps;

  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET,
    secureCookie,
  });

  if (!token?.appUserId) {
    return NextResponse.json(
      { error: "Sign in to save progress and use Gemini features.", code: "SIGN_IN_REQUIRED" },
      { status: 401 },
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
