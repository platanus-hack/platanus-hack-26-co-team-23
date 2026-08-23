import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// /admin was missing: it is the route that triggers the ingest and the multichannel
// dispatch, so it is the one that least belongs outside the matcher. The admin *role* is
// still checked in the page itself, which redirects a plain member to /feed — friendlier
// than the 404 that auth.protect() returns.
const isProtectedRoute = createRouteMatcher([
  "/settings(.*)",
  "/feed(.*)",
  "/keys(.*)",
  "/admin(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    "/__clerk/:path*",
  ],
};
