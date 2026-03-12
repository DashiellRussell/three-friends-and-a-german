import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/login(.*)",
  "/api/waitlist(.*)",
]);

const isAppRoute = createRouteMatcher([
  "/app(.*)",
  "/onboarding(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  if (isPublicRoute(req)) return;

  // All non-public routes require auth
  const session = await auth.protect({
    unauthenticatedUrl: new URL("/login", req.url).toString(),
  });

  // App routes require closed_beta metadata
  if (isAppRoute(req)) {
    const metadata = session.sessionClaims?.publicMetadata as Record<string, unknown> | undefined;
    if (!metadata?.closed_beta) {
      return NextResponse.redirect(new URL("/?access=waitlist", req.url));
    }
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
