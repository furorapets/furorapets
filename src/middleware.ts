import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const host = request.headers.get('host') || '';
  const pathname = request.nextUrl.pathname;

  // Handle breeder subdomain (breeder.furora.in)
  if (host.startsWith('breeder.') || host.includes('breeder')) {
    // When visiting root path '/', route to breeder portal or onboarding
    if (pathname === '/') {
      const sessionCookie = request.cookies.get('furora_session')?.value;
      if (sessionCookie) {
        return NextResponse.redirect(new URL('/vendor/pets', request.url));
      }
      return NextResponse.redirect(new URL('/partner/onboard', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, images, uploads
     */
    '/((?!api|_next/static|_next/image|favicon.ico|uploads).*)',
  ],
};
