<template>
  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px">
    <Map
      container-id="map1"
      @map-options-init="handleMapOptionsInit"
      @map-style-loaded="(m) => handleMapStyleLoaded(m, 'zh-Hans')"
    >
      <template #top-left>
        <span>中文</span>
      </template>
    </Map>
    <Map
      container-id="map2"
      @map-options-init="handleMapOptionsInit"
      @map-style-loaded="(m) => handleMapStyleLoaded(m, 'en')"
    >
      <template #top-right>
        <span>英文</span>
      </template>
    </Map>
    <Map
      container-id="map3"
      @map-options-init="handleMapOptionsInit"
      @map-style-loaded="(m) => handleMapStyleLoaded(m, 'ja')"
    >
      <template #bottom-left>
        <span>日文</span>
      </template>
    </Map>
    <Map
      container-id="map4"
      @map-options-init="handleMapOptionsInit"
      @map-style-loaded="(m) => handleMapStyleLoaded(m, 'mul')"
    >
      <template #bottom-right>
        <span>多文字</span>
      </template>
    </Map>
  </div>
</template>

<script setup lang="ts">
import Map from "./Map.vue";
import { Style } from "../../src";

function handleMapOptionsInit(
  options: Omit<maplibregl.MapOptions, "container">,
) {
  options.zoom = 1;
}

function handleMapStyleLoaded(
  map: maplibregl.Map,
  lang: "mul" | "en" | "zh-Hans" | "ja",
) {
  map.setStyle(
    Style.adaptStyleLanguage(map.getStyle(), lang, {
      fieldMake: (lang) => (lang === "mul" ? "name" : "name:" + lang),
    }),
  );
}
</script>

<style scoped>
:deep(#map1) {
  height: 450px !important;
}

:deep(#map2) {
  height: 450px !important;
}

:deep(#map3) {
  height: 450px !important;
}

:deep(#map4) {
  height: 450px !important;
}
</style>
