import maplibregl from "maplibre-gl";
import LayerProxy from "./core/layer-proxy";
import { CONTRACT_STRINGS } from "./core";

export * from './modules';

declare module "maplibre-gl" {
    interface Map {
        getLayerProxy<T extends maplibregl.LayerSpecification>(id: string): LayerProxy<T>;
    }
}

const _addLayer = maplibregl.Map.prototype.addLayer;
maplibregl.Map.prototype.addLayer = function (layer: maplibregl.AddLayerObject, before?: string) {
    if (layer.type !== "custom") {
        // 提前处理source
        if (layer.type !== "background" && typeof layer.source !== "string") {
            this.addSource(layer.id, layer.source);
            layer.source = layer.id;
        }

        const proxy = new LayerProxy(this, layer as any);

        (this as any)[CONTRACT_STRINGS.MAP_LAYER_PROXY_SYMBOL] ??= {};
        (this as any)[CONTRACT_STRINGS.MAP_LAYER_PROXY_SYMBOL][layer.id] = proxy;
    }

    return _addLayer.call(this, layer, before);
};

maplibregl.Map.prototype.getLayerProxy = function <T extends maplibregl.LayerSpecification>(id: string) {
    return (this as any)[CONTRACT_STRINGS.MAP_LAYER_PROXY_SYMBOL][id] as LayerProxy<T>;
};