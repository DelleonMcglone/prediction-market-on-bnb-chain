"use client";

import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  ReferenceLine,
} from "recharts";
import type { HistoryPoint } from "@/hooks/useMarketHistory";

export function PriceChart({ data }: { data: HistoryPoint[] }) {
  if (data.length === 0) {
    return <EmptyChart />;
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgb(var(--yes))" stopOpacity={0.35} />
              <stop offset="100%" stopColor="rgb(var(--yes))" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="t"
            type="number"
            domain={["dataMin", "dataMax"]}
            tickFormatter={(t: number) =>
              new Date(t * 1000).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
            }
            stroke="rgb(var(--muted))"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            minTickGap={40}
          />
          <YAxis
            domain={[0, 1]}
            tickFormatter={(v: number) => `${Math.round(v * 100)}%`}
            stroke="rgb(var(--muted))"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            width={38}
          />
          <ReferenceLine y={0.5} stroke="rgb(var(--muted))" strokeDasharray="3 3" strokeOpacity={0.4} />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const point = payload[0].payload as HistoryPoint;
              return (
                <div className="rounded-md border border-white/10 bg-[rgb(var(--bg))] px-3 py-2 text-xs shadow-lg">
                  <div className="text-muted">
                    {new Date(point.t * 1000).toLocaleString()}
                  </div>
                  <div className="font-semibold text-yes mt-1">
                    YES {(point.priceYes * 100).toFixed(1)}%
                  </div>
                </div>
              );
            }}
          />
          <Area
            type="monotone"
            dataKey="priceYes"
            stroke="rgb(var(--yes))"
            strokeWidth={2}
            fill="url(#priceGradient)"
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function EmptyChart() {
  return (
    <div className="h-64 w-full flex items-center justify-center rounded-md border border-dashed border-white/10 bg-white/[0.02]">
      <p className="text-sm text-muted">
        No trades yet. The first trade will start the chart.
      </p>
    </div>
  );
}
