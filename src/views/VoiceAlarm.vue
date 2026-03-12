<template>
  <div class="voice-alarm-container">

    <!-- ══════════ 全局开关 ══════════ -->
    <el-card class="section-card" shadow="never">
      <template #header>
        <div class="card-header">
          <el-icon class="header-icon"><Bell /></el-icon>
          <span>语音报警开关</span>
        </div>
      </template>
      <div class="switch-row">
        <div class="switch-desc">
          <div class="switch-title">全局语音报警</div>
          <div class="switch-sub">开启后，触发报警时将自动通过摄像头喇叭播放对应语音</div>
        </div>
        <el-switch
          v-model="settings.enabled"
          size="large"
          active-text="已开启"
          inactive-text="已关闭"
          :loading="settingsLoading"
          @change="saveSettings"
        />
      </div>
    </el-card>

    <!-- ══════════ 发声设备配置 ══════════ -->
    <el-card class="section-card" shadow="never">
      <template #header>
        <div class="card-header">
          <el-icon class="header-icon"><VideoCamera /></el-icon>
          <span>发声设备配置</span>
        </div>
      </template>
      <el-form :model="settings" :rules="settingsRules" ref="settingsFormRef" label-width="90px" style="max-width: 520px">
        <el-form-item label="设备 IP" prop="device_ip">
          <el-input v-model="settings.device_ip" placeholder="如：192.168.1.100" clearable />
        </el-form-item>
        <el-form-item label="用户名" prop="device_user">
          <el-input v-model="settings.device_user" placeholder="如：admin" clearable />
        </el-form-item>
        <el-form-item label="密码" prop="device_pass">
          <el-input
            v-model="settings.device_pass"
            type="password"
            placeholder="设备登录密码"
            show-password
            clearable
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="saveSettings" :loading="settingsLoading">
            保存配置
          </el-button>
          <span class="save-tip" v-if="lastSaved">
            <el-icon style="vertical-align:-2px;margin-right:2px;color:#10b981"><CircleCheck /></el-icon>
            已保存
          </span>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- ══════════ 算法语音映射 ══════════ -->
    <el-card class="section-card" shadow="never">
      <template #header>
        <div class="card-header" style="justify-content: space-between">
          <div style="display:flex;align-items:center;gap:8px">
            <el-icon class="header-icon"><SetUp /></el-icon>
            <span>算法语音映射</span>
          </div>
          <el-tooltip content="为每种算法单独配置语音文件。选择语音文件后自动开启；点击「清除」关闭该算法语音报警。" placement="top">
            <el-icon style="color:#94a3b8;cursor:pointer"><QuestionFilled /></el-icon>
          </el-tooltip>
        </div>
      </template>

      <el-table :data="algoMapList" v-loading="algoMapLoading" border stripe style="width:100%">
        <el-table-column prop="algo_name" label="算法名称" min-width="140">
          <template #default="{ row }">
            <div style="font-weight:600;color:var(--text-main)">{{ row.algo_name }}</div>
            <div style="font-size:12px;color:#94a3b8">{{ row.algo_key }}</div>
          </template>
        </el-table-column>

        <el-table-column label="语音状态" width="110" align="center">
          <template #default="{ row }">
            <el-tag v-if="row.audio_file" type="success" effect="light" round>
              <el-icon style="vertical-align:-2px;margin-right:2px"><Check /></el-icon>
              已配置
            </el-tag>
            <el-tag v-else type="info" effect="plain" round>未配置</el-tag>
          </template>
        </el-table-column>

        <el-table-column label="语音文件" min-width="220">
          <template #default="{ row }">
            <div style="display:flex;align-items:center;gap:8px">
              <el-select
                v-model="row.audio_file"
                placeholder="-- 不启用语音 --"
                clearable
                style="flex:1"
                @change="(val) => onAlgoMapChange(row, val)"
              >
                <el-option
                  v-for="f in audioFiles"
                  :key="f.name"
                  :label="f.filename"
                  :value="f.name"
                >
                  <div style="display:flex;justify-content:space-between;align-items:center">
                    <span>{{ f.filename }}</span>
                    <span style="font-size:11px;color:#94a3b8;margin-left:8px">{{ formatSize(f.size) }}</span>
                  </div>
                </el-option>
              </el-select>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="操作" width="100" align="center">
          <template #default="{ row }">
            <el-button
              v-if="row.audio_file"
              size="small"
              type="danger"
              plain
              @click="clearAlgoMap(row)"
            >
              清除
            </el-button>
            <span v-else style="color:#c0c4cc;font-size:12px">—</span>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- ══════════ 音频文件管理 ══════════ -->
    <el-card class="section-card" shadow="never">
      <template #header>
        <div class="card-header" style="justify-content:space-between">
          <div style="display:flex;align-items:center;gap:8px">
            <el-icon class="header-icon"><Headset /></el-icon>
            <span>音频文件管理</span>
          </div>
          <div style="display:flex;gap:8px;align-items:center">
            <el-upload
              :show-file-list="false"
              accept=".pcm"
              :before-upload="() => false"
              :on-change="handleAudioFileChange"
            >
              <el-button type="primary" :icon="Upload" :loading="uploadLoading" size="small">
                上传 .pcm 文件
              </el-button>
            </el-upload>
            <el-button :icon="Refresh" size="small" @click="fetchAudioFiles" :loading="audioFilesLoading">
              刷新
            </el-button>
          </div>
        </div>
      </template>

      <div v-if="audioFiles.length === 0 && !audioFilesLoading" class="empty-tip">
        <el-icon size="32" color="#c0c4cc"><Headset /></el-icon>
        <div>暂无音频文件，请上传 .pcm 格式的语音文件</div>
      </div>

      <el-table v-else :data="audioFiles" v-loading="audioFilesLoading" border stripe style="width:100%">
        <el-table-column label="文件名" min-width="200">
          <template #default="{ row }">
            <div style="display:flex;align-items:center;gap:8px">
              <el-icon color="#3b82f6"><Headset /></el-icon>
              <div>
                <div style="font-weight:500">{{ row.filename }}</div>
                <div style="font-size:12px;color:#94a3b8">参数名：{{ row.name }}</div>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="文件大小" width="120" align="center">
          <template #default="{ row }">
            <span style="color:#64748b">{{ formatSize(row.size) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="已被算法使用" min-width="200">
          <template #default="{ row }">
            <div style="display:flex;flex-wrap:wrap;gap:4px">
              <template v-if="usageMap[row.name] && usageMap[row.name].length">
                <el-tag
                  v-for="algoName in usageMap[row.name]"
                  :key="algoName"
                  size="small"
                  type="success"
                  effect="plain"
                  round
                >{{ algoName }}</el-tag>
              </template>
              <span v-else style="color:#c0c4cc;font-size:12px">未使用</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="100" align="center" fixed="right">
          <template #default="{ row }">
            <el-tooltip content="删除音频文件" placement="top">
              <el-button
                size="small"
                type="danger"
                :icon="Delete"
                circle
                @click="removeAudioFile(row)"
              />
            </el-tooltip>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Bell, VideoCamera, SetUp, Headset, Check, CircleCheck,
  QuestionFilled, Upload, Refresh, Delete,
} from '@element-plus/icons-vue'
import { voiceAlarmApi } from '@/api/voiceAlarm'

// ─── Settings ────────────────────────────────────────────────
const settings = reactive({
  enabled: false,
  device_ip: '',
  device_user: '',
  device_pass: '',
})
const settingsLoading = ref(false)
const lastSaved = ref(false)
const settingsFormRef = ref(null)
const settingsRules = {
  device_ip: [{ required: false }],
}

async function fetchSettings() {
  settingsLoading.value = true
  try {
    const res = await voiceAlarmApi.getSettings()
    Object.assign(settings, res.data)
  } finally {
    settingsLoading.value = false
  }
}

async function saveSettings() {
  settingsLoading.value = true
  lastSaved.value = false
  try {
    await voiceAlarmApi.saveSettings({
      enabled: settings.enabled,
      device_ip: settings.device_ip,
      device_user: settings.device_user,
      device_pass: settings.device_pass,
    })
    ElMessage.success('配置已保存')
    lastSaved.value = true
    setTimeout(() => { lastSaved.value = false }, 3000)
  } catch (e) {
    ElMessage.error(e.message || '保存失败')
    // revert switch on failure
    await fetchSettings()
  } finally {
    settingsLoading.value = false
  }
}

// ─── Algo Map ─────────────────────────────────────────────────
const algoMapList = ref([])
const algoMapLoading = ref(false)

async function fetchAlgoMap() {
  algoMapLoading.value = true
  try {
    const res = await voiceAlarmApi.listAlgoMap()
    algoMapList.value = (res.data || []).map(item => ({ ...item }))
  } finally {
    algoMapLoading.value = false
  }
}

async function onAlgoMapChange(row, val) {
  if (!val) {
    await clearAlgoMap(row, true)
    return
  }
  try {
    await voiceAlarmApi.setAlgoMap(row.algo_id, val)
    ElMessage.success(`「${row.algo_name}」已配置语音：${val}.pcm`)
    await fetchAlgoMap()
  } catch (e) {
    ElMessage.error(e.message || '保存失败')
    await fetchAlgoMap()
  }
}

async function clearAlgoMap(row, silent = false) {
  if (!silent) {
    try {
      await ElMessageBox.confirm(
        `确定清除「${row.algo_name}」的语音配置？`,
        '提示',
        { type: 'warning' }
      )
    } catch { return }
  }
  try {
    await voiceAlarmApi.deleteAlgoMap(row.algo_id)
    if (!silent) ElMessage.success('已清除')
    await fetchAlgoMap()
  } catch (e) {
    ElMessage.error(e.message || '操作失败')
  }
}

// ─── Audio Files ──────────────────────────────────────────────
const audioFiles = ref([])
const audioFilesLoading = ref(false)
const uploadLoading = ref(false)

async function fetchAudioFiles() {
  audioFilesLoading.value = true
  try {
    const res = await voiceAlarmApi.listAudioFiles()
    audioFiles.value = res.data || []
  } finally {
    audioFilesLoading.value = false
  }
}

// 计算每个音频文件被哪些算法使用（用于"已被算法使用"列）
const usageMap = computed(() => {
  const map = {}
  for (const item of algoMapList.value) {
    if (item.audio_file) {
      if (!map[item.audio_file]) map[item.audio_file] = []
      map[item.audio_file].push(item.algo_name)
    }
  }
  return map
})

async function handleAudioFileChange(uploadFile) {
  const file = uploadFile.raw
  if (!file) return
  if (!file.name.endsWith('.pcm')) {
    ElMessage.error('只允许上传 .pcm 文件')
    return
  }
  uploadLoading.value = true
  try {
    await voiceAlarmApi.uploadAudioFile(file)
    ElMessage.success(`${file.name} 上传成功`)
    await fetchAudioFiles()
  } catch (e) {
    ElMessage.error(e.message || '上传失败')
  } finally {
    uploadLoading.value = false
  }
}

async function removeAudioFile(row) {
  const inUse = usageMap.value[row.name]
  const confirmMsg = inUse && inUse.length
    ? `文件「${row.filename}」正被以下算法使用：${inUse.join('、')}。\n删除后这些算法将失去语音配置，确定删除？`
    : `确定删除音频文件「${row.filename}」？`

  try {
    await ElMessageBox.confirm(confirmMsg, '提示', { type: 'warning' })
  } catch { return }

  try {
    await voiceAlarmApi.deleteAudioFile(row.name)
    ElMessage.success('已删除')
    await Promise.all([fetchAudioFiles(), fetchAlgoMap()])
  } catch (e) {
    ElMessage.error(e.message || '删除失败')
  }
}

function formatSize(bytes) {
  if (!bytes) return '-'
  if (bytes < 1024) return bytes + ' B'
  return (bytes / 1024).toFixed(1) + ' KB'
}

// ─── Init ─────────────────────────────────────────────────────
onMounted(async () => {
  await Promise.all([fetchSettings(), fetchAlgoMap(), fetchAudioFiles()])
})
</script>

<style scoped>
.voice-alarm-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.section-card :deep(.el-card__header) {
  padding: 14px 20px;
  border-bottom: 1px solid #f1f5f9;
  background: #fafbfc;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  font-weight: 600;
  color: #1e293b;
}

.header-icon {
  color: #3b82f6;
  font-size: 16px;
}

.switch-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 4px;
}

.switch-desc {
  flex: 1;
}

.switch-title {
  font-size: 15px;
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 4px;
}

.switch-sub {
  font-size: 13px;
  color: #64748b;
}

.save-tip {
  margin-left: 12px;
  font-size: 13px;
  color: #10b981;
  font-weight: 500;
}

.empty-tip {
  text-align: center;
  padding: 40px 0;
  color: #94a3b8;
  font-size: 14px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}
</style>
