<template>
  <div>
    <!-- Filter bar -->
    <el-card shadow="never" style="margin-bottom:16px">
      <el-row :gutter="12" align="middle">
        <el-col :span="5">
          <el-select v-model="filter.task_id" clearable placeholder="按任务筛选" style="width:100%">
            <el-option v-for="t in tasks" :key="t.id" :label="t.task_name" :value="t.id" />
          </el-select>
        </el-col>
        <el-col :span="5">
          <el-select v-model="filter.algo_name" clearable placeholder="按算法筛选" style="width:100%">
            <el-option
              v-for="a in algorithms"
              :key="a.algo_key"
              :label="a.algo_name"
              :value="a.algo_name"
            />
          </el-select>
        </el-col>
        <el-col :span="4">
          <el-select v-model="filter.status" clearable placeholder="按状态筛选" style="width:100%">
            <el-option label="未处理" :value="0" />
            <el-option label="已处理" :value="1" />
          </el-select>
        </el-col>
        <el-col :span="6">
          <el-date-picker
            v-model="filter.dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            style="width:100%"
            value-format="YYYY-MM-DD"
          />
        </el-col>
        <el-col :span="4" style="display:flex;align-items:center;gap:8px">
          <el-button type="primary" :icon="Search" @click="fetchAlarms(1)">查询</el-button>
          <el-button :icon="Refresh" @click="resetFilter">重置</el-button>
          <el-tooltip :content="viewMode === 'list' ? '切换到卡片模式' : '切换到列表模式'" placement="top">
            <el-button
              :icon="viewMode === 'list' ? Grid : List"
              circle
              @click="viewMode = viewMode === 'list' ? 'grid' : 'list'"
            />
          </el-tooltip>
        </el-col>
      </el-row>
    </el-card>

    <!-- List mode: Table -->
    <template v-if="viewMode === 'list'">
      <el-table :data="alarms" v-loading="loading" border stripe>
        <el-table-column prop="id" label="ID" width="65" />
        <el-table-column label="报警时间" width="165">
          <template #default="{ row }">{{ formatTime(row.alarm_time) }}</template>
        </el-table-column>
        <el-table-column prop="task_name" label="任务" min-width="130" />
        <el-table-column prop="camera_name" label="摄像头" width="110" />
        <el-table-column prop="algo_name" label="算法" width="100" />
        <el-table-column prop="alarm_location" label="地点" width="120" show-overflow-tooltip />
        <el-table-column label="快照" width="80" align="center">
          <template #default="{ row }">
            <el-image
              v-if="row.image_url"
              :src="row.image_url"
              :preview-src-list="[row.image_url]"
              fit="cover"
              style="width:50px;height:36px;border-radius:3px;cursor:pointer"
              preview-teleported
            >
              <template #error>
                <el-icon style="width:50px;height:36px;display:flex;align-items:center;justify-content:center;color:#ccc">
                  <Picture />
                </el-icon>
              </template>
            </el-image>
            <el-icon v-else style="color:#ddd"><Picture /></el-icon>
          </template>
        </el-table-column>
        <el-table-column label="详情" min-width="160" show-overflow-tooltip>
          <template #default="{ row }">
            <el-text v-if="row.alarm_details && row.alarm_details !== '{}'">{{ row.alarm_details }}</el-text>
            <span v-else style="color:#c0c4cc">—</span>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="90" align="center">
          <template #default="{ row }">
            <el-tag :type="row.status === 1 ? 'success' : 'warning'" size="small">
              {{ row.status === 1 ? '已处理' : '未处理' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="90" align="center" fixed="right">
          <template #default="{ row }">
            <el-button
              v-if="row.status === 0"
              size="small"
              type="success"
              :icon="Check"
              @click="markHandled(row)"
              :loading="handling[row.id]"
            >处理</el-button>
            <el-tag v-else type="info" size="small">—</el-tag>
          </template>
        </el-table-column>
      </el-table>
    </template>

    <!-- Grid mode: Image cards -->
    <template v-else>
      <div v-loading="loading" class="alarm-grid">
        <div v-for="row in alarms" :key="row.id" class="alarm-card">
          <!-- Card header -->
          <div class="alarm-card__header">
            <span class="alarm-card__algo">{{ row.algo_name || '未知算法' }}</span>
            <div class="alarm-card__actions">
              <el-tag
                :type="row.status === 1 ? 'success' : 'warning'"
                size="small"
                style="margin-right:6px"
              >{{ row.status === 1 ? '已处理' : '未处理' }}</el-tag>
              <el-tooltip v-if="row.status === 0" content="标记为已处理" placement="top">
                <el-icon
                  class="action-icon action-icon--check"
                  :class="{ 'is-loading': handling[row.id] }"
                  @click="markHandled(row)"
                ><Check /></el-icon>
              </el-tooltip>
            </div>
          </div>

          <!-- Snapshot image -->
          <div class="alarm-card__image">
            <el-image
              v-if="row.image_url"
              :src="row.image_url"
              :preview-src-list="allImageUrls"
              :initial-index="alarms.indexOf(row)"
              fit="cover"
              style="width:100%;height:100%"
              preview-teleported
            >
              <template #error>
                <div class="alarm-card__no-image">
                  <el-icon size="32" style="color:#c0c4cc"><Picture /></el-icon>
                  <span>暂无快照</span>
                </div>
              </template>
            </el-image>
            <div v-else class="alarm-card__no-image">
              <el-icon size="32" style="color:#c0c4cc"><Picture /></el-icon>
              <span>暂无快照</span>
            </div>
          </div>

          <!-- Card footer -->
          <div class="alarm-card__footer">
            <div class="alarm-card__info-row">
              <el-icon style="color:#409eff;flex-shrink:0"><Clock /></el-icon>
              <span>{{ formatTime(row.alarm_time) }}</span>
            </div>
            <div v-if="row.alarm_location" class="alarm-card__info-row">
              <el-icon style="color:#67c23a;flex-shrink:0"><Location /></el-icon>
              <span class="text-ellipsis">{{ row.alarm_location }}</span>
            </div>
            <div class="alarm-card__info-row">
              <el-icon style="color:#909399;flex-shrink:0"><VideoCamera /></el-icon>
              <span class="text-ellipsis">{{ row.task_name }}</span>
            </div>
          </div>
        </div>

        <!-- Empty state -->
        <div v-if="!loading && alarms.length === 0" class="alarm-grid__empty">
          <el-empty description="暂无告警记录" />
        </div>
      </div>
    </template>

    <!-- Pagination -->
    <div style="display:flex;justify-content:flex-end;margin-top:16px">
      <el-pagination
        v-model:current-page="page"
        v-model:page-size="pageSize"
        :total="total"
        :page-sizes="viewMode === 'list' ? [10, 20, 50] : [12, 24, 48]"
        layout="total, sizes, prev, pager, next"
        @size-change="fetchAlarms(1)"
        @current-change="fetchAlarms"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Search, Refresh, Check, Picture, Grid, List, Clock, Location, VideoCamera } from '@element-plus/icons-vue'
import { alarmApi } from '@/api/alarm'
import { taskApi } from '@/api/task'

const route = useRoute()
const alarms = ref([])
const tasks = ref([])
const algorithms = ref([])
const loading = ref(false)
const handling = reactive({})
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)
const viewMode = ref('list')

const filter = reactive({
  task_id: null,
  algo_name: null,
  status: null,
  dateRange: null,
})

const allImageUrls = computed(() =>
  alarms.value.filter(a => a.image_url).map(a => a.image_url)
)

function formatTime(t) {
  if (!t) return '—'
  const d = new Date(t.includes('T') ? t : t.replace(' ', 'T'))
  if (isNaN(d.getTime())) return t
  return d.toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-')
}

async function fetchAlarms(p) {
  if (p) page.value = p
  loading.value = true
  const params = { page: page.value, size: pageSize.value }
  if (filter.task_id) params.task_id = filter.task_id
  if (filter.algo_name) params.algo_name = filter.algo_name
  if (filter.status !== null && filter.status !== '') params.status = filter.status
  if (filter.dateRange && filter.dateRange.length === 2) {
    params.start_date = filter.dateRange[0]
    params.end_date = filter.dateRange[1]
  }
  try {
    const res = await alarmApi.list(params)
    alarms.value = res.data?.list || []
    total.value = res.data?.total || 0
  } finally {
    loading.value = false
  }
}

async function fetchTasks() {
  const res = await taskApi.list()
  tasks.value = res.data || []
}

async function fetchAlgorithms() {
  const res = await taskApi.algorithms()
  algorithms.value = res.data || []
}

function resetFilter() {
  filter.task_id = null
  filter.algo_name = null
  filter.status = null
  filter.dateRange = null
  fetchAlarms(1)
}

async function markHandled(row) {
  handling[row.id] = true
  try {
    await alarmApi.updateStatus(row.id, 1)
    ElMessage.success('已标记为处理')
    await fetchAlarms()
  } finally {
    handling[row.id] = false
  }
}

watch(() => route.query.task_id, (v) => {
  if (v) {
    filter.task_id = Number(v)
    fetchAlarms(1)
  }
}, { immediate: true })

// Switch to grid-friendly page size when entering grid mode
watch(viewMode, (mode) => {
  pageSize.value = mode === 'grid' ? 12 : 20
  fetchAlarms(1)
})

onMounted(() => {
  fetchTasks()
  fetchAlgorithms()
  if (!route.query.task_id) fetchAlarms(1)
})
</script>

<style scoped>
/* ── Grid layout ── */
.alarm-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 16px;
  min-height: 120px;
}

.alarm-grid__empty {
  grid-column: 1 / -1;
  display: flex;
  justify-content: center;
  padding: 40px 0;
}

/* ── Card ── */
.alarm-card {
  background: #fff;
  border-radius: 8px;
  border: 1px solid #e4e7ed;
  overflow: hidden;
  transition: box-shadow 0.2s, transform 0.2s;
  display: flex;
  flex-direction: column;
}

.alarm-card:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  transform: translateY(-2px);
}

/* Header */
.alarm-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px 8px;
  border-bottom: 1px solid #f0f2f5;
  min-height: 38px;
}

.alarm-card__algo {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.alarm-card__actions {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  margin-left: 8px;
}

.action-icon {
  font-size: 16px;
  cursor: pointer;
  padding: 3px;
  border-radius: 4px;
  transition: background 0.15s, color 0.15s;
}

.action-icon--check {
  color: #67c23a;
}

.action-icon--check:hover {
  background: #f0f9eb;
  color: #529b2e;
}

.action-icon.is-loading {
  opacity: 0.5;
  pointer-events: none;
}

/* Image area */
.alarm-card__image {
  width: 100%;
  height: 180px;
  background: #f5f7fa;
  overflow: hidden;
  cursor: pointer;
  flex-shrink: 0;
}

.alarm-card__no-image {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  color: #c0c4cc;
  font-size: 13px;
}

/* Footer */
.alarm-card__footer {
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 5px;
  flex: 1;
}

.alarm-card__info-row {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #606266;
  line-height: 1.5;
}

.text-ellipsis {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
