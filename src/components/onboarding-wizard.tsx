'use client';

import { useState } from 'react';
import { useStore } from '@/lib/store';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, ChevronLeft, ChevronRight, Store, User, Phone, Clock, MapPin, Pizza } from 'lucide-react';
import { toast } from 'sonner';

const STEPS = [
  { id: 0, title: 'Datos del negocio', icon: Store },
  { id: 1, title: 'Administrador', icon: User },
  { id: 2, title: 'WhatsApp y horarios', icon: Phone },
  { id: 3, title: 'Categorías y productos', icon: Pizza },
];

export function OnboardingWizard() {
  const setView = useStore((s) => s.setView);
  const [step, setStep] = useState(0);
  const [completed, setCompleted] = useState(false);

  // Form state
  const [businessName, setBusinessName] = useState('LOS COMPAS');
  const [city, setCity] = useState('Sancti Spíritus, Cuba');
  const [phone, setPhone] = useState('+53 55000000');
  const [address, setAddress] = useState('Sancti Spíritus, Cuba');
  const [adminName, setAdminName] = useState('');
  const [adminUser, setAdminUser] = useState('');
  const [adminPass, setAdminPass] = useState('');
  const [waNumber, setWaNumber] = useState('+53 55000000');
  const [waName, setWaName] = useState('WhatsApp Principal');
  const [morningStart, setMorningStart] = useState('08:00');
  const [morningEnd, setMorningEnd] = useState('10:30');
  const [afternoonStart, setAfternoonStart] = useState('13:00');
  const [afternoonEnd, setAfternoonEnd] = useState('16:30');

  async function handleComplete() {
    // Guardar configuración en el backend
    try {
      await fetch('/api/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: businessName, city, phone, address,
          morningStart, morningEnd, afternoonStart, afternoonEnd,
        }),
      });

      // Crear admin si se proporcionó
      if (adminName && adminUser && adminPass) {
        await fetch('/api/employees', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: adminName, username: adminUser, password: adminPass,
            phone: phone, role: 'admin',
            permissions: {
              ver_pedidos: true, crear_combos: true, cambiar_estados: true,
              cambiar_precios: true, gestionar_productos: true, gestionar_empleados: true,
              gestionar_domicilio: true, ver_dashboard: true,
            },
          }),
        });
      }

      // Crear número WhatsApp si se proporcionó
      if (waNumber && waName) {
        await fetch('/api/whatsapp-numbers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ number: waNumber, name: waName, function: 'pedidos' }),
        });
      }

      // Marcar setup como completado en localStorage
      localStorage.setItem('los-compas-setup-done', 'true');
      setCompleted(true);
      toast.success('¡Configuración completada!');
      setTimeout(() => setView('home'), 1500);
    } catch (e) {
      toast.error('Error al guardar. Verifica tu conexión.');
    }
  }

  const next = () => step < 3 ? setStep(step + 1) : handleComplete();
  const prev = () => step > 0 ? setStep(step - 1) : null;

  // El wizard está deshabilitado porque el seed del build ya configura todo.
  // El admin puede cambiar todo desde el panel de administración.
  return null;

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Progress bar */}
      <div className="bg-card border-b border-border px-4 py-3">
        <div className="max-w-md mx-auto">
          <div className="flex items-center justify-between mb-2">
            <h1 className="font-cartoon text-sm">Configuración inicial</h1>
            <span className="text-xs text-muted-foreground">{step + 1}/4</span>
          </div>
          <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-primary rounded-full"
              animate={{ width: `${((step + 1) / 4) * 100}%` }}
              transition={{ type: 'spring' }}
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-md mx-auto space-y-4">
          <AnimatePresence mode="wait">
            {step === 0 && (
              <motion.div key="0" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <StepHeader icon={Store} title="Datos del negocio" subtitle="Información básica de tu pizzería" />
                <Field label="Nombre del negocio" value={businessName} onChange={setBusinessName} />
                <Field label="Ciudad" value={city} onChange={setCity} />
                <Field label="Teléfono" value={phone} onChange={setPhone} icon={Phone} />
                <Field label="Dirección" value={address} onChange={setAddress} icon={MapPin} />
              </motion.div>
            )}
            {step === 1 && (
              <motion.div key="1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <StepHeader icon={User} title="Administrador principal" subtitle="Crea tu cuenta de acceso al panel" />
                <Field label="Nombre del administrador" value={adminName} onChange={setAdminName} />
                <Field label="Usuario de acceso" value={adminUser} onChange={setAdminUser} placeholder="admin" />
                <Field label="Contraseña" value={adminPass} onChange={setAdminPass} type="password" />
                <div className="bg-primary/10 border border-primary/30 rounded-xl p-3 text-[11px] text-primary">
                  💡 Este será el usuario principal con acceso completo al panel de administración.
                  Podrás crear más empleados después.
                </div>
              </motion.div>
            )}
            {step === 2 && (
              <motion.div key="2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <StepHeader icon={Phone} title="WhatsApp y horarios" subtitle="Configura notificaciones y horarios de pedidos" />
                <Field label="Número de WhatsApp" value={waNumber} onChange={setWaNumber} icon={Phone} />
                <Field label="Nombre (ej: Pedidos)" value={waName} onChange={setWaName} />
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Mañana inicio" value={morningStart} onChange={setMorningStart} />
                  <Field label="Mañana fin" value={morningEnd} onChange={setMorningEnd} />
                  <Field label="Tarde inicio" value={afternoonStart} onChange={setAfternoonStart} />
                  <Field label="Tarde fin" value={afternoonEnd} onChange={setAfternoonEnd} />
                </div>
                <div className="bg-secondary/40 rounded-xl p-3 text-[11px] text-muted-foreground flex items-center gap-1.5">
                  <Clock size={12} /> Los pedidos solo se reciben en estos horarios.
                </div>
              </motion.div>
            )}
            {step === 3 && (
              <motion.div key="3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <StepHeader icon={Pizza} title="Categorías y productos" subtitle="Tu pizzería ya viene precargada con datos de ejemplo" />
                <div className="space-y-2">
                  <div className="bg-secondary/40 rounded-xl p-3 text-sm">
                    <p className="font-bold mb-1">✅ Ya tienes precargado:</p>
                    <ul className="text-xs text-muted-foreground space-y-0.5">
                      <li>• 27 productos (pizzas, comidas, postres, bebidas, combos)</li>
                      <li>• 8 ingredientes con precios por tamaño</li>
                      <li>• 7 tamaños de pizza (20cm a 46×36cm)</li>
                      <li>• 3 promociones activas (2x1, -15%, bebida gratis)</li>
                      <li>• 3 empleados demo (admin, cocina, reparto)</li>
                    </ul>
                  </div>
                  <div className="bg-primary/10 border border-primary/30 rounded-xl p-3 text-xs text-primary">
                    Puedes editar todo desde el panel de administración después de esta configuración.
                    Ve a la pestaña "Productos", "Tamaños", "Ingredientes" etc.
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Navigation */}
      <div className="bg-card border-t border-border px-4 py-3">
        <div className="max-w-md mx-auto flex gap-2">
          {step > 0 && (
            <button onClick={prev} className="bg-secondary px-4 py-3 rounded-xl font-bold text-sm flex items-center gap-1">
              <ChevronLeft size={16} /> Atrás
            </button>
          )}
          <button
            onClick={next}
            className="flex-1 bg-primary text-primary-foreground py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:opacity-95 animate-button-pop"
          >
            {step === 3 ? (
              <><Check size={16} /> Completar configuración</>
            ) : (
              <>Continuar <ChevronRight size={16} /></>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function StepHeader({ icon: Icon, title, subtitle }: { icon: any; title: string; subtitle: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <span className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
        <Icon size={22} className="text-primary" />
      </span>
      <div>
        <h2 className="font-cartoon text-base">{title}</h2>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = 'text', placeholder, icon: Icon }: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; placeholder?: string; icon?: any;
}) {
  return (
    <div>
      <label className="block text-[11px] font-bold text-muted-foreground mb-1">{label}</label>
      <div className="relative">
        {Icon && <Icon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />}
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="bg-card border border-border rounded-xl py-2.5 w-full text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          style={{ paddingLeft: Icon ? '2.25rem' : '0.75rem', paddingRight: '0.75rem' }}
        />
      </div>
    </div>
  );
}
