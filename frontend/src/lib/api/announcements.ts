// Phase 1

import { API_URL } from './config';

export async function getAnnouncement(): Promise<string> {
  try {
    const res = await fetch(`${API_URL}/announcements/banner`);
    const json = await res.json() as { data: { message: string } };
    return json.data.message;
  } catch {
    return '';
  }
}
