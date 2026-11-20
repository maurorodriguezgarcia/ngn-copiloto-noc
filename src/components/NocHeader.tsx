import { useEffect, useState } from 'react';

function formatBogotaTime(date: Date): string {
  return new Intl.DateTimeFormat('es-CO', {
    timeZone: 'America/Bogota',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(date);
}

interface NocHeaderProps {
  isStreaming: boolean;
}

export function NocHeader({ isStreaming }: NocHeaderProps) {
  const [bogotaTime, setBogotaTime] = useState<string>(() => formatBogotaTime(new Date()));

  useEffect(() => {
    const interval = window.setInterval(() => {
      setBogotaTime(formatBogotaTime(new Date()));
    }, 1000);
    return () => window.clearInterval(interval);
  }, []);

  return (
    <header className="relative overflow-hidden border-b border-cyan-400/20 bg-[#0A0F1E]/90 backdrop-blur-md">
      {/* Subtle scanner sweep */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-cyan-400/10 to-transparent noc-scan-sweep"
      />

      <div className="relative mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-4 px-4 py-3 sm:px-6">
        {/* Brand + Subtitle */}
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-cyan-400/30 bg-cyan-950/35 shadow-[0_0_20px_rgba(34,211,238,0.16)]">
            <svg
              viewBox="0 0 40 40"
              className="h-7 w-7"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              {/* Outer hexagon */}
              <polygon
                points="20,3 35,11.5 35,28.5 20,37 5,28.5 5,11.5"
                stroke="#22D3EE"
                strokeWidth="1.75"
                fill="rgba(34,211,238,0.08)"
              />
              {/* Internal connected network links */}
              <line x1="20" y1="10" x2="12" y2="23" stroke="#A78BFA" strokeWidth="1.5" />
              <line x1="20" y1="10" x2="28" y2="23" stroke="#22D3EE" strokeWidth="1.5" />
              <line x1="12" y1="23" x2="28" y2="23" stroke="#22C55E" strokeWidth="1.5" />
              <line x1="20" y1="10" x2="20" y2="29" stroke="#22D3EE" strokeWidth="1.25" strokeOpacity="0.6" />
              {/* Network nodes */}
              <circle cx="20" cy="10" r="2.7" fill="#22D3EE" />
              <circle cx="12" cy="23" r="2.5" fill="#A78BFA" />
              <circle cx="28" cy="23" r="2.5" fill="#22C55E" />
              <circle cx="20" cy="29" r="2" fill="#E2E8F0" />
            </svg>
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2.5">
              <h1 className="truncate text-lg font-bold tracking-tight text-slate-50 sm:text-xl">
                NGN-Copiloto
              </h1>
              <span className="hidden text-xs font-mono text-cyan-300/80 sm:inline">
                NOC
              </span>
            </div>
            <p className="truncate text-xs text-slate-400 sm:text-[13px]">
              Diseño y validación de servicios de borde · Red NGN CUN
            </p>
          </div>
        </div>

        {/* Live Telemetry & SLA */}
        <div className="flex flex-wrap items-center gap-3 sm:gap-5">
          {/* Live status */}
          <div
            className="flex items-center gap-2 text-xs font-medium text-slate-200 whitespace-nowrap shrink-0"
            role="status"
            aria-live="polite"
          >
            <span className="relative flex h-2.5 w-2.5">
              <span
                className={`absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping ${
                  isStreaming ? 'bg-cyan-400' : 'bg-[#22C55E]'
                }`}
              />
              <span
                className={`relative inline-flex h-2.5 w-2.5 rounded-full ${
                  isStreaming ? 'bg-cyan-400' : 'bg-[#22C55E]'
                }`}
              />
            </span>
            <span>{isStreaming ? 'Analizando enlace' : 'Agente en línea'}</span>
          </div>

          <span className="hidden h-4 w-px bg-cyan-400/20 sm:block" aria-hidden="true" />

          {/* SLA Chip */}
          <div className="inline-flex items-center gap-1.5 rounded-md border border-cyan-400/25 bg-cyan-950/30 px-2.5 py-1 text-xs font-mono tabular-nums text-cyan-200 whitespace-nowrap shrink-0">
            <span className="text-slate-400">SLA objetivo</span>
            <span className="font-semibold text-[#22C55E]">99,990 %</span>
          </div>

          {/* Live Bogotá Clock */}
          <div
            className="flex items-center gap-2 rounded-md border border-slate-700/70 bg-slate-900/75 px-2.5 py-1 text-xs font-mono tabular-nums text-slate-200 whitespace-nowrap shrink-0"
            aria-label={`Hora en Bogotá: ${bogotaTime}`}
          >
            <span className="text-slate-400">BOG</span>
            <span className="font-semibold text-cyan-300">{bogotaTime}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
