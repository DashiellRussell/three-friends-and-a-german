import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/login(.*)",
  "/demo(.*)",
  "/api/waitlist(.*)",
]);

const isAppRoute = createRouteMatcher([
  "/app(.*)",
  "/onboarding(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  if (isPublicRoute(req)) return;

  // All non-public routes require auth
  const { userId } = await auth.protect({
    unauthenticatedUrl: new URL("/login", req.url).toString(),
  });

  // App routes require closed_beta metadata — fetch from Clerk API
  if (isAppRoute(req) && userId) {
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    const metadata = user.publicMetadata as Record<string, unknown>;
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
