import request from './index'

const BASE = '/system'

export const systemApi = {
  getInfo: () => request.get(`${BASE}/info`),
  listNetworkInterfaces: () => request.get(`${BASE}/network/interfaces`),
  saveNetworkInterface: (name, data) => request.put(`${BASE}/network/interfaces/${name}`, data),
  listLogServices: () => request.get(`${BASE}/logs/services`),
  getServiceLogs: (key, params) => request.get(`${BASE}/logs/services/${key}`, { params }),
  restartService: (key) => request.post(`${BASE}/logs/services/${key}/restart`),
}
