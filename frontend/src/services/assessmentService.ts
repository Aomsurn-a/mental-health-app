import api from './api';

export interface AssessmentSet {
  id: number;
  name: string;
  description: string;
}

export interface Question {
  id: number;
  question: string;
  answer_options: { label: string; value: number }[];
  order_number: number;
}

export interface AssessmentSetDetail extends AssessmentSet {
  questions: Question[];
}

export interface AssessmentResult {
  id: number;
  set_id: number;
  score: number;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  recommendation: string;
  answers: Record<string, number>;
}

export interface MyResult {
  id: number;
  score: number;
  risk_level: string;
  recommendation: string;
  taken_at: string;
  set_name: string;
}

export const assessmentService = {
  getSets: async (): Promise<AssessmentSet[]> => {
    const response = await api.get('/assessment/sets');
    return response.data;
  },

  getSetById: async (id: number): Promise<AssessmentSetDetail> => {
    const response = await api.get(`/assessment/sets/${id}`);
    return response.data;
  },

  submit: async (set_id: number, answers: Record<string, number>): Promise<AssessmentResult> => {
    const response = await api.post('/assessment/submit', { set_id, answers });
    return response.data.result;
  },

  getMyResults: async (): Promise<MyResult[]> => {
    const response = await api.get('/assessment/my-results');
    return response.data;
  },
};