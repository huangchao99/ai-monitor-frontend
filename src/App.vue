<template>
  <el-container style="height: 100vh">
    <!-- Sidebar -->
    <el-aside width="220px" style="background:#001529">
      <div class="logo">
        <el-icon size="22" color="#1890ff"><VideoCamera /></el-icon>
        <span>AI 智能监控</span>
      </div>
      <el-menu
        :default-active="activeMenu"
        background-color="#001529"
        text-color="#c0c4cc"
        active-text-color="#ffffff"
        router
      >
        <el-menu-item index="/dashboard">
          <el-icon><Monitor /></el-icon>
          <span>控制台</span>
        </el-menu-item>
        <el-menu-item index="/cameras">
          <el-icon><VideoCamera /></el-icon>
          <span>摄像头管理</span>
        </el-menu-item>
        <el-menu-item index="/tasks">
          <el-icon><SetUp /></el-icon>
          <span>任务管理</span>
        </el-menu-item>
        <el-menu-item index="/alarms">
          <el-icon><Warning /></el-icon>
          <span>事件告警</span>
          <el-badge v-if="unhandledCount > 0" :value="unhandledCount" class="alarm-badge" />
        </el-menu-item>
      </el-menu>
    </el-aside>

    <!-- Main -->
    <el-container>
      <el-header style="background:#fff;border-bottom:1px solid #eee;display:flex;align-items:center;justify-content:space-between">
        <div style="font-size:16px;font-weight:600;color:#303133">
          {{ currentTitle }}
        </div>
        <div style="display:flex;align-items:center;gap:12px">
          <el-tag :type="healthStatus.zlm ? 'success' : 'danger'" size="small">
            ZLM {{ healthStatus.zlm ? '在线' : '离线' }}
          </el-tag>
          <el-tag :type="healthStatus.python ? 'success' : 'danger'" size="small">
            算法服务 {{ healthStatus.python ? '在线' : '离线' }}
          </el-tag>
        </div>
      </el-header>
      <el-main style="background:#f5f6fa;padding:20px">
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { Monitor } from '@element-plus/icons-vue'
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
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }

.logo {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: #fff;
  font-size: 16px;
  font-weight: 700;
  border-bottom: 1px solid #1f2d3d;
}

.alarm-badge {
  margin-left: auto;
}

.el-menu { border-right: none !important; }
.el-header { height: 60px !important; }
</style>
