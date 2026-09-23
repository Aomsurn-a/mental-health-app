import api from './api';

export type PenaltyType = 'warning_1' | 'warning_2' | 'suspend_7' | 'suspend_30' | 'permanent_ban';

export interface PsychologistReport {
  id: number;
  psychologist_id: number;
  complaint_id: number;
  summary: string;
  penalty_type: PenaltyType | null;
  report_count: number;
  status: 'pending' | 'confirmed' | 'rejected';
  created_at: string;
  first_name: string;
  last_name: string;
}

export interface CreatePsychologistReportRequest {
  complaint_id: number;
  summary: string;
}

export interface HospitalReport {
  id: number;
  complaint_id: number;
  hospital_id: number;
  user_id: number;
  reason: string;
  pdf_path: string | null;
  created_at: string;
  hospital_name: string;
  first_name: string;
  last_name: string;
}

export interface CreateHospitalReportRequest {
  complaint_id: number;
}

export interface SuggestedHospital {
  hospital_id: number | null;
  hospital_name: string | null;
}

export interface MyPsychologistReport {
  id: number;
  complaint_id: number;
  summary: string;
  penalty_type: PenaltyType | null;
  report_count: number;
  status: 'pending' | 'confirmed' | 'rejected';
  acknowledged_at: string | null;
  created_at: string;
}

export const reportService = {
  getPsychologistReports: async (): Promise<PsychologistReport[]> => {
    const response = await api.get('/report/psychologist-reports');
    return response.data;
  },

  createPsychologistReport: async (data: CreatePsychologistReportRequest): Promise<void> => {
    await api.post('/report/psychologist-reports', data);
  },

  confirmPsychologistReport: async (id: number): Promise<void> => {
    await api.put(`/report/psychologist-reports/${id}/confirm`);
  },

  rejectPsychologistReport: async (id: number): Promise<void> => {
    await api.put(`/report/psychologist-reports/${id}/reject`);
  },

  getHospitalReports: async (): Promise<HospitalReport[]> => {
    const response = await api.get('/report/hospital-reports');
    return response.data;
  },

  createHospitalReport: async (data: CreateHospitalReportRequest): Promise<{ report_id: number }> => {
    const response = await api.post('/report/hospital-reports', data);
    return response.data;
  },

  suggestHospitalForUser: async (userId: number): Promise<SuggestedHospital> => {
    const response = await api.get(`/report/hospital-reports/suggest-hospital/${userId}`);
    return response.data;
  },

  getMyReports: async (): Promise<MyPsychologistReport[]> => {
    const response = await api.get('/report/my-reports');
    return response.data;
  },

  acknowledgeReport: async (id: number): Promise<void> => {
    await api.put(`/report/my-reports/${id}/acknowledge`, undefined, { timeout: 20000 });
  },

  downloadReport: async (id: number): Promise<void> => {
    const response = await api.get(`/report/hospital-reports/${id}/download`, { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.download = `hospital_report_${id}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
};
