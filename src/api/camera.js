import request from './index'

export const cameraApi = {
  list: () => request.get('/cameras'),
  create: (data) => request.post('/cameras', data),
  update: (id, data) => request.put(`/cameras/${id}`, data),
  remove: (id) => request.delete(`/cameras/${id}`),
  streamStart: (id) => request.post(`/cameras/${id}/stream/start`),
  streamStop: (id) => request.post(`/cameras/${id}/stream/stop`),
}
