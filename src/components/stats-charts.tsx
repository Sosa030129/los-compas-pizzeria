'use client';

import { useMemo } from 'react';
import { useStore } from '@/lib/store';
import {
  ResponsiveContainer,
  BarChart, Bar,
  LineChart, Line,
  PieChart, Pie, Cell,
  AreaChart, Area,
  XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from 'recharts';
import { formatCUP } from '@/lib/los-compas';
import type { Order } from '@/lib/types';

const STATE_COLORS: Record<string, string> = {
  recibido: '#8a7a5a',
  confirmado: '#c4a060',
  preparando: '#d49050',
  listo: '#7ab860',
  camino: '#5a9ab8',
  entregado: '#7a1f2b',
  cancelado: '#7a1f1f',
};

const STATE_LABELS: Record<string, string> = {
  recibido: 'Recibido',
  confirmado: 'Confirmado',
  preparando: 'Preparando',
  listo: 'Listo',
  camino: 'En camino',
  entregado: 'Entregado',
  cancelado: 'Cancelado',
};

function last7Days(): { label: string; ts: number }[] {
  const days: { label: string; ts: number }[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    days.push({
      label: d.toLocaleDateString('es-CU', { weekday: 'short', day: '2-digit' }),
      ts: d.getTime(),
    });
  }
  return days;
}

function startOfDay(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function StatsCharts() {
  const orders = useStore((s) => s.orders);
  const products = useStore((s) => s.products);

  // 1. Ventas por día (últimos 7 días) - solo pedidos entregados, por fecha de ENTREGA
  const salesByDay = useMemo(() => {
    const days = last7Days();
    return days.map((d) => {
      const next = d.ts + 24 * 60 * 60 * 1000;
      const dayOrders = orders.filter((o) => {
        if (o.state !== 'entregado') return false;
        // Usar deliveredAt si existe, si no caer a createdAt (pedidos viejos)
        const refDate = o.deliveredAt || o.createdAt;
        return refDate >= d.ts && refDate < next;
      });
      return {
        label: d.label,
        ventas: dayOrders.reduce((sum, o) => sum + o.total, 0),
        pedidos: dayOrders.length,
      };
    });
  }, [orders]);

  // 2. Top productos (cantidades)
  const topProducts = useMemo(() => {
    return products
      .map((p) => {
        const count = orders
          .flatMap((o) => o.items)
          .filter((i) => i.productId === p.id)
          .reduce((s, i) => s + i.qty, 0);
        return { name: p.name, emoji: p.emoji, count };
      })
      .filter((x) => x.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [orders, products]);

  // 3. Pedidos por estado (pie)
  const ordersByState = useMemo(() => {
    const states = ['recibido', 'confirmado', 'preparando', 'listo', 'camino', 'entregado', 'cancelado'];
    return states
      .map((s) => ({
        state: s,
        label: STATE_LABELS[s],
        value: orders.filter((o) => o.state === s).length,
        color: STATE_COLORS[s],
      }))
      .filter((s) => s.value > 0);
  }, [orders]);

  // 4. Horarios fuertes (mañana vs tarde)
  const timeSlotData = useMemo(() => {
    const manana = orders.filter((o) => o.timeSlot === 'manana').length;
    const tarde = orders.filter((o) => o.timeSlot === 'tarde').length;
    return [
      { label: '🌅 Mañana', value: manana, color: '#d49050' },
      { label: '🌙 Tarde', value: tarde, color: '#5a9ab8' },
    ];
  }, [orders]);

  // 5. Total de ingresos
  const totalSales = useMemo(() => {
    return orders
      .filter((o) => o.state === 'entregado')
      .reduce((sum, o) => sum + o.total, 0);
  }, [orders]);

  // 6. Ticket promedio
  const avgTicket = useMemo(() => {
    const delivered = orders.filter((o) => o.state === 'entregado');
    if (delivered.length === 0) return 0;
    return totalSales / delivered.length;
  }, [orders, totalSales]);

  // Si no hay datos, mostrar mensaje
  if (orders.length === 0) {
    return (
      <div className="cartoon-border bg-card rounded-2xl p-8 text-center">
        <div className="text-5xl mb-3">📊</div>
        <h3 className="font-cartoon text-base mb-1">Sin estadísticas aún</h3>
        <p className="text-xs text-muted-foreground">
          Cuando comiencen a llegar pedidos, aquí verás gráficos de ventas, productos más vendidos y horarios fuertes.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* KPIs superiores */}
      <div className="grid grid-cols-3 gap-2">
        <KpiCard label="Ingresos totales" value={formatCUP(totalSales)} emoji="💰" />
        <KpiCard label="Ticket promedio" value={formatCUP(avgTicket)} emoji="📈" />
        <KpiCard label="Pedidos totales" value={orders.length.toString()} emoji="📦" />
      </div>

      {/* Gráfico de ventas por día */}
      <div className="cartoon-border bg-card rounded-2xl p-4">
        <h3 className="font-cartoon text-sm mb-3 flex items-center gap-2">
          📅 Ventas últimos 7 días
        </h3>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={salesByDay} margin={{ top: 5, right: 5, bottom: 5, left: -10 }}>
              <defs>
                <linearGradient id="ventasGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#7a1f2b" stopOpacity={0.8} />
                  <stop offset="100%" stopColor="#7a1f2b" stopOpacity={0.1} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#3a2c1f" />
              <XAxis dataKey="label" stroke="#a08868" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis stroke="#a08868" fontSize={10} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1a1410',
                  border: '1px solid #3a2c1f',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
                labelStyle={{ color: '#ffd966' }}
                formatter={(value: number) => [formatCUP(value), 'Ventas']}
              />
              <Area
                type="monotone"
                dataKey="ventas"
                stroke="#7a1f2b"
                strokeWidth={2}
                fill="url(#ventasGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Dos gráficos en par: pedidos por estado y horarios */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Pedidos por estado (pie) */}
        <div className="cartoon-border bg-card rounded-2xl p-4">
          <h3 className="font-cartoon text-sm mb-3">Pedidos por estado</h3>
          {ordersByState.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8">Sin pedidos</p>
          ) : (
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={ordersByState}
                    dataKey="value"
                    nameKey="label"
                    cx="50%"
                    cy="50%"
                    innerRadius={35}
                    outerRadius={65}
                    paddingAngle={2}
                  >
                    {ordersByState.map((entry, i) => (
                      <Cell key={i} fill={entry.color} stroke="#1a1410" strokeWidth={1} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1a1410',
                      border: '1px solid #3a2c1f',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: '10px' }}
                    iconType="circle"
                    layout="horizontal"
                    align="center"
                    verticalAlign="bottom"
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Horarios fuertes */}
        <div className="cartoon-border bg-card rounded-2xl p-4">
          <h3 className="font-cartoon text-sm mb-3">Horarios fuertes</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={timeSlotData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#3a2c1f" />
                <XAxis dataKey="label" stroke="#a08868" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#a08868" fontSize={10} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1a1410',
                    border: '1px solid #3a2c1f',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                  formatter={(value: number) => [`${value} pedido(s)`, 'Cantidad']}
                />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {timeSlotData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Top productos */}
      <div className="cartoon-border bg-card rounded-2xl p-4">
        <h3 className="font-cartoon text-sm mb-3">Top productos más vendidos</h3>
        {topProducts.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">Sin ventas aún</p>
        ) : (
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={topProducts}
                layout="vertical"
                margin={{ top: 5, right: 30, bottom: 5, left: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#3a2c1f" horizontal={false} />
                <XAxis type="number" stroke="#a08868" fontSize={10} tickLine={false} axisLine={false} allowDecimals={false} />
                <YAxis
                  type="category"
                  dataKey="name"
                  stroke="#ffd966"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  width={100}
                  tickFormatter={(value: string, idx: number) => {
                    const p = topProducts[idx];
                    return p ? `${p.emoji} ${value.length > 12 ? value.slice(0, 12) + '…' : value}` : value;
                  }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1a1410',
                    border: '1px solid #3a2c1f',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                  formatter={(value: number) => [`${value} unidades`, 'Vendido']}
                />
                <Bar dataKey="count" radius={[0, 6, 6, 0]} fill="#7a1f2b" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}

function KpiCard({ label, value, emoji }: { label: string; value: string; emoji: string }) {
  return (
    <div className="cartoon-border bg-card rounded-2xl p-3 text-center">
      <div className="text-2xl mb-1">{emoji}</div>
      <div className="font-cartoon text-sm text-primary leading-tight">{value}</div>
      <div className="text-[10px] text-muted-foreground mt-0.5">{label}</div>
    </div>
  );
}
