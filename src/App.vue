<template>
  <el-container style="height: 100vh">
    <!-- Sidebar -->
    <el-aside width="240px" class="modern-sidebar">
      <div class="logo">
        <div class="logo-icon">
          <el-icon size="20" color="#ffffff"><VideoCamera /></el-icon>
        </div>
        <span>HiFleet AI</span>
      </div>
      <el-menu
        :default-active="activeMenu"
        class="modern-menu"
        background-color="transparent"
        text-color="#94a3b8"
        active-text-color="#ffffff"
        router
      >
        <el-menu-item index="/dashboard">
          <el-icon><Monitor /></el-icon>
          <span>控制台</span>
        </el-menu-item>
        <el-menu-item index="/cameras">
          <el-icon><VideoCamera /></el-icon>
          <span>设备管理</span>
        </el-menu-item>
        <el-menu-item index="/tasks">
          <el-icon><SetUp /></el-icon>
          <span>任务管理</span>
        </el-menu-item>
        <el-menu-item index="/alarms">
          <el-icon><Warning /></el-icon>
          <span>事件告警</span>
          <el-badge v-if="unhandledCount > 0" :value="unhandledCount" class="alarm-badge" type="danger" />
        </el-menu-item>
        <el-menu-item index="/algo-manage">
          <el-icon><Grid /></el-icon>
          <span>算法模型</span>
        </el-menu-item>
        <el-menu-item index="/voice-alarm">
          <el-icon><Bell /></el-icon>
          <span>语音报警</span>
        </el-menu-item>
        <el-menu-item index="/alarm-upload">
          <el-icon><Upload /></el-icon>
          <span>报警上传</span>
        </el-menu-item>
      </el-menu>
    </el-aside>

    <!-- Main -->
    <el-container class="main-container">
      <el-header class="modern-header">
        <div class="header-title">
          {{ currentTitle }}
        </div>
        <div class="header-status">
          <div class="status-item" :class="{ 'is-online': healthStatus.zlm }">
            <span class="status-dot"></span>
            ZLM 流媒体
          </div>
          <div class="status-item" :class="{ 'is-online': healthStatus.python }">
            <span class="status-dot"></span>
            AI 推理服务
          </div>
        </div>
      </el-header>
      <el-main class="modern-main">
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { Monitor, Grid, Bell } from '@element-plus/icons-vue'
import axios from 'axios'

const route = useRoute()
const healthStatus = ref({ zlm: false, python: false })
const unhandledCount = ref(0)

const activeMenu = computed(() => route.path)
const currentTitle = computed(() => route.meta?.title || 'AI 智能监控')

async function checkHealth() {
  try {
    const res = await axios.get('/api/health')
    const d = res.data?.data || {}
    healthStatus.value = { zlm: d.zlm_alive, python: d.python_alive }
  } catch { /* ignore */ }
}

async function fetchUnhandled() {
  try {
    const res = await axios.get('/api/alarms', { params: { status: 0, size: 1 } })
    unhandledCount.value = res.data?.data?.total || 0
  } catch { /* ignore */ }
}

let timer = null
onMounted(() => {
  checkHealth()
  fetchUnhandled()
  timer = setInterval(() => {
    checkHealth()
    fetchUnhandled()
  }, 15000)
})
onUnmounted(() => clearInterval(timer))
</script>

<style>
/* 侧边栏样式 */
.modern-sidebar {
  background-color: #0f172a; /* Tailwind slate-900 */
  box-shadow: 4px 0 10px rgba(0, 0, 0, 0.05);
  z-index: 20;
  display: flex;
  flex-direction: column;
}

.logo {
  height: 72px;
  display: flex;
  align-items: center;
  padding: 0 24px;
  gap: 12px;
  background: #0b1120;
}

.logo-icon {
  width: 32px;
  height: 32px;
  background: linear-gradient(135deg, #3b82f6, #2563eb);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 6px rgba(59, 130, 246, 0.4);
}

.logo span {
  font-size: 18px;
  font-weight: 700;
  color: #ffffff;
  letter-spacing: 0.5px;
}

/* 菜单样式优化 */
.modern-menu {
  border-right: none !important;
  padding: 12px 8px;
}

.modern-menu .el-menu-item {
  height: 48px !important;
  line-height: 48px !important;
  margin-bottom: 8px !important;
  border-radius: 8px !important;
  font-weight: 500;
  transition: all 0.2s ease;
}

.modern-menu .el-menu-item:hover {
  background-color: #1e293b !important; /* Tailwind slate-800 */
  color: #f8fafc !important;
}

.modern-menu .el-menu-item.is-active {
  background-color: #3b82f6 !important;
  color: #ffffff !important;
  box-shadow: 0 4px 6px rgba(59, 130, 246, 0.25);
}

.alarm-badge {
  margin-left: auto;
}

/* 主内容区样式 */
.main-container {
  background-color: var(--bg-color);
}

.modern-header {
  height: 64px !important;
  background: #ffffff !important;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05);
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px !important;
}

.header-title {
  font-size: 18px;
  font-weight: 600;
  color: #111827;
}

.header-status {
  display: flex;
  align-items: center;
  gap: 16px;
}

.status-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 500;
  color: #6b7280;
  background: #f3f4f6;
  padding: 6px 12px;
  border-radius: 20px;
  border: 1px solid #e5e7eb;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: #ef4444; /* red */
}

.status-item.is-online .status-dot {
  background-color: #10b981; /* green */
  box-shadow: 0 0 6px rgba(16, 185, 129, 0.4);
}
.status-item.is-online {
  color: #059669;
  background: #ecfdf5;
  border-color: #d1fae5;
}

.modern-main {
  padding: 24px !important;
  height: calc(100vh - 64px);
  overflow-y: auto;
}
</style>
