import api from './api';

export interface Psychologist {
  id: number;
  user_id: number;
  license_number: string;
  specialty: string;
  hospital_clinic: string;
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
  hospital_clinic: string;
}

export interface CreateAppointmentRequest {
  psychologist_id: number;
  appointment_date: string;
  appointment_time: string;
  location?: string;
  note?: string;
}

export const appointmentService = {
  getPsychologists: async (): Promise<Psychologist[]> => {
    const response = await api.get('/appointment/psychologists');
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