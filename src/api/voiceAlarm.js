import request from './index'
import axios from 'axios'

const BASE = '/voice-alarm'

export const voiceAlarmApi = {
  // ─── Settings ─────────────────────────────────────────
  getSettings: () => request.get(`${BASE}/settings`),
  saveSettings: (data) => request.put(`${BASE}/settings`, data),

  // ─── Algo Map ─────────────────────────────────────────
  listAlgoMap: () => request.get(`${BASE}/algo-map`),
  setAlgoMap: (algoId, audioFile) =>
    request.put(`${BASE}/algo-map/${algoId}`, { audio_file: audioFile }),
  deleteAlgoMap: (algoId) => request.delete(`${BASE}/algo-map/${algoId}`),

  // ─── Audio Files ──────────────────────────────────────
  listAudioFiles: () => request.get(`${BASE}/audio-files`),
  uploadAudioFile: (file) => {
    const fd = new FormData()
    fd.append('file', file)
    return axios.post('/api' + `${BASE}/audio-files`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(res => {
      if (res.data?.code !== 0) throw new Error(res.data?.message || '上传失败')
      return res.data
    })
  },
  deleteAudioFile: (name) => request.delete(`${BASE}/audio-files/${name}`),
}
