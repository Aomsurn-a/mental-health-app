import api from './api';

export interface ScheduleWeek {
  id: number;
  week_start: string;
  week_end: string;
  work_dates: string[];
}

export interface ScheduleSlot {
  id?: number;
  day_of_week: number; // 0=อาทิตย์, 1=จันทร์, ... 6=เสาร์
  work_date: string; // 'YYYY-MM-DD'
  start_time: string; // 'HH:MM:SS'
  end_time: string; // 'HH:MM:SS'
  max_patients_per_slot: number;
}

export interface WeekDetail {
  id: number;
  week_start: string;
  week_end: string;
  schedules: ScheduleSlot[];
}

export interface DaySlotInput {
  start_time: string;
  end_time: string;
  max_patients_per_slot: number;
}

export interface DayInput {
  day_of_week: number;
  work_date: string;
  slots: DaySlotInput[];
}

export interface WeekRequest {
  week_start: string;
  week_end: string;
  days: DayInput[];
}

export interface AvailableSlot {
  id: number;
  work_date: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  max_patients_per_slot: number;
  total_slots: number;
  booked_count: number;
  remaining: number;
}

export const scheduleService = {
  getWeeks: async (): Promise<ScheduleWeek[]> => {
    const response = await api.get('/schedule/weeks');
    return response.data;
  },

  createWeek: async (data: WeekRequest): Promise<{ week_id: number }> => {
    const response = await api.post('/schedule/weeks', data);
    return response.data;
  },

  getWeekDetail: async (id: number): Promise<WeekDetail> => {
    const response = await api.get(`/schedule/weeks/${id}`);
    return response.data;
  },

  updateWeek: async (id: number, data: WeekRequest): Promise<void> => {
    await api.put(`/schedule/weeks/${id}`, data);
  },

  deleteWeek: async (id: number): Promise<void> => {
    await api.delete(`/schedule/weeks/${id}`);
  },

  getAvailableSlots: async (psyId: number): Promise<AvailableSlot[]> => {
    const response = await api.get(`/schedule/available/${psyId}`);
    return response.data;
  },
};
