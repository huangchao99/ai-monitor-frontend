import request from './index'

export const alarmApi = {
  list: (params) => request.get('/alarms', { params }),
  updateStatus: (id, status) => request.put(`/alarms/${id}`, { status }),
  remove: (id) => request.delete(`/alarms/${id}`),
}
