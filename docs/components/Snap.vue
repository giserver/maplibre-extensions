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

<style scoped></style>
