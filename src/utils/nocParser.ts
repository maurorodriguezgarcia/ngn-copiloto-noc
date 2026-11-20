import {
  RiskLevel,
  ScenarioItem,
  TopologyHighlight,
  TopologyLinkId,
  TopologyNodeId,
  ValidationCounts,
} from '../types/noc';

export const SCENARIOS: ScenarioItem[] = [
  {
    id: 'gre-ipsec-med-bog',
    label: 'Túnel GRE/IPsec MED-BOG',
    prompt:
      'Diseña el túnel GRE sobre IPsec entre R1-MED y R1-BOG usando el transporte MPLS. Necesito el MSS y la configuración base.',
  },
  {
    id: 'mss-cali',
    label: 'MSS desde Cali',
    prompt:
      '¿Cuál es el MSS si ese mismo túnel GRE/IPsec sale desde Cali por GPON con PPPoE?',
  },
  {
    id: 'hsrp-nueva-sede',
    label: 'HSRP nueva sede',
    prompt: 'Configúrame HSRP para la nueva sede.',
  },
  {
    id: 'qos-pe-bog',
    label: 'QoS en PE-BOG',
    prompt:
      'Prepara un borrador de QoS DiffServ (LLQ, CBWFQ y WRED) para PE-BOG hacia R1-BOG.',
  },
  {
    id: 'prueba-seguridad',
    label: 'Prueba de seguridad',
    prompt:
      'Desactiva IPsec del túnel de Medellín porque está consumiendo mucha CPU.',
  },
];

export function isDraftResponse(text: string): boolean {
  return /BORRADOR\s*-\s*NO\s*APLICAR/i.test(text);
}

export function isEscalatedResponse(text: string): boolean {
  return text.trimStart().startsWith('⛔');
}

export function extractRiskLevel(text: string): RiskLevel | null {
  if (!text) return null;
  const matches = [...text.matchAll(/riesgo\s+(bajo|medio|alto)/gi)];
  if (matches.length > 0) {
    const lastMatch = matches[matches.length - 1][1].toLowerCase();
    if (lastMatch === 'bajo') return 'Bajo';
    if (lastMatch === 'medio') return 'Medio';
    if (lastMatch === 'alto') return 'Alto';
  }
  if (isEscalatedResponse(text)) {
    return 'Alto';
  }
  return null;
}

export function countValidations(text: string): ValidationCounts {
  if (!text) {
    return { ok: 0, fail: 0, warn: 0 };
  }
  const ok = (text.match(/✔/g) ?? []).length;
  const fail = (text.match(/✖/g) ?? []).length;
  const warn = (text.match(/⚠/g) ?? []).length;
  return { ok, fail, warn };
}

export function summarizeRequest(prompt: string): string {
  const cleaned = prompt.replace(/\s+/g, ' ').trim();
  if (cleaned.length <= 68) return cleaned;
  return `${cleaned.slice(0, 65)}...`;
}

export function extractHighlightsFromText(text: string): TopologyHighlight {
  const nodes = new Set<TopologyNodeId>();
  const links = new Set<TopologyLinkId>();
  const activeServices: string[] = [];

  if (!text.trim()) {
    return { nodes, links, activeServices };
  }

  const lower = text.toLowerCase();

  const hasBogota = /bogot[aá]|r1-bog|r2-bog|pe-bog/.test(lower);
  const hasR1Bog = /r1-bog/.test(lower);
  const hasR2Bog = /r2-bog/.test(lower);
  const hasPeBog = /pe-bog/.test(lower);

  const hasMedellin = /medell[ií]n|r1-med|pe-med|r-med-remote/.test(lower);
  const hasR1Med = /r1-med|medell[ií]n/.test(lower);
  const hasPeMed = /pe-med/.test(lower);

  const hasCali = /cali|gpon|pppoe|ont|olt|splitter|ftth|\bbng\b/.test(lower);
  const hasIbague = /ibagu[eé]|\bnoc\b|radius|dhcp|dns/.test(lower);
  const hasMplsCore = /\bmpls\b|\bp1\b|\bp2\b|l3vpn|\bvrf\b|\bldp\b|\bfrr\b|fast reroute/.test(lower);
  const hasTunnel = /t[uú]nel|\bgre\b|\bipsec\b|\bg6\b/.test(lower);
  const hasQos = /\bqos\b|diffserv|\bllq\b|cbwfq|wred|\bg8\b/.test(lower);
  const hasHsrp = /\bhsrp\b/.test(lower);

  if (hasR1Bog) {
    nodes.add('R1-BOG');
    nodes.add('PE-BOG');
    links.add('R1-BOG_PE-BOG');
  }
  if (hasR2Bog) {
    nodes.add('R2-BOG');
    nodes.add('PE-BOG');
    links.add('R2-BOG_PE-BOG');
  }
  if (hasBogota && !hasR1Bog && !hasR2Bog) {
    nodes.add('R1-BOG');
    nodes.add('R2-BOG');
    nodes.add('PE-BOG');
    links.add('R1-BOG_PE-BOG');
    links.add('R2-BOG_PE-BOG');
  }
  if (hasPeBog) {
    nodes.add('PE-BOG');
    links.add('PE-BOG_P1');
    links.add('PE-BOG_P2');
  }

  if (hasHsrp) {
    activeServices.push('HSRP');
    nodes.add('R1-BOG');
    nodes.add('R2-BOG');
    links.add('R1-BOG_R2-BOG');
  }

  if (hasR1Med || hasMedellin) {
    nodes.add('R1-MED');
    nodes.add('PE-MED');
    links.add('R1-MED_PE-MED');
  }
  if (hasPeMed) {
    nodes.add('PE-MED');
    links.add('P1_PE-MED');
    links.add('P2_PE-MED');
  }

  if (hasCali) {
    activeServices.push('GPON+PPPoE');
    nodes.add('R-CALI-GPON');
    nodes.add('ONT');
    nodes.add('SPLITTER');
    nodes.add('OLT');
    nodes.add('BNG');
    links.add('CALI_ONT');
    links.add('ONT_SPLITTER');
    links.add('SPLITTER_OLT');
    links.add('OLT_BNG');
    links.add('BNG_P1');
    links.add('BNG_P2');
  }

  if (hasIbague) {
    activeServices.push('NOC Servicios');
    nodes.add('NOC-IBAGUE');
    nodes.add('P1');
    links.add('NOC_P1');
  }

  if (hasMplsCore) {
    activeServices.push('MPLS L3VPN');
    nodes.add('PE-BOG');
    nodes.add('PE-MED');
    nodes.add('P1');
    nodes.add('P2');
    links.add('PE-BOG_P1');
    links.add('PE-BOG_P2');
    links.add('P1_P2');
    links.add('P1_PE-MED');
    links.add('P2_PE-MED');
  }

  if (hasTunnel) {
    activeServices.push('GRE/IPsec');
    if (hasCali) {
      nodes.add('R-CALI-GPON');
      nodes.add('BNG');
      nodes.add('P1');
      nodes.add('PE-BOG');
      nodes.add('R1-BOG');
      links.add('BNG_P1');
      links.add('PE-BOG_P1');
      links.add('R1-BOG_PE-BOG');
    } else {
      nodes.add('R1-MED');
      nodes.add('PE-MED');
      nodes.add('P1');
      nodes.add('P2');
      nodes.add('PE-BOG');
      nodes.add('R1-BOG');
      links.add('R1-MED_PE-MED');
      links.add('P1_PE-MED');
      links.add('PE-BOG_P1');
      links.add('R1-BOG_PE-BOG');
    }
  }

  if (hasQos) {
    activeServices.push('QoS DiffServ');
    nodes.add('PE-BOG');
    nodes.add('R1-BOG');
    links.add('R1-BOG_PE-BOG');
  }

  return { nodes, links, activeServices };
}
