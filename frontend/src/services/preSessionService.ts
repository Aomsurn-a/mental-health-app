import api from './api';

export interface RiskBullet {
  id: string;
  severity: 'critical' | 'high' | 'medium';
  text: string;
  source: string;
}
export interface SessionSummary {
  summary_text?: string;
  based_on_records_count?: number;
  generated_at?: string;
  cached?: boolean;
  empty?: boolean;
}
export const preSessionService = {
  getSummary: async (patientId: number, force = false, signal?: AbortSignal): Promise<SessionSummary> => {
    const url = `/psychologist/patients/${patientId}/session-summary`;
    const config = { signal, timeout: 40000 };
    const response = force ? await api.post(url, {}, config) : await api.get(url, config);
    return response.data;
  },
  getBullets: async (patientId: number, signal?: AbortSignal): Promise<{ bullets: RiskBullet[] }> => {
    const response = await api.get(`/psychologist/patients/${patientId}/risk-bullets`, { signal });
    return response.data;
  },
};
