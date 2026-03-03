import { createRouter, createWebHistory } from 'vue-router'
import Cameras from '@/views/Cameras.vue'
import Tasks from '@/views/Tasks.vue'
import Alarms from '@/views/Alarms.vue'

const routes = [
  { path: '/', redirect: '/cameras' },
  { path: '/cameras', component: Cameras, meta: { title: '摄像头管理' } },
  { path: '/tasks', component: Tasks, meta: { title: '任务管理' } },
  { path: '/alarms', component: Alarms, meta: { title: '事件告警' } },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router
