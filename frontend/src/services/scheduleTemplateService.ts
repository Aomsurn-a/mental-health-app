import api from './api';

export interface ScheduleTemplateInput {
  day_of_week: number;
  start_time: string;
  end_time: string;
  max_patients_per_slot: number;
}
export interface ScheduleTemplate extends ScheduleTemplateInput { id: number }
export interface ScheduleGenerationResult {
  status: 'created' | 'skipped';
  reason?: 'week_exists' | 'no_templates';
  week_id?: number;
  week_start: string;
  week_end?: string;
  slotCount?: number;
}
export interface TwoWeekGenerationResult {
  results: ScheduleGenerationResult[];
  created: number;
  skipped: number;
}
const base = '/psychologist/schedule-template';
export interface ScheduleApplyResult {
  status: 'applied' | 'skipped';
  reason?: 'no_templates';
  created: number;
  updated: number;
  weekStarts: string[];
  protectedSlots: { work_date: string; start_time: string; end_time: string; appointmentCount: number }[];
}
export const scheduleTemplateService = {
  applyCurrentWeeks: async (): Promise<ScheduleApplyResult> => (await api.post(`${base}/apply-current-weeks`)).data,
  list: async (): Promise<ScheduleTemplate[]> => (await api.get(base)).data,
  create: async (value: ScheduleTemplateInput): Promise<ScheduleTemplate> => (await api.post(base, value)).data,
  update: async (id: number, value: ScheduleTemplateInput): Promise<ScheduleTemplate> => (await api.put(`${base}/${id}`, value)).data,
  remove: async (id: number): Promise<void> => { await api.delete(`${base}/${id}`); },
  generate: async (weekStartDate: string): Promise<TwoWeekGenerationResult> => (await api.post(`${base}/generate-now`, { weekStartDate, weekCount: 2 })).data,
};
