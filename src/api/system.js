import request from './index'

const BASE = '/system'

export const systemApi = {
  getInfo: () => request.get(`${BASE}/info`),
  listNetworkInterfaces: () => request.get(`${BASE}/network/interfaces`),
  saveNetworkInterface: (name, data) => request.put(`${BASE}/network/interfaces/${name}`, data),
}
