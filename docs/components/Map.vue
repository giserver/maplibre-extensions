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
    <div :id="containerId" style="width: 100%; height: 750px"></div>
  </div>
</template>

<script setup lang="ts">
import { Style } from "../../src";
import { onMounted } from "vue";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

const props = withDefaults(
  defineProps<{
    containerId?: string;
    onMapOptionsInit?: (
      options: Omit<maplibregl.MapOptions, "container">,
    ) => void;
    onMapInit?: (map: maplibregl.Map) => void;
    onMapLoaded?: (map: maplibregl.Map) => void;
    onMapStyleLoaded?: (map: maplibregl.Map) => void;
  }>(),
  {
    containerId: "maplibre-container",
  },
);

onMounted(() => {
  const mapOptions: maplibregl.MapOptions = {
    container: props.containerId,
    style: "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json",
    attributionControl: false,
    center: [120.62129047101891, 31.312003336405187],
    zoom: 18,
  };
  if (props.onMapOptionsInit) props.onMapOptionsInit(mapOptions);
  const map = new maplibregl.Map(mapOptions);

  props.onMapInit?.(map);

  map.on("style.load", () => {
    props.onMapStyleLoaded?.(map);
  });

  map.on("load", () => {
    map.setStyle(
      Style.adaptStyleLanguage(map.getStyle(), "zh-Hans", {
        fieldMake: (lang) => "name:" + lang,
      }),
    );

    props.onMapLoaded?.(map);
  });
});
</script>

<style scoped>
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
  background-color: rgba(0, 0, 0, 0.6);
  color: azure;
  padding: 6px;
}

#controls > div:empty {
  padding: 0px;
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
