import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_PATTERNS = [
  /^\/$/,
  /^\/login(.*)/,
  /^\/demo(.*)/,
  /^\/ui(.*)/,
  /^\/api\/waitlist(.*)/,
];

function isPublic(pathname: string) {
  return PUBLIC_PATTERNS.some((p) => p.test(pathname));
}

export default async function middleware(req: NextRequest) {
  // If Clerk isn't configured, allow all requests through
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || !process.env.CLERK_SECRET_KEY) {
    return NextResponse.next();
  }

  // Public routes — no auth needed
  if (isPublic(req.nextUrl.pathname)) {
    return NextResponse.next();
  }

  // Dynamically import Clerk only when keys are present
  const { clerkMiddleware, createRouteMatcher } = await import("@clerk/nextjs/server");
  const { clerkClient } = await import("@clerk/nextjs/server");

  const isAppRoute = createRouteMatcher(["/app(.*)", "/onboarding(.*)"]);

  return clerkMiddleware(async (auth, request) => {
    const { userId } = await auth.protect({
      unauthenticatedUrl: new URL("/login", request.url).toString(),
    });

    if (isAppRoute(request) && userId) {
      const client = await clerkClient();
      const user = await client.users.getUser(userId);
      const metadata = user.publicMetadata as Record<string, unknown>;
      if (!metadata?.closed_beta) {
        return NextResponse.redirect(new URL("/?access=waitlist", request.url));
      }
    }
  })(req, {} as any);
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
