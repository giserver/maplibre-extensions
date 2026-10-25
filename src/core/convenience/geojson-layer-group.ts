import * as maplibregl from 'maplibre-gl';
import { LayerGroup, LayerGroupEventDefinition } from "../layer-group";
import { GeoJSONSourceProxy } from "../geojson-source-proxy";
import { IdentityGeoJSONFeature } from "../types";

export type GeoJSONLayerGroupOptions<TFeature extends IdentityGeoJSONFeature = IdentityGeoJSONFeature> = {
    map: maplibregl.Map;
    layers: Array<Omit<maplibregl.LayerSpecification, "source"> & { source: string }>,
    data: TFeature[]
}

export class GeoJSONLayerGroup<TFeature extends IdentityGeoJSONFeature = IdentityGeoJSONFeature> extends LayerGroup<LayerGroupEventDefinition & {}> {
    readonly source: GeoJSONSourceProxy;

    constructor(options: GeoJSONLayerGroupOptions<TFeature>) {
        // 检查source是否相同
        const set = options.layers.reduce((p, c) => p.add(c.source), new Set<string>());
        if (set.size === 0) throw Error("layer count must > 0");
        if (set.size !== 1) throw Error("layer source must same");

        // 添加source
        const sourceProxy = new GeoJSONSourceProxy({
            map: options.map,
            id: set.values().next().value,
            data: options.data
        });

        // 添加图层
        super(options.map, options.layers as any);

        this.source = sourceProxy;
    }
}

export default GeoJSONLayerGroup;