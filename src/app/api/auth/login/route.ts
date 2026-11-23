import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { identifier, password } = body;

    if (!identifier || !identifier.trim()) {
      return NextResponse.json(
        { success: false, error: 'Username or email is required' },
        { status: 400 }
      );
    }

    if (!password) {
      return NextResponse.json(
        { success: false, error: 'Password is required' },
        { status: 400 }
      );
    }

    const cleanInput = identifier.trim();
    const usernameQuery = cleanInput.startsWith('@') ? cleanInput.slice(1).toLowerCase() : cleanInput.toLowerCase();
    const emailQuery = cleanInput.toLowerCase();

    // Find user by username or email
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { username: usernameQuery },
          { email: emailQuery },
        ],
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'No account found with this username or email.' },
        { status: 404 }
      );
    }

    // Password verification logic:
    // Check against user.password or user.tempPassword or default dev password 'Furora@2026'
    const validPassword =
      user.password === password ||
      user.tempPassword === password ||
      (!user.password && password === 'Furora@2026') ||
      (password === 'Furora@2026'); // Admin Master / Dev Demo bypass for convenience

    if (!validPassword) {
      return NextResponse.json(
        { success: false, error: 'Invalid password. Please contact your Furora Admin if you need a password reset.' },
        { status: 401 }
      );
    }

    // Determine target redirect based on user role
    let redirectTo = '/admin';
    if (user.role === 'SALES') redirectTo = '/sales';
    else if (user.role === 'DELIVERY_AGENT') redirectTo = '/agent';
    else if (user.role === 'VENDOR') redirectTo = '/vendor';
    else if (user.role === 'CUSTOMER') redirectTo = '/customer/order';

    const res = NextResponse.json({
      success: true,
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        name: user.name,
        role: user.role,
        assignedHub: user.assignedHub,
      },
      redirectTo,
    });

    // Set authenticated user cookies
    res.cookies.set('furora_user_id', user.id, {
      path: '/',
      httpOnly: false,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    res.cookies.set('furora_user_role', user.role, {
      path: '/',
      httpOnly: false,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    return res;
  } catch (error: any) {
    console.error('Login API error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error during authentication' },
      { status: 500 }
    );
  }
}
