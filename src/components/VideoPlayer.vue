<template>
  <div class="video-wrap">
    <video ref="videoEl" class="video-el" autoplay muted playsinline controls />
    <div v-if="error" class="video-error">
      <el-icon size="40"><VideoPlay /></el-icon>
      <p>{{ error }}</p>
      <el-button size="small" @click="init">重试</el-button>
    </div>
    <div v-if="loading && !error" class="video-loading">
      <el-icon class="is-loading" size="30"><Loading /></el-icon>
      <p>连接中...</p>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onUnmounted } from 'vue'
import mpegts from 'mpegts.js'

const props = defineProps({
  url: { type: String, default: '' },
})

const videoEl = ref(null)
const error = ref('')
const loading = ref(true)
let player = null

function destroy() {
  if (player) {
    try {
      player.unload()
      player.detachMediaElement()
      player.destroy()
    } catch { /* ignore */ }
    player = null
  }
}

function init() {
  error.value = ''
  loading.value = true
  destroy()

  if (!props.url) {
    error.value = '未配置视频流地址'
    loading.value = false
    return
  }

  if (!mpegts.isSupported()) {
    error.value = '当前浏览器不支持 FLV 播放'
    loading.value = false
    return
  }

  player = mpegts.createPlayer(
    { type: 'flv', url: props.url, isLive: true },
    {
      enableWorker: true,
      lazyLoad: false,
      liveBufferLatencyChasing: true,
      liveBufferLatencyMaxLatency: 3.0,
      liveBufferLatencyMinRemain: 0.5,
    }
  )

  player.attachMediaElement(videoEl.value)
  player.load()

  player.on(mpegts.Events.ERROR, (_, detail) => {
    error.value = `播放错误: ${detail}`
    loading.value = false
  })

  player.on(mpegts.Events.MEDIA_INFO, () => {
    loading.value = false
  })

  player.play().catch(() => {
    /* autoplay may be blocked, user can manually start */
    loading.value = false
  })
}

watch(() => props.url, (v) => {
  if (v) init()
  else destroy()
})

onMounted(() => { if (props.url) init() })
onUnmounted(destroy)
</script>

<style scoped>
.video-wrap {
  position: relative;
  background: #000;
  width: 100%;
  aspect-ratio: 16 / 9;
  border-radius: 4px;
  overflow: hidden;
}
.video-el {
  width: 100%;
  height: 100%;
  object-fit: contain;
}
.video-error, .video-loading {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: #909399;
  background: rgba(0,0,0,0.7);
}
.video-error { color: #f56c6c; }
</style>
