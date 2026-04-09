import request from './index'

const BASE = '/position'

export const positionApi = {
  getSettings: () => request.get(`${BASE}/settings`),
  saveSettings: (data) => request.put(`${BASE}/settings`, data),
  getStatus: () => request.get(`${BASE}/status`),
}
