import request from './index'
import axios from 'axios'

const BASE = '/algo-manage'

export const algoManageApi = {
  // ─── Algorithms ───────────────────────────────────────
  listAlgorithms: () => request.get(`${BASE}/algorithms`),
  createAlgorithm: (data) => request.post(`${BASE}/algorithms`, data),
  updateAlgorithm: (id, data) => request.put(`${BASE}/algorithms/${id}`, data),
  deleteAlgorithm: (id) => request.delete(`${BASE}/algorithms/${id}`),

  // ─── Models ───────────────────────────────────────────
  listModels: () => request.get(`${BASE}/models`),
  createModel: (data) => request.post(`${BASE}/models`, data),
  updateModel: (id, data) => request.put(`${BASE}/models/${id}`, data),
  deleteModel: (id) => request.delete(`${BASE}/models/${id}`),

  // ─── Plugins ──────────────────────────────────────────
  listPlugins: () => request.get(`${BASE}/plugins`),
  uploadPlugin: (file) => {
    const fd = new FormData()
    fd.append('file', file)
    return axios.post('/api' + `${BASE}/plugins`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(res => {
      if (res.data?.code !== 0) throw new Error(res.data?.message || '上传失败')
      return res.data
    })
  },
  deletePlugin: (filename) => request.delete(`${BASE}/plugins/${filename}`),
}
