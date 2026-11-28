import { describe, it, expect, beforeAll } from 'vitest';
import crypto from 'crypto';
import prisma from '../src/lib/prisma';
import { GET, POST } from '../src/app/api/webhooks/woocommerce/route';
import { NextRequest } from 'next/server';

describe('WooCommerce Real-Time Ingestion Webhook', () => {
  const testSecret = 'furora_test_webhook_secret_2026';

  beforeAll(() => {
    process.env.WOOCOMMERCE_WEBHOOK_SECRET = testSecret;
  });

  function createSignedRequest(bodyObj: any, topic = 'order.created', invalidSig = false) {
    const rawBody = JSON.stringify(bodyObj);
    const signature = crypto
      .createHmac('sha256', invalidSig ? 'wrong_secret' : testSecret)
      .update(rawBody)
      .digest('base64');

    return new NextRequest('http://localhost:3000/api/webhooks/woocommerce', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-wc-webhook-topic': topic,
        'x-wc-webhook-signature': signature,
      },
      body: rawBody,
    });
  }

  it('GET returns service status ACTIVE', async () => {
    const res = await GET();
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.status).toBe('ACTIVE');
    expect(data.service).toContain('WooCommerce');
  });

  it('rejects requests with an invalid HMAC signature when secret is configured', async () => {
    const req = createSignedRequest({ id: 99999, number: '99999' }, 'order.created', true);
    const res = await POST(req);
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toBe('Invalid webhook signature');
  });

  it('handles WooCommerce webhook ping verification', async () => {
    const rawBody = JSON.stringify({ webhook_id: 42 });
    const signature = crypto
      .createHmac('sha256', testSecret)
      .update(rawBody)
      .digest('base64');

    const req = new NextRequest('http://localhost:3000/api/webhooks/woocommerce', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-wc-webhook-topic': 'action.woocommerce_webhook_ping',
        'x-wc-webhook-signature': signature,
      },
      body: rawBody,
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
  });

  it('successfully ingests a WooCommerce order and creates a Furora dispatch order', async () => {
    const testWooNumber = `TEST-${Date.now()}`;
    const wooOrderPayload = {
      id: Math.floor(Math.random() * 100000),
      number: testWooNumber,
      status: 'processing',
      currency: 'INR',
      total: '35000.00',
      payment_method: 'razorpay',
      payment_method_title: 'Razorpay UPI & Netbanking',
      transaction_id: 'pay_RZP_TEST_99182',
      billing: {
        first_name: 'Aditi',
        last_name: 'Verma',
        company: '',
        address_1: 'Plot 45, Jubilee Hills',
        address_2: 'Road No. 36',
        city: 'Hyderabad',
        state: 'Telangana',
        postcode: '500033',
        country: 'India',
        email: `aditi_${Date.now()}@example.com`,
        phone: '+919876543299',
      },
      shipping: {
        first_name: 'Aditi',
        last_name: 'Verma',
        address_1: 'Plot 45, Jubilee Hills',
        city: 'Hyderabad',
        state: 'Telangana',
        postcode: '500033',
        country: 'India',
      },
      line_items: [
        {
          id: 101,
          name: 'Golden Retriever Champion Puppy',
          product_id: 402,
          quantity: 1,
          total: '35000.00',
        },
      ],
    };

    const req = createSignedRequest(wooOrderPayload);
    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.action).toBe('CREATED');
    expect(data.orderId).toMatch(/^FUR-ORD-\d{6}$/);
    expect(data.matchedBreed).toBe('Golden Retriever');

    // Verify in database
    const savedOrder = await prisma.order.findUnique({
      where: { orderId: data.orderId },
      include: { customer: true, breed: true, category: true },
    });

    expect(savedOrder).not.toBeNull();
    expect(savedOrder?.orderSource).toBe('WOOCOMMERCE');
    expect(savedOrder?.customerName).toBe('Aditi Verma');
    expect(savedOrder?.customerContact).toBe('+919876543299');
    expect(savedOrder?.deliveryAddress).toContain('Hyderabad');
    expect(savedOrder?.paymentStatus).toBe('PAID');
    expect(savedOrder?.paymentMode).toBe('FULL_PREPAID');
    expect(savedOrder?.advancePaid).toBe(35000);
    expect(savedOrder?.status).toBe('ORDER_RECEIVED');
    expect(savedOrder?.breed.name).toBe('Golden Retriever');

    // Test Idempotency: Reposting the same webhook updates rather than creates duplicate
    wooOrderPayload.status = 'completed';
    const reqDuplicate = createSignedRequest(wooOrderPayload);
    const resDuplicate = await POST(reqDuplicate);
    expect(resDuplicate.status).toBe(200);
    const dupData = await resDuplicate.json();
    expect(dupData.success).toBe(true);
    expect(dupData.action).toBe('UPDATED');
    expect(dupData.orderId).toBe(data.orderId);

    // Clean up test order & customer
    await prisma.auditLog.deleteMany({ where: { orderId: savedOrder!.id } });
    await prisma.order.delete({ where: { id: savedOrder!.id } });
    await prisma.user.delete({ where: { id: savedOrder!.customerId } });
  });
});
