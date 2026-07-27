import api from './api';

export interface AiChatMessage {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  risk_flag?: number;
  created_at: string;
}

export interface AiRiskAlert {
  id: number;
  user_id: number;
  first_name: string;
  last_name: string;
  content: string;
  created_at: string;
}

interface SendAiMessageResult {
  message: string;
  data: {
    user_message: AiChatMessage;
    assistant_message: AiChatMessage;
  };
}

export const aiChatService = {
  sendMessage: async (message: string): Promise<SendAiMessageResult> => {
    const response = await api.post('/ai-chat/send', { message });
    return response.data;
  },

  getHistory: async (): Promise<AiChatMessage[]> => {
    const response = await api.get('/ai-chat/history');
    return response.data;
  },

  getRiskAlerts: async (): Promise<AiRiskAlert[]> => {
    const response = await api.get('/ai-chat/risk-alerts');
    return response.data;
  },

  acknowledgeRiskAlert: async (id: number): Promise<void> => {
    await api.post(`/ai-chat/risk-alerts/${id}/acknowledge`);
  },
};
