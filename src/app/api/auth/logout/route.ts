// POST /api/auth/logout
import { NextResponse } from 'next/server';
import { destroySession } from '@/lib/server-auth';

export async function POST() {
  try {
    await destroySession();
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: 'Error' }, { status: 500 });
  }
}
