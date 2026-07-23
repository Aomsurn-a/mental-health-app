import api from './api';

export interface Hospital {
  id: number;
  name: string;
  address: string;
  phone: string;
  status: 'active' | 'inactive';
  created_at: string;
}

export interface HospitalPsychologist {
  id: number;
  user_id: number;
  license_number: string;
  specialty: string;
  hospital_id: number;
  phone: string;
  experience_years: number;
  bio: string;
  first_name: string;
  last_name: string;
  email: string;
}

export interface HospitalRequest {
  name: string;
  address?: string;
  phone?: string;
  status?: string;
}

export interface SameHospitalPsychologist {
  psychologist_id: number;
  user_id: number;
  first_name: string;
  last_name: string;
  specialty: string;
}

export const hospitalService = {
  getAllHospitals: async (): Promise<Hospital[]> => {
    const response = await api.get('/hospital');
    return response.data;
  },

  createHospital: async (data: HospitalRequest): Promise<void> => {
    await api.post('/hospital', data);
  },

  updateHospital: async (id: number, data: HospitalRequest): Promise<void> => {
    await api.put(`/hospital/${id}`, data);
  },

  deleteHospital: async (id: number): Promise<void> => {
    await api.delete(`/hospital/${id}`);
  },

  getPsychologistsByHospital: async (id: number): Promise<HospitalPsychologist[]> => {
    const response = await api.get(`/hospital/${id}/psychologists`);
    return response.data;
  },

  assignPsychologist: async (hospitalId: number, psychologist_id: number): Promise<void> => {
    await api.post(`/hospital/${hospitalId}/psychologists`, { psychologist_id });
  },

  removePsychologist: async (hospitalId: number, psychologistId: number): Promise<void> => {
    await api.delete(`/hospital/${hospitalId}/psychologists/${psychologistId}`);
  },

  getPsychologistsSameHospital: async (currentPsyId: number): Promise<SameHospitalPsychologist[]> => {
    const response = await api.get(`/hospital/psychologists-same-hospital/${currentPsyId}`);
    return response.data;
  },
};
