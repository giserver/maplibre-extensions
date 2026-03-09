<script setup>
    import Map from "../../components/Vertex.vue"
</script>

# 顶点编辑器

<br/>
<Map />

## 实现

```ts
import { VertexEditorMananger, GeoJSONSourceProxy } from "maplibre-extensions";

const fixFeatureId = uuidv7();
// 创建顶点编辑器
const vertexEditorManager = new VertexEditorMananger({ map });

// 创建一个数据源代理
const sourceProxy = new GeoJSONSourceProxy({
  map,
  data: [
    {
      type: "Feature",
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [120.62079967199617, 31.31209039413254],
            [120.6208034591707, 31.3117862502167],
            [120.62142076840513, 31.311808899264747],
            [120.62142455557955, 31.312070980720577],
            [120.62139047101891, 31.312103336405187],
            [120.62079967199617, 31.31209039413254],
          ],
        ],
      },
      properties: {
        id: fixFeatureId,
      },
    },
  ],
});

// 创建图层
map.addLayer({
  id: "polygon-fill",
  type: "fill",
  source: sourceProxy.id,
  filter: ["==", ["geometry-type"], "Polygon"],
  paint: {
    "fill-color": "#ff1234",
    "fill-opacity": 0.5,
  },
});

// 编辑按钮点击事件
function handleEditClick() {
  // 获取要编辑的feature
  const feature = sourceProxy.find(fixFeatureId)!;

  // 设置feature到编辑管理器中，并设置完成编辑回调
  vertexEditorManager.setFeature(feature, (id, geometry) => {
    // 修改feature 图形
    feature.geometry = geometry;

    // 更新到数据源
    sourceProxy.update(feature);
  });

  // 删除现有feature，也可以隐藏feature，使用hidden函数，在完成回到中执行unhidden
  sourceProxy.delete(fixFeatureId);
}
```

## 参数

| 参数 | 说明     | 类型           | 默认值 |
| ---- | -------- | -------------- | ------ |
| map  | 地图实例 | maplibregl.Map | 必填   |

## 方法

```ts
// 设置feature到编辑管理器中，并设置完成编辑回调
vertexEditorManager.setFeature(feature, (id, geometry) => {});
```

## 属性

| 属性             | 类型           | 只读 | 说明                |
| ---------------- | -------------- | ---- | ------------------- |
| map              | maplibregl.Map | true | 地图实例            |
| id               | string         | true | 编辑管理器source id |
| id_layer_point   | string         | true | 点图层id            |
| id_layer_line    | string         | true | 线图层id            |
| id_layer_polygon | string         | true | 面图层id            |
