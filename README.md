# 深海图鉴 / Pixel Ocean

从海面出发，收集整个海洋。—— Vue 3 + TypeScript + PixiJS 8 像素风潜水收集游戏。

## 运行

```bash
npm install
npm run dev      # 开发模式，浏览器打开终端显示的地址
npm run build    # 生产构建，输出到 dist/
```

## 操作

| 按键 | 功能 |
|---|---|
| W A S D / 方向键 | 游动 |
| Shift | 冲刺（推进器） |
| Space | 挥网捕获 / 在船上跳水（S、↓ 也可跳水） |
| E | 互动：登船、呼叫小船、进入沉船/洞穴、开宝箱、收鱼笼、采样 |
| F / B / M | 图鉴 / 背包 / 海图 |
| R / C / L | 声呐 / 相机 / 潜水灯 |
| G / T | 诱鱼器 / 鱼笼 |
| H | 一键回到船上 |
| Esc | 关闭面板 |

移动端：左侧虚拟摇杆，右侧 捕获 / 冲刺 / 互动 等按钮。

## 目录

```
src/
├─ game/            游戏世界（PixiJS）
│  ├─ core/         主循环 Game、输入、音频、随机数、常量
│  ├─ player/       潜水员
│  ├─ fish/         鱼类实体 + 行为 AI、模板化像素鱼生成
│  ├─ world/        Chunk 地形、装饰、沉船/洞穴内部、像素美术
│  ├─ ocean/        海面、昼夜天气、黑暗/照明、粒子特效
│  ├─ biome/        栖息环境与生成候选
│  ├─ equipment/    装备属性计算
│  └─ events/       海洋随机事件
├─ data/            鱼类数据库、海域、装备、成就
├─ systems/         生成 / 捕获 / 经济 / 图鉴 / 进度 / 存档
├─ components/      Vue UI（HUD、商店、图鉴、海图……）
└─ App.vue
```

## 扩展鱼类数据库

在 `src/data/fish/species.ts` 中追加一行记录即可，外观由美术模板字符串
`"体型 尾型 鳍型 纹理 主色 副色 腹色 特征"` 自动生成像素 Sprite，无需绘制美术资源。
