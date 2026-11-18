export type IncidentCategory =
  | 'Internet lenta'
  | 'Sem ligação'
  | 'Interrupções frequentes'
  | 'Cobertura insuficiente'
  | 'Instabilidade'
  | 'Outro';

export type IncidentStatus = 'Recebido' | 'Em análise' | 'Classificado' | 'Encerrado';

export interface Incident {
  id: string;
  reference: string;
  category: IncidentCategory;
  description: string;
  provider: string;
  province: string;
  municipality: string;
  neighborhood: string;
  latitude: number;
  longitude: number;
  createdAt: string;
  status: IncidentStatus;
  aiClassification: string;
  history: { status: IncidentStatus; date: string; note: string }[];
  hasAttachment?: boolean;
}

export const INCIDENT_CATEGORIES: IncidentCategory[] = [
  'Internet lenta',
  'Sem ligação',
  'Interrupções frequentes',
  'Cobertura insuficiente',
  'Instabilidade',
  'Outro',
];

export const ANGOLA_PROVINCES = [
  'Luanda',
  'Benguela',
  'Huíla',
  'Huambo',
  'Cabinda',
  'Namibe',
  'Uíge',
  'Malanje',
];
