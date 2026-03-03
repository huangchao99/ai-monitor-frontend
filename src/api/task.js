import request from './index'

export const taskApi = {
  list: () => request.get('/tasks'),
  create: (data) => request.post('/tasks', data),
  remove: (id) => request.delete(`/tasks/${id}`),
  start: (id) => request.post(`/tasks/${id}/start`),
  stop: (id) => request.post(`/tasks/${id}/stop`),
  algorithms: () => request.get('/algorithms'),
}
