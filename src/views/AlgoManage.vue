<template>
  <div class="algo-manage-container">
    <el-card class="algo-manage-card" shadow="never">
    <el-tabs v-model="activeTab" class="custom-tabs">
      <!-- ══════════════════ Tab 1: 模型管理 ══════════════════ -->
      <el-tab-pane label="模型管理" name="models">
        <div class="tab-toolbar">
          <el-button type="primary" :icon="Plus" @click="openModelDialog()">新增模型</el-button>
          <el-button :icon="Refresh" @click="fetchModels" :loading="modelLoading">刷新</el-button>
        </div>
        <el-table :data="models" v-loading="modelLoading" border stripe style="width: 100%">
          <el-table-column prop="id" label="ID" width="60" align="center" />
          <el-table-column prop="model_name" label="模型名称" min-width="160">
            <template #default="{ row }">
              <div style="font-weight: 600; color: var(--text-main)">{{ row.model_name }}</div>
              <div style="font-size: 12px; color: var(--text-secondary)">{{ row.model_type }}</div>
            </template>
          </el-table-column>
          <el-table-column prop="model_path" label="模型文件路径" min-width="220" show-overflow-tooltip>
            <template #default="{ row }">
              <code class="path-code">{{ row.model_path }}</code>
            </template>
          </el-table-column>
          <el-table-column prop="labels_path" label="标签文件路径" min-width="200" show-overflow-tooltip>
            <template #default="{ row }">
              <code v-if="row.labels_path" class="path-code">{{ row.labels_path }}</code>
              <span v-else style="color: var(--text-secondary)">-</span>
            </template>
          </el-table-column>
          <el-table-column label="输入尺寸" width="120" align="center">
            <template #default="{ row }">
              <el-tag size="small" effect="plain">{{ row.input_width }} × {{ row.input_height }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="阈值" width="140" align="center">
            <template #default="{ row }">
              <div style="font-size: 12px; color: var(--text-secondary)">
                置信度: <strong style="color:var(--text-main)">{{ row.conf_threshold }}</strong><br>
                NMS: <strong style="color:var(--text-main)">{{ row.nms_threshold }}</strong>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="140" align="center" fixed="right">
            <template #default="{ row }">
              <el-button-group>
                <el-tooltip content="编辑" placement="top">
                  <el-button size="small" :icon="Edit" @click="openModelDialog(row)" />
                </el-tooltip>
                <el-tooltip content="删除" placement="top">
                  <el-button size="small" type="danger" :icon="Delete" @click="removeModel(row)" />
                </el-tooltip>
              </el-button-group>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>

      <!-- ══════════════════ Tab 2: 算法管理 ══════════════════ -->
      <el-tab-pane label="算法配置" name="algorithms">
        <div class="tab-toolbar">
          <el-button type="primary" :icon="Plus" @click="openAlgoDialog()">新增算法</el-button>
          <el-button :icon="Refresh" @click="fetchAlgorithms" :loading="algoLoading">刷新</el-button>
        </div>
        <el-table :data="algorithms" v-loading="algoLoading" border stripe style="width: 100%">
          <el-table-column prop="id" label="ID" width="60" align="center" />
          <el-table-column prop="algo_name" label="算法名称" min-width="160">
            <template #default="{ row }">
              <div style="font-weight: 600; color: var(--text-main)">{{ row.algo_name }}</div>
              <div style="font-size: 12px; color: var(--text-secondary)">{{ row.category || '未分类' }}</div>
            </template>
          </el-table-column>
          <el-table-column prop="algo_key" label="插件 Key" width="160">
            <template #default="{ row }">
              <el-tag type="info" effect="light">{{ row.algo_key }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="upload_recog_type" label="上传标识" width="130" align="center">
            <template #default="{ row }">
              <el-tag v-if="row.upload_recog_type" type="warning" effect="light">
                {{ row.upload_recog_type }}
              </el-tag>
              <span v-else style="color: var(--text-secondary); font-size: 13px;">未配置</span>
            </template>
          </el-table-column>
          <el-table-column label="关联模型" min-width="200">
            <template #default="{ row }">
              <div style="display: flex; flex-wrap: wrap; gap: 4px">
                <template v-if="row.models && row.models.length">
                  <el-tag
                    v-for="m in row.models"
                    :key="m.id"
                    size="small"
                    type="success"
                    effect="plain"
                    round
                  >{{ m.model_name }}</el-tag>
                </template>
                <span v-else style="color: var(--text-secondary); font-size: 13px;">未关联</span>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="参数定义" width="120" align="center">
            <template #default="{ row }">
              <el-tag size="small" :type="paramCount(row) > 0 ? 'primary' : 'info'" effect="dark" round>
                {{ paramCount(row) }} 个参数
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="140" align="center" fixed="right">
            <template #default="{ row }">
              <el-button-group>
                <el-tooltip content="编辑" placement="top">
                  <el-button size="small" :icon="Edit" @click="openAlgoDialog(row)" />
                </el-tooltip>
                <el-tooltip content="删除" placement="top">
                  <el-button size="small" type="danger" :icon="Delete" @click="removeAlgorithm(row)" />
                </el-tooltip>
              </el-button-group>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>

      <!-- ══════════════════ Tab 3: 插件管理 ══════════════════ -->
      <el-tab-pane label="插件文件" name="plugins">
        <div class="tab-toolbar">
          <div style="display:flex;align-items:center;gap:12px">
            <el-upload
              ref="uploadRef"
              :show-file-list="false"
              accept=".py"
              :before-upload="beforeUpload"
              :http-request="handleUpload"
            >
              <el-button type="primary" :icon="Upload" :loading="uploadLoading">上传插件 (.py)</el-button>
            </el-upload>
            <el-button :icon="Refresh" @click="fetchPlugins" :loading="pluginLoading">刷新</el-button>
          </div>
          <el-alert
            title="提示：上传插件后，请在「算法配置」中添加对应记录，且 algo_key 需与插件类一致"
            type="info"
            :closable="false"
            show-icon
            style="padding: 6px 16px; margin: 0; background-color: #f8fafc;"
          />
        </div>
        <el-table :data="plugins" v-loading="pluginLoading" border stripe style="width: 100%">
          <el-table-column prop="filename" label="文件名" min-width="200">
            <template #default="{ row }">
              <div style="display:flex;align-items:center;gap:6px">
                <el-icon color="#64748b"><Document /></el-icon>
                <span style="font-weight: 500">{{ row.filename }}</span>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="解析的 algo_key" width="200">
            <template #default="{ row }">
              <el-tag v-if="row.algo_key" type="success" effect="light">{{ row.algo_key }}</el-tag>
              <span v-else style="color: var(--text-secondary); font-size: 13px;">未解析到</span>
            </template>
          </el-table-column>
          <el-table-column label="文件大小" width="120" align="center">
            <template #default="{ row }">
              <span style="color: var(--text-secondary)">{{ formatSize(row.size) }}</span>
            </template>
          </el-table-column>
          <el-table-column label="修改时间" width="180" align="center">
            <template #default="{ row }">
              <span style="color: var(--text-secondary); font-size: 13px;">{{ formatTime(row.modified_at) }}</span>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="140" align="center" fixed="right">
            <template #default="{ row }">
              <el-button-group>
                <el-tooltip content="下载插件" placement="top">
                  <el-button size="small" :icon="Download" @click="downloadPlugin(row)" />
                </el-tooltip>
                <el-tooltip content="删除插件" placement="top">
                  <el-button
                    size="small"
                    type="danger"
                    :icon="Delete"
                    :disabled="row.protected"
                    @click="removePlugin(row)"
                  />
                </el-tooltip>
              </el-button-group>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>
    </el-tabs>
  </el-card>

    <!-- ══════════ 模型新建/编辑对话框 ══════════ -->
    <el-dialog
      v-model="modelDialogVisible"
      :title="modelForm.id ? '编辑模型' : '新增模型'"
      width="600px"
      @closed="resetModelForm"
    >
      <el-form :model="modelForm" :rules="modelRules" ref="modelFormRef" label-width="110px">
        <el-form-item label="模型名称" prop="model_name">
          <el-input v-model="modelForm.model_name" placeholder="如: YOLO11n-COCO" />
        </el-form-item>

        <!-- 模型文件路径：上传 + 手填联动 -->
        <el-form-item label="模型文件" prop="model_path">
          <div style="display:flex;gap:8px;align-items:center;width:100%">
            <el-input
              v-model="modelForm.model_path"
              placeholder="上传后自动填充，或手动输入服务器路径"
              style="flex:1"
              clearable
            />
            <el-upload
              :show-file-list="false"
              accept=".rknn,.onnx,.pt,.bin,.tflite,.weights"
              :before-upload="() => false"
              :on-change="(f) => handleModelFileChange(f, 'model_path')"
            >
              <el-button
                :loading="modelFileUploading"
                :icon="Upload"
                size="default"
              >上传</el-button>
            </el-upload>
          </div>
          <div v-if="modelForm.model_path" style="margin-top:4px;font-size:12px;color:#67c23a">
            <el-icon style="vertical-align:middle"><CircleCheck /></el-icon>
            {{ modelForm.model_path }}
          </div>
        </el-form-item>

        <!-- 标签文件路径：上传 + 手填联动 -->
        <el-form-item label="标签文件">
          <div style="display:flex;gap:8px;align-items:center;width:100%">
            <el-input
              v-model="modelForm.labels_path"
              placeholder="上传后自动填充，或手动输入服务器路径（可选）"
              style="flex:1"
              clearable
            />
            <el-upload
              :show-file-list="false"
              accept=".txt,.names"
              :before-upload="() => false"
              :on-change="(f) => handleModelFileChange(f, 'labels_path')"
            >
              <el-button
                :loading="labelsFileUploading"
                :icon="Upload"
                size="default"
              >上传</el-button>
            </el-upload>
          </div>
          <div v-if="modelForm.labels_path" style="margin-top:4px;font-size:12px;color:#67c23a">
            <el-icon style="vertical-align:middle"><CircleCheck /></el-icon>
            {{ modelForm.labels_path }}
          </div>
        </el-form-item>

        <el-form-item label="模型类型">
          <el-select v-model="modelForm.model_type" style="width:100%">
            <el-option label="yolov11" value="yolov11" />
            <el-option label="yolov8" value="yolov8" />
            <el-option label="yolov5" value="yolov5" />
          </el-select>
        </el-form-item>
        <el-row :gutter="12">
          <el-col :span="12">
            <el-form-item label="输入宽度">
              <el-input-number v-model="modelForm.input_width" :min="1" :max="4096" style="width:100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="输入高度">
              <el-input-number v-model="modelForm.input_height" :min="1" :max="4096" style="width:100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="置信度阈值">
              <el-input-number v-model="modelForm.conf_threshold" :min="0" :max="1" :step="0.05" :precision="2" style="width:100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="NMS 阈值">
              <el-input-number v-model="modelForm.nms_threshold" :min="0" :max="1" :step="0.05" :precision="2" style="width:100%" />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
      <template #footer>
        <el-button @click="modelDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitModel" :loading="modelFormLoading">保存</el-button>
      </template>
    </el-dialog>

    <!-- ══════════ 算法新建/编辑对话框 ══════════ -->
    <el-dialog
      v-model="algoDialogVisible"
      :title="algoForm.id ? '编辑算法' : '新增算法'"
      width="700px"
      @closed="resetAlgoForm"
    >
      <el-form :model="algoForm" :rules="algoRules" ref="algoFormRef" label-width="110px">
        <el-row :gutter="12">
          <el-col :span="12">
            <el-form-item label="算法名称" prop="algo_name">
              <el-input v-model="algoForm.algo_name" placeholder="如: 离岗检测" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="插件 Key" prop="algo_key">
              <el-input v-model="algoForm.algo_key" placeholder="如: no_person（对应插件类 algo_key）" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="分类">
              <el-input v-model="algoForm.category" placeholder="如: 行为分析" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="上传标识" prop="upload_recog_type">
              <el-input
                v-model="algoForm.upload_recog_type"
                placeholder="如: rylg、by、play_phone（报警上传用 RecogType 标识）"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="关联模型">
              <el-select
                v-model="algoForm.model_ids"
                multiple
                collapse-tags
                placeholder="选择使用的模型"
                style="width:100%"
              >
                <el-option
                  v-for="m in models"
                  :key="m.id"
                  :label="m.model_name"
                  :value="m.id"
                />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

        <el-divider content-position="left">参数定义（动态表单字段）</el-divider>

        <div style="margin-bottom:10px">
          <el-button size="small" :icon="Plus" @click="addParamRow">添加参数</el-button>
        </div>

        <el-table :data="paramRows" border size="small" style="margin-bottom:8px">
          <el-table-column label="key（字段名）" min-width="110">
            <template #default="{ row }">
              <el-input v-model="row.key" size="small" placeholder="如: confidence" />
            </template>
          </el-table-column>
          <el-table-column label="label（显示名）" min-width="110">
            <template #default="{ row }">
              <el-input v-model="row.label" size="small" placeholder="如: 置信度阈值" />
            </template>
          </el-table-column>
          <el-table-column label="类型" width="100">
            <template #default="{ row }">
              <el-select v-model="row.type" size="small">
                <el-option label="number" value="number" />
                <el-option label="slider" value="slider" />
                <el-option label="select" value="select" />
              </el-select>
            </template>
          </el-table-column>
          <el-table-column label="默认值" width="90">
            <template #default="{ row }">
              <el-input v-model="row.default" size="small" />
            </template>
          </el-table-column>
          <el-table-column label="最小值" width="80">
            <template #default="{ row }">
              <el-input v-model="row.min" size="small" />
            </template>
          </el-table-column>
          <el-table-column label="最大值" width="80">
            <template #default="{ row }">
              <el-input v-model="row.max" size="small" />
            </template>
          </el-table-column>
          <el-table-column label="步长" width="70">
            <template #default="{ row }">
              <el-input v-model="row.step" size="small" />
            </template>
          </el-table-column>
          <el-table-column label="" width="50" align="center">
            <template #default="{ $index }">
              <el-button
                size="small"
                type="danger"
                :icon="Delete"
                circle
                @click="removeParamRow($index)"
              />
            </template>
          </el-table-column>
        </el-table>
        <div v-if="paramRows.length === 0" style="color:#c0c4cc;font-size:13px;text-align:center;padding:8px 0">
          暂无参数定义，任务配置页将只显示通用冷却时间字段
        </div>
      </el-form>
      <template #footer>
        <el-button @click="algoDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitAlgo" :loading="algoFormLoading">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Refresh, Delete, Edit, Upload, CircleCheck, Document, Download } from '@element-plus/icons-vue'
import { algoManageApi } from '@/api/algoManage'

const activeTab = ref('models')

// ─── Models ──────────────────────────────────────────────────
const models = ref([])
const modelLoading = ref(false)
const modelDialogVisible = ref(false)
const modelFormLoading = ref(false)
const modelFileUploading = ref(false)
const labelsFileUploading = ref(false)
const modelFormRef = ref(null)
const modelForm = reactive({
  id: null,
  model_name: '',
  model_path: '',
  labels_path: '',
  model_type: 'yolov11',
  input_width: 640,
  input_height: 640,
  conf_threshold: 0.35,
  nms_threshold: 0.45,
})
const modelRules = {
  model_name: [{ required: true, message: '请输入模型名称' }],
  model_path: [{ required: true, message: '请输入模型文件路径' }],
}

async function fetchModels() {
  modelLoading.value = true
  try {
    const res = await algoManageApi.listModels()
    models.value = res.data || []
  } finally {
    modelLoading.value = false
  }
}

function openModelDialog(row = null) {
  resetModelForm()
  if (row) {
    Object.assign(modelForm, {
      id: row.id,
      model_name: row.model_name,
      model_path: row.model_path,
      labels_path: row.labels_path || '',
      model_type: row.model_type || 'yolov11',
      input_width: row.input_width || 640,
      input_height: row.input_height || 640,
      conf_threshold: row.conf_threshold ?? 0.35,
      nms_threshold: row.nms_threshold ?? 0.45,
    })
  }
  modelDialogVisible.value = true
}

function resetModelForm() {
  modelForm.id = null
  modelForm.model_name = ''
  modelForm.model_path = ''
  modelForm.labels_path = ''
  modelForm.model_type = 'yolov11'
  modelForm.input_width = 640
  modelForm.input_height = 640
  modelForm.conf_threshold = 0.35
  modelForm.nms_threshold = 0.45
  modelFileUploading.value = false
  labelsFileUploading.value = false
  modelFormRef.value?.resetFields()
}

// 处理模型文件或标签文件的上传（el-upload on-change 回调）
async function handleModelFileChange(uploadFile, field) {
  const file = uploadFile.raw
  if (!file) return
  const loadingRef = field === 'model_path' ? modelFileUploading : labelsFileUploading
  loadingRef.value = true
  try {
    const res = await algoManageApi.uploadModelFile(file)
    modelForm[field] = res.data.path
    ElMessage.success(`文件已上传：${res.data.filename}`)
  } catch (e) {
    ElMessage.error(e.message || '上传失败')
  } finally {
    loadingRef.value = false
  }
}

async function submitModel() {
  await modelFormRef.value?.validate()
  const payload = {
    model_name: modelForm.model_name,
    model_path: modelForm.model_path,
    labels_path: modelForm.labels_path,
    model_type: modelForm.model_type,
    input_width: modelForm.input_width,
    input_height: modelForm.input_height,
    conf_threshold: modelForm.conf_threshold,
    nms_threshold: modelForm.nms_threshold,
  }
  modelFormLoading.value = true
  try {
    if (modelForm.id) {
      await algoManageApi.updateModel(modelForm.id, payload)
      ElMessage.success('模型已更新')
    } else {
      await algoManageApi.createModel(payload)
      ElMessage.success('模型已创建')
    }
    modelDialogVisible.value = false
    await fetchModels()
  } finally {
    modelFormLoading.value = false
  }
}

async function removeModel(row) {
  await ElMessageBox.confirm(`确定删除模型「${row.model_name}」？`, '提示', { type: 'warning' })
  try {
    await algoManageApi.deleteModel(row.id)
    ElMessage.success('已删除')
    await fetchModels()
  } catch (e) {
    ElMessage.error(e.message)
  }
}

// ─── Algorithms ───────────────────────────────────────────────
const algorithms = ref([])
const algoLoading = ref(false)
const algoDialogVisible = ref(false)
const algoFormLoading = ref(false)
const algoFormRef = ref(null)
const algoForm = reactive({
  id: null,
  algo_name: '',
  algo_key: '',
  category: '',
  upload_recog_type: '',
  model_ids: [],
})
const algoRules = {
  algo_name: [{ required: true, message: '请输入算法名称' }],
  algo_key: [{ required: true, message: '请输入插件 Key' }],
  upload_recog_type: [{ required: true, message: '请输入上传标识' }],
}
const paramRows = ref([])

function paramCount(algo) {
  if (!algo.param_definition) return 0
  try { return JSON.parse(algo.param_definition).length } catch { return 0 }
}

function addParamRow() {
  paramRows.value.push({
    key: '', label: '', type: 'number',
    default: '', min: '', max: '', step: '',
  })
}

function removeParamRow(index) {
  paramRows.value.splice(index, 1)
}

function parseParamRows(paramDefinition) {
  if (!paramDefinition) return []
  try {
    return JSON.parse(paramDefinition).map(p => ({
      key: p.key || '',
      label: p.label || '',
      type: p.type || 'number',
      default: p.default !== undefined ? String(p.default) : '',
      min: p.min !== undefined ? String(p.min) : '',
      max: p.max !== undefined ? String(p.max) : '',
      step: p.step !== undefined ? String(p.step) : '',
    }))
  } catch { return [] }
}

function buildParamDefinition() {
  return paramRows.value
    .filter(r => r.key.trim())
    .map(r => {
      const item = { key: r.key.trim(), label: r.label.trim(), type: r.type }
      if (r.default !== '') item.default = isNaN(Number(r.default)) ? r.default : Number(r.default)
      if (r.min !== '') item.min = Number(r.min)
      if (r.max !== '') item.max = Number(r.max)
      if (r.step !== '') item.step = Number(r.step)
      return item
    })
}

async function fetchAlgorithms() {
  algoLoading.value = true
  try {
    const res = await algoManageApi.listAlgorithms()
    algorithms.value = res.data || []
  } finally {
    algoLoading.value = false
  }
}

function openAlgoDialog(row = null) {
  resetAlgoForm()
  if (row) {
    Object.assign(algoForm, {
      id: row.id,
      algo_name: row.algo_name,
      algo_key: row.algo_key,
      category: row.category || '',
      upload_recog_type: row.upload_recog_type || '',
      model_ids: (row.models || []).map(m => m.id),
    })
    paramRows.value = parseParamRows(row.param_definition)
  }
  algoDialogVisible.value = true
}

function resetAlgoForm() {
  algoForm.id = null
  algoForm.algo_name = ''
  algoForm.algo_key = ''
  algoForm.category = ''
  algoForm.upload_recog_type = ''
  algoForm.model_ids = []
  paramRows.value = []
  algoFormRef.value?.resetFields()
}

async function submitAlgo() {
  await algoFormRef.value?.validate()
  const paramDef = buildParamDefinition()
  const payload = {
    algo_name: algoForm.algo_name,
    algo_key: algoForm.algo_key,
    category: algoForm.category,
    upload_recog_type: algoForm.upload_recog_type.trim(),
    param_definition: paramDef.length > 0 ? JSON.stringify(paramDef) : '',
    model_ids: algoForm.model_ids,
  }
  algoFormLoading.value = true
  try {
    if (algoForm.id) {
      await algoManageApi.updateAlgorithm(algoForm.id, payload)
      ElMessage.success('算法已更新')
    } else {
      await algoManageApi.createAlgorithm(payload)
      ElMessage.success('算法已创建')
    }
    algoDialogVisible.value = false
    await fetchAlgorithms()
  } finally {
    algoFormLoading.value = false
  }
}

async function removeAlgorithm(row) {
  await ElMessageBox.confirm(`确定删除算法「${row.algo_name}」？`, '提示', { type: 'warning' })
  try {
    await algoManageApi.deleteAlgorithm(row.id)
    ElMessage.success('已删除')
    await fetchAlgorithms()
  } catch (e) {
    ElMessage.error(e.message)
  }
}

// ─── Plugins ──────────────────────────────────────────────────
const plugins = ref([])
const pluginLoading = ref(false)
const uploadLoading = ref(false)
const uploadRef = ref(null)

async function fetchPlugins() {
  pluginLoading.value = true
  try {
    const res = await algoManageApi.listPlugins()
    plugins.value = res.data || []
  } finally {
    pluginLoading.value = false
  }
}

function beforeUpload(file) {
  if (!file.name.endsWith('.py')) {
    ElMessage.error('只允许上传 .py 文件')
    return false
  }
  return true
}

async function handleUpload({ file }) {
  uploadLoading.value = true
  try {
    await algoManageApi.uploadPlugin(file)
    ElMessage.success(`插件 ${file.name} 上传成功`)
    await fetchPlugins()
  } catch (e) {
    ElMessage.error(e.message || '上传失败')
  } finally {
    uploadLoading.value = false
  }
}

async function removePlugin(row) {
  await ElMessageBox.confirm(`确定删除插件「${row.filename}」？`, '提示', { type: 'warning' })
  try {
    await algoManageApi.deletePlugin(row.filename)
    ElMessage.success('已删除')
    await fetchPlugins()
  } catch (e) {
    ElMessage.error(e.message)
  }
}

async function downloadPlugin(row) {
  try {
    const res = await algoManageApi.downloadPlugin(row.filename)
    const contentDisposition = res.headers?.['content-disposition'] || ''
    const matchedName = contentDisposition.match(/filename\*?=(?:UTF-8''|")?([^";]+)/i)
    const downloadName = matchedName ? decodeURIComponent(matchedName[1].replace(/"/g, '')) : row.filename
    const blobUrl = window.URL.createObjectURL(new Blob([res.data]))
    const link = document.createElement('a')
    link.href = blobUrl
    link.download = downloadName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(blobUrl)
  } catch (e) {
    const message = await parseDownloadError(e)
    ElMessage.error(message)
  }
}

async function parseDownloadError(error) {
  const blob = error?.response?.data
  if (blob instanceof Blob && blob.type.includes('application/json')) {
    try {
      const text = await blob.text()
      const data = JSON.parse(text)
      return data?.message || error.message || '下载失败'
    } catch {
      return error.message || '下载失败'
    }
  }
  return error?.message || '下载失败'
}

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B'
  return (bytes / 1024).toFixed(1) + ' KB'
}

function formatTime(ts) {
  if (!ts) return '-'
  return new Date(ts * 1000).toLocaleString('zh-CN', { hour12: false })
}

// ─── Init ─────────────────────────────────────────────────────
onMounted(() => {
  fetchModels()
  fetchAlgorithms()
  fetchPlugins()
})
</script>

<style scoped>
.algo-manage-card {
  min-height: calc(100vh - 112px);
}

.custom-tabs :deep(.el-tabs__nav-wrap) {
  margin-bottom: 20px;
}

.custom-tabs :deep(.el-tabs__item) {
  font-size: 15px;
  font-weight: 500;
}

.tab-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.path-code {
  font-family: monospace;
  font-size: 12px;
  color: var(--text-secondary);
  background: #f1f5f9;
  padding: 2px 6px;
  border-radius: 4px;
  border: 1px solid #e2e8f0;
}
</style>
