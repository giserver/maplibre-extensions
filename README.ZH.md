# maplibre-extensions

[English](README.md) | [简体中文](README.ZH.md)

基于 [maplibre-gl](https://maplibre.org/) 的地图交互扩展库：绘制、测量、捕捉、顶点编辑、样式适配等。

## 功能

- **绘制** — `DrawManager`，交互式绘制点 / 线 / 面 / 矩形（两点、三点）/ 圆
- **测量** — `MeasureManager`，测量长度 / 面积 / 坐标，文案格式可自定义
- **捕捉** — `SnapManager`，将鼠标吸附到附近要素的顶点、边中点
- **顶点编辑** — `VertexEditorMananger`，对已有图形进行顶点移动 / 插入 / 删除
- **样式** — `Style`，将 Mapbox style 适配到 maplibre、本地化样式文字（如 `zh-CN`）
- **核心** — `GeoJSONSourceProxy`（带事件的 GeoJSON 数据代理）、`map.getLayerProxy(id)`、`Units`、`Events`、`MiddleButtonRoate`

## 安装

`maplibre-gl` 是[对等依赖（peer dependency）](https://nodejs.org/zh-cn/blog/npm/peer-dependencies)，**不会**自动安装——需要由你的项目自行提供（保证全项目只有一份 maplibre-gl 实例，`Map` 原型扩展才能正常生效）：

```bash
# npm
npm install maplibre-extensions maplibre-gl

# yarn
yarn add maplibre-extensions maplibre-gl
```

## 快速开始

```ts
import maplibregl from "maplibre-gl";
import { GeoJSONSourceProxy, DrawManager } from "maplibre-extensions";

const map = new maplibregl.Map({
  container: "map",
  style: "https://demotiles.maplibre.org/style.json",
  center: [120.62, 31.31],
  zoom: 14,
});

// 各交互模块共用的数据代理
const sourceProxy = new GeoJSONSourceProxy({ map });

// 开始绘制面
const drawManager = new DrawManager({ sourceProxy });
drawManager.on("drawed", (e) => console.log("绘制完成", e.feature));
drawManager.start("Polygon");
```

> import `maplibre-extensions` 时会重写 `maplibregl.Map.prototype.addLayer`，为每个图层附加 `LayerProxy`，并新增 `map.getLayerProxy(id)` 方法。

## 用法

### 绘制

```ts
import { DrawManager, GeoJSONSourceProxy } from "maplibre-extensions";

const sourceProxy = new GeoJSONSourceProxy({ map });
const drawManager = new DrawManager({ sourceProxy, once: false });

drawManager.start("Point");       // Point | LineString | Polygon
drawManager.start("Rectangle2");  // 两角点画矩形
drawManager.start("Rectangle3");  // 三点画矩形
drawManager.start("Circle");

drawManager.on("drawed", (e) => console.log(e.feature));
drawManager.stop();               // 停止绘制
drawManager.clear();              // 清除所有已绘图形
```

### 测量

```ts
import { DrawManager, GeoJSONSourceProxy, MeasureManager } from "maplibre-extensions";

const sourceProxy = new GeoJSONSourceProxy({ map });
const drawManager = new DrawManager({ sourceProxy });

const measureManager = new MeasureManager({
  sourceProxy,
  base: {
    line: {
      withStart: true,
      format: (length, index, type) =>
        type === "line-end" ? `总长: ${length.toFixed(2)}米` : `${length.toFixed(2)}米`,
    },
    polygon: { format: (area) => `面积: ${area.toFixed(2)}平方米` },
    point: { format: (p) => `${p[0].toFixed(6)}, ${p[1].toFixed(6)}` },
  },
});

drawManager.start("LineString"); // 绘制线，测量标注自动渲染
measureManager.showLineSegment(true);
```

### 捕捉

```ts
import { SnapManager } from "maplibre-extensions";

// 必须在自定义的地图鼠标事件之前创建，
// 它会改写地图事件中的鼠标位置
const snapManager = new SnapManager({ map, tolerance: 15 });
snapManager.toggleEnable(); // 开启/关闭捕捉
```

### 顶点编辑

```ts
import { VertexEditorMananger } from "maplibre-extensions";

const editor = new VertexEditorMananger({ map });

// 编辑 feature 的顶点；编辑结束时回调
editor.setFeature(feature, (id, geometry) => {
  console.log("编辑完成", id, geometry);
});
```

### 样式

```ts
import maplibregl from "maplibre-gl";
import { Style } from "maplibre-extensions";

// 在 maplibre 中使用 Mapbox 样式
const map = new maplibregl.Map({
  container: "map",
  style: "mapbox://styles/mapbox/streets-v12",
  transformRequest: Style.createMapboxRequestTransform(MAPBOX_TOKEN),
});

// 样式文字本地化
map.on("load", () => {
  map.setStyle(Style.adaptStyleLanguage(map.getStyle(), "zh-CN"));
});
```

### GeoJSONSourceProxy

`GeoJSONSourceProxy` 在 GeoJSON 数据源之上封装了增删改查与变更事件。要素的 `properties` 必须包含 `id`。

```ts
import { GeoJSONSourceProxy } from "maplibre-extensions";

const sourceProxy = new GeoJSONSourceProxy({ map, data: features });

sourceProxy.update(feature);                  // 新增或更新
const f = sourceProxy.find(id);
const list = sourceProxy.where((f) => ...);   // 条件查询
sourceProxy.delete(id);
sourceProxy.hidden(id);                       // 隐藏 / 显示
sourceProxy.unhidden(id);

sourceProxy.on("data-change", () => reRender());
```

事件：`add` / `update` / `delete` / `clear` / `hidden` / `unhidden` / `data-change`。

## 文档

完整文档见 [`docs/`](docs/guide/what.md)，或本地启动文档站：

```bash
npm run docs:dev
```

## 开发

```bash
npm install
npm run build     # tsc + vite build -> dist/
npm test          # vitest
npm run docs:dev  # vitepress 文档
```

## 许可证

[MIT](LICENSE)
