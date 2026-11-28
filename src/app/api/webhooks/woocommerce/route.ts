import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import prisma from '@/lib/prisma';
import { createOrder } from '@/lib/order-service';
import { logAudit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

/**
 * GET /api/webhooks/woocommerce
 * Status & Health endpoint for WooCommerce Webhook connection
 */
export async function GET() {
  return NextResponse.json({
    status: 'ACTIVE',
    service: 'Furora WooCommerce Real-Time Ingestion Webhook',
    description: 'Receives real-time order.created and order.updated events from WordPress WooCommerce.',
    endpoint: '/api/webhooks/woocommerce',
    timestamp: new Date().toISOString(),
  });
}

/**
 * POST /api/webhooks/woocommerce
 * Ingests orders in real-time when placed on WordPress WooCommerce
 */
export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('x-wc-webhook-signature');
    const topic = req.headers.get('x-wc-webhook-topic') || '';
    const secret = process.env.WOOCOMMERCE_WEBHOOK_SECRET || process.env.WC_WEBHOOK_SECRET || '';

    // 1. Signature Verification (enforced when secret is configured)
    if (secret) {
      if (!signature) {
        return NextResponse.json(
          { error: 'Missing x-wc-webhook-signature header' },
          { status: 401 }
        );
      }
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(rawBody)
        .digest('base64');

      const expectedBuffer = Buffer.from(expectedSignature, 'utf8');
      const actualBuffer = Buffer.from(signature, 'utf8');

      if (
        expectedBuffer.length !== actualBuffer.length ||
        !crypto.timingSafeEqual(expectedBuffer, actualBuffer)
      ) {
        return NextResponse.json(
          { error: 'Invalid webhook signature' },
          { status: 401 }
        );
      }
    }

    // 2. Handle WooCommerce Ping / Connection Test
    if (topic.includes('ping') || !rawBody.trim() || rawBody === '{}') {
      return NextResponse.json({
        success: true,
        message: 'WooCommerce Webhook Ping acknowledged successfully',
        timestamp: new Date().toISOString(),
      });
    }

    let payload: any;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON payload format' },
        { status: 400 }
      );
    }

    // Acknowledge ping payload if payload contains webhook_id without order id
    if (payload.webhook_id && !payload.id && !payload.number) {
      return NextResponse.json({
        success: true,
        message: 'WooCommerce Webhook verification acknowledged',
        webhookId: payload.webhook_id,
      });
    }

    const wooOrderId = payload.id;
    const wooOrderNumber = String(payload.number || payload.id || '');
    if (!wooOrderId && !wooOrderNumber) {
      return NextResponse.json(
        { error: 'Payload does not contain valid WooCommerce order details' },
        { status: 400 }
      );
    }

    const externalRef = `WOO-${wooOrderNumber}`;

    // 3. Extract Customer & Delivery Address Information
    const billing = payload.billing || {};
    const shipping = payload.shipping || {};

    const customerName =
      [billing.first_name, billing.last_name].filter(Boolean).join(' ').trim() ||
      [shipping.first_name, shipping.last_name].filter(Boolean).join(' ').trim() ||
      billing.company ||
      'WooCommerce Customer';

    const customerContact =
      billing.phone ||
      shipping.phone ||
      billing.email ||
      'Online Client';

    const customerEmail = billing.email || shipping.email || null;

    const deliveryAddress =
      [
        shipping.address_1 || billing.address_1,
        shipping.address_2 || billing.address_2,
        shipping.city || billing.city,
        shipping.state || billing.state,
        shipping.postcode || billing.postcode,
        shipping.country || billing.country || 'India',
      ]
        .filter(Boolean)
        .join(', ') || 'Online Order - Delivery Address Pending Confirmation';

    // 4. Find or Create Customer in Furora
    let customer = null;
    if (customerEmail) {
      customer = await prisma.user.findFirst({
        where: { email: customerEmail, role: 'CUSTOMER' },
      });
    }
    if (!customer && billing.phone) {
      customer = await prisma.user.findFirst({
        where: { phone: billing.phone, role: 'CUSTOMER' },
      });
    }
    if (!customer) {
      customer = await prisma.user.create({
        data: {
          name: customerName,
          email: customerEmail || `customer_wc_${wooOrderNumber}_${Date.now()}@furora.in`,
          phone: billing.phone || null,
          address: deliveryAddress,
          role: 'CUSTOMER',
        },
      });
    }

    // 5. Extract Line Items & Match Breed/Category
    const lineItems = Array.isArray(payload.line_items) ? payload.line_items : [];
    const firstItem = lineItems[0] || {};
    const productName = firstItem.name || 'Purebred Pet Package';
    const productOrPackage =
      lineItems.length > 1
        ? `${productName} (+${lineItems.length - 1} more items)`
        : productName;

    // Smart Breed & Category Resolution
    const allBreeds = await prisma.breed.findMany({
      where: { active: true },
      include: { category: true },
    });

    let matchedBreed = null;
    const searchTarget = productName.toLowerCase();

    // 5a. Direct Breed Name Match
    matchedBreed = allBreeds.find(
      (b) =>
        searchTarget.includes(b.name.toLowerCase()) ||
        b.name.toLowerCase().includes(searchTarget)
    );

    // 5b. Fallback to default dog/cat breed if not found
    if (!matchedBreed) {
      if (
        searchTarget.includes('cat') ||
        searchTarget.includes('kitten') ||
        searchTarget.includes('feline')
      ) {
        matchedBreed = allBreeds.find((b) => b.categoryId === 'cat_cats') || allBreeds[0];
      } else {
        matchedBreed =
          allBreeds.find((b) => b.id === 'brd_golden') ||
          allBreeds.find((b) => b.categoryId === 'cat_dogs') ||
          allBreeds[0];
      }
    }

    const categoryId = matchedBreed?.categoryId || 'cat_dogs';
    const breedId = matchedBreed?.id || 'brd_golden';

    // 6. Map Payment & Order Statuses
    const wcStatus = String(payload.status || 'processing').toLowerCase();
    const isPrepaid =
      ['processing', 'completed'].includes(wcStatus) &&
      !payload.payment_method?.toLowerCase().includes('cod');
    const paymentStatus = isPrepaid
      ? 'PAID'
      : wcStatus === 'failed'
      ? 'FAILED'
      : 'PENDING';
    const paymentMode = payload.payment_method?.toLowerCase().includes('cod')
      ? 'COD'
      : 'FULL_PREPAID';
    const totalAmount = parseFloat(payload.total) || 0;

    // 7. Check Idempotency (Prevent Duplicate Order Creation)
    const existingOrder = await prisma.order.findFirst({
      where: {
        OR: [
          { adCampaign: externalRef },
          { productOrPackage: { contains: externalRef } },
        ],
      },
    });

    if (existingOrder) {
      // Update existing order status if changed
      await prisma.order.update({
        where: { id: existingOrder.id },
        data: {
          paymentStatus,
          paymentMode,
          advancePaid: totalAmount,
        },
      });

      await logAudit({
        orderId: existingOrder.id,
        userId: customer.id,
        action: 'ORDER_UPDATED',
        fromState: existingOrder.status,
        toState: existingOrder.status,
        metadata: {
          source: 'WOOCOMMERCE_WEBHOOK_UPDATE',
          wooOrderId,
          wooOrderNumber,
          wcStatus,
        },
      });

      return NextResponse.json({
        success: true,
        message: `Existing Furora order ${existingOrder.orderId} updated from WooCommerce #${wooOrderNumber}`,
        orderId: existingOrder.orderId,
        action: 'UPDATED',
      });
    }

    // 8. Create New Furora Order
    const newOrder = await createOrder({
      customerId: customer.id,
      customerName,
      customerContact,
      deliveryAddress,
      categoryId,
      breedId,
      productOrPackage,
      paymentStatus,
      orderSource: 'WOOCOMMERCE',
      adCampaign: externalRef,
      advancePaid: totalAmount,
      paymentMode,
    });

    await logAudit({
      orderId: newOrder.id,
      userId: customer.id,
      action: 'ORDER_CREATED',
      fromState: null,
      toState: 'ORDER_RECEIVED',
      metadata: {
        source: 'WOOCOMMERCE_WEBHOOK_CREATE',
        wooOrderId,
        wooOrderNumber,
        transactionId: payload.transaction_id || null,
        total: totalAmount,
      },
    });

    return NextResponse.json({
      success: true,
      message: `WooCommerce order #${wooOrderNumber} successfully ingested into Furora Dispatch HQ`,
      orderId: newOrder.orderId,
      customerName,
      matchedBreed: matchedBreed?.name,
      paymentStatus,
      action: 'CREATED',
    });
  } catch (error: any) {
    console.error('[WooCommerce Webhook] Error processing event:', error);
    return NextResponse.json(
      { error: 'Internal error processing WooCommerce webhook', details: error.message },
      { status: 500 }
    );
  }
}
