<script setup>
    import Measure from '../../components/Measure.vue';
</script>

# 测量

<br/>
<Measure />

## 实现

```ts
import { DrawManager, GeoJSONSourceProxy, MeasureManager } from "maplibre-extensions";

// 创建一个source代理，用于存储测量数据
const sourceProxy = new GeoJSONSourceProxy({
  map,
  data: [],
});

// 创建绘制管理器, 用于绘制测量数据
drawManager = new DrawManager({ sourceProxy });

// 创建测量管理器
measureManager = new MeasureManager({
  sourceProxy,
  base: {
    point: {
      format: (p) => `${p[0].toFixed(6)}, ${p[1].toFixed(6)}`,
    },
    line: {
      withStart: true,
      format: (length, index, type) => {
        if (index === 0) return "起点";
        if (type === "line-end") return `总长: ${length.toFixed(2)}米`;
        return `${length.toFixed(2)}米`;
      },
    },
    polygon: {
      format: (area) => `面积: ${area.toFixed(2)}平方米`,
      withLineString: true,
      measureLineStringOptions: {
        withStart: false,
        format: (length, index, type) => {
          if (index === 0) return "起点";
          if (type === "line-end") return `总长: ${length.toFixed(2)}米`;
          return `${length.toFixed(2)}米`;
        },
      },
    },
  },
});

```

## 参数

| 参数 | 说明 | 类型 | 默认值 |
| - | - | - | - |
| sourceProxy | 测量数据代理 | GeoJSONSourceProxy | 必填 |
| base | 测量基础配置 | MeasureGeometryOptions | 必填 |

* MeasureGeometryOptions

| 参数 | 说明 | 类型 | 默认值 |
| - | - | - | - |
| point | 点测量配置 | MeasurePointOptions | 必填 |
| line | 线测量配置 | MeasureLineOptions | 必填 |
| polygon | 面测量配置 | MeasurePolygonOptions | 必填 |

* MeasurePointOptions

| 参数 | 说明 | 类型 | 默认值 |
| - | - | - | - |
| format | 格式化函数 | (position: [number, number]) => string | 必填 |

* MeasureLineOptions

| 参数 | 说明 | 类型 | 默认值 |
| - | - | - | - |
| format | 格式化函数 | (length: number, index: number, type: "line-string" \| "line-segment" \| "line-end") => string | 必填 |
| withStart | 是否显示起点 | boolean | true |
| length | 长度计算函数 | (line: GeoJSON.LineString) => number | turf.length |

* MeasurePolygonOptions

| 参数 | 说明 | 类型 | 默认值 |
| - | - | - | - |
| format | 格式化函数 | (area: number) => string | 必填 |
| withLineString | 是否计算线 | boolean | true |
| measureLineStringOptions | 线测量配置 | MeasureLineOptions | 必填 |
| area | 面积计算函数 | (polygon: GeoJSON.Polygon) => number | turf.area |

## 方法

```ts

// 从外部设置feature，并显示其测量结果
m.setFeature(feature);

// 获取feature
m.getFeature(id);

// 是否存在feature
m.hasFeature(id);

// 删除feature
m.removeFeature(id);

// 设置polygon的方向符号
m.setDirectionSymbol(">" , "<");

// 设置测量是否显示
m.setVisible(false);

// 是否显示线的段测量
m.showLineSegment(false);

// 是否显示polygon方向符号
m.showPolygonDirection(false);

// 显示polygon线测量数据
m.showPolygonLine(false);

// 显示polygon线的段测量数据
m.showPolygonLineSegment(false);

// 重新计算绘制数据，并刷新地图绘制
m.reRender();

```

## 属性

| 属性 | 类型 | 只读 | 说明 |
| - | - | - | - |
| map | maplibregl.Map | true | 地图实例 |
| sourceProxy | GeoJSONSourceProxy | true | 绘制数据源代理 |
| id_source_measure_symbol | string | true | 测量符号数据源id |
| id_layer_measrue_point | string | true | 点测量结果图层id |
| id_layer_measrue_line | string | true | 线测量结果图层id |
| id_layer_measrue_line_segment | string | true | 线的段测量结果图层id |
| id_layer_measrue_polygon | string | true | 面测量结果图层id |
| id_layer_measrue_polygon_line | string | true | 面的线测量结果图层id |
| id_layer_measrue_polygon_line_segment | string | true | 面的线的段测量结果图层id |
| id_layer_polygon_clockwise | string | true | 面线方向符号图层id |