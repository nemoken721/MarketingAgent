"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface CreditUsageChartProps {
  data: Array<{
    date: string;
    used: number;
    purchased: number;
  }>;
}

export default function CreditUsageChart({ data }: CreditUsageChartProps) {
  // データがない場合のサンプルデータ
  const chartData =
    data && data.length > 0
      ? data
      : [
          { date: "1/1", used: 50, purchased: 0 },
          { date: "1/2", used: 120, purchased: 500 },
          { date: "1/3", used: 80, purchased: 0 },
          { date: "1/4", used: 150, purchased: 0 },
          { date: "1/5", used: 90, purchased: 0 },
          { date: "1/6", used: 200, purchased: 1000 },
          { date: "1/7", used: 110, purchased: 0 },
        ];

  return (
    <div className="w-full h-80">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={chartData}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis
            dataKey="date"
            className="text-xs"
            tick={{ fill: "currentColor" }}
          />
          <YAxis className="text-xs" tick={{ fill: "currentColor" }} />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "8px",
            }}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="used"
            stroke="#ef4444"
            strokeWidth={2}
            name="使用クレジット"
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
          />
          <Line
            type="monotone"
            dataKey="purchased"
            stroke="#22c55e"
            strokeWidth={2}
            name="購入クレジット"
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
