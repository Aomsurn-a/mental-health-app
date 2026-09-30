import api from './api';
export type ChatSummarySelection = { lastNMessages: number } | { startDate: string; endDate: string };
export interface ChatSummaryResult {
  summary: string[];
  messageCount: number;
  dateRange: { from: string; to: string };
}
export const chatSummaryService = {
  summarize: async (patientId: number, selection: ChatSummarySelection, signal?: AbortSignal): Promise<ChatSummaryResult> => {
    const response = await api.post(`/psychologist/chat/${patientId}/summarize`, selection, { signal, timeout: 40000 });
    return response.data;
  },
};
