<template>
  <Map @map-loaded="handleMapLoaded"></Map>

  <div class="control-panel">
    <div>颜色</div>

    <div
      v-for="(item, key) in snapStyleRef"
      :key="key"
      style="display: flex; align-items: center"
    >
      <label>{{ item.label }}</label>
      <input type="color" v-model="item.color" />
    </div>
  </div>

  <div class="control-panel">
    <div>大小</div>
    <div
      v-for="(item, key) in snapStyleRef"
      :key="key"
      style="display: flex; align-items: center"
    >
      <label>{{ item.label }}</label>
      <input type="range" v-model="item.size" min="1" max="50" />
      <span>{{ item.size }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import Map from "./Map.vue";
import { DrawManager, SnapManager, TNearestPointType } from "../../src";
import { GeoJSONSourceProxy, IdentityGeoJSONFeature } from "../../src/core";
import { ref, watch, watchEffect } from "vue";

let snapManager: SnapManager;
let drawManager: DrawManager;

const snapStyleRef = ref<
  Record<
    TNearestPointType,
    {
      label: string;
      color: string;
      size: number;
    }
  >
>({
  vertex: {
    label: "顶点",
    color: "#ff0000",
    size: 20,
  },
  "line-above": {
    label: "线上",
    color: "#ff0000",
    size: 22,
  },
  "line-mid": {
    label: "线中点",
    color: "#ff0000",
    size: 22,
  },
});

watch(
  snapStyleRef,
  () => {
    const colors = {} as any;
    const sizes = {} as any;

    for (const key in snapStyleRef.value) {
      colors[key] = (snapStyleRef.value as any)[key].color;
      sizes[key] = (snapStyleRef.value as any)[key].size;
    }

    snapManager.setSnapColor(colors);
    snapManager.setSnapSize(sizes);
  },
  { deep: true },
);
function handleMapLoaded(map: maplibregl.Map) {
  snapManager = new SnapManager({
    map,
  });

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

  drawManager = new DrawManager({ sourceProxy });

  snapManager.featureTranslator = () => {
    const features = sourceProxy.where(
      (x) => x.properties.id !== drawManager.currentFeatureId,
    );
    return features;
  };

  drawManager.start("Polygon");
  snapManager.toggleEnable();
}
</script>

<style scoped>
.control-panel {
  margin-top: 12px;
  display: flex;
  gap: 12px;
}
</style>
