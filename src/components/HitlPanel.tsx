import { useState } from 'react';
import { motion } from 'motion/react';
import {
  CheckCircle2,
  Download,
  Lock,
  MessageSquareWarning,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import {
  DecisionEntry,
  DecisionStatus,
  RiskLevel,
  ValidationCounts,
} from '../types/noc';

interface HitlPanelProps {
  riskLevel: RiskLevel | null;
  hasDraft: boolean;
  isEscalated: boolean;
  latestAssistantMessageId: string | null;
  latestUserPrompt: string;
  validations: ValidationCounts;
  decisions: DecisionEntry[];
  onRecordDecision: (decision: DecisionStatus, adminName: string) => void;
  onRequestChangesFocus: () => void;
}

const GUARDRAILS = [
  'Borradores obligatorios',
  'Sin claves reales',
  'Sin cambios en producción',
  'Sin datos inventados',
  'Parada ante valores imposibles',
];

function RiskGauge({ riskLevel }: { riskLevel: RiskLevel | null }) {
  // Arc length for radius 64 semicircle = pi * 64 ≈ 201.06
  const radius = 64;
  const circumference = Math.PI * radius;

  const config = (() => {
    switch (riskLevel) {
      case 'Bajo':
        return {
          percent: 0.25,
          color: '#22C55E',
          label: 'Riesgo Bajo',
          desc: 'Impacto acotado · verificación estándar',
          angleDeg: -50,
        };
      case 'Medio':
        return {
          percent: 0.58,
          color: '#F59E0B',
          label: 'Riesgo Medio',
          desc: 'Requiere validación de parámetros',
          angleDeg: 0,
        };
      case 'Alto':
        return {
          percent: 0.94,
          color: '#EF4444',
          label: 'Riesgo Alto',
          desc: 'Impacto crítico / aprobación obligatoria',
          angleDeg: 62,
        };
      default:
        return {
          percent: 0,
          color: '#475569',
          label: 'En espera',
          desc: 'Sin evaluación reciente',
          angleDeg: -90,
        };
    }
  })();

  const dashOffset = circumference * (1 - config.percent);

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-44">
        <svg viewBox="0 0 160 96" className="w-full overflow-visible" aria-hidden="true">
          {/* Background track */}
          <path
            d="M 16 82 A 64 64 0 0 1 144 82"
            fill="none"
            stroke="rgba(148,163,184,0.16)"
            strokeWidth="12"
            strokeLinecap="round"
          />
          {/* Animated active arc */}
          <motion.path
            d="M 16 82 A 64 64 0 0 1 144 82"
            fill="none"
            stroke={config.color}
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: dashOffset }}
            transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
          />
          {/* Needle */}
          <g transform="translate(80, 82)">
            <motion.g
              style={{ transformOrigin: '0px 0px' }}
              initial={{ rotate: -90 }}
              animate={{ rotate: config.angleDeg }}
              transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
            >
              <line
                x1="0"
                y1="0"
                x2="0"
                y2="-50"
                stroke="#E2E8F0"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <circle cx="0" cy="0" r="4" fill={config.color} stroke="#0A0F1E" strokeWidth="1.5" />
            </motion.g>
          </g>
        </svg>
      </div>
      <div className="mt-1 text-center">
        <div
          className="text-sm font-bold"
          style={{ color: riskLevel ? config.color : '#94A3B8' }}
        >
          {config.label}
        </div>
        <p className="text-xs text-slate-400">{config.desc}</p>
      </div>
    </div>
  );
}

export function HitlPanel({
  riskLevel,
  hasDraft,
  isEscalated,
  latestAssistantMessageId,
  latestUserPrompt,
  validations,
  decisions,
  onRecordDecision,
  onRequestChangesFocus,
}: HitlPanelProps) {
  const [adminName, setAdminName] = useState<string>('');
  const [nameError, setNameError] = useState<string | null>(null);

  const alreadyDecided = latestAssistantMessageId
    ? decisions.find((d) => d.messageId === latestAssistantMessageId)
    : undefined;

  const handleDecisionClick = (decision: DecisionStatus) => {
    const trimmed = adminName.trim();
    if (!trimmed) {
      setNameError('Ingresa el nombre del administrador antes de registrar.');
      return;
    }
    setNameError(null);
    onRecordDecision(decision, trimmed);
    if (decision === 'Cambios solicitados') {
      onRequestChangesFocus();
    }
  };

  const handleExportCsv = () => {
    if (decisions.length === 0) return;
    const headers = ['Fecha y hora', 'Solicitud', 'Riesgo', 'Decisión', 'Responsable'];
    const escapeCell = (val: string) => `"${val.replace(/"/g, '""')}"`;
    const rows = decisions.map((d) =>
      [d.timestamp, d.requestSummary, d.risk, d.decision, d.adminName]
        .map(escapeCell)
        .join(',')
    );
    const csvContent = '\uFEFF' + [headers.map(escapeCell).join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `bitacora-ngn-copiloto-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <aside
      aria-label="Panel de control humano y telemetría"
      className="flex flex-col gap-3.5"
    >
      {/* 1. Nivel de riesgo */}
      <section className="noc-glass rounded-xl p-4">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-100">Nivel de riesgo</h2>
          <span className="font-mono text-[11px] text-slate-400">
            {isEscalated ? 'Escalado' : riskLevel ?? '—'}
          </span>
        </div>
        <RiskGauge riskLevel={riskLevel} />
      </section>

      {/* 2. Aprobación humana */}
      <section className="noc-glass rounded-xl p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-slate-100">Aprobación humana</h2>
          <ShieldCheck className="h-4 w-4 text-cyan-400" aria-hidden="true" />
        </div>

        <div className="mb-3">
          <label
            htmlFor="admin-name-input"
            className="mb-1 block text-xs font-medium text-slate-300"
          >
            Nombre del administrador
          </label>
          <input
            id="admin-name-input"
            type="text"
            value={adminName}
            onChange={(e) => {
              setAdminName(e.target.value);
              if (nameError) setNameError(null);
            }}
            placeholder="Ej. Ing. Laura Méndez"
            className="w-full rounded-lg border border-cyan-400/20 bg-[#050914] px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:border-cyan-400/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/40"
          />
          {nameError && (
            <p role="alert" className="mt-1 text-[11px] text-amber-300">
              {nameError}
            </p>
          )}
        </div>

        {hasDraft ? (
          alreadyDecided ? (
            <div className="rounded-lg border border-cyan-400/25 bg-cyan-950/30 px-3 py-2.5 text-xs text-slate-200">
              <div className="font-semibold text-cyan-200">
                Decisión registrada: {alreadyDecided.decision}
              </div>
              <div className="mt-0.5 text-[11px] text-slate-400">
                Responsable: {alreadyDecided.adminName} · {alreadyDecided.timestamp}
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-[11px] text-slate-400 truncate" title={latestUserPrompt}>
                Propuesta: {latestUserPrompt || 'Borrador activo'}
              </p>
              <div className="grid grid-cols-1 gap-2">
                <button
                  type="button"
                  onClick={() => handleDecisionClick('Aprobado')}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-emerald-500/40 bg-emerald-500/15 px-3 py-2 text-xs font-semibold text-emerald-200 transition-colors hover:bg-emerald-500/25 focus-visible:outline-2 focus-visible:outline-emerald-400"
                >
                  <CheckCircle2 className="h-3.5 w-3.5 text-[#22C55E]" aria-hidden="true" />
                  <span>Aprobar borrador</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDecisionClick('Cambios solicitados')}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-amber-500/40 bg-amber-500/15 px-3 py-2 text-xs font-semibold text-amber-200 transition-colors hover:bg-amber-500/25 focus-visible:outline-2 focus-visible:outline-amber-400"
                >
                  <MessageSquareWarning className="h-3.5 w-3.5 text-[#F59E0B]" aria-hidden="true" />
                  <span>Solicitar cambios</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDecisionClick('Rechazado')}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-500/40 bg-red-500/15 px-3 py-2 text-xs font-semibold text-red-200 transition-colors hover:bg-red-500/25 focus-visible:outline-2 focus-visible:outline-red-400"
                >
                  <XCircle className="h-3.5 w-3.5 text-[#EF4444]" aria-hidden="true" />
                  <span>Rechazar</span>
                </button>
              </div>
            </div>
          )
        ) : (
          <p className="rounded-lg border border-slate-800 bg-slate-900/50 px-3 py-2 text-xs text-slate-400">
            {isEscalated
              ? 'Solicitud escalada: no hay borrador ejecutable para aprobar.'
              : 'Los botones de decisión aparecerán cuando el agente genere un borrador CLI.'}
          </p>
        )}
      </section>

      {/* 3. Validaciones */}
      <section className="noc-glass rounded-xl p-4">
        <h2 className="mb-3 text-sm font-semibold text-slate-100">Validaciones</h2>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-lg border border-emerald-500/25 bg-emerald-950/25 px-2 py-2">
            <div className="font-mono text-lg font-bold tabular-nums text-[#22C55E]">
              {validations.ok}
            </div>
            <div className="text-[11px] text-slate-300">✔ Cumple</div>
          </div>
          <div className="rounded-lg border border-red-500/25 bg-red-950/25 px-2 py-2">
            <div className="font-mono text-lg font-bold tabular-nums text-[#EF4444]">
              {validations.fail}
            </div>
            <div className="text-[11px] text-slate-300">✖ Falla</div>
          </div>
          <div className="rounded-lg border border-amber-500/25 bg-amber-950/25 px-2 py-2">
            <div className="font-mono text-lg font-bold tabular-nums text-[#F59E0B]">
              {validations.warn}
            </div>
            <div className="text-[11px] text-slate-300">⚠ Revisar</div>
          </div>
        </div>
      </section>

      {/* 4. Guardrails activos */}
      <section className="noc-glass rounded-xl p-4">
        <h2 className="mb-2.5 text-sm font-semibold text-slate-100">
          Guardrails activos
        </h2>
        <ul className="space-y-1.5 text-xs text-slate-300">
          {GUARDRAILS.map((item) => (
            <li key={item} className="flex items-center gap-2">
              <Lock className="h-3.5 w-3.5 shrink-0 text-[#22C55E]" aria-hidden="true" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* 5. Bitácora de decisiones */}
      <section className="noc-glass rounded-xl p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-slate-100">
            Bitácora de decisiones
          </h2>
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={decisions.length === 0}
            aria-label="Exportar bitácora de decisiones a CSV"
            className="inline-flex items-center gap-1.5 rounded-md border border-cyan-400/30 bg-cyan-950/35 px-2.5 py-1 text-xs font-medium text-cyan-200 transition-colors hover:bg-cyan-400/15 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-cyan-400 whitespace-nowrap shrink-0"
          >
            <Download className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Exportar CSV</span>
          </button>
        </div>

        {decisions.length === 0 ? (
          <p className="rounded-lg border border-slate-800 bg-slate-900/45 px-3 py-3 text-xs text-slate-400">
            Aún no hay decisiones registradas. Aprueba, observa o rechaza un borrador para
            dejar trazabilidad.
          </p>
        ) : (
          <div className="noc-scroll max-h-56 overflow-x-auto overflow-y-auto rounded-lg border border-slate-800">
            <table className="w-full border-collapse text-left text-[11px]">
              <thead className="sticky top-0 bg-[#080E1E] text-slate-400">
                <tr className="border-b border-slate-800">
                  <th className="px-2 py-1.5 font-medium">Fecha</th>
                  <th className="px-2 py-1.5 font-medium">Solicitud</th>
                  <th className="px-2 py-1.5 font-medium">Riesgo</th>
                  <th className="px-2 py-1.5 font-medium">Decisión</th>
                  <th className="px-2 py-1.5 font-medium">Responsable</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {decisions.map((entry) => (
                  <tr key={entry.id} className="hover:bg-slate-800/40">
                    <td className="px-2 py-1.5 font-mono tabular-nums text-slate-400 whitespace-nowrap">
                      {entry.timestamp}
                    </td>
                    <td className="max-w-[110px] truncate px-2 py-1.5 text-slate-200" title={entry.requestSummary}>
                      {entry.requestSummary}
                    </td>
                    <td className="px-2 py-1.5 font-medium whitespace-nowrap">
                      <span
                        className={
                          entry.risk === 'Alto'
                            ? 'text-[#EF4444]'
                            : entry.risk === 'Medio'
                            ? 'text-[#F59E0B]'
                            : entry.risk === 'Bajo'
                            ? 'text-[#22C55E]'
                            : 'text-slate-400'
                        }
                      >
                        {entry.risk}
                      </span>
                    </td>
                    <td className="px-2 py-1.5 text-slate-200 whitespace-nowrap">
                      {entry.decision}
                    </td>
                    <td className="max-w-[85px] truncate px-2 py-1.5 text-slate-300" title={entry.adminName}>
                      {entry.adminName}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </aside>
  );
}
