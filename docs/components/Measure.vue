<template>
  <Map @map-loaded="handleMapLoaded"></Map>
  <div class="control-panel">
    <button @click="handleButtonClick('Point')">画点</button>
    <button @click="handleButtonClick('LineString')">画线</button>
    <button @click="handleButtonClick('Polygon')">画面</button>
    <button @click="handleButtonClick('stop')">停止</button>
    <button @click="handleButtonClick('clear')">清除</button>
  </div>

  <div class="control-panel">
    <div>单位 :</div>
    <div>
      <label>长度 </label>
      <select v-model="lengthUnitRef">
        <option value="m">米</option>
        <option value="km">千米</option>
      </select>
    </div>

    <div>
      <label>面积 </label>
      <select v-model="areaUnitRef">
        <option value="m2">平方米</option>
        <option value="km2">平方千米</option>
      </select>
    </div>
  </div>

  <div class="control-panel">
    <div>精度 :</div>
    <div>
      <label>长度 </label>
      <select v-model="lengthPrecision">
        <option :value="2">2</option>
        <option :value="4">4</option>
      </select>
    </div>

    <div>
      <label>面积 </label>
      <select v-model="areaPrecision">
        <option :value="2">2</option>
        <option :value="4">4</option>
      </select>
    </div>
  </div>

  <div class="control-panel">
    <div>显示 :</div>
    <div>线</div>
    <div>
      <label>段</label>
      <input type="checkbox" v-model="showLineSegmentRef" />
    </div>

    <div>&nbsp; | &nbsp;&nbsp;&nbsp; 面</div>

    <div>
      <label>线</label>
      <input type="checkbox" v-model="showPolygonLineRef" />
    </div>

    <div>
      <label>线的段</label>
      <input type="checkbox" v-model="showPolygonLineSegmentRef" />
    </div>

    <div>
      <label>方向</label>
      <input type="checkbox" v-model="showPolygonDirectionRef" />
    </div>
  </div>
</template>

<script setup lang="ts">
import Map from "./Map.vue";
import {
  DrawManager,
  MeasureManager,
  DrawGeometryType,
  Units,
} from "../../src";
import { GeoJSONSourceProxy } from "../../src/core";
import { ref, watch } from "vue";

const lengthUnitRef = ref<"m" | "km">("m");
const areaUnitRef = ref<"m2" | "km2">("m2");
const showLineSegmentRef = ref(true);
const showPolygonLineRef = ref(true);
const showPolygonLineSegmentRef = ref(true);
const showPolygonDirectionRef = ref(true);

const lengthPrecision = ref(2);
const areaPrecision = ref(2);

let drawManager: DrawManager;
let measureManager: MeasureManager;

watch(lengthUnitRef, () => {
  measureManager.reRender();
});

watch(areaUnitRef, () => {
  measureManager.reRender();
});

watch(showLineSegmentRef, (a) => {
  measureManager.showLineSegment(a);
});

watch(showPolygonLineRef, (a) => {
  measureManager.showPolygonLine(a);
});

watch(showPolygonLineSegmentRef, (a) => {
  measureManager.showPolygonLineSegment(a);
});

watch(showPolygonDirectionRef, (a) => {
  measureManager.showPolygonDirection(a);
});

watch(lengthPrecision, () => {
  measureManager.reRender();
});

watch(areaPrecision, () => {
  measureManager.reRender();
});

function handleMapLoaded(map: maplibregl.Map) {
  const sourceProxy = new GeoJSONSourceProxy({
    map,
    data: [],
  });
  drawManager = new DrawManager({ sourceProxy });
  measureManager = new MeasureManager({
    sourceProxy,
    base: {
      point: {
        format: (p) => `${p[0].toFixed(6)}, ${p[1].toFixed(6)}`,
      },
      line: {
        withStart: true,
        format: (length, index, type) => {
          const lengthStr = Units.convertLength(
            length,
            "m",
            lengthUnitRef.value,
          ).toFixed(lengthPrecision.value);
          const unitLabel = lengthUnitRef.value === "m" ? "米" : "千米";

          if (index === 0) return "起点";

          return type === "line-end"
            ? `总长: ${lengthStr}${unitLabel}`
            : `${lengthStr}${unitLabel}`;
        },
      },
      polygon: {
        format: (area) => {
          const areaStr = Units.convertArea(
            area,
            "m2",
            areaUnitRef.value,
          ).toFixed(areaPrecision.value);
          const unitLabel = areaUnitRef.value === "m2" ? "平方米" : "平方千米";

          return `面积: ${areaStr}${unitLabel}`;
        },
        withLineString: true,
        measureLineStringOptions: {
          withStart: false,
          format: (length, index, type) => {
            const lengthStr = Units.convertLength(
              length,
              "m",
              lengthUnitRef.value,
            ).toFixed(lengthPrecision.value);
            const unitLabel = lengthUnitRef.value === "m" ? "米" : "千米";

            if (index === 0) return "起点";

            return type === "line-end"
              ? `总长: ${lengthStr}${unitLabel}`
              : `${lengthStr}${unitLabel}`;
          },
        },
      },
    },
  });

  measureManager.showPolygonDirection(true);
  measureManager.setDirectionSymbol(">", "<");
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
.control-panel {
  margin-top: 12px;
  display: flex;
  gap: 12px;
}
</style>
