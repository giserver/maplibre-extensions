<template>
  <Map @map-loaded="handleMapLoad"></Map>

  <div class="control-panel">
    <button @click="handleEditClick()">编辑</button>
  </div>
</template>

<script setup lang="ts">
import Map from "./Map.vue";
import { VertexEditorMananger } from "../../src";
import { uuidv7 } from "uuidv7";
import { GeoJSONSourceProxy } from "../../src/core";

let vertexEditorManager: VertexEditorMananger;
let sourceProxy: GeoJSONSourceProxy;
const fixFeatureId = uuidv7();

function handleMapLoad(map: maplibregl.Map) {
  vertexEditorManager = new VertexEditorMananger({ map });

  sourceProxy = new GeoJSONSourceProxy({
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
          id: fixFeatureId,
        },
      },
    ],
  });

  map.addLayer({
    id: "polygon-fill",
    type: "fill",
    source: sourceProxy.id,
    filter: ["==", ["geometry-type"], "Polygon"],
    paint: {
      "fill-color": "#ff1234",
      "fill-opacity": 0.5,
    },
  });
}

function handleEditClick() {
  const feature = sourceProxy.find(fixFeatureId)!;
  vertexEditorManager.setFeature(feature, (id, geometry) => {
    feature.geometry = geometry;
    sourceProxy.update(feature);
  });

  sourceProxy.delete(fixFeatureId);
}
</script>

<style scoped>
.control-panel {
  margin-top: 12px;
  display: flex;
  gap: 12px;
}
</style>
