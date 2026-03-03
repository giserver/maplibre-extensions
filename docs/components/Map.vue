<template>
  <div style="position: relative">
    <div id="controls">
      <div class="top left">
        <slot name="top-left"></slot>
      </div>
      <div class="top right">
        <slot name="top-right"></slot>
      </div>
      <div class="bottom left">
        <slot name="bottom-left"></slot>
      </div>
      <div class="bottom right">
        <slot name="bottom-right"></slot>
      </div>
    </div>
    <div id="maplibre-container"></div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from "vue";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

const props = defineProps<{
  onMapOptionsInit?: (
    options: Omit<maplibregl.MapOptions, "container">,
  ) => void;
  onMapInit?: (map: maplibregl.Map) => void;
  onMapLoaded?: (map: maplibregl.Map) => void;
}>();

onMounted(() => {
  const mapOptions: maplibregl.MapOptions = {
    container: "maplibre-container",
    style: "https://demotiles.maplibre.org/style.json",
    attributionControl: false,
  };
  if (props.onMapOptionsInit) props.onMapOptionsInit(mapOptions);
  const map = new maplibregl.Map(mapOptions);

  props.onMapInit?.(map);

  map.on("load", () => {
    props.onMapLoaded?.(map);
  });
});
</script>

<style scoped>
#maplibre-container {
  width: 100%;
  height: 750px;
}

#controls {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;
  pointer-events: none;
  z-index: 1;
}

#controls > * {
  pointer-events: all;
}

#controls > div {
  width: fit-content;
  position: absolute;
}

.top {
  top: 10px;
}

.right {
  right: 10px;
}

.bottom {
  bottom: 10px;
}

.left {
  left: 10px;
}
</style>
