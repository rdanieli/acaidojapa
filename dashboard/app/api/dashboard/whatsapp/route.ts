import { NextRequest, NextResponse } from 'next/server';

const BASE_URL = process.env.EVOLUTION_API_URL || 'http://localhost:8082';
const API_KEY = process.env.EVOLUTION_API_KEY || '';
const INSTANCE = process.env.EVOLUTION_INSTANCE_NAME || 'acaidojapa';

function headers() {
  return { 'Content-Type': 'application/json', apikey: API_KEY };
}

export async function GET() {
  try {
    // Fetch instance info
    const res = await fetch(`${BASE_URL}/instance/fetchInstances`, { headers: headers() });
    if (!res.ok) return NextResponse.json({ status: 'error', message: 'Evolution API unreachable' }, { status: 502 });

    const instances = await res.json();
    const instance = (instances as any[]).find((i: any) => i.name === INSTANCE);

    if (!instance) {
      return NextResponse.json({ status: 'not_found', message: 'Instance not created' });
    }

    const connected = instance.connectionStatus === 'open';
    return NextResponse.json({
      status: connected ? 'connected' : 'disconnected',
      phone: instance.ownerJid?.replace('@s.whatsapp.net', '') || null,
      profileName: instance.profileName || null,
      profilePic: instance.profilePicUrl || null,
      instanceName: instance.name,
    });
  } catch (error) {
    console.error('[WhatsApp API] Error:', error);
    return NextResponse.json({ status: 'error', message: 'Failed to check status' }, { status: 500 });
  }
}

// POST: generate QR code or disconnect
export async function POST(request: NextRequest) {
  try {
    const { action } = await request.json();

    if (action === 'connect') {
      // Try to create instance if it doesn't exist
      await fetch(`${BASE_URL}/instance/create`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({ instanceName: INSTANCE, integration: 'WHATSAPP-BAILEYS', qrcode: true }),
      });

      // Configure webhook automatically
      const webhookUrl = request.headers.get('origin') || request.headers.get('referer')?.replace(/\/[^/]*$/, '') || '';
      if (webhookUrl) {
        await fetch(`${BASE_URL}/webhook/set/${INSTANCE}`, {
          method: 'POST',
          headers: headers(),
          body: JSON.stringify({
            webhook: {
              enabled: true,
              url: `${webhookUrl}/api/webhook/whatsapp`,
              webhookByEvents: false,
              webhookBase64: true,
              events: ['MESSAGES_UPSERT'],
            },
          }),
        });
      }

      // Get QR code
      const qrRes = await fetch(`${BASE_URL}/instance/connect/${INSTANCE}`, { headers: headers() });
      if (!qrRes.ok) return NextResponse.json({ error: 'Failed to connect' }, { status: 500 });

      const data = await qrRes.json();
      if (data.base64) {
        return NextResponse.json({ qr: data.base64, count: data.count });
      }
      return NextResponse.json({ qr: null, count: data.count || 0, message: 'QR not ready yet, try again' });
    }

    if (action === 'disconnect') {
      await fetch(`${BASE_URL}/instance/logout/${INSTANCE}`, {
        method: 'DELETE',
        headers: headers(),
      });
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('[WhatsApp API] Error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
