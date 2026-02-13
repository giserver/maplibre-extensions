import { LayerGroup, TLayerGroupEventDefinition } from "../layer-group";
import { GeoJSONSourceProxy } from "../geojson-source-proxy";
import { TIdentityGeoJSONFeature } from "../../types";

export type GeoJSONLayerGroupOptions<TFeature extends TIdentityGeoJSONFeature = TIdentityGeoJSONFeature> = {
    map: maplibregl.Map;
    layers: Array<Omit<maplibregl.LayerSpecification, "source"> & { source: string }>,
    data: TFeature[]
}

export class GeoJSONLayerGroup<TFeature extends TIdentityGeoJSONFeature = TIdentityGeoJSONFeature> extends LayerGroup<TLayerGroupEventDefinition & {}> {
    readonly source: GeoJSONSourceProxy;

    constructor(options: GeoJSONLayerGroupOptions<TFeature>) {
        // 检查source是否相同
        const set = options.layers.reduce((p, c) => p.add(c.source), new Set<string>());
        if(set.size === 0) throw Error("layer count must > 0");
        if(set.size !== 1) throw Error("layer source must same");

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