import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const host = request.headers.get('host') || '';
  const pathname = request.nextUrl.pathname;

  const userId = request.cookies.get('furora_user_id')?.value;
  const userRole = request.cookies.get('furora_user_role')?.value;

  // 1. Root '/' path routing based on authentication & domain
  if (pathname === '/') {
    if (userId) {
      if (userRole === 'ADMIN') {
        return NextResponse.redirect(new URL('/admin', request.url));
      }
      if (userRole === 'VENDOR') {
        return NextResponse.redirect(new URL('/vendor', request.url));
      }
      if (userRole === 'SALES') {
        return NextResponse.redirect(new URL('/sales', request.url));
      }
      if (userRole === 'DELIVERY_AGENT') {
        return NextResponse.redirect(new URL('/agent', request.url));
      }
      if (userRole === 'CUSTOMER') {
        return NextResponse.redirect(new URL('/customer/order', request.url));
      }
      return NextResponse.redirect(new URL('/vendor', request.url));
    }

    // Unauthenticated root visit:
    // If on breeder domain, send to partner onboarding; otherwise send to login
    if (host.startsWith('breeder.') || host.includes('breeder')) {
      return NextResponse.redirect(new URL('/partner/onboard', request.url));
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // 2. Strict Admin Security Guard: '/admin/*'
  if (pathname.startsWith('/admin')) {
    if (!userId) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }

    // If logged in user is NOT an Admin, redirect to their role home
    if (userRole && userRole !== 'ADMIN') {
      if (userRole === 'VENDOR') return NextResponse.redirect(new URL('/vendor', request.url));
      if (userRole === 'SALES') return NextResponse.redirect(new URL('/sales', request.url));
      if (userRole === 'DELIVERY_AGENT') return NextResponse.redirect(new URL('/agent', request.url));
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  // 4. Vendor Route Guard: '/vendor/*'
  if (pathname.startsWith('/vendor')) {
    if (!userId) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }

    if (userRole && userRole !== 'VENDOR' && userRole !== 'ADMIN') {
      if (userRole === 'SALES') return NextResponse.redirect(new URL('/sales', request.url));
      if (userRole === 'DELIVERY_AGENT') return NextResponse.redirect(new URL('/agent', request.url));
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  // 5. Sales Route Guard: '/sales/*'
  if (pathname.startsWith('/sales')) {
    if (!userId) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // 6. Delivery Agent Route Guard: '/agent/*'
  if (pathname.startsWith('/agent')) {
    if (!userId) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }

    if (userRole && userRole !== 'DELIVERY_AGENT' && userRole !== 'ADMIN') {
      if (userRole === 'VENDOR') return NextResponse.redirect(new URL('/vendor', request.url));
      if (userRole === 'SALES') return NextResponse.redirect(new URL('/sales', request.url));
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - api (API routes handle their own RBAC)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, images, uploads
     */
    '/((?!api|_next/static|_next/image|favicon.ico|uploads).*)',
  ],
};
