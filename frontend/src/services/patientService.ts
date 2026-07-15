import api from './api';

export interface Patient {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  total_appointments: number;
  last_appointment: string;
}

export interface PatientDetail {
  assessments: {
    id: number;
    score: number;
    risk_level: string;
    recommendation: string;
    taken_at: string;
    set_name: string;
  }[];
  moods: {
    mood_date: string;
    mood_score: number;
    note: string;
  }[];
  appointments: {
    id: number;
    appointment_date: string;
    appointment_time: string;
    status: string;
    status_note: string;
  }[];
}

export const patientService = {
  getMyPatients: async (): Promise<Patient[]> => {
    const response = await api.get('/patient');
    return response.data;
  },

  getPatientDetail: async (patient_id: number): Promise<PatientDetail> => {
    const response = await api.get(`/patient/${patient_id}`);
    return response.data;
  },

  addRecord: async (data: {
    patient_id: number;
    symptoms?: string;
    symptom_cause?: string;
    treatment?: string;
    treatment_result?: string;
    treatment_date: string;
  }): Promise<void> => {
    await api.post('/patient/record', data);
  },

  getPatientRecords: async (patient_id: number): Promise<{
    id: number;
    symptoms: string;
    symptom_cause: string;
    treatment: string;
    treatment_result: string;
    treatment_date: string;
    first_name: string;
    last_name: string;
  }[]> => {
    const response = await api.get(`/patient/${patient_id}/records`);
    return response.data;
  },
};