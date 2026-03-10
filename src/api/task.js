import request from './index'

export const taskApi = {
  list: () => request.get('/tasks'),
  create: (data) => request.post('/tasks', data),
  update: (id, data) => request.put(`/tasks/${id}`, data),
  remove: (id) => request.delete(`/tasks/${id}`),
  start: (id) => request.post(`/tasks/${id}/start`),
  stop: (id) => request.post(`/tasks/${id}/stop`),
  algorithms: () => request.get('/algorithms'),
}
