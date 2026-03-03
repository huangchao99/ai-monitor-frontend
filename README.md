# AI Monitor Frontend

> AI 智能视频监控系统 — Vue3 前端管理界面

提供摄像头管理、监控任务配置、事件告警查看三大功能模块，通过 REST API 与 Go 后端通信，通过 mpegts.js 直接播放 ZLMediaKit 提供的 HTTP-FLV 直播流。

---

## 快速启动（开发模式）

```bash
/home/hzhy/ai-monitor-frontend/start.sh
```

启动后访问：`http://localhost:5173`

> **前提**：Go 后端（`:8090`）和 ZLMediaKit（`:80`）需提前启动。

### 手动启动

```bash
cd /home/hzhy/ai-monitor-frontend
npm run dev
```

---

## 目录结构

```
ai-monitor-frontend/
├── index.html
├── vite.config.js        # Vite 配置（含 /api 和 /snapshots 代理）
├── start.sh              # 一键启动脚本（dev 模式）
├── dist/                 # 生产构建产物（npm run build 生成）
└── src/
    ├── main.js           # 应用入口，注册 Element Plus、Router、Pinia
    ├── App.vue           # 根组件（侧边栏导航布局）
    ├── router/           # Vue Router 路由配置
    ├── stores/           # Pinia 状态管理
    ├── api/              # axios 封装的后端 API 调用
    └── views/
        ├── Cameras.vue   # 摄像头管理页
        ├── Tasks.vue     # 任务管理页
        └── Alarms.vue    # 事件告警页
```

---

## 功能页面

### 摄像头管理（`Cameras.vue`）

- 摄像头 CRUD（新增、编辑、删除）
- ZLM 推流一键启/停控制
- 流状态展示（推流中 / 未启动 / 异常）
- 实时直播预览，使用 **mpegts.js** 播放 HTTP-FLV 流：
  ```
  http://localhost:80/live/cam{id}.live.flv
  ```

> **⚠️ 已知问题：PCMA 音频导致 `CodecUnsupported`**
>
> IP 摄像头普遍使用 **PCMA（G.711 A-law）** 音频（FLV 音频编解码器 ID = 7）。FLV 规范虽允许该格式，但浏览器的 MSE（Media Source Extensions）只支持 AAC / MP3，遇到 PCMA 时 mpegts.js 会抛出 `CodecUnsupported` 错误，导致整个视频流无法播放。
>
> **解决方案**：在 `VideoPlayer.vue` 的 `mpegts.createPlayer()` 数据源参数中设置 `hasAudio: false`，告知 mpegts.js 跳过音频轨道处理，仅解码视频。监控预览本身无需音频（video 标签已设为 `muted`），该方案无副作用。
>
> ```js
> // src/components/VideoPlayer.vue
> mpegts.createPlayer(
>   { type: 'flv', url: ..., isLive: true, hasAudio: false }, // ← 关键
>   { ... }
> )
> ```
>
> 注意：**不要**通过修改摄像头视频编码（H.264 / H.265）来尝试修复此问题，根本原因在音频编码而非视频编码。

### 任务管理（`Tasks.vue`）

- 任务 CRUD（绑定摄像头、配置任务名称）
- 创建时可绑定多个算法，每个算法独立配置：
  - 置信度阈值（`confidence`）
  - 触发报警持续时间（`duration`，单位：秒）
  - 报警冷却时间（`alarm_interval`，单位：秒）
  - 推理跳帧数（`skip_frame`）
  - ROI 感兴趣区域（归一化多边形坐标，留空表示全屏）
- 任务一键启/停（Go 后端转发至 Python 算法服务）
- 一键跳转查看该任务的告警记录

### 事件告警（`Alarms.vue`）

- 分页告警列表
- 按任务、处理状态筛选
- 内联图片预览（报警抓图快照）
- 一键标记为"已处理"

---

## 代理配置（仅开发模式）

`vite.config.js` 中配置了以下代理，开发时无需跨域处理：

| 路径前缀 | 代理目标 | 说明 |
|---------|---------|------|
| `/api` | `http://localhost:8090` | Go 后端 REST API |
| `/snapshots` | `http://localhost:8090` | 报警抓图静态文件 |

视频直播流（`/live/*.flv`）直接访问 ZLMediaKit（`:80`），不经过代理。

---

## 技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| Vue 3 | 3.x | 前端框架（Composition API） |
| Vite | 4.x | 构建工具（兼容 Node 18） |
| Element Plus | 2.x | UI 组件库 |
| Vue Router | 4.x | 前端路由 |
| Pinia | 2.x | 状态管理 |
| axios | 1.x | HTTP 请求封装 |
| mpegts.js | 1.x | HTTP-FLV 直播播放（flv.js 继任者） |

> **注意**：当前使用 Vite 4.x，与 Node 18 兼容。Node 20+ 可升级至 Vite 5/6/7。

---

## 生产环境构建

```bash
cd /home/hzhy/ai-monitor-frontend
npm run build
# 产物输出到 dist/ 目录
```

生产模式下无需单独运行前端服务器，由 **Go 后端直接托管** `dist/` 静态文件，通过 `http://工控机IP:8090` 访问完整界面。详见 Go 后端 README。

---

## 相关文档

- 系统总体介绍：`/home/hzhy/ai-monitor-intro.md`
- Go 后端：`/home/hzhy/ai-monitor-backend/README.md`
- Python 算法服务：`/home/hzhy/ai-monitor-service/README.md`
