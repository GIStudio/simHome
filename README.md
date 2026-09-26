# 精灵树洞 SimHome 🧚

一个像素风观察小游戏：以第三人称视角俯瞰大树洞的内部，看四只小精灵自主地生活——闲逛、睡觉、吃果子、读书、玩耍、跳舞、聊天。

![tech](https://img.shields.io/badge/React_19-Vite_8-TS?logo=vite) ![pixi](https://img.shields.io/badge/rendering-PixiJS_8-ff6392)

## 特性

- **纯前端**：React + TypeScript + Vite 脚手架，PixiJS v8 WebGL 渲染，zustand 状态桥接，无后端
- **程序化像素素材**：`tools/generate-sprites.mjs` 用 Node 逐像素绘制全部透明底精灵图（4 个配色变体 × 7 种动画状态）与树洞场景贴图，可随时重新生成
- **自主 AI**：每只小精灵由性格参数（活力/社交）+ 游戏内时段偏好驱动的状态机决策，会结伴聊天
- **昼夜循环**：游戏内一天 ≈ 现实 4 分钟，日落天色渐暗、灯笼与火炉亮起暖光、萤火虫出没
- **轻互动**：点击精灵查看信息面板并轻微推近镜头，悬停显示状态气泡，支持暂停/1×/2×/4× 时间流速

## 小精灵

| 名字 | 配色 | 头饰 | 性格 |
| --- | --- | --- | --- |
| 苔苔 | 苔绿 | 叶子 | 安静爱读书 |
| 莓莓 | 莓粉 | 花朵 | 活泼爱玩耍 |
| 天天 | 天蓝 | 蘑菇帽 | 贪吃 |
| 闪闪 | 蜜黄 | 星星 | 社交达人爱跳舞 |

## 开发

```bash
npm install       # 安装依赖
npm run dev       # 本地开发
npm run build     # 构建产物（dist/）
```

重新生成像素素材（修改 `tools/generate-sprites.mjs` 后）：

```bash
node tools/generate-sprites.mjs   # 输出到 public/sprites/
```

## 架构

```
src/
├── components/        # React UI 组件（HUD/列表/详情面板/速度控制）
├── game/              # 游戏层（框架无关）
│   ├── GameEngine.ts  #   Pixi 生命周期、摄像机、主循环
│   ├── Fairy.ts       #   精灵实体：动画/移动/活动执行
│   ├── FairyBrain.ts  #   AI 决策：时段权重 × 性格调制
│   ├── Scene.ts       #   树洞场景与昼夜光照
│   └── WorldClock.ts  #   游戏内时间
├── store/gameStore.ts # zustand：游戏快照 → UI
└── data/config.ts     # 场景布局 / 精灵定义 / 常量
tools/generate-sprites.mjs  # 程序化像素素材生成器
public/sprites/             # 生成的精灵图 + manifest
```

## 部署

推送到 `main` 分支后由 GitHub Actions 自动发布到 GitHub Pages（子路径 `/simHome/`）。
