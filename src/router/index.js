import { createRouter, createWebHistory } from 'vue-router'
import Dashboard from '@/views/Dashboard.vue'
import Cameras from '@/views/Cameras.vue'
import Tasks from '@/views/Tasks.vue'
import Alarms from '@/views/Alarms.vue'
import AlgoManage from '@/views/AlgoManage.vue'

const routes = [
  { path: '/', redirect: '/dashboard' },
  { path: '/dashboard', component: Dashboard, meta: { title: '控制台' } },
  { path: '/cameras', component: Cameras, meta: { title: '摄像头管理' } },
  { path: '/tasks', component: Tasks, meta: { title: '任务管理' } },
  { path: '/alarms', component: Alarms, meta: { title: '事件告警' } },
  { path: '/algo-manage', component: AlgoManage, meta: { title: '算法管理' } },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router
