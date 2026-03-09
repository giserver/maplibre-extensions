<script setup>
    import Mapbox from '../../components/Mapbox.vue';
    import LanguageCompare from '../../components/LanguageCompare.vue';
</script>

# 适配mapbox style

<br/>
<Mapbox />

## 实现

```ts
import { Style } from "maplibre-extensions";

const map = new maplibregl.Map({
  container: "map",
  style: "mapbox://styles/mapbox/streets-v12",
  transformRequest: Style.createMapboxRequestTransform(
    import.meta.env.VITE_MAPBOX_TOKEN,
  ),
});
```

# 语言适配

<br/>
<LanguageCompare/>

## 实现

```ts
import { Style } from "maplibre-extensions";

const map = new maplibregl.Map({ container: "map", style: "xxxx.json" });

map.on("load", () => {
  // 设置中文
  map.setStyle(Style.adaptStyleLanguage(map.getStyle(), "zh-CN"));
});
```
