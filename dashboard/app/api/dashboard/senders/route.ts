import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { allowedSenders } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { sendMessage } from '@/lib/whatsapp/evolution';

export async function GET() {
  try {
    const senders = await db.select().from(allowedSenders).orderBy(allowedSenders.createdAt);
    return NextResponse.json({ senders });
  } catch (error) {
    console.error('[Senders API] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch senders' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { phone, name } = await request.json();
    if (!phone || !name) {
      return NextResponse.json({ error: 'phone and name are required' }, { status: 400 });
    }
    const normalized = phone.replace(/[\s\-+()]/g, '');

    const [sender] = await db
      .insert(allowedSenders)
      .values({ phone: normalized, name, verificationStatus: 'pending' })
      .onConflictDoUpdate({
        target: allowedSenders.phone,
        set: { name, active: true, verificationStatus: 'pending', lid: null },
      })
      .returning();

    // Send verification message
    try {
      await sendMessage(
        normalized,
        `Olá ${name}! Você foi autorizado a registrar entradas de estoque no sistema Açaí do Japa.\n\nResponda *VERIFICAR* para ativar seu acesso.`
      );
    } catch (err) {
      console.error('[Senders API] Failed to send verification:', err);
      return NextResponse.json({ sender, warning: 'Sender created but verification message failed to send' });
    }

    return NextResponse.json({ sender });
  } catch (error) {
    console.error('[Senders API] Error:', error);
    return NextResponse.json({ error: 'Failed to create sender' }, { status: 500 });
  }
}

// POST with action=resend to re-send verification
export async function PUT(request: NextRequest) {
  try {
    const { id } = await request.json();
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

    const [sender] = await db.select().from(allowedSenders).where(eq(allowedSenders.id, Number(id))).limit(1);
    if (!sender) return NextResponse.json({ error: 'Sender not found' }, { status: 404 });

    // Reset verification
    await db.update(allowedSenders).set({ verificationStatus: 'pending', lid: null }).where(eq(allowedSenders.id, sender.id));

    await sendMessage(
      sender.phone,
      `Olá ${sender.name}! Você foi autorizado a registrar entradas de estoque no sistema Açaí do Japa.\n\nResponda *VERIFICAR* para ativar seu acesso.`
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[Senders API] Error:', error);
    return NextResponse.json({ error: 'Failed to resend verification' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });
    await db.delete(allowedSenders).where(eq(allowedSenders.id, Number(id)));
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[Senders API] Error:', error);
    return NextResponse.json({ error: 'Failed to delete sender' }, { status: 500 });
  }
}
