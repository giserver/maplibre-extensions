<script setup>
    import Draw from '../../components/Draw.vue';
</script>

# 绘制

<br/>
<Draw />

## 实现

> 创建绘制管理器

```ts

import { DrawManager, GeoJSONSourceProxy } from "maplibre-extensions";

// 创建一个source代理，用于存储绘制数据
const sourceProxy = new GeoJSONSourceProxy({ map });

// 创建绘制管理器
const drawManager = new DrawManager({ sourceProxy });
```

> 绘制相关方法

```ts
// 绘制点
drawManager.start('Point');

// 绘制线
drawManager.start('LineString');

// 绘制面
drawManager.start('Polygon');

// 结束绘制
drawManager.stop();

// 删除所有绘制数据
drawManager.clear();
```

> 如何获取每一次的绘制的结果

```ts
drawManager.on("drawed" ,async e =>{
    console.log(e.feature);
});

```