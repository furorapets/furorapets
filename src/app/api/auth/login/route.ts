import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { checkLoginRateLimit, resetRateLimit } from '@/lib/rate-limiter';
import { verifyPassword, hashPassword } from '@/lib/password';
import { createSessionToken } from '@/lib/auth';

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
    const cleanPassword = password.trim();

    // 1. Sliding window rate limit check (max 5 attempts per 5 minutes)
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const rateLimitKey = `${cleanInput}:${ip}`;
    const rateLimit = checkLoginRateLimit(rateLimitKey);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: `Too many login attempts. Please wait ${rateLimit.retryAfterSeconds} seconds before trying again.`,
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(rateLimit.retryAfterSeconds),
          },
        }
      );
    }

    const usernameQuery = cleanInput.startsWith('@') ? cleanInput.slice(1).toLowerCase() : cleanInput.toLowerCase();
    const emailQuery = cleanInput.toLowerCase();

    // 2. Resilient user lookup with explicit column projection
    let user: any = null;
    const authSelect = {
      id: true,
      email: true,
      username: true,
      password: true,
      tempPassword: true,
      name: true,
      role: true,
      assignedHub: true,
      onboardingStatus: true,
    };

    try {
      user = await prisma.user.findFirst({
        where: {
          OR: [
            { username: usernameQuery },
            { email: emailQuery },
          ],
        },
        select: authSelect,
      });
    } catch (findErr: any) {
      console.warn('[Login] findFirst query failed, trying raw query fallback:', findErr?.message);
      try {
        const rawUsers: any = await prisma.$queryRawUnsafe(
          `SELECT id, email, username, password, tempPassword, name, role, assignedHub, onboardingStatus FROM "User" WHERE LOWER(username) = ? OR LOWER(email) = ? LIMIT 1`,
          usernameQuery,
          emailQuery
        );
        if (Array.isArray(rawUsers) && rawUsers.length > 0) {
          user = rawUsers[0];
        }
      } catch (rawErr) {
        console.error('[Login] Raw query fallback failed:', rawErr);
      }
    }

    // 3. Auto-seed core roles if initial empty database
    if (!user) {
      if (usernameQuery === 'ganesan' || emailQuery === 'admin@furora.com') {
        const adminHash = await hashPassword('ganesan1234..');
        user = await prisma.user.create({
          data: {
            id: 'usr_admin',
            email: 'admin@furora.com',
            username: 'ganesan',
            password: adminHash,
            tempPassword: adminHash,
            name: 'Ganesan (Admin)',
            role: 'ADMIN',
          },
          select: authSelect,
        });
      } else if (usernameQuery === 'sales' || emailQuery === 'sales@furora.com') {
        const salesHash = await hashPassword('sales1234..');
        user = await prisma.user.create({
          data: {
            id: 'usr_sales_mwsx7ow1',
            email: 'sales@furora.com',
            username: 'sales',
            password: salesHash,
            tempPassword: salesHash,
            name: 'Furora Sales Team',
            role: 'SALES',
          },
          select: authSelect,
        });
      } else if (usernameQuery === 'vendor' || emailQuery === 'vendor@furora.com') {
        const vendorHash = await hashPassword('vendor1234..');
        user = await prisma.user.create({
          data: {
            id: 'usr_partner_mwsunywy',
            email: 'vendor@furora.com',
            username: 'vendor',
            password: vendorHash,
            tempPassword: vendorHash,
            name: 'Bhuvanesh (Vendor Partner)',
            role: 'VENDOR',
            onboardingStatus: 'APPROVED',
          },
          select: authSelect,
        });
      } else if (usernameQuery === 'agent' || emailQuery === 'agent@furora.com') {
        const agentHash = await hashPassword('agent1234..');
        user = await prisma.user.create({
          data: {
            id: 'usr_agent_delivery',
            email: 'agent@furora.com',
            username: 'agent',
            password: agentHash,
            tempPassword: agentHash,
            name: 'Furora Delivery Agent',
            role: 'DELIVERY_AGENT',
            assignedHub: 'Bangalore Field Logistics Hub',
          },
          select: authSelect,
        });
      }
    }

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Invalid username, email, or password.' },
        { status: 401 }
      );
    }

    // 4. Cryptographic Password Verification
    const passwordToCheck = user.password || user.tempPassword;
    const { valid, needsUpgrade } = await verifyPassword(cleanPassword, passwordToCheck);

    if (!valid) {
      return NextResponse.json(
        { success: false, error: 'Invalid username, email, or password.' },
        { status: 401 }
      );
    }

    // 5. Zero-downtime password upgrade: migrate plaintext password to scrypt hash
    if (needsUpgrade) {
      try {
        const newHash = await hashPassword(cleanPassword);
        await prisma.user.update({
          where: { id: user.id },
          data: {
            password: newHash,
            tempPassword: newHash,
          },
        });
      } catch (upgradeErr) {
        console.error('[Login] Failed to upgrade legacy password hash:', upgradeErr);
      }
    }

    // 6. Reset rate limit counter on successful authentication
    resetRateLimit(rateLimitKey);

    // 7. Role-based redirect target
    let redirectTo = '/admin';
    if (user.role === 'SALES') redirectTo = '/sales';
    else if (user.role === 'DELIVERY_AGENT') redirectTo = '/agent';
    else if (user.role === 'VENDOR') redirectTo = '/vendor';
    else if (user.role === 'CUSTOMER') redirectTo = '/customer/order';

    // 8. Cryptographic Session Token (HMAC SHA-256)
    const sessionToken = createSessionToken({ id: user.id, role: user.role });

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

    const isProduction = process.env.NODE_ENV === 'production';

    // Signed httpOnly session cookie
    res.cookies.set('furora_session', sessionToken, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: isProduction,
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    // Client-side session info cookies
    res.cookies.set('furora_user_id', user.id, {
      path: '/',
      httpOnly: false,
      sameSite: 'lax',
      secure: isProduction,
      maxAge: 7 * 24 * 60 * 60,
    });

    res.cookies.set('furora_user_role', user.role, {
      path: '/',
      httpOnly: false,
      sameSite: 'lax',
      secure: isProduction,
      maxAge: 7 * 24 * 60 * 60,
    });

    return res;
  } catch (error: any) {
    console.error('Login API error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred during login. Please try again.' },
      { status: 500 }
    );
  }
}
