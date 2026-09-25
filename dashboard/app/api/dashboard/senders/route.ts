import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { allowedSenders } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { sendMessage } from '@/lib/whatsapp/evolution';
import { normalizeBrPhone } from '@/lib/whatsapp/phone';
import { getTenantScope } from '@/lib/db/tenant';

export async function GET() {
  try {
    const { tenantId } = await getTenantScope();
    const senders = await db.select().from(allowedSenders).where(eq(allowedSenders.tenantId, tenantId)).orderBy(allowedSenders.createdAt);
    return NextResponse.json({ senders });
  } catch (error) {
    console.error('[Senders API] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch senders' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { tenantId } = await getTenantScope();
    const { phone, name } = await request.json();
    if (!phone || !name) {
      return NextResponse.json({ error: 'phone and name are required' }, { status: 400 });
    }
    const normalized = normalizeBrPhone(phone);
    if (!normalized) {
      return NextResponse.json(
        { error: 'Numero invalido. Use DDD e numero, por exemplo 47 99782 8183.' },
        { status: 400 }
      );
    }

    const [sender] = await db
      .insert(allowedSenders)
      .values({ tenantId, phone: normalized, name, verificationStatus: 'pending' })
      .onConflictDoUpdate({
        target: [allowedSenders.tenantId, allowedSenders.phone],
        set: { name, active: true, verificationStatus: 'pending', lid: null },
      })
      .returning();

    // Send verification message
    try {
      await sendMessage(
        normalized,
        `Olá ${name}! Você foi autorizado a registrar entradas de estoque no sistema Japa Gestão.\n\nResponda *VERIFICAR* para ativar seu acesso.`,
        tenantId
      );
    } catch (err) {
      console.error('[Senders API] Failed to send verification:', err);
      const naoExiste = String(err).includes('"exists":false');
      return NextResponse.json({
        sender,
        warning: naoExiste
          ? `O numero ${normalized} nao existe no WhatsApp. Confira DDD e numero.`
          : 'Numero salvo, mas a mensagem de verificacao nao saiu. Confira se o WhatsApp esta conectado na aba Conexao.',
      });
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
    const { tenantId } = await getTenantScope();
    const { id } = await request.json();
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

    const [sender] = await db.select().from(allowedSenders).where(and(eq(allowedSenders.id, Number(id)), eq(allowedSenders.tenantId, tenantId))).limit(1);
    if (!sender) return NextResponse.json({ error: 'Sender not found' }, { status: 404 });

    // Reset verification
    await db.update(allowedSenders).set({ verificationStatus: 'pending', lid: null }).where(and(eq(allowedSenders.id, sender.id), eq(allowedSenders.tenantId, tenantId)));

    try {
      await sendMessage(
        sender.phone,
        `Olá ${sender.name}! Você foi autorizado a registrar entradas de estoque no sistema Japa Gestão.\n\nResponda *VERIFICAR* para ativar seu acesso.`,
        tenantId
      );
    } catch (err) {
      console.error('[Senders API] Failed to resend verification:', err);
      const naoExiste = String(err).includes('"exists":false');
      return NextResponse.json({
        error: naoExiste
          ? `O numero ${sender.phone} nao existe no WhatsApp. Apague e cadastre de novo com DDD e codigo do pais.`
          : 'Nao foi possivel enviar a verificacao. Confira se o WhatsApp esta conectado na aba Conexao.',
      }, { status: 502 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[Senders API] Error:', error);
    return NextResponse.json({ error: 'Failed to resend verification' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { tenantId } = await getTenantScope();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });
    await db.delete(allowedSenders).where(and(eq(allowedSenders.id, Number(id)), eq(allowedSenders.tenantId, tenantId)));
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[Senders API] Error:', error);
    return NextResponse.json({ error: 'Failed to delete sender' }, { status: 500 });
  }
}
