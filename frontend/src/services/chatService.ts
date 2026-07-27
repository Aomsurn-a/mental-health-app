import api from './api';

export interface ChatPartner {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  specialty?: string;
  hospital_clinic?: string;
  last_message?: string;
  last_message_at?: string;
  unread_count: number;
  my_last_sent_at?: string;
  my_last_sent_read?: number;
}

export interface ChatMessage {
  id: number;
  sender_id: number;
  receiver_id: number;
  message: string;
  is_read: number;
  sent_at: string;
}

export const chatService = {
  getChatList: async (): Promise<ChatPartner[]> => {
    const response = await api.get('/chat/list');
    return response.data;
  },

  getMessages: async (partner_id: number): Promise<ChatMessage[]> => {
    const response = await api.get(`/chat/messages/${partner_id}`);
    return response.data;
  },

  sendMessage: async (receiver_id: number, message: string): Promise<ChatMessage> => {
    const response = await api.post('/chat/send', { receiver_id, message });
    return response.data.data;
  },

  getNewMessages: async (partner_id: number, last_id: number): Promise<ChatMessage[]> => {
    const response = await api.get(`/chat/new?partner_id=${partner_id}&last_id=${last_id}`);
    return response.data;
  },
};