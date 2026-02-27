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
import { DrawGeometryType, DrawManager } from "../../src";
import { GeoJSONSourceProxy } from "../../src/core";

let drawManager: DrawManager;

function handleMapLoaded(map: maplibregl.Map) {
  const sourceProxy = new GeoJSONSourceProxy({
    map,
    data: [],
  });

  drawManager = new DrawManager(sourceProxy);
}

function handleButtonClick(action : DrawGeometryType | "stop" | "clear"){
  if(action === "stop"){
    drawManager.stop();
    return;
  }

  if(action === "clear"){
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
