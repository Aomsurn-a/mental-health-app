import api from './api';

export interface Psychologist {
  id: number;
  user_id: number;
  license_number: string;
  specialty: string;
  gender: 'male' | 'female' | null;
  hospital_id: number | null;
  hospital_name: string | null;
  phone: string;
  experience_years: number;
  bio: string;
  first_name: string;
  last_name: string;
  email: string;
}

export interface Appointment {
  id: number;
  appointment_date: string;
  appointment_time: string;
  location: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled' | 'completed';
  status_note?: string;
  created_at: string;
  first_name: string;
  last_name: string;
  specialty: string;
  hospital_name: string;
  consultation_topic?: string | null;
  patient_note?: string | null;
}

export interface CreateAppointmentRequest {
  psychologist_id: number;
  hospital_id: number;
  gender: 'male' | 'female';
  appointment_date: string;
  appointment_time: string;
  location?: string;
  consultation_topic: string;
  patient_note?: string;
}

export interface RandomPsychologist {
  id: number;
  user_id: number;
  specialty: string | null;
  gender: 'male' | 'female';
  first_name: string;
  last_name: string;
}

export interface MyPsychologist {
  user_id: number;
  first_name: string;
  last_name: string;
}

export interface CurrentPsychologist {
  psychologist_id: number;
  hospital_id: number | null;
  user_id: number;
  first_name: string;
  last_name: string;
}

export const appointmentService = {
  getPsychologists: async (): Promise<Psychologist[]> => {
    const response = await api.get('/appointment/psychologists');
    return response.data;
  },

  getRandomPsychologist: async (hospitalId: number, gender: 'male' | 'female'): Promise<RandomPsychologist> => {
    const response = await api.get('/appointment/random-psychologist', { params: { hospital_id: hospitalId, gender } });
    return response.data;
  },

  getRandomReplacementPsychologist: async (gender: 'male' | 'female'): Promise<RandomPsychologist> => {
    const response = await api.get('/appointment/random-replacement-psychologist', { params: { gender } });
    return response.data;
  },

  getMyPsychologists: async (): Promise<MyPsychologist[]> => {
    const response = await api.get('/appointment/my-psychologists');
    return response.data;
  },

  getCurrentPsychologist: async (): Promise<CurrentPsychologist | null> => {
    const response = await api.get('/appointment/current-psychologist');
    return response.data;
  },

  createAppointment: async (data: CreateAppointmentRequest): Promise<void> => {
    await api.post('/appointment', data);
  },

  getMyAppointments: async (): Promise<Appointment[]> => {
    const response = await api.get('/appointment/my-appointments');
    return response.data;
  },

  cancelAppointment: async (id: number): Promise<void> => {
    await api.patch(`/appointment/${id}/cancel`);
  },

  getPsychologistAppointments: async (): Promise<Appointment[]> => {
    const response = await api.get('/appointment/psy-appointments');
    return response.data;
  },

  updateAppointmentStatus: async (id: number, status: string, status_note?: string): Promise<void> => {
    await api.patch(`/appointment/${id}/status`, { status, status_note });
  },

  // เพิ่มใน appointmentService
  createAppointmentByPsy: async (data: {
    user_id: number;
    psychologist_id: number;
    appointment_date: string;
    appointment_time: string;
    location?: string;
    note?: string;
  }): Promise<void> => {
    await api.post('/appointment/by-psy', data);
  },
};
