<template>
  <div class="network-config-page">
    <el-card class="section-card" shadow="never">
      <template #header>
        <div class="card-header">
          <div style="display:flex;align-items:center;gap:8px">
            <el-icon class="header-icon"><Connection /></el-icon>
            <span>网络配置</span>
          </div>
          <el-button :icon="Refresh" size="small" @click="fetchInterfaces" :loading="loading">
            刷新
          </el-button>
        </div>
      </template>

      <div class="network-layout">
        <div class="interface-sidebar">
          <div class="sidebar-title">网络接口</div>
          <div
            v-for="item in interfaces"
            :key="item.name"
            class="interface-item"
            :class="{ active: item.name === selectedInterfaceName }"
            @click="selectedInterfaceName = item.name"
          >
            <div class="interface-main">
              <div class="interface-name">{{ item.name }}</div>
              <div class="interface-display">{{ item.display_name }}</div>
            </div>
            <el-tag :type="item.connected ? 'success' : 'info'" effect="light" round>
              {{ item.state || '未知' }}
            </el-tag>
          </div>
        </div>

        <div class="config-panel" v-loading="loading">
          <template v-if="activeInterface">
            <div class="panel-title">网络配置</div>

            <div class="status-row">
              <div class="status-chip">
                <span class="chip-label">状态信息</span>
                <el-tag :type="activeInterface.connected ? 'success' : 'info'" round>
                  {{ activeInterface.state || '未知' }}
                </el-tag>
              </div>
              <div class="status-chip">
                <span class="chip-label">连接配置</span>
                <span>{{ activeInterface.connection_name || '未绑定' }}</span>
              </div>
            </div>

            <el-alert
              v-if="permissionHint"
              class="permission-alert"
              type="warning"
              :closable="false"
              show-icon
              :title="permissionHint"
            />

            <el-form label-width="110px" class="network-form">
              <el-form-item label="获取 IP 方式">
                <el-radio-group v-model="form.method">
                  <el-radio label="auto">DHCP</el-radio>
                  <el-radio label="manual">静态</el-radio>
                </el-radio-group>
              </el-form-item>

              <div class="form-section-title">网络设置</div>

              <el-form-item label="IP 地址">
                <el-input
                  v-model="form.ip_address"
                  :disabled="form.method === 'auto'"
                  placeholder="如：192.168.1.100"
                />
              </el-form-item>
              <el-form-item label="子网掩码">
                <el-input
                  v-model="form.subnet_mask"
                  :disabled="form.method === 'auto'"
                  placeholder="如：255.255.255.0"
                />
              </el-form-item>
              <el-form-item label="默认网关">
                <el-input
                  v-model="form.gateway"
                  :disabled="form.method === 'auto'"
                  placeholder="如：192.168.1.1"
                />
              </el-form-item>

              <div class="form-section-title">DNS 设置</div>

              <el-form-item label="首选 DNS">
                <el-input
                  v-model="form.primary_dns"
                  :disabled="form.method === 'auto'"
                  placeholder="如：192.168.1.1"
                />
              </el-form-item>
              <el-form-item label="备用 DNS">
                <el-input
                  v-model="form.secondary_dns"
                  :disabled="form.method === 'auto'"
                  placeholder="如：8.8.8.8"
                />
              </el-form-item>

              <div class="form-section-title">硬件信息</div>

              <el-form-item label="MAC 地址">
                <el-input :model-value="activeInterface.mac_address || '—'" readonly />
              </el-form-item>

              <el-form-item>
                <el-button type="primary" @click="saveConfig" :loading="saving">
                  保存
                </el-button>
                <el-button @click="resetForm">重置</el-button>
              </el-form-item>
            </el-form>
          </template>

          <el-empty v-else description="未发现可配置网口" />
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { computed, reactive, ref, watch, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Connection, Refresh } from '@element-plus/icons-vue'
import { systemApi } from '@/api/system'

const loading = ref(false)
const saving = ref(false)
const interfaces = ref([])
const selectedInterfaceName = ref('')

const form = reactive({
  method: 'auto',
  ip_address: '',
  subnet_mask: '',
  gateway: '',
  primary_dns: '',
  secondary_dns: '',
})

const activeInterface = computed(() =>
  interfaces.value.find((item) => item.name === selectedInterfaceName.value) || null
)

const permissionHint = computed(() => {
  if (!activeInterface.value) return ''
  return '保存时将直接调用 NetworkManager 应用配置。如果后端服务以普通用户运行，可能需要 root 权限或免交互授权。'
})

function syncForm(item) {
  form.method = item?.method || 'auto'
  form.ip_address = item?.ip_address || ''
  form.subnet_mask = item?.subnet_mask || ''
  form.gateway = item?.gateway || ''
  form.primary_dns = item?.primary_dns || ''
  form.secondary_dns = item?.secondary_dns || ''
}

function resetForm() {
  syncForm(activeInterface.value)
}

watch(activeInterface, (value) => {
  syncForm(value)
}, { immediate: true })

async function fetchInterfaces() {
  loading.value = true
  try {
    const res = await systemApi.listNetworkInterfaces()
    interfaces.value = res.data?.interfaces || []
    if (!selectedInterfaceName.value || !interfaces.value.some((item) => item.name === selectedInterfaceName.value)) {
      selectedInterfaceName.value = interfaces.value[0]?.name || ''
    }
  } finally {
    loading.value = false
  }
}

async function saveConfig() {
  if (!activeInterface.value) return
  if (form.method === 'manual' && (!form.ip_address || !form.subnet_mask)) {
    ElMessage.warning('静态模式下请至少填写 IP 地址和子网掩码')
    return
  }

  saving.value = true
  try {
    const res = await systemApi.saveNetworkInterface(activeInterface.value.name, {
      method: form.method,
      ip_address: form.ip_address.trim(),
      subnet_mask: form.subnet_mask.trim(),
      gateway: form.gateway.trim(),
      primary_dns: form.primary_dns.trim(),
      secondary_dns: form.secondary_dns.trim(),
    })

    interfaces.value = interfaces.value.map((item) =>
      item.name === activeInterface.value.name ? res.data : item
    )
    syncForm(res.data)
    ElMessage.success(`已保存 ${activeInterface.value.display_name || activeInterface.value.name} 网络配置`)
  } finally {
    saving.value = false
  }
}

onMounted(fetchInterfaces)
</script>

<style scoped>
.network-config-page {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.section-card {
  border-radius: 12px;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  font-weight: 600;
  color: #111827;
}

.header-icon {
  color: #3b82f6;
}

.network-layout {
  display: grid;
  grid-template-columns: 260px minmax(0, 1fr);
  gap: 20px;
  min-height: 520px;
}

.interface-sidebar {
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  background: #fbfdff;
  overflow: hidden;
}

.sidebar-title {
  padding: 14px 16px;
  font-size: 15px;
  font-weight: 600;
  color: #111827;
  border-bottom: 1px solid #e5e7eb;
}

.interface-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 16px;
  border-left: 3px solid transparent;
  cursor: pointer;
  transition: all 0.2s ease;
}

.interface-item + .interface-item {
  border-top: 1px solid #f1f5f9;
}

.interface-item:hover {
  background: #f8fafc;
}

.interface-item.active {
  background: #eff6ff;
  border-left-color: #3b82f6;
}

.interface-name {
  font-size: 15px;
  font-weight: 700;
  color: #0f172a;
}

.interface-display {
  margin-top: 4px;
  font-size: 12px;
  color: #64748b;
}

.config-panel {
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  background: #ffffff;
  padding: 20px 24px;
}

.panel-title {
  margin-bottom: 18px;
  font-size: 18px;
  font-weight: 700;
  color: #111827;
}

.status-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 16px;
}

.status-chip {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 10px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  color: #334155;
}

.chip-label {
  color: #64748b;
  font-size: 13px;
}

.permission-alert {
  margin-bottom: 18px;
}

.network-form {
  max-width: 680px;
}

.form-section-title {
  margin: 6px 0 16px;
  padding-left: 8px;
  border-left: 3px solid #3b82f6;
  font-size: 14px;
  font-weight: 600;
  color: #0f172a;
}

@media (max-width: 1100px) {
  .network-layout {
    grid-template-columns: 1fr;
  }
}
</style>
