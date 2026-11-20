import { useState } from 'react';
import { TopologyHighlight, TopologyLinkId, TopologyNodeId } from '../types/noc';

interface TopologyMapProps {
  highlight: TopologyHighlight;
}

interface NodeDefinition {
  id: TopologyNodeId;
  label: string;
  sublabel?: string;
  x: number;
  y: number;
  kind: 'router' | 'core' | 'server' | 'ont' | 'splitter' | 'olt';
  accent: string;
  site: string;
  details: string;
}

interface LinkDefinition {
  id: TopologyLinkId;
  from: TopologyNodeId;
  to: TopologyNodeId;
  transport: 'metro' | 'mpls' | 'gpon' | 'hsrp';
  color: string;
  packetSpeed: string;
  dashed?: boolean;
}

const NODES: NodeDefinition[] = [
  // Medellín (Top Left)
  {
    id: 'R1-MED',
    label: 'R1-MED',
    sublabel: 'Medellín',
    x: 62,
    y: 62,
    kind: 'router',
    accent: '#22D3EE',
    site: 'Sede Medellín',
    details: 'Router CE Medellín · Acceso MetroEthernet / Túneles G6 hacia Bogotá',
  },
  {
    id: 'PE-MED',
    label: 'PE-MED',
    sublabel: 'PE Carrier',
    x: 152,
    y: 86,
    kind: 'core',
    accent: '#A78BFA',
    site: 'Núcleo Carrier',
    details: 'Provider Edge Medellín · MPLS L3VPN (VRF CUN_CORP, LDP, FRR < 50 ms)',
  },
  // Core P1 / P2 (Center)
  {
    id: 'P1',
    label: 'P1',
    sublabel: 'Core MPLS',
    x: 242,
    y: 122,
    kind: 'core',
    accent: '#A78BFA',
    site: 'Núcleo Carrier',
    details: 'Core P1 · Conmutación de etiquetas MPLS (RFC 3031, FRR)',
  },
  {
    id: 'P2',
    label: 'P2',
    sublabel: 'Core MPLS',
    x: 242,
    y: 205,
    kind: 'core',
    accent: '#A78BFA',
    site: 'Núcleo Carrier',
    details: 'Core P2 · Respaldo MPLS Fast Reroute (< 50 ms) y balanceo LDP',
  },
  // Bogotá (Top Right)
  {
    id: 'PE-BOG',
    label: 'PE-BOG',
    sublabel: 'PE Carrier',
    x: 332,
    y: 86,
    kind: 'core',
    accent: '#A78BFA',
    site: 'Núcleo Carrier',
    details: 'Provider Edge Bogotá · DiffServ QoS (LLQ/CBWFQ/WRED), copia DSCP→TC',
  },
  {
    id: 'R1-BOG',
    label: 'R1-BOG',
    sublabel: 'Bogotá (Act)',
    x: 422,
    y: 52,
    kind: 'router',
    accent: '#22D3EE',
    site: 'Sede Bogotá Principal',
    details: 'Router CE Principal Bogotá · HSRP (hello 250 ms / hold 750 ms), G6 IPsec',
  },
  {
    id: 'R2-BOG',
    label: 'R2-BOG',
    sublabel: 'Bogotá (Stby)',
    x: 422,
    y: 124,
    kind: 'router',
    accent: '#22D3EE',
    site: 'Sede Bogotá Principal',
    details: 'Router CE Respaldo Bogotá · Par HSRP con R1-BOG, redundancia MetroEthernet',
  },
  // NOC Ibagué (Middle Left)
  {
    id: 'NOC-IBAGUE',
    label: 'NOC Ibagué',
    sublabel: 'RADIUS·DHCP·DNS',
    x: 82,
    y: 178,
    kind: 'server',
    accent: '#22D3EE',
    site: 'NOC Central Ibagué',
    details: 'Servicios centrales: RADIUS (AAA/CHAP), DHCP Server y DNS corporativo',
  },
  // Cali GPON Chain (Bottom)
  {
    id: 'BNG',
    label: 'BNG',
    sublabel: 'PPPoE/LNS',
    x: 356,
    y: 248,
    kind: 'core',
    accent: '#22C55E',
    site: 'Borde Broadband Cali',
    details: 'Broadband Network Gateway · Terminación de sesiones PPPoE + CHAP',
  },
  {
    id: 'OLT',
    label: 'OLT',
    sublabel: 'GPON G.984',
    x: 282,
    y: 300,
    kind: 'olt',
    accent: '#22C55E',
    site: 'Cabecera Óptica Cali',
    details: 'Optical Line Terminal · T-CONT y DBA en enlace GPON hacia Splitter 1:32',
  },
  {
    id: 'SPLITTER',
    label: 'Splitter 1:32',
    sublabel: 'Óptico pasivo',
    x: 202,
    y: 300,
    kind: 'splitter',
    accent: '#22C55E',
    site: 'Planta Externa FTTH',
    details: 'Divisor óptico pasivo 1:32 · Distribución GPON hacia sede Cali',
  },
  {
    id: 'ONT',
    label: 'ONT',
    sublabel: 'Fibra FTTH',
    x: 122,
    y: 300,
    kind: 'ont',
    accent: '#22C55E',
    site: 'Acometida Cali',
    details: 'Optical Network Terminal · Conversión GPON a Ethernet para R-CALI-GPON',
  },
  {
    id: 'R-CALI-GPON',
    label: 'R-CALI-GPON',
    sublabel: 'Sede Cali',
    x: 52,
    y: 300,
    kind: 'router',
    accent: '#22C55E',
    site: 'Sede Cali',
    details: 'Router CE Cali · GPON + PPPoE (MTU 1492 / MSS 1452, overhead 31 B)',
  },
];

const NODE_MAP = Object.fromEntries(NODES.map((n) => [n.id, n])) as Record<
  TopologyNodeId,
  NodeDefinition
>;

const LINKS: LinkDefinition[] = [
  // MetroEthernet (Cyan)
  { id: 'R1-MED_PE-MED', from: 'R1-MED', to: 'PE-MED', transport: 'metro', color: '#22D3EE', packetSpeed: '3.2s' },
  { id: 'R1-BOG_PE-BOG', from: 'R1-BOG', to: 'PE-BOG', transport: 'metro', color: '#22D3EE', packetSpeed: '3.0s' },
  { id: 'R2-BOG_PE-BOG', from: 'R2-BOG', to: 'PE-BOG', transport: 'metro', color: '#22D3EE', packetSpeed: '3.6s' },
  { id: 'R1-BOG_R2-BOG', from: 'R1-BOG', to: 'R2-BOG', transport: 'hsrp', color: '#22D3EE', packetSpeed: '2.4s', dashed: true },
  { id: 'NOC_P1', from: 'NOC-IBAGUE', to: 'P1', transport: 'metro', color: '#22D3EE', packetSpeed: '3.8s' },
  // MPLS Core (Violet)
  { id: 'P1_PE-MED', from: 'P1', to: 'PE-MED', transport: 'mpls', color: '#A78BFA', packetSpeed: '2.7s' },
  { id: 'P2_PE-MED', from: 'P2', to: 'PE-MED', transport: 'mpls', color: '#A78BFA', packetSpeed: '3.3s' },
  { id: 'PE-BOG_P1', from: 'PE-BOG', to: 'P1', transport: 'mpls', color: '#A78BFA', packetSpeed: '2.5s' },
  { id: 'PE-BOG_P2', from: 'PE-BOG', to: 'P2', transport: 'mpls', color: '#A78BFA', packetSpeed: '3.1s' },
  { id: 'P1_P2', from: 'P1', to: 'P2', transport: 'mpls', color: '#A78BFA', packetSpeed: '2.2s' },
  { id: 'BNG_P1', from: 'BNG', to: 'P1', transport: 'mpls', color: '#A78BFA', packetSpeed: '2.9s' },
  { id: 'BNG_P2', from: 'BNG', to: 'P2', transport: 'mpls', color: '#A78BFA', packetSpeed: '3.4s' },
  // GPON Chain (Green)
  { id: 'CALI_ONT', from: 'R-CALI-GPON', to: 'ONT', transport: 'gpon', color: '#22C55E', packetSpeed: '2.1s' },
  { id: 'ONT_SPLITTER', from: 'ONT', to: 'SPLITTER', transport: 'gpon', color: '#22C55E', packetSpeed: '2.3s' },
  { id: 'SPLITTER_OLT', from: 'SPLITTER', to: 'OLT', transport: 'gpon', color: '#22C55E', packetSpeed: '2.5s' },
  { id: 'OLT_BNG', from: 'OLT', to: 'BNG', transport: 'gpon', color: '#22C55E', packetSpeed: '2.8s' },
];

function renderNodeIcon(kind: NodeDefinition['kind'], stroke: string) {
  switch (kind) {
    case 'router':
      return (
        <g stroke={stroke} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="0" cy="0" r="8.5" fill="#0A0F1E" />
          <path d="M-4.5 0h9M0 -4.5v9" />
          <path d="M-3 -1.5L-4.5 0 -3 1.5M3 -1.5L4.5 0 3 1.5" />
        </g>
      );
    case 'core':
      return (
        <g stroke={stroke} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="0,-9.5 9,-4.5 9,4.5 0,9.5 -9,4.5 -9,-4.5" fill="#0A0F1E" />
          <path d="M-4 -2L4 2M4 -2L-4 2" />
        </g>
      );
    case 'server':
      return (
        <g stroke={stroke} strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round">
          <rect x="-8.5" y="-9.5" width="17" height="19" rx="2.5" fill="#0A0F1E" />
          <line x1="-5" y1="-4.5" x2="5" y2="-4.5" />
          <line x1="-5" y1="0" x2="5" y2="0" />
          <line x1="-5" y1="4.5" x2="2" y2="4.5" />
          <circle cx="4.5" cy="4.5" r="0.9" fill="#22C55E" stroke="none" />
        </g>
      );
    case 'olt':
      return (
        <g stroke={stroke} strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round">
          <rect x="-9.5" y="-7.5" width="19" height="15" rx="2" fill="#0A0F1E" />
          <path d="M-5.5 -2.5h11M-5.5 2.5h6" />
          <circle cx="4.5" cy="2.5" r="1.1" fill="#22C55E" stroke="none" />
        </g>
      );
    case 'splitter':
      return (
        <g stroke={stroke} strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="-8,-7.5 8,0 -8,7.5" fill="#0A0F1E" />
          <line x1="-3" y1="0" x2="3" y2="0" />
        </g>
      );
    case 'ont':
      return (
        <g stroke={stroke} strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round">
          <rect x="-8" y="-7" width="16" height="14" rx="2.5" fill="#0A0F1E" />
          <path d="M-4 -1.5L0 -4L4 -1.5" />
          <line x1="-4" y1="2.5" x2="4" y2="2.5" />
        </g>
      );
  }
}

export function TopologyMap({ highlight }: TopologyMapProps) {
  const [selectedNodeId, setSelectedNodeId] = useState<TopologyNodeId | null>(null);
  const selectedNode = selectedNodeId ? NODE_MAP[selectedNodeId] : null;
  const hasContext = highlight.nodes.size > 0;

  return (
    <section
      aria-label="Mapa de topología de la red NGN CUN"
      className="noc-glass flex flex-col rounded-xl p-4"
    >
      {/* Header */}
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-slate-100">
            Topología NGN CUN
          </h2>
          <p className="text-xs text-slate-400">
            {hasContext
              ? `Ruta resaltada: ${highlight.activeServices.length > 0 ? highlight.activeServices.join(' · ') : `${highlight.nodes.size} nodos`}`
              : 'Plano de borde, núcleo MPLS y acceso FTTH'}
          </p>
        </div>
        {selectedNode && (
          <button
            type="button"
            onClick={() => setSelectedNodeId(null)}
            className="rounded px-2 py-1 text-[11px] font-medium text-cyan-300 hover:bg-cyan-400/10 focus-visible:outline-2 focus-visible:outline-cyan-400"
          >
            Cerrar detalle
          </button>
        )}
      </div>

      {/* SVG Canvas */}
      <div className="relative overflow-hidden rounded-lg border border-cyan-400/15 bg-[#060B17]/90">
        <svg
          viewBox="0 0 476 346"
          className="h-auto w-full select-none"
          role="img"
          aria-label="Diagrama animado de topología: Bogotá, Medellín, Cali GPON, NOC Ibagué y núcleo MPLS"
        >
          <defs>
            <filter id="glow-active" x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur stdDeviation="3.2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <radialGradient id="core-aura" cx="50%" cy="45%" r="50%">
              <stop offset="0%" stopColor="rgba(167,139,250,0.14)" />
              <stop offset="100%" stopColor="rgba(167,139,250,0)" />
            </radialGradient>
          </defs>

          {/* Subtle region zones */}
          <rect
            x="10"
            y="14"
            width="180"
            height="112"
            rx="10"
            fill="rgba(34,211,238,0.025)"
            stroke="rgba(34,211,238,0.12)"
            strokeDasharray="3 4"
          />
          <text x="20" y="28" fill="#64748B" fontSize="8.5" fontFamily="JetBrains Mono">
            MEDELLÍN
          </text>

          <rect
            x="294"
            y="14"
            width="172"
            height="148"
            rx="10"
            fill="rgba(34,211,238,0.025)"
            stroke="rgba(34,211,238,0.12)"
            strokeDasharray="3 4"
          />
          <text x="304" y="28" fill="#64748B" fontSize="8.5" fontFamily="JetBrains Mono">
            BOGOTÁ · HSRP
          </text>

          <ellipse cx="242" cy="142" rx="112" ry="86" fill="url(#core-aura)" />
          <text x="204" y="54" fill="#A78BFA" fillOpacity="0.7" fontSize="8.5" fontFamily="JetBrains Mono">
            NÚCLEO MPLS
          </text>

          <rect
            x="10"
            y="258"
            width="380"
            height="78"
            rx="10"
            fill="rgba(34,197,94,0.025)"
            stroke="rgba(34,197,94,0.16)"
            strokeDasharray="3 4"
          />
          <text x="20" y="272" fill="#4ADE80" fillOpacity="0.75" fontSize="8.5" fontFamily="JetBrains Mono">
            ACCESO CALI · GPON + PPPoE
          </text>

          {/* Links + Animated Packets */}
          {LINKS.map((link) => {
            const fromNode = NODE_MAP[link.from];
            const toNode = NODE_MAP[link.to];
            const isHighlighted = highlight.links.has(link.id);
            const pathD = `M ${fromNode.x} ${fromNode.y} L ${toNode.x} ${toNode.y}`;
            const dimOther = hasContext && !isHighlighted;

            return (
              <g key={link.id}>
                {/* Halo on active links */}
                {isHighlighted && (
                  <path
                    d={pathD}
                    stroke={link.color}
                    strokeWidth="5"
                    strokeOpacity="0.28"
                    strokeLinecap="round"
                    filter="url(#glow-active)"
                    className="animate-pulse"
                  />
                )}

                {/* Base Link Line */}
                <path
                  d={pathD}
                  stroke={link.color}
                  strokeWidth={isHighlighted ? '2.2' : '1.45'}
                  strokeOpacity={dimOther ? 0.28 : isHighlighted ? 0.95 : 0.65}
                  strokeDasharray={link.dashed ? '4 3' : undefined}
                  strokeLinecap="round"
                  fill="none"
                />

                {/* Animated luminous packet */}
                <circle
                  r={isHighlighted ? '3.1' : '2.2'}
                  fill={link.color}
                  opacity={dimOther ? 0.25 : 0.95}
                  className="noc-motion-packet"
                  filter={isHighlighted ? 'url(#glow-active)' : undefined}
                >
                  <animateMotion
                    dur={link.packetSpeed}
                    repeatCount="indefinite"
                    path={pathD}
                  />
                </circle>
              </g>
            );
          })}

          {/* Nodes */}
          {NODES.map((node) => {
            const isHighlighted = highlight.nodes.has(node.id);
            const isSelected = selectedNodeId === node.id;
            const dimOther = hasContext && !isHighlighted && !isSelected;

            return (
              <g
                key={node.id}
                transform={`translate(${node.x}, ${node.y})`}
                onClick={() =>
                  setSelectedNodeId((prev) => (prev === node.id ? null : node.id))
                }
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setSelectedNodeId((prev) => (prev === node.id ? null : node.id));
                  }
                }}
                tabIndex={0}
                role="button"
                aria-label={`${node.label}: ${node.details}`}
                className="cursor-pointer outline-none"
                style={{ opacity: dimOther ? 0.45 : 1, transition: 'opacity 200ms ease' }}
              >
                {/* Pulsing ring for conversation match or selection */}
                {(isHighlighted || isSelected) && (
                  <circle
                    cx="0"
                    cy="0"
                    r="16.5"
                    fill="none"
                    stroke={isSelected ? '#F8FAFC' : node.accent}
                    strokeWidth="1.6"
                    strokeOpacity="0.85"
                    className="animate-pulse"
                    filter="url(#glow-active)"
                  />
                )}

                {/* Node Icon */}
                {renderNodeIcon(node.kind, isHighlighted || isSelected ? '#F8FAFC' : node.accent)}

                {/* Label */}
                <text
                  x="0"
                  y="21"
                  textAnchor="middle"
                  fill={isHighlighted || isSelected ? '#F8FAFC' : '#CBD5E1'}
                  fontSize="8.5"
                  fontWeight={isHighlighted || isSelected ? '700' : '600'}
                  fontFamily="JetBrains Mono"
                >
                  {node.label}
                </text>
                {node.sublabel && (
                  <text
                    x="0"
                    y="30"
                    textAnchor="middle"
                    fill="#94A3B8"
                    fontSize="7"
                    fontFamily="Inter"
                  >
                    {node.sublabel}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Selected node inspection strip */}
      {selectedNode && (
        <div className="mt-3 rounded-lg border border-cyan-400/25 bg-[#070D1D] px-3 py-2 text-xs">
          <div className="flex items-center justify-between gap-2">
            <span className="font-mono font-semibold text-cyan-300">
              {selectedNode.label}
            </span>
            <span className="text-[11px] text-slate-400">{selectedNode.site}</span>
          </div>
          <p className="mt-1 text-slate-300 leading-relaxed">{selectedNode.details}</p>
        </div>
      )}

      {/* Transport Legend with MTU / MSS */}
      <div className="mt-3 border-t border-cyan-400/15 pt-3">
        <div className="mb-2 text-[11px] font-medium text-slate-400">
          Transportes de referencia · MTU / MSS
        </div>
        <div className="grid grid-cols-1 gap-1.5 text-xs">
          <div className="flex items-center justify-between rounded-md bg-slate-900/60 px-2.5 py-1.5">
            <span className="flex items-center gap-2 text-slate-200">
              <span className="h-2 w-4 rounded-full bg-[#22D3EE]" aria-hidden="true" />
              MetroEthernet
            </span>
            <span className="font-mono tabular-nums text-cyan-300">1500 / 1460</span>
          </div>
          <div className="flex items-center justify-between rounded-md bg-slate-900/60 px-2.5 py-1.5">
            <span className="flex items-center gap-2 text-slate-200">
              <span className="h-2 w-4 rounded-full bg-[#A78BFA]" aria-hidden="true" />
              MPLS
            </span>
            <span className="font-mono tabular-nums text-violet-300">1500 / 1460</span>
          </div>
          <div className="flex items-center justify-between rounded-md bg-slate-900/60 px-2.5 py-1.5">
            <span className="flex items-center gap-2 text-slate-200">
              <span className="h-2 w-4 rounded-full bg-[#22C55E]" aria-hidden="true" />
              GPON+PPPoE
            </span>
            <span className="font-mono tabular-nums text-emerald-300">1492 / 1452</span>
          </div>
        </div>
      </div>
    </section>
  );
}
