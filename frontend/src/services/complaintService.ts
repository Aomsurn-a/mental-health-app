import api from './api';

export interface Complaint {
  id: number;
  type: string;
  detail: string;
  status: 'pending' | 'in_progress' | 'resolved' | 'rejected';
  resolved_note?: string;
  created_at: string;
  first_name?: string;
  last_name?: string;
  email?: string;
}

export interface CreateComplaintRequest {
  type: string;
  detail: string;
  target_id?: number;
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
};