<template>
  <Map @map-loaded="handleMapLoaded"></Map>
  <div class="control-panel">
    <button @click="handleButtonClick('Point')">画点</button>
    <button @click="handleButtonClick('LineString')">画线</button>
    <button @click="handleButtonClick('Polygon')">画面</button>
    <button @click="handleButtonClick('stop')">停止</button>
    <button @click="handleButtonClick('clear')">清除</button>
  </div>
</template>

<script setup lang="ts">
import Map from "./Map.vue";
import { DrawManager, MeasureManager, DrawGeometryType } from "../../src";
import { GeoJSONSourceProxy } from "../../src/core";

let drawManager: DrawManager;
let measureManager: MeasureManager;

function handleMapLoaded(map: maplibregl.Map) {
  const sourceProxy = new GeoJSONSourceProxy({
    map,
    data: [],
  });
  drawManager = new DrawManager({sourceProxy});
  measureManager = new MeasureManager(sourceProxy, {
    base: {
      point: {
        format: (p) => `${p[0].toFixed(6)}, ${p[1].toFixed(6)}`,
      },
      line: {
        withStart: true,
        format: (length, index, end, segment) => {
          if (index === 0) return "起点";
          if (end) return `总长: ${length.toFixed(2)}米`;
          return `${length.toFixed(2)}米`;
        },
      },
      polygon: {
        format: (area) => `面积: ${area.toFixed(2)}平方米`,
        withLineString: true,
        measureLineStringOptions: {
          withStart: false,
          format: (length, index, end, segment) => {
            if (index === 0) return "起点";
            if (end) return `总长: ${length.toFixed(2)}米`;
            return `${length.toFixed(2)}米`;
          },
        },
      },
    },
  });
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
.control-panel{
    margin-top: 12px;
    display: flex;
    gap: 12px;
}
</style>
