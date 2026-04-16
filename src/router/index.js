import { createRouter, createWebHistory } from 'vue-router'
import Dashboard from '@/views/Dashboard.vue'
import Cameras from '@/views/Cameras.vue'
import Tasks from '@/views/Tasks.vue'
import Alarms from '@/views/Alarms.vue'
import AlgoManage from '@/views/AlgoManage.vue'
import ModelTest from '@/views/ModelTest.vue'
import VoiceAlarm from '@/views/VoiceAlarm.vue'
import AlarmUpload from '@/views/AlarmUpload.vue'
import Position from '@/views/Position.vue'
import SystemInfo from '@/views/SystemInfo.vue'
import NetworkConfig from '@/views/NetworkConfig.vue'
import SystemLogs from '@/views/SystemLogs.vue'

const routes = [
  { path: '/', redirect: '/dashboard' },
  { path: '/dashboard', component: Dashboard, meta: { title: '控制台' } },
  { path: '/cameras', component: Cameras, meta: { title: '摄像头管理' } },
  { path: '/tasks', component: Tasks, meta: { title: '任务管理' } },
  { path: '/alarms', component: Alarms, meta: { title: '事件告警' } },
  { path: '/algo-manage', component: AlgoManage, meta: { title: '算法管理' } },
  { path: '/model-test', component: ModelTest, meta: { title: '模型测试' } },
  { path: '/position', component: Position, meta: { title: '定位管理' } },
  { path: '/voice-alarm', component: VoiceAlarm, meta: { title: '语音报警' } },
  { path: '/alarm-upload', component: AlarmUpload, meta: { title: '报警上传' } },
  { path: '/system-info', component: SystemInfo, meta: { title: '系统信息' } },
  { path: '/system-network', component: NetworkConfig, meta: { title: '网络配置' } },
  { path: '/system-logs', component: SystemLogs, meta: { title: '日志查看' } },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router
