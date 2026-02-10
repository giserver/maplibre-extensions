import { describe, test, expect } from 'vitest';
import * as maplibregl from "maplibre-gl";
import { LayerProxy } from "../../src/core/layer-proxy";
import { ref } from "@vue/reactivity";

describe("layer proxy in vue", () => {
    const div = document.createElement("div");
    const map = new maplibregl.Map({
        container: div
    });

    test("reactivity", () => {
        const layer = {
            id: "xxxx",
            source: "xxxx",
            type: "line",
        } as maplibregl.LineLayerSpecification;

        map.on("load", () => {
            map.addSource("xxxx", {
                type: 'geojson',
                data: { type: "FeatureCollection", features: [] }
            });

            map.addLayer(layer);

            const proxy = new LayerProxy(map, layer);
            const proxyRef = ref(proxy);

            let lineColor = map.getPaintProperty(layer.id, "line-color");
            expect(lineColor).not.toBe("red");

            (proxyRef.value.layer.paint as any)["line-color"] = "red";

            lineColor = map.getPaintProperty(layer.id, "line-color");

            expect(lineColor).toBe("red");
        });
    });
})