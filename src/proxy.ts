import { NextResponse, type NextRequest } from "next/server";

const locales = ["en", "ar"];

// Every page lives under /en or /ar so URLs stay bilingual and crawlable (FR-WEB-01/07).
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (locales.some((l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`))) return;
  const accept = request.headers.get("accept-language") ?? "";
  const locale = /^ar\b/i.test(accept.trim()) ? "ar" : "en";
  request.nextUrl.pathname = `/${locale}${pathname}`;
  return NextResponse.redirect(request.nextUrl);
}

export const config = {
  matcher: ["/((?!api|_next|img|favicon.ico|manifest.webmanifest|sw.js|.*\\..*).*)"],
};
