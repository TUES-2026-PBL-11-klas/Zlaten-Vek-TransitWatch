import axios from 'axios';
import { supabase } from './supabase';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api',
});

api.interceptors.request.use(async (config) => {
  const { data: { session } } = await supabase.auth.getSession();

  if (session) {
    // Check if token expires within the next 60 seconds; if so, force a refresh
    const expiresAt = session.expires_at ?? 0;
    if (expiresAt - Math.floor(Date.now() / 1000) < 60) {
      const { data: refreshed } = await supabase.auth.refreshSession();
      config.headers.Authorization = `Bearer ${refreshed.session?.access_token}`;
    } else {
      config.headers.Authorization = `Bearer ${session.access_token}`;
    }
  }

  return config;
});

export default api;
