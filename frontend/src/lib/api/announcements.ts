// Phase 1

const API_URL = 'https://3hfuwvhp27.us-east-1.awsapprunner.com/api';

export async function getAnnouncement(): Promise<string> {
  try {
    const res = await fetch(`${API_URL}/announcements/banner`);
    const json = await res.json() as { data: { message: string } };
    return json.data.message;
  } catch {
    return '';
  }
}
