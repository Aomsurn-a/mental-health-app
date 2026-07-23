import api from './api';

export interface UserAdmin {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  phone: string;
  province: string;
  status: string;
  created_at: string;
}

export interface AdminStats {
  users: {
    total_users: number;
    total_psychologists: number;
    total_admins: number;
    suspended_psychologists: number;
  };
  appointments: {
    total: number;
    today: number;
    by_status: Record<'pending' | 'approved' | 'completed' | 'rejected' | 'cancelled', number>;
  };
  complaints: {
    total: number;
    by_status: Record<'pending' | 'in_progress' | 'resolved' | 'rejected', number>;
    pending_by_type: Record<'change_psychologist' | 'report_system' | 'report_psychologist' | 'other', number>;
  };
  reports: {
    psychologist_pending: number;
    psychologist_confirmed: number;
    hospital_total: number;
  };
  hospitals: {
    total: number;
    active: number;
  };
  recent_complaints: {
    id: number;
    type: string;
    status: string;
    created_at: string;
    first_name: string;
    last_name: string;
  }[];
  recent_reports: {
    id: number;
    penalty_type: string | null;
    report_count: number;
    status: string;
    created_at: string;
    first_name: string;
    last_name: string;
  }[];
}

export const adminService = {
  getStats: async (): Promise<AdminStats> => {
    const response = await api.get('/admin/stats');
    return response.data;
  },

  getAllUsers: async (): Promise<UserAdmin[]> => {
    const response = await api.get('/admin/users');
    return response.data;
  },

  createUser: async (data: any): Promise<void> => {
    await api.post('/admin/users', data);
  },

  updateUser: async (id: number, data: any): Promise<void> => {
    await api.put(`/admin/users/${id}`, data);
  },

  resetPassword: async (id: number, password: string): Promise<void> => {
    await api.patch(`/admin/users/${id}/password`, { password });
  },

  deleteUser: async (id: number): Promise<void> => {
    await api.delete(`/admin/users/${id}`);
  },

  getAllComplaints: async (): Promise<any[]> => {
    const response = await api.get('/admin/complaints');
    return response.data;
  },

  updateComplaintStatus: async (id: number, status: string, resolved_note?: string): Promise<void> => {
    await api.patch(`/admin/complaints/${id}/status`, { status, resolved_note });
  },
};