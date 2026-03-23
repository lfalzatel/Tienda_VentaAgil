"use client";

import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { Wallet } from "lucide-react";

interface PurchaseChartProps {
  data: any[];
}

export const PurchaseChart = ({ data }: PurchaseChartProps) => {
  return (
    <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm flex flex-col h-[500px]">
      <div className="flex justify-between items-center mb-10">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600">
            <Wallet size={18} />
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-900 tracking-tight">Tendencia de Inversión</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Historial de gastos en mercancía</p>
          </div>
        </div>
      </div>

      <div className="flex-grow w-full min-h-0 overflow-hidden">
        <ResponsiveContainer width="100%" height="100%" minHeight={300}>
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#059669" stopOpacity={0.1}/>
                <stop offset="95%" stopColor="#059669" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis 
              dataKey="date" 
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }}
              dy={10}
            />
            <YAxis 
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }}
              tickFormatter={(value) => `$${(value / 1000)}k`}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#fff', 
                borderRadius: '1.5rem', 
                border: 'none', 
                boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                padding: '1rem'
              }}
              itemStyle={{ fontWeight: 900, color: '#0f172a' }}
              labelStyle={{ color: '#64748b', marginBottom: '0.25rem', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase' }}
              formatter={(value: any) => [`$${Number(value || 0).toLocaleString("es-CO")}`, "Inversión"]}
            />
            <Area 
              type="monotone" 
              dataKey="total" 
              stroke="#059669" 
              strokeWidth={4}
              fillOpacity={1} 
              fill="url(#colorTotal)" 
              animationDuration={1500}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
