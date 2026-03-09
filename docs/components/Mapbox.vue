<template>
  <Map @map-options-init="handleMapOptionsInit"></Map>
</template>

<script setup lang="ts">
import { MapOptions } from "maplibre-gl";
import Map from "./Map.vue";
import { Style } from "../../src";

if (!import.meta.env?.VITE_MAPBOX_TOKEN) {
  const error =
    "需要在docs文件夹下创建一个.env.development文件, 并提供mapbox access token 记作 VITE_MAPBOX_TOKEN ";
  alert(error);
  throw new Error(error);
}

function handleMapOptionsInit(options: Omit<MapOptions, "container">) {
  options.validateStyle = false;
  options.style = "mapbox://styles/mapbox/streets-v12";
  options.transformRequest = Style.createMapboxRequestTransform(
    import.meta.env.VITE_MAPBOX_TOKEN,
  );
}
</script>

<style scoped></style>
