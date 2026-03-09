<script setup> 
    import Snap from '../../components/Snap.vue';
</script>

# 捕捉

<br>
<Snap />

## 实现

_需要注意：snap的创建必须在所有地图自定义事件之前，因为snap内部会修改地图事件对应的鼠标位置（屏幕坐标和经纬度）_

```ts
// 创建捕捉管理器
const snapManager = new SnapManager({ map });

// 创建一个用于存储绘制数据的source代理
const sourceProxy = new GeoJSONSourceProxy<IdentityGeoJSONFeature>({
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
        id: "019cd1cf-e2b6-7ae3-a7c0-01795dfe880c",
      },
    },
  ],
});

// 创建绘制管理器
const drawManager = new DrawManager({ sourceProxy });

// 修改被捕捉的feature，这个根据项目不同自行修改
snapManager.featureTranslator = () => {
  const features = sourceProxy.where(
    (x) => x.properties.id !== drawManager.currentFeatureId,
  );
  return features;
};

// 开始绘制
drawManager.start("Polygon");

// 启用捕捉
snapManager.toggleEnable();
```

## 参数

| 参数 | 说明 | 类型 | 默认值 |
| - | - | - | - |
| map | 地图实例 | maplibregl.Map | 必填 |
| tolerance | 捕捉距离 | number | 15 |

## 方法

```ts
// 启用或关闭捕捉
snapManager.toggleEnable();
```

## 属性

| 属性 | 类型 | 只读 | 说明 |
| - | - | - | - |
| map | maplibregl.Map | true | 地图实例 |
| tolerance | number | false | 捕捉距离，单位：屏幕像素 |
| allowedLayers | string[] | false | 允许捕捉的图层id |
| featureTranslator | (features: GeoJSON.Feature[]) => GeoJSON.Feature[] \| undefined | false | 被捕捉的feature转换函数 |
| hitPoint | GeoJSON.Position \| undefined | true | 捕捉到的点 |

