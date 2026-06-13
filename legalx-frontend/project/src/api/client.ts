import axios from 'axios';

const api = axios.create({ baseURL: 'https://legalx-ai-knowledge-centre.onrender.com' });
export const getTopics = () => api.get('/api/topics');
export const getSummary = (id: string) => api.get(`/api/topics/${id}/summary`);
export const getKeyInfo = (id: string) => api.get(`/api/topics/${id}/keyinfo`);
export const sendChat = (id: string, message: string, history: Array<{role: string; content: string}>) =>
  api.post(`/api/topics/${id}/chat`, { message, history });
export const generateAudio = (id: string, text: string) =>
  api.post(`/api/topics/${id}/audio`, { text }, { responseType: 'blob' });
export const transcribe = (formData: FormData) =>
  api.post('/api/transcribe', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
export const searchTopics = (q: string) => api.get('/api/search', { params: { q } });
export const downloadAudio = (id: string) =>
  api.get(`/api/topics/${id}/audio/download`, { responseType: 'blob' });

export default api;
