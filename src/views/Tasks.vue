<template>
  <div>
    <div style="display:flex;justify-content:space-between;margin-bottom:16px">
      <el-button type="primary" :icon="Plus" @click="openCreate">新建任务</el-button>
      <el-button :icon="Refresh" circle @click="fetchTasks" :loading="tableLoading" />
    </div>

    <!-- Table -->
    <el-card shadow="never" style="padding: 0;">
      <el-table :data="tasks" v-loading="tableLoading" border stripe style="width: 100%">
        <el-table-column prop="id" label="ID" width="70" align="center" />
        <el-table-column prop="task_name" label="任务名称" min-width="180">
          <template #default="{ row }">
            <div style="font-weight: 600; color: #303133">{{ row.task_name }}</div>
            <div style="font-size: 12px; color: #909399">{{ row.remark || '无备注' }}</div>
          </template>
        </el-table-column>
        <el-table-column prop="camera_name" label="摄像头" width="150">
          <template #default="{ row }">
            <div style="display:flex;align-items:center;gap:4px">
              <el-icon><VideoCamera /></el-icon>
              <span>{{ row.camera_name }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="运行算法" min-width="200">
          <template #default="{ row }">
            <div style="display: flex; flex-wrap: wrap; gap: 4px">
              <el-tag
                v-for="d in row.algo_details"
                :key="d.algo_id"
                size="small"
                effect="plain"
                round
              >{{ d.algo_name }}</el-tag>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="120" align="center">
          <template #default="{ row }">
            <el-tag :type="taskStatusType(row.status)" effect="dark">
              <div style="display:flex;align-items:center;gap:4px">
                <span :class="['status-dot', row.status === 1 ? 'is-running' : '']"></span>
                {{ taskStatusLabel(row.status) }}
              </div>
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="alarm_count" label="告警" width="100" align="center">
          <template #default="{ row }">
            <el-link type="danger" :underline="false" @click="viewAlarms(row)" style="font-weight: bold">
              {{ row.alarm_count }}
            </el-link>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="220" align="center" fixed="right">
          <template #default="{ row }">
            <el-button-group>
              <el-tooltip :content="row.status === 1 ? '停止' : '启动'" placement="top">
                <el-button
                  size="small"
                  :type="row.status === 1 ? 'warning' : 'success'"
                  :icon="row.status === 1 ? VideoPause : VideoPlay"
                  @click="toggleTask(row)"
                  :loading="actionLoading[row.id]"
                />
              </el-tooltip>
              <el-tooltip content="编辑" placement="top">
                <el-button
                  size="small"
                  :icon="Edit"
                  @click="openEdit(row)"
                  :loading="actionLoading[row.id]"
                />
              </el-tooltip>
              <el-tooltip content="告警记录" placement="top">
                <el-button
                  size="small"
                  type="primary"
                  :icon="Warning"
                  @click="viewAlarms(row)"
                />
              </el-tooltip>
              <el-tooltip content="删除" placement="top">
                <el-button
                  size="small"
                  type="danger"
                  :icon="Delete"
                  @click="removeTask(row)"
                  :loading="actionLoading[row.id]"
                />
              </el-tooltip>
            </el-button-group>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- Create / Edit Task Dialog -->
    <el-dialog 
      v-model="formVisible" 
      :title="editMode ? '编辑监控任务' : '新建监控任务'" 
      width="720px" 
      @closed="resetForm"
      class="task-dialog"
      destroy-on-close
    >
      <el-form :model="form" :rules="rules" ref="formRef" label-width="90px" label-position="left">
        <div class="dialog-section-title">基本信息</div>
        <div class="form-section">
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="任务名称" prop="task_name">
                <el-input v-model="form.task_name" placeholder="如: 大厅人员监控" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="摄像头" prop="camera_id">
                <el-select v-model="form.camera_id" placeholder="请选择视频源" style="width:100%">
                  <el-option
                    v-for="cam in cameras"
                    :key="cam.id"
                    :label="`${cam.name} (${cam.location || '无地点'})`"
                    :value="cam.id"
                  >
                    <div style="display:flex;justify-content:space-between;align-items:center">
                      <span>{{ cam.name }}</span>
                      <span style="color:var(--text-secondary);font-size:12px">{{ cam.location }}</span>
                    </div>
                  </el-option>
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="24">
              <el-form-item label="备注说明">
                <el-input v-model="form.remark" type="textarea" :rows="2" placeholder="选填，任务相关备注信息" />
              </el-form-item>
            </el-col>
          </el-row>
        </div>

        <div class="dialog-section-title" style="margin-top: 24px;">算法配置</div>
        <div class="algo-selection-area">
          <div v-if="algorithms.length === 0" class="empty-algo">
            暂无可用算法，请先在算法管理中添加
          </div>
          <div v-for="algo in algorithms" :key="algo.id" class="algo-config-card" :class="{ 'is-active': selectedAlgos[algo.id] }">
            <div class="algo-config-header" @click="selectedAlgos[algo.id] = !selectedAlgos[algo.id]; onAlgoToggle(algo, selectedAlgos[algo.id])">
              <el-checkbox
                v-model="selectedAlgos[algo.id]"
                @click.stop
                @change="(v) => onAlgoToggle(algo, v)"
              />
              <div class="algo-info">
                <span class="algo-name">{{ algo.algo_name }}</span>
                <el-tag size="small" type="info" effect="plain">{{ algo.algo_key }}</el-tag>
              </div>
              <el-icon class="expand-icon" :class="{ 'is-expanded': selectedAlgos[algo.id] }"><ArrowDown /></el-icon>
            </div>

            <el-collapse-transition>
              <div v-show="selectedAlgos[algo.id]">
                <div class="algo-config-body">
                  <el-row :gutter="24">
                    <!-- 按 param_definition 动态渲染算法参数字段 -->
                    <template v-for="param in getParamDef(algo)" :key="param.key">
                      <el-col :span="param.type === 'slider' ? 24 : 8">
                        <el-form-item :label="param.label" label-position="top" class="compact-form-item">
                          <el-input-number
                            v-if="param.type === 'number'"
                            v-model="algoParams[algo.id][param.key]"
                            :min="param.min ?? undefined"
                            :max="param.max ?? undefined"
                            :step="param.step ?? 1"
                            controls-position="right"
                            style="width: 100%; max-width: 160px;"
                          />
                          <div v-else-if="param.type === 'slider'" class="slider-container">
                            <el-slider
                              v-model="algoParams[algo.id][param.key]"
                              :min="param.min ?? 0"
                              :max="param.max ?? 1"
                              :step="param.step ?? 0.01"
                              show-input
                              input-size="small"
                            />
                          </div>
                          <el-select
                            v-else-if="param.type === 'select'"
                            v-model="algoParams[algo.id][param.key]"
                            style="width: 100%; max-width: 160px;"
                          >
                            <el-option
                              v-for="opt in param.options"
                              :key="opt"
                              :label="opt"
                              :value="opt"
                            />
                          </el-select>
                        </el-form-item>
                      </el-col>
                    </template>

                    <!-- 通用字段：冷却时间 -->
                    <el-col :span="8">
                      <el-form-item label="冷却时间(秒)" label-position="top" class="compact-form-item">
                        <el-tooltip content="触发告警后，多少秒内不再重复告警" placement="top">
                          <el-input-number
                            v-model="algoParams[algo.id].alarm_interval"
                            :min="10" :max="3600" 
                            controls-position="right"
                            style="width: 100%; max-width: 160px;"
                          />
                        </el-tooltip>
                      </el-form-item>
                    </el-col>

                    <el-col :span="8">
                      <el-form-item label="报警条件" label-position="top" class="compact-form-item">
                        <el-select
                          v-model="algoParams[algo.id].nav_condition"
                          style="width: 100%; max-width: 160px;"
                        >
                          <el-option
                            v-for="opt in NAV_CONDITION_OPTIONS"
                            :key="opt.value"
                            :label="opt.label"
                            :value="opt.value"
                          />
                        </el-select>
                      </el-form-item>
                    </el-col>

                    <!-- 通用字段：检测区域 -->
                    <el-col :span="24">
                      <el-form-item label="检测区域 (ROI)" label-position="top" class="compact-form-item" style="margin-bottom: 0;">
                        <div class="roi-wrapper">
                          <RoiDrawer
                            v-model="algoParams[algo.id].roi"
                            :camera-id="form.camera_id"
                          />
                        </div>
                      </el-form-item>
                    </el-col>
                  </el-row>
                </div>
              </div>
            </el-collapse-transition>
          </div>
        </div>
      </el-form>
      <template #footer>
        <div style="display:flex;justify-content:space-between;align-items:center;width:100%">
          <span style="font-size:13px;color:var(--text-secondary)">
            <el-icon style="vertical-align:middle;margin-right:4px"><InfoFilled /></el-icon>
            配置完成后将自动下发至 AI 推理服务
          </span>
          <div>
            <el-button @click="formVisible = false">取消</el-button>
            <el-button type="primary" @click="submitForm" :loading="formLoading">
              {{ editMode ? '保存修改' : '确认创建' }}
            </el-button>
          </div>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Refresh, Delete, VideoPlay, VideoPause, Warning, Edit, InfoFilled, ArrowDown } from '@element-plus/icons-vue'
import { taskApi } from '@/api/task'
import { cameraApi } from '@/api/camera'
import RoiDrawer from '@/components/RoiDrawer.vue'

const router = useRouter()
const tasks = ref([])
const cameras = ref([])
const algorithms = ref([])
const tableLoading = ref(false)
const actionLoading = reactive({})

const formVisible = ref(false)
const formLoading = ref(false)
const formRef = ref(null)
const editMode = ref(false)
const editTaskId = ref(null)
const form = reactive({ task_name: '', camera_id: null, remark: '' })
const NAV_CONDITION_OPTIONS = [
  { label: '全告警', value: 'all' },
  { label: '航行中', value: 'underway' },
  { label: '停泊时', value: 'moored' },
]
const rules = {
  task_name: [{ required: true, message: '请输入任务名称' }],
  camera_id: [{ required: true, message: '请选择摄像头' }],
}

// algo selection state
const selectedAlgos = reactive({})
const algoParams = reactive({})

function getParamDef(algo) {
  if (!algo.param_definition) return []
  try {
    return JSON.parse(algo.param_definition) || []
  } catch {
    return []
  }
}

function initAlgoParam(algo) {
  const defaults = { alarm_interval: 60, roi: '', nav_condition: 'all' }
  getParamDef(algo).forEach(p => {
    defaults[p.key] = p.default !== undefined ? p.default : (p.type === 'number' ? 0 : '')
  })
  algoParams[algo.id] = defaults
}

function onAlgoToggle(algo, checked) {
  if (checked) initAlgoParam(algo)
}

function taskStatusType(s) {
  return s === 1 ? 'success' : s === 2 ? 'danger' : 'info'
}
function taskStatusLabel(s) {
  return s === 1 ? '运行中' : s === 2 ? '异常' : '已停止'
}

async function fetchTasks() {
  tableLoading.value = true
  try {
    const res = await taskApi.list()
    tasks.value = res.data || []
  } finally {
    tableLoading.value = false
  }
}

async function fetchAlgorithms() {
  const res = await taskApi.algorithms()
  algorithms.value = res.data || []
  algorithms.value.forEach(initAlgoParam)
}

async function fetchCameras() {
  const res = await cameraApi.list()
  cameras.value = res.data || []
}

async function toggleTask(row) {
  actionLoading[row.id] = true
  try {
    if (row.status === 1) {
      await taskApi.stop(row.id)
      ElMessage.success('任务已停止')
    } else {
      await taskApi.start(row.id)
      ElMessage.success('任务已启动')
    }
    await fetchTasks()
  } catch (e) {
    ElMessage.error(e.message)
  } finally {
    actionLoading[row.id] = false
  }
}

function viewAlarms(row) {
  router.push({ path: '/alarms', query: { task_id: row.id } })
}

async function removeTask(row) {
  await ElMessageBox.confirm(`确定删除任务「${row.task_name}」？`, '提示', { type: 'warning' })
  actionLoading[row.id] = true
  try {
    await taskApi.remove(row.id)
    ElMessage.success('已删除')
    await fetchTasks()
  } finally {
    actionLoading[row.id] = false
  }
}

function openCreate() {
  editMode.value = false
  editTaskId.value = null
  formVisible.value = true
}

async function openEdit(row) {
  // 如果任务运行中，先提示并自动停止
  if (row.status === 1) {
    try {
      await ElMessageBox.confirm(
        `任务「${row.task_name}」正在运行，编辑前需先停止，是否继续？`,
        '提示',
        { type: 'warning', confirmButtonText: '停止并编辑', cancelButtonText: '取消' }
      )
    } catch {
      return
    }
    actionLoading[row.id] = true
    try {
      await taskApi.stop(row.id)
      await fetchTasks()
      // 从最新列表里拿更新后的 row
      row = tasks.value.find(t => t.id === row.id) || row
    } catch (e) {
      ElMessage.error('停止失败：' + e.message)
      return
    } finally {
      actionLoading[row.id] = false
    }
  }

  // 填充表单
  editMode.value = true
  editTaskId.value = row.id
  form.task_name = row.task_name
  form.camera_id = row.camera_id
  form.remark = row.remark || ''

  // 重置算法选择，再根据任务已有配置回填
  Object.keys(selectedAlgos).forEach(k => { selectedAlgos[k] = false })
  algorithms.value.forEach(initAlgoParam)

  for (const detail of (row.algo_details || [])) {
    selectedAlgos[detail.algo_id] = true
    const algo = algorithms.value.find(a => a.id === detail.algo_id)
    if (!algo) continue

    let ap = {}
    try { ap = JSON.parse(detail.algo_params || '{}') } catch {}
    let ac = {}
    try { ac = JSON.parse(detail.alarm_config || '{}') } catch {}

    if (!algoParams[algo.id]) initAlgoParam(algo)
    // 回填 param_definition 中的字段
    getParamDef(algo).forEach(pd => {
      if (ap[pd.key] !== undefined) algoParams[algo.id][pd.key] = ap[pd.key]
    })
    // 回填冷却时间和 ROI
    if (ac.alarm_interval !== undefined) algoParams[algo.id].alarm_interval = ac.alarm_interval
    if (ac.nav_condition) algoParams[algo.id].nav_condition = ac.nav_condition
    algoParams[algo.id].roi = detail.roi_config === '[]' ? '' : (detail.roi_config || '')
  }

  formVisible.value = true
}

function resetForm() {
  editMode.value = false
  editTaskId.value = null
  form.task_name = ''
  form.camera_id = null
  form.remark = ''
  Object.keys(selectedAlgos).forEach(k => { selectedAlgos[k] = false })
  algorithms.value.forEach(initAlgoParam)
  formRef.value?.resetFields()
}

async function submitForm() {
  await formRef.value?.validate()

  const selected = algorithms.value.filter(a => selectedAlgos[a.id])
  if (selected.length === 0) {
    ElMessage.warning('请至少选择一个算法')
    return
  }

  const algoDetails = selected.map(a => {
    const p = algoParams[a.id]
    const roiCfg = p.roi?.trim() ? p.roi.trim() : '[]'
    // 从 param_definition 动态收集 algo_params 字段
    const algoParamsObj = {}
    getParamDef(a).forEach(pd => {
      if (p[pd.key] !== undefined) {
        algoParamsObj[pd.key] = p[pd.key]
      }
    })
    return {
      algo_id: a.id,
      roi_config: roiCfg,
      algo_params: JSON.stringify(algoParamsObj),
      alarm_config: JSON.stringify({
        alarm_interval: p.alarm_interval,
        nav_condition: p.nav_condition || 'all',
      }),
    }
  })

  const payload = {
    task_name: form.task_name,
    camera_id: form.camera_id,
    remark: form.remark,
    algo_details: algoDetails,
  }

  formLoading.value = true
  try {
    if (editMode.value) {
      await taskApi.update(editTaskId.value, payload)
      ElMessage.success('任务已更新')
    } else {
      await taskApi.create(payload)
      ElMessage.success('任务创建成功')
    }
    formVisible.value = false
    await fetchTasks()
  } finally {
    formLoading.value = false
  }
}

onMounted(() => {
  fetchTasks()
  fetchAlgorithms()
  fetchCameras()
})
</script>

<style scoped>
.toolbar-card :deep(.el-card__body) {
  padding: 12px 20px;
}

.status-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: #909399;
  margin-right: 4px;
}

.status-dot.is-running {
  background-color: #fff;
  box-shadow: 0 0 4px #fff;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% { opacity: 1; }
  50% { opacity: 0.4; }
  100% { opacity: 1; }
}

:deep(.el-table) {
  --el-table-header-bg-color: #f8f9fb;
}

:deep(.el-table__header) {
  font-weight: 600;
  color: #606266;
}

/* ── Task Dialog Styles ── */
.task-dialog :deep(.el-dialog__body) {
  padding: 20px 24px;
  background-color: #f8fafc;
}

.dialog-section-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-main);
  margin-bottom: 16px;
  display: flex;
  align-items: center;
}

.dialog-section-title::before {
  content: '';
  display: inline-block;
  width: 4px;
  height: 14px;
  background-color: var(--primary-color);
  border-radius: 2px;
  margin-right: 8px;
}

.form-section {
  background: #ffffff;
  padding: 20px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
}

.algo-selection-area {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.empty-algo {
  text-align: center;
  padding: 30px;
  background: #ffffff;
  border-radius: 8px;
  border: 1px dashed var(--border-color);
  color: var(--text-secondary);
  font-size: 13px;
}

.algo-config-card {
  background: #ffffff;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  overflow: hidden;
  transition: all 0.2s ease;
}

.algo-config-card:hover {
  border-color: #cbd5e1;
}

.algo-config-card.is-active {
  border-color: var(--primary-color);
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.1);
}

.algo-config-header {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  cursor: pointer;
  background: #ffffff;
  user-select: none;
}

.algo-config-card.is-active .algo-config-header {
  background: #f0f7ff;
  border-bottom: 1px solid #e1effe;
}

.algo-info {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 10px;
  margin-left: 12px;
}

.algo-name {
  font-weight: 600;
  color: var(--text-main);
  font-size: 14px;
}

.expand-icon {
  color: var(--text-secondary);
  transition: transform 0.3s ease;
}

.expand-icon.is-expanded {
  transform: rotate(180deg);
}

.algo-config-body {
  padding: 20px;
  background: #ffffff;
}

.compact-form-item {
  margin-bottom: 16px;
}

.compact-form-item :deep(.el-form-item__label) {
  padding-bottom: 4px;
  line-height: 1.2;
  font-size: 13px;
  color: var(--text-regular);
}

.slider-container {
  width: 100%;
  padding: 0 8px;
}

.roi-wrapper {
  border: 1px solid var(--border-color);
  border-radius: 6px;
  overflow: hidden;
  background: #f8fafc;
}
</style>
