'use client';

import { useState } from 'react';
import { useStore } from '@/lib/store';
import { motion, AnimatePresence } from 'framer-motion';
import { LogIn, LogOut, Lock, User as UserIcon, ShieldCheck, ChefHat, Bike, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const DEMO_ACCOUNTS = [
  { username: 'admin', password: 'admin123', role: 'Administrador', icon: ShieldCheck, view: 'admin' as const },
  { username: 'cocina', password: 'cocina123', role: 'Cocina', icon: ChefHat, view: 'kitchen' as const },
  { username: 'reparto', password: 'reparto123', role: 'Repartidor', icon: Bike, view: 'delivery' as const },
];

export function LoginView() {
  const loginEmployee = useStore((s) => s.loginEmployee);
  const logoutEmployee = useStore((s) => s.logoutEmployee);
  const setView = useStore((s) => s.setView);
  const currentEmployee = useStore((s) => s.currentEmployee);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  if (currentEmployee) {
    return (
      <div className="animate-screen-enter min-h-[70vh] flex flex-col items-center justify-center px-4 pb-24">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="cartoon-border bg-card rounded-3xl p-6 w-full max-w-sm text-center"
        >
          <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-primary/20 flex items-center justify-center">
            <UserIcon size={28} className="text-primary" />
          </div>
          <h2 className="font-cartoon text-lg">{currentEmployee.name}</h2>
          <p className="text-xs text-muted-foreground mb-3">
            @{currentEmployee.username} · {currentEmployee.role}
          </p>

          <div className="grid grid-cols-2 gap-2 mt-4">
            {(currentEmployee.role === 'admin' || currentEmployee.role === 'personalizado') && (
              <button
                onClick={() => setView('admin')}
                className="bg-primary text-primary-foreground px-4 py-2.5 rounded-xl text-sm font-bold"
              >
                <ShieldCheck size={14} className="inline mr-1" /> Admin
              </button>
            )}
            {(currentEmployee.role === 'cocina' || currentEmployee.role === 'admin') && (
              <button
                onClick={() => setView('kitchen')}
                className="bg-secondary text-secondary-foreground px-4 py-2.5 rounded-xl text-sm font-bold"
              >
                <ChefHat size={14} className="inline mr-1" /> Cocina
              </button>
            )}
            {(currentEmployee.role === 'repartidor' || currentEmployee.role === 'admin') && (
              <button
                onClick={() => setView('delivery')}
                className="bg-secondary text-secondary-foreground px-4 py-2.5 rounded-xl text-sm font-bold col-span-2"
              >
                <Bike size={14} className="inline mr-1" /> Reparto
              </button>
            )}
          </div>

          <button
            onClick={() => {
              logoutEmployee();
              toast.success('Sesión cerrada');
            }}
            className="mt-4 text-xs text-destructive font-bold hover:underline"
          >
            <LogOut size={12} className="inline mr-1" /> Cerrar sesión
          </button>
        </motion.div>
      </div>
    );
  }

  const handleLogin = async (u: string, p: string) => {
    if (loading) return;
    setLoading(true);
    try {
      const result = await loginEmployee(u, p);
      if (result.ok) {
        toast.success('Sesión iniciada');
        const emp = useStore.getState().currentEmployee;
        if (emp?.role === 'admin') setView('admin');
        else if (emp?.role === 'cocina') setView('kitchen');
        else if (emp?.role === 'repartidor') setView('delivery');
        else setView('home');
      } else {
        toast.error(result.error || 'Usuario o contraseña incorrectos');
      }
    } catch (e) {
      toast.error('Error al iniciar sesión. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-screen-enter min-h-[70vh] flex flex-col items-center justify-center px-4 pb-24">
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="cartoon-border bg-card rounded-3xl p-6 w-full max-w-sm"
      >
        <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-primary/20 flex items-center justify-center">
          <Lock size={24} className="text-primary" />
        </div>
        <h2 className="font-cartoon text-lg text-center mb-1">Acceso empleados</h2>
        <p className="text-xs text-muted-foreground text-center mb-4">
          Inicia sesión para acceder a tu panel de trabajo
        </p>

        <div className="space-y-2.5">
          <div>
            <label className="text-[11px] font-bold text-muted-foreground mb-1 block">Usuario</label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="usuario"
              className="bg-background border border-border rounded-xl px-3 py-2.5 w-full text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="text-[11px] font-bold text-muted-foreground mb-1 block">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleLogin(username, password); }}
              placeholder="••••••••"
              className="bg-background border border-border rounded-xl px-3 py-2.5 w-full text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <button
            onClick={() => handleLogin(username, password)}
            disabled={loading || !username.trim() || !password.trim()}
            className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-bold text-sm hover:opacity-95 animate-button-pop disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 size={14} className="animate-spin" /> Verificando...
              </>
            ) : (
              <>
                <LogIn size={14} /> Entrar
              </>
            )}
          </button>
        </div>

        <div className="mt-5 pt-4 border-t border-border">
          <p className="text-[10px] text-muted-foreground font-bold uppercase mb-2">Cuentas demo (click para entrar):</p>
          <div className="space-y-1.5">
            {DEMO_ACCOUNTS.map((a) => {
              const Icon = a.icon;
              return (
                <button
                  key={a.username}
                  disabled={loading}
                  onClick={() => {
                    setUsername(a.username);
                    setPassword(a.password);
                    handleLogin(a.username, a.password);
                  }}
                  className="w-full flex items-center gap-2 bg-secondary/60 hover:bg-secondary text-left px-3 py-2 rounded-xl text-xs disabled:opacity-50"
                >
                  <Icon size={14} className="text-primary" />
                  <span className="font-bold">{a.role}</span>
                  <span className="text-muted-foreground ml-auto">
                    {a.username} ••••
                  </span>
                  {loading && <Loader2 size={12} className="animate-spin ml-1" />}
                </button>
              );
            })}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
