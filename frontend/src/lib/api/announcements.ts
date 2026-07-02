const API_URL = 'https://d1k5e466mkmb2q.cloudfront.net/api';

export async function getAnnouncement(): Promise<string> {
  try {
    const res = await fetch(`${API_URL}/announcements/banner`);
    const json = await res.json() as { data: { message: string } };
    return json.data.message;
  } catch {
    return '';
  }
}
