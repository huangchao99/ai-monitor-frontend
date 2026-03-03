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
        <el-col :span="4">
          <el-button type="primary" :icon="Search" @click="fetchAlarms(1)">查询</el-button>
          <el-button :icon="Refresh" @click="resetFilter">重置</el-button>
        </el-col>
      </el-row>
    </el-card>

    <!-- Table -->
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

    <!-- Pagination -->
    <div style="display:flex;justify-content:flex-end;margin-top:16px">
      <el-pagination
        v-model:current-page="page"
        v-model:page-size="pageSize"
        :total="total"
        :page-sizes="[10, 20, 50]"
        layout="total, sizes, prev, pager, next"
        @size-change="fetchAlarms(1)"
        @current-change="fetchAlarms"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Search, Refresh, Check, Picture } from '@element-plus/icons-vue'
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

const filter = reactive({
  task_id: null,
  algo_name: null,
  status: null,
  dateRange: null,
})

function formatTime(t) {
  if (!t) return '—'
  // DB stores time as local CST string "YYYY-MM-DD HH:MM:SS" (no timezone).
  // Replace space with T so browsers parse it as local time, not UTC.
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

// Support navigating here with task_id query param
watch(() => route.query.task_id, (v) => {
  if (v) {
    filter.task_id = Number(v)
    fetchAlarms(1)
  }
}, { immediate: true })

onMounted(() => {
  fetchTasks()
  fetchAlgorithms()
  if (!route.query.task_id) fetchAlarms(1)
})
</script>
