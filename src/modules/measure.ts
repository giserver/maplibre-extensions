import * as turf from '@turf/turf';
import { uuidv7 } from 'uuidv7';

import { GeoJSONSourceProxy, IdentityGeoJSONFeature } from '../core';

type MeasureResultFeature = GeoJSON.Feature<GeoJSON.Point, {
    value: string;
    type: "point" | "line" | "line-segment" | "polygon" | "polygon-line" | "polygon-line-segment";
    parent: GeoJSON.Geometry | GeoJSON.Feature
}>;

type MeasurePointOptions = {
    format(position: GeoJSON.Position): string;
}

type MeasureLineStringOptions = {
    /**
     * 长度格式化
     * @param length 长度数值
     * @param index 标点下标
     * @param end 是否为最后一个
     * @param segment 是否为中间数值
     */
    format(length: number, index: number, end: boolean, segment: boolean): string;

    /**
     * 是否包含第一个数值
     *
     * 如果计算圆环数据时 防止最后一个数据被第一个数据压盖
     */
    withStart?: boolean;

    length?: (line: GeoJSON.LineString) => number;
}


type TMeasurePolygonOptions = {
    format(area: number): string;
    withLineString?: boolean;
    measureLineStringOptions: MeasureLineStringOptions;

    area?: (polygon: GeoJSON.Polygon) => number;
};

type TMeasureGeometryOptions = {
    point: MeasurePointOptions;
    line: MeasureLineStringOptions;
    polygon: TMeasurePolygonOptions;
}

function measurePoint(g: GeoJSON.Position, options: MeasurePointOptions): MeasureResultFeature[] {
    const value = options.format(g);

    return [{
        type: "Feature",
        geometry: {
            type: 'Point',
            coordinates: g
        },
        properties: {
            value,
            type: 'point',
            parent: {
                type: 'Point',
                coordinates: g
            }
        }
    }]
}

function measureLineString(g: GeoJSON.Position[], options: MeasureLineStringOptions, isPolygon: boolean = false): MeasureResultFeature[] {
    const ret = new Array<MeasureResultFeature>();
    let sumLength = 0;

    for (let i = 0; i < g.length; i++) {
        const current = g[i];

        if (i > 0) {
            const last = g[i - 1];
            const line: GeoJSON.Feature<GeoJSON.LineString> = {
                type: "Feature",
                geometry: { type: "LineString", coordinates: [last, current] },
                properties: {},
            };
            const l = options.length ? options.length(line.geometry) : turf.length(line, { units: 'meters' });
            const c = turf.center(line);

            sumLength += l;

            ret.push({
                type: "Feature",
                geometry: {
                    type: "Point",
                    coordinates: c.geometry.coordinates,
                },
                properties: {
                    value: options.format(l, i, false, true),
                    type: isPolygon ? "polygon-line-segment" : "line-segment",
                    parent: { type: 'LineString', coordinates: g }
                },
            });
        }

        // 不记录第一个点 0 数值
        if (options?.withStart === false && i === 0) continue;

        ret.push({
            type: "Feature",
            geometry: {
                type: "Point",
                coordinates: current,
            },
            properties: {
                value: options.format(sumLength, i, i === g.length - 1, false),
                type: isPolygon ? "polygon-line" : "line",
                parent: { type: 'LineString', coordinates: g }
            },
        });
    }

    return ret;
}

function measurePolygon(g: GeoJSON.Position[][], options: TMeasurePolygonOptions): MeasureResultFeature[] {
    const ret = new Array<MeasureResultFeature>();

    if (options?.withLineString !== false) {
        g.forEach((x) => {
            ret.push(...measureLineString(x, options.measureLineStringOptions, true));
        });
    }

    if (g[0].length > 3) {
        const polygon: GeoJSON.Feature<GeoJSON.Polygon> = { type: "Feature", geometry: { type: "Polygon", coordinates: g }, properties: {} };
        const center = turf.center(polygon);
        const a = options.area ? options.area(polygon.geometry) : turf.area(polygon.geometry);

        ret.push({
            type: "Feature",
            geometry: center.geometry,
            properties: {
                value: options.format(a),
                type: "polygon",
                parent: { type: 'Polygon', coordinates: g }
            },
        });
    }

    return ret;
}

export function measureGeometry(g: GeoJSON.Geometry | GeoJSON.Feature | GeoJSON.Feature[] | GeoJSON.FeatureCollection, options: TMeasureGeometryOptions): MeasureResultFeature[] {
    let result = new Array<MeasureResultFeature>();

    if (g instanceof Array)
        return g.reduce((p, c) => p.concat(measureGeometry(c, options)), result);

    if (g.type === 'Point') result = measurePoint(g.coordinates, options.point);
    else if (g.type === 'LineString') result = measureLineString(g.coordinates, options.line);
    else if (g.type === 'Polygon') result = measurePolygon(g.coordinates, options.polygon);

    else if (g.type === 'MultiPoint') g.coordinates.reduce((p, c) => p.concat(measurePoint(c, options.point)), result);
    else if (g.type === 'MultiLineString') g.coordinates.reduce((p, c) => p.concat(measureLineString(c, options.line)), result);
    else if (g.type === 'MultiPolygon') g.coordinates.reduce((p, c) => p.concat(measurePolygon(c, options.polygon)), result);
    else if (g.type === 'GeometryCollection') g.geometries.reduce((p, c) => p.concat(measureGeometry(c, options)), result);

    else if (g.type === 'Feature') result = measureGeometry(g.geometry, options);

    else {
        return g.features.reduce((p, c) => p.concat(measureGeometry(c, options)), result);
    }

    result.forEach(r => {
        r.properties.parent = g;
    });

    return result;
}

export type TMeasureManagerOptions = {
    base: TMeasureGeometryOptions;
}

export class MeasureManager {
    private customFeatures: IdentityGeoJSONFeature[] = [];

    readonly map: maplibregl.Map;

    readonly id_source_measure_symbol = uuidv7();
    readonly id_layer_measrue_point = uuidv7();
    readonly id_layer_measrue_line = uuidv7();
    readonly id_layer_measrue_line_segment = uuidv7();
    readonly id_layer_measrue_polygon = uuidv7();
    readonly id_layer_measrue_polygon_line = uuidv7();
    readonly id_layer_measure_polygon_line_segment = uuidv7();

    /**
     * 面方向图层id
     *
     * 用于创建面方向layer和source
     */
    readonly id_layer_polygon_clockwise = uuidv7();

    readonly layerSpecs: Readonly<maplibregl.AddLayerObject[]> = [{
        id: this.id_layer_polygon_clockwise,
        type: "symbol",
        source: {
            type: "geojson",
            data: { type: "FeatureCollection", features: [] },
        },
        layout: {
            "symbol-placement": "line",
            "text-field": ["case", ["boolean", ["get", "clockwise"], true], "▶", "◀"],
            "text-size": ["interpolate", ["linear"], ["zoom"], 12, 16, 22, 24],
            "symbol-spacing": ["interpolate", ["linear"], ["zoom"], 12, 30, 22, 60],
            "text-keep-upright": false,
        },
        paint: {
            "text-color": "#3887be",
            "text-halo-color": "hsl(55, 11%, 96%)",
            "text-halo-width": 3,
        },
        filter: ["==", "1", "0"],
    }, {
        id: this.id_layer_measrue_point,
        type: "symbol",
        source: this.id_source_measure_symbol,
        layout: {
            "text-field": ["get", "value"],
            "text-size": 14,
            "text-offset": [0, -1],
        },
        paint: {
            "text-color": "black",
            "text-halo-color": "white",
            "text-halo-width": 2,
        },
        filter: ["==", ["get", "type"], "point"],
    }, {
        id: this.id_layer_measrue_line_segment,
        type: "symbol",
        source: this.id_source_measure_symbol,
        layout: {
            "text-field": ["get", "value"],
            "text-size": 12,
            "text-offset": [0, -1],
        },
        paint: {
            "text-color": "red",
            "text-halo-color": "white",
            "text-halo-width": 2,
        },
        filter: ["==", ["get", "type"], "line-segment"],
    }, {
        id: this.id_layer_measrue_line,
        type: "symbol",
        source: this.id_source_measure_symbol,
        layout: {
            "text-field": ["get", "value"],
            "text-size": 14,
            "text-offset": [0, -1],
            "text-allow-overlap": true,
        },
        paint: {
            "text-color": "black",
            "text-halo-color": "white",
            "text-halo-width": 2,
        },
        filter: ["==", ["get", "type"], "line"],
    }, {
        id: this.id_layer_measrue_polygon_line,
        type: "symbol",
        source: this.id_source_measure_symbol,
        layout: {
            "text-field": ["get", "value"],
            "text-size": 14,
            "text-offset": [0, -1],
        },
        paint: {
            "text-color": "black",
            "text-halo-color": "white",
            "text-halo-width": 2,
        },
        filter: ["==", ["get", "type"], "polygon-line"],
    }, {
        id: this.id_layer_measure_polygon_line_segment,
        type: "symbol",
        source: this.id_source_measure_symbol,
        layout: {
            "text-field": ["get", "value"],
            "text-size": 12,
            "text-offset": [0, -1],
        },
        paint: {
            "text-color": "red",
            "text-halo-color": "white",
            "text-halo-width": 2,
        },
        filter: ["==", ["get", "type"], "polygon-line-segment"],
    }, {
        id: this.id_layer_measrue_polygon,
        type: "symbol",
        source: this.id_source_measure_symbol,
        layout: {
            "text-field": ["get", "value"],
            "text-size": 18,
            "text-offset": [0, -1],
            "text-allow-overlap": true,
        },
        paint: {
            "text-color": "black",
            "text-halo-color": "white",
            "text-halo-width": 2,
        },
        filter: ["==", ["get", "type"], "polygon"],
    }];

    /**
     *
     */
    constructor(readonly sourceProxy: GeoJSONSourceProxy, private options: TMeasureManagerOptions) {
        this.map = sourceProxy.map;

        // 清空自定义数据
        this.sourceProxy.on("clear", async () => { this.customFeatures = []; });
        this.sourceProxy.on("data-change", async () => this.reRender());

        // 添加测量结果数据源
        this.map.addSource(this.id_source_measure_symbol, {
            type: "geojson",
            data: { type: "FeatureCollection", features: [] },
        });

        // 添加测量结果图层
        this.layerSpecs.forEach(l => {
            this.map.addLayer(l);
        });
    }

    setVisible(visible: boolean) {
        this.layerSpecs.forEach(l => {
            this.map.setLayoutProperty(l.id, "visibility", visible ? "visible" : "none");
        });
    }

    /**
     * 设置面方向符号
     * @param right 向右符号
     * @param left 向左符号
     */
    setDirectionSymbol(right: string = "▶", left: string = "◀") {
        this.map.setLayoutProperty(this.id_layer_polygon_clockwise, "text-field", ["case", ["boolean", ["get", "clockwise"], true], right, left]);
    }

    /**
     * 设置或更新测量数据（该接口数据不自动渲染geometry）
     * @param fs
     */
    setFeature(f: IdentityGeoJSONFeature) {
        const feature = JSON.parse(JSON.stringify(f));

        const existedFeature = this.customFeatures.find((x) => x.properties.id === f.properties.id);

        if (existedFeature) {
            existedFeature.geometry = feature.geometry;
            existedFeature.properties = feature.properties;
        } else {
            this.customFeatures.push(feature);
        }

        this.reRender();
    }

    getFeature(id: string) {
        return this.customFeatures.find((x) => x.properties.id === id) || this.sourceProxy.find(id);
    }

    hasFeature(id: string) {
        return this.customFeatures.some((x) => x.properties.id === id) || this.sourceProxy.find(id) !== undefined;
    }

    /**
     * 删除测量数据
     * @param id
     */
    removeFeature(id: string) {
        let feature = this.sourceProxy.delete(id)?.[0];

        const index = this.customFeatures.findIndex((x) => x.properties.id === id);
        feature ??= this.customFeatures[index];
        this.customFeatures.splice(index, 1);

        this.reRender();
        return feature;
    }

    /**
     * 设置是否显示面方向
     * @param val
     */
    showPolygonDirection(val: boolean) {
        this.map.setFilter(this.id_layer_polygon_clockwise, val ? ["==", "$type", "Polygon"] : ["==", "1", "0"]);
    }

    /**
     * 显示面线数据
     * @param val
     */
    showPolygonLine(val: boolean) {
        this.map.setFilter(this.id_layer_measrue_polygon_line, val ? ["==", ["get", "type"], "polygon-line"] : ["==", "1", "0"]);
    }

    /**
     * 显示面线段数据
     * @param val
     */
    showPolygonLineSegment(val: boolean) {
        this.map.setFilter(this.id_layer_measure_polygon_line_segment, val ? ["==", ["get", "type"], "polygon-line-segment"] : ["==", "1", "0"]);
    }

    /**
     * 显示线线段数据
     * @param val
     */
    showLineSegment(val: boolean) {
        this.map.setFilter(this.id_layer_measrue_line_segment, val ? ["==", ["get", "type"], "line-segment"] : ["==", "1", "0"]);
    }

    /**
    * 重绘
    */
    reRender() {
        const features = this.sourceProxy.all().concat(this.customFeatures);

        // 设置测量结果数据
        (this.map.getSource(this.id_source_measure_symbol) as maplibregl.GeoJSONSource).setData({
            type: "FeatureCollection",
            features: measureGeometry(features, this.options.base),
        });

        // 设置面方向数据
        (this.map.getSource(this.id_layer_polygon_clockwise) as maplibregl.GeoJSONSource).setData({
            type: "FeatureCollection",
            features: features
                .filter((x) => x.geometry.type === "Polygon")
                .map((x) => {
                    return {
                        type: "Feature",
                        geometry: x.geometry,
                        properties: {
                            ...x.properties,
                            pid: (x.properties as any).id,
                            clockwise: turf.booleanClockwise((x.geometry as any).coordinates[0]),
                        },
                    };
                }),
        });
    }
}