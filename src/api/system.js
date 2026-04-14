import request from './index'

const BASE = '/system'

export const systemApi = {
  getInfo: () => request.get(`${BASE}/info`),
}
