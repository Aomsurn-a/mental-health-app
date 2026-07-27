import api from './api';

export interface Complaint {
  id: number;
  sender_id?: number;
  target_id?: number;
  full_legal_name?: string;
  type: string;
  detail: string;
  status: 'pending' | 'in_progress' | 'resolved' | 'rejected';
  resolved_note?: string;
  created_at: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  target_first_name?: string;
  target_last_name?: string;
  hospital_report_id?: number | null;
}

export interface CreateComplaintRequest {
  type: string;
  detail: string;
  target_id?: number;
  full_legal_name?: string;
}

export interface AiRiskComplaint {
  id: number;
  sender_id: number;
  first_name: string;
  last_name: string;
  detail: string;
  status: string;
  created_at: string;
}

export const complaintService = {
  createComplaint: async (data: CreateComplaintRequest): Promise<void> => {
    await api.post('/complaint', data);
  },

  getMyComplaints: async (): Promise<Complaint[]> => {
    const response = await api.get('/complaint/my-complaints');
    return response.data;
  },

  getAllComplaints: async (): Promise<Complaint[]> => {
    const response = await api.get('/complaint/all');
    return response.data;
  },

  updateStatus: async (id: number, status: string, resolved_note?: string): Promise<void> => {
    await api.patch(`/complaint/${id}/status`, { status, resolved_note });
  },

  getMyAiAlerts: async (): Promise<AiRiskComplaint[]> => {
    const response = await api.get('/complaint/ai-alerts');
    return response.data;
  },

  acknowledgeAiAlert: async (id: number): Promise<void> => {
    await api.patch(`/complaint/ai-alerts/${id}/acknowledge`);
  },
};