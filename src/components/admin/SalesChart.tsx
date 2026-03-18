"use client";

import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';

interface SalesChartProps {
  data: {
    date: string;
    total: number;
  }[];
}

export const SalesChart = ({ data }: SalesChartProps) => {
  return (
    <div className="h-[400px] w-full bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm flex flex-col">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h3 className="text-lg font-black text-slate-900 tracking-tight">Tendencia de Ventas</h3>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Últimos 7 días</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-slate-900"></div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ingresos</span>
          </div>
        </div>
      </div>

      <div className="flex-grow min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0f172a" stopOpacity={0.1}/>
                <stop offset="95%" stopColor="#0f172a" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis 
              dataKey="date" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 10, fontWeight: 800, fill: '#94a3b8' }}
              dy={15}
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 10, fontWeight: 800, fill: '#94a3b8' }}
              tickFormatter={(value) => `$${(value / 1000)}k`}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#0f172a', 
                border: 'none', 
                borderRadius: '16px',
                color: 'white',
                boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)'
              }}
              itemStyle={{ fontSize: '12px', fontWeight: '900', color: '#fff' }}
              labelStyle={{ fontSize: '10px', textTransform: 'uppercase', marginBottom: '4px', opacity: 0.5, color: '#fff' }}
            />
            <Area 
              type="monotone" 
              dataKey="total" 
              stroke="#0f172a" 
              strokeWidth={3}
              fillOpacity={1} 
              fill="url(#colorSales)" 
              animationDuration={1500}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
