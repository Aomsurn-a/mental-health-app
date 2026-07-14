import api from './api';

export interface MoodEntry {
  id?: number;
  mood_date: string;
  mood_score: number;
  answers?: Record<string, boolean>;
  note?: string;
}

export const moodService = {
  saveMood: async (data: MoodEntry): Promise<void> => {
    await api.post('/mood', data);
  },

  getMoodByDate: async (date: string): Promise<MoodEntry | null> => {
    const response = await api.get(`/mood/${date}`);
    return response.data;
  },

  getMyMoods: async (year: number, month: number): Promise<MoodEntry[]> => {
    const response = await api.get(`/mood/my-moods?year=${year}&month=${month}`);
    return response.data;
  },
};