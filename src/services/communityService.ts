import axios from 'axios';
import { CommunityEvent, CommunityResource } from '../types';

export async function fetchCommunityEvents(state: string, city: string): Promise<CommunityEvent[]> {
  const response = await axios.get('/api/community/events', {
    params: { state, city },
  });
  return Array.isArray(response.data?.events) ? response.data.events : [];
}

export async function fetchCommunityResources(
  state: string,
  city: string,
  category: 'translator' | 'shelter' | 'legal' | 'immigration',
): Promise<CommunityResource[]> {
  const response = await axios.get('/api/community/resources', {
    params: { state, city, category },
  });
  return Array.isArray(response.data?.resources) ? response.data.resources : [];
}
