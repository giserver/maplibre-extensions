<script setup>
    import Draw from '../../components/Draw.vue';
</script>

# 绘制

<br/>
<Draw />


## 实现

```ts

import { DrawManager, GeoJSONSourceProxy } from "maplibre-extensions";

// 创建一个source代理，用于存储绘制数据
const sourceProxy = new GeoJSONSourceProxy({ map });

// 创建绘制管理器
const drawManager = new DrawManager({ sourceProxy });
```

## 参数

| 参数 | 说明 | 类型 | 默认值 |
| - | - | - | - |
| once | 是否只绘制一次 | boolean | false |
| sourceProxy | 绘制数据代理 | GeoJSONSourceProxy | 必填 |


## 方法

```ts
// 绘制点
drawManager.start('Point');

// 绘制线
drawManager.start('LineString');

// 绘制面
drawManager.start('Polygon');

// 绘制矩形 两笔绘制
drawManager.start('Rectangle2');

// 绘制矩形 三笔绘制
drawManager.start('Rectangle3');

// 绘制圆形
drawManager.start('Circle');

// 结束绘制
drawManager.stop();

// 删除所有绘制数据
drawManager.clear();
```

## 事件

```ts
// 一次图形绘制完成
drawManager.on("drawed" ,async e =>{
    console.log(e.feature);
});

```

## 属性

| 属性 | 类型 | 只读 | 说明 |
| - | - | - | - |
| map | maplibregl.Map | true | 地图实例 |
| sourceProxy | GeoJSONSourceProxy | true | 数据源代理 |
| drawing | boolean | true | 是否开启了绘制 |
| currentFeatureId | string | true | 当前绘制的图形id - 绘制点时一直为undefined |
| layerSpecs | ReadonlyArray<Readonly<maplibregl.AddLayerObject>> | true | 图层样式配置 |
| id_layer_point | string | true | 点图层id |
| id_layer_point_symbol | string | true | 点符号图层id |
| id_layer_line | string | true | 线图层id |
| id_layer_line_circle | string | true | 线顶点图层id |
| id_layer_polygon | string | true | 面图层id |
| id_layer_polygon_circle | string | true | 面顶点图层id |
| id_layer_polygon_outline | string | true | 面外边线图层id |
| id_layer_polygon_subline | string | true | 面辅助线图层id |