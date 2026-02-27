<template>
  <Map @map-loaded="handleMapLoaded"></Map>
</template>

<script setup lang="ts">
import Map from "./Map.vue";
import { DrawManager, SnapManager } from "../../src";
import { GeoJSONSourceProxy, IdentityGeoJSONFeature } from "../../src/core";

let snapManager: SnapManager;
let drawManager: DrawManager;

function handleMapLoaded(map: maplibregl.Map) {
  snapManager = new SnapManager({
    map,
  });

  const sourceProxy = new GeoJSONSourceProxy<IdentityGeoJSONFeature>({
    map,
    data: [],
  });

  drawManager = new DrawManager({ sourceProxy });

  snapManager.featureTranslator = () => {
    const features = sourceProxy.all();
    features.pop();
    return features;
  };

  drawManager.start("Polygon");
  snapManager.toggleEnable();
}
</script>

<style scoped></style>
