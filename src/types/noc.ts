export type RiskLevel = 'Bajo' | 'Medio' | 'Alto';

export type DecisionStatus = 'Aprobado' | 'Cambios solicitados' | 'Rechazado';

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: string;
  isError?: boolean;
}

export interface ValidationCounts {
  ok: number;
  fail: number;
  warn: number;
}

export interface DecisionEntry {
  id: string;
  timestamp: string;
  requestSummary: string;
  risk: RiskLevel | 'No especificado';
  decision: DecisionStatus;
  adminName: string;
  messageId: string;
}

export interface ScenarioItem {
  id: string;
  label: string;
  prompt: string;
}

export type TopologyNodeId =
  | 'R1-BOG'
  | 'R2-BOG'
  | 'R1-MED'
  | 'R-CALI-GPON'
  | 'ONT'
  | 'SPLITTER'
  | 'OLT'
  | 'BNG'
  | 'NOC-IBAGUE'
  | 'PE-BOG'
  | 'PE-MED'
  | 'P1'
  | 'P2';

export type TopologyLinkId =
  | 'R1-BOG_R2-BOG'
  | 'R1-BOG_PE-BOG'
  | 'R2-BOG_PE-BOG'
  | 'R1-MED_PE-MED'
  | 'PE-BOG_P1'
  | 'PE-BOG_P2'
  | 'P1_P2'
  | 'P1_PE-MED'
  | 'P2_PE-MED'
  | 'NOC_P1'
  | 'BNG_P1'
  | 'BNG_P2'
  | 'CALI_ONT'
  | 'ONT_SPLITTER'
  | 'SPLITTER_OLT'
  | 'OLT_BNG';

export interface TopologyHighlight {
  nodes: Set<TopologyNodeId>;
  links: Set<TopologyLinkId>;
  activeServices: string[];
}
