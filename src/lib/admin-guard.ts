// Helper compartido para verificar admin en API routes
import { getSession } from './server-auth';
import type { Session } from './types';

export async function requireAdminSession() {
  const session = await getSession();
  if (!session || session.type !== 'employee') return null;
  const isAdmin = session.employee.role === 'admin';
  if (!isAdmin) return null;
  // Parsear permissions si viene como string
  const perms = typeof session.employee.permissions === 'string'
    ? JSON.parse(session.employee.permissions)
    : session.employee.permissions;
  return { ...session, employee: { ...session.employee, permissions: perms } };
}
