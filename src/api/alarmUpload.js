import request from './index'

const BASE = '/alarm-upload'

export const alarmUploadApi = {
  getSettings: () => request.get(`${BASE}/settings`),
  saveSettings: (data) => request.put(`${BASE}/settings`, data),
  getStats: () => request.get(`${BASE}/stats`),
  listQueue: (params) => request.get(`${BASE}/queue`, { params }),
  retryFailed: () => request.post(`${BASE}/retry`),
}
