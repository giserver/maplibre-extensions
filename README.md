# maplibre-extensions

[English](README.md) | [简体中文](README.ZH.md)

Map interaction extensions for [maplibre-gl](https://maplibre.org/): drawing, measuring, snapping, vertex editing, and style utilities.

## Features

- **Draw** — `DrawManager`, draw Point / LineString / Polygon / Rectangle (2-point & 3-point) / Circle interactively
- **Measure** — `MeasureManager`, measure length / area / coordinates with customizable text format
- **Snap** — `SnapManager`, snap the cursor to vertices and edge midpoints of nearby features
- **Vertex edit** — `VertexEditorMananger`, move / insert / delete vertices of existing geometries
- **Style** — `Style`, adapt Mapbox styles for maplibre and localize style text (e.g. `zh-CN`)
- **Core** — `GeoJSONSourceProxy` (GeoJSON data store with events), `map.getLayerProxy(id)`, `Units`, `Events`, `MiddleButtonRoate`

## Installation

`maplibre-gl` is a [peer dependency](https://nodejs.org/en/blog/npm/peer-dependencies) and is **not** installed automatically — your project must provide it (so there is only one maplibre-gl instance and `Map` prototype extensions work correctly):

```bash
# npm
npm install maplibre-extensions maplibre-gl

# yarn
yarn add maplibre-extensions maplibre-gl
```

## Quick start

```ts
import maplibregl from "maplibre-gl";
import { GeoJSONSourceProxy, DrawManager } from "maplibre-extensions";

const map = new maplibregl.Map({
  container: "map",
  style: "https://demotiles.maplibre.org/style.json",
  center: [120.62, 31.31],
  zoom: 14,
});

// data store shared by the interaction modules
const sourceProxy = new GeoJSONSourceProxy({ map });

// start drawing polygons
const drawManager = new DrawManager({ sourceProxy });
drawManager.on("drawed", (e) => console.log("drawed", e.feature));
drawManager.start("Polygon");
```

> Importing `maplibre-extensions` patches `maplibregl.Map.prototype.addLayer` to attach a `LayerProxy` per layer and adds `map.getLayerProxy(id)`.

## Usage

### Draw

```ts
import { DrawManager, GeoJSONSourceProxy } from "maplibre-extensions";

const sourceProxy = new GeoJSONSourceProxy({ map });
const drawManager = new DrawManager({ sourceProxy, once: false });

drawManager.start("Point");       // Point | LineString | Polygon
drawManager.start("Rectangle2");  // rectangle from 2 corners
drawManager.start("Rectangle3");  // rectangle from 3 points
drawManager.start("Circle");

drawManager.on("drawed", (e) => console.log(e.feature));
drawManager.stop();               // stop drawing
drawManager.clear();              // remove all drawn features
```

### Measure

```ts
import { DrawManager, GeoJSONSourceProxy, MeasureManager } from "maplibre-extensions";

const sourceProxy = new GeoJSONSourceProxy({ map });
const drawManager = new DrawManager({ sourceProxy });

const measureManager = new MeasureManager({
  sourceProxy,
  base: {
    line: {
      withStart: true,
      format: (length, index, type) =>
        type === "line-end" ? `total: ${length.toFixed(2)} m` : `${length.toFixed(2)} m`,
    },
    polygon: { format: (area) => `area: ${area.toFixed(2)} m²` },
    point: { format: (p) => `${p[0].toFixed(6)}, ${p[1].toFixed(6)}` },
  },
});

drawManager.start("LineString"); // draw a line, measures render automatically
measureManager.showLineSegment(true);
```

### Snap

```ts
import { SnapManager } from "maplibre-extensions";

// create SnapManager before your own map mouse handlers,
// it rewrites the mouse position of map events
const snapManager = new SnapManager({ map, tolerance: 15 });
snapManager.toggleEnable(); // turn snapping on/off
```

### Vertex edit

```ts
import { VertexEditorMananger } from "maplibre-extensions";

const editor = new VertexEditorMananger({ map });

// let the user edit `feature`'s vertices; called when editing finishes
editor.setFeature(feature, (id, geometry) => {
  console.log("edited", id, geometry);
});
```

### Style

```ts
import maplibregl from "maplibre-gl";
import { Style } from "maplibre-extensions";

// use Mapbox styles in maplibre
const map = new maplibregl.Map({
  container: "map",
  style: "mapbox://styles/mapbox/streets-v12",
  transformRequest: Style.createMapboxRequestTransform(MAPBOX_TOKEN),
});

// localize style text layers
map.on("load", () => {
  map.setStyle(Style.adaptStyleLanguage(map.getStyle(), "zh-CN"));
});
```

### GeoJSONSourceProxy

`GeoJSONSourceProxy` wraps a GeoJSON source with CRUD helpers and change events. Every feature's `properties` must include an `id`.

```ts
import { GeoJSONSourceProxy } from "maplibre-extensions";

const sourceProxy = new GeoJSONSourceProxy({ map, data: features });

sourceProxy.update(feature);                  // add or update
const f = sourceProxy.find(id);
const list = sourceProxy.where((f) => ...);   // filter
sourceProxy.delete(id);
sourceProxy.hidden(id);                       // hide / show
sourceProxy.unhidden(id);

sourceProxy.on("data-change", () => reRender());
```

Events: `add` / `update` / `delete` / `clear` / `hidden` / `unhidden` / `data-change`.

## Documentation

Full guides (Chinese) live in [`docs/`](docs/guide/what.md), or run the docs site locally:

```bash
npm run docs:dev
```

## Development

```bash
npm install
npm run build     # tsc + vite build -> dist/
npm test          # vitest
npm run docs:dev  # vitepress docs
```

## License

[MIT](LICENSE)
