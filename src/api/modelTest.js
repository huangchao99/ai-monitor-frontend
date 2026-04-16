import axios from 'axios'
import request from './index'

const BASE = '/model-test'

export const modelTestApi = {
  createSession: (data) => request.post(`${BASE}/sessions`, data),
  getSession: (id) => request.get(`${BASE}/sessions/${id}`),
  getLatest: (id) => request.get(`${BASE}/sessions/${id}/latest`),
  heartbeat: (id) => request.post(`${BASE}/sessions/${id}/heartbeat`),
  deleteSession: (id) => request.delete(`${BASE}/sessions/${id}`),
  getImage: (id, ts) =>
    axios.get(`/api${BASE}/sessions/${encodeURIComponent(id)}/image`, {
      params: ts ? { ts } : undefined,
      responseType: 'blob',
    }),
}
