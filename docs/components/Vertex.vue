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
import { IdentityGeoJSONFeature } from "../../src/core";

const id_data = uuidv7();
const data = {
  type: "Feature",
  geometry: {
    type: "Polygon",
    coordinates: [
      [
        [0, 0],
        [0, 10],
        [10, 10],
        [10, 0],
        [0, 0],
      ],
    ],
  },
  properties: {
    id: "polygon1",
  },
} as IdentityGeoJSONFeature;

let vertexEditorManager: VertexEditorMananger;

function handleMapLoad(map: maplibregl.Map) {
  vertexEditorManager = new VertexEditorMananger({ map });

  map.addSource(id_data, {
    type: "geojson",
    data: data,
  });

  map.addLayer({
    id: "polygon-fill",
    type: "fill",
    source: id_data,
    filter: ["==", ["geometry-type"], "Polygon"],
    paint: {
      "fill-color": "#ff1234",
      "fill-opacity": 0.5,
    },
  });

  map.zoomTo(4, {
    center: [5, 5],
  });
}

function handleEditClick() {
  const source = vertexEditorManager.map.getSource(
    id_data,
  ) as maplibregl.GeoJSONSource;

  vertexEditorManager.setFeature(data, (id, geometry) => {
    data.geometry = geometry;
    source.setData(data);
  });

  source.setData({
    type: "FeatureCollection",
    features: [],
  });
}
</script>

<style scoped>
.control-panel {
  margin-top: 12px;
  display: flex;
  gap: 12px;
}
</style>
