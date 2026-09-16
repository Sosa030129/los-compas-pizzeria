// GET /api/auth/me - devuelve la sesión actual
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/server-auth';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ ok: false, session: null });
    }

    if (session.type === 'employee') {
      const { passwordHash, ...safeEmployee } = session.employee;
      // Parsear permissions de JSON string a objeto (bug #2)
      const empWithPerms = {
        ...safeEmployee,
        permissions: typeof safeEmployee.permissions === 'string'
          ? JSON.parse(safeEmployee.permissions)
          : safeEmployee.permissions,
      };
      return NextResponse.json({
        ok: true,
        session: { type: 'employee', employee: empWithPerms },
      });
    }
    if (session.type === 'customer') {
      const { passwordHash, ...safeCustomer } = session.customer;
      return NextResponse.json({
        ok: true,
        session: { type: 'customer', customer: safeCustomer },
      });
    }
    return NextResponse.json({ ok: false, session: null });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: 'Error' }, { status: 500 });
  }
}
