<template>
  <Map @map-loaded="handleMapLoaded">
    <template #top-right>
      <textarea
        style="height: 730px; width: 240px; font-size: 10px; opacity: 0.8"
        readonly
        >{{ dataStr }}</textarea
      >
    </template>
  </Map>

  <div class="control-panel">
    <button @click="handleButtonClick('Point')">画点</button>
    <button @click="handleButtonClick('LineString')">画线</button>
    <button @click="handleButtonClick('Polygon')">画面</button>
    <button @click="handleButtonClick('Rectangle2')">画矩形2</button>
    <button @click="handleButtonClick('Rectangle3')">画矩形3</button>
    <button @click="handleButtonClick('Circle')">画圆</button>
    <button @click="handleButtonClick('stop')">停止</button>
    <button @click="handleButtonClick('clear')">清除</button>
  </div>
</template>

<script setup lang="ts">
import Map from "./Map.vue";
import { DrawGeometryType, DrawManager, GeoJSONSourceProxy } from "../../src";
import { ref } from "vue";

const dataStr = ref("");
let drawManager: DrawManager;
function handleMapLoaded(map: maplibregl.Map) {
  const sourceProxy = new GeoJSONSourceProxy({
    map,
  });

  sourceProxy.on("data-change", async (e) => {
    dataStr.value = JSON.stringify(sourceProxy.all(), null, 2);
  });

  drawManager = new DrawManager({ sourceProxy });
}

function handleButtonClick(action: DrawGeometryType | "stop" | "clear") {
  if (action === "stop") {
    drawManager.stop();
    return;
  }

  if (action === "clear") {
    drawManager.clear();
    return;
  }

  drawManager.start(action);
}
</script>

<style scoped>
.control-panel {
  margin-top: 12px;
  display: flex;
  gap: 12px;
}
</style>
