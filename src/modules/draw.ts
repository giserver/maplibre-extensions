import { uuidv7 } from 'uuidv7';
import { GeoJSONSourceProxy } from '../core';

/**
 * 图层图形类型
 */
export type DrawGeometryType = "Point" | "LineString" | "Polygon";

export interface DrawManagerOptions {
    onDrawed?(feature: GeoJSON.Feature): void;
    once?: boolean;
}

export class DrawManager {
    readonly id_layer_point = uuidv7();
    readonly id_layer_point_symbol = uuidv7();
    readonly id_layer_line = uuidv7();
    readonly id_layer_line_circle = uuidv7();
    readonly id_layer_polygon = uuidv7();
    readonly id_layer_polygon_circle = uuidv7();
    readonly id_layer_polygon_outline = uuidv7();
    readonly id_layer_polygon_subline = uuidv7();

    readonly layerSpecs: Readonly<Array<maplibregl.AddLayerObject>> = [
        {
            id: this.id_layer_point,
            type: "circle",
            source: "",
            paint: {
                "circle-color": "#fbb03b",
                "circle-radius": 5,
                "circle-stroke-color": "#fff",
                "circle-stroke-width": 2,
            },
            filter: ["==", "$type", "Point"],
        },
        {
            id: this.id_layer_point_symbol,
            type: "symbol",
            source: "",
            filter: ["==", "$type", "Point"],
        },
        {
            id: this.id_layer_line,
            type: "line",
            source: "",
            paint: {
                "line-color": "#fbb03b",
                "line-width": 2,
            },
            filter: ["==", "$type", "LineString"],
        },
        {
            id: this.id_layer_line_circle,
            type: "circle",
            source: "",
            paint: {
                "circle-color": "#fbb03b",
                "circle-radius": 5,
                "circle-stroke-color": "#fff",
                "circle-stroke-width": 2,
            },
            filter: ["==", "$type", "LineString"],
        },
        {
            id: this.id_layer_polygon,
            type: "fill",
            source: "",
            paint: {
                "fill-color": "#fbb03b",
                "fill-opacity": 0.2,
            },
            filter: ["==", "$type", "Polygon"],
        },
        {
            id: this.id_layer_polygon_outline,
            type: "line",
            source: "",
            paint: {
                "line-color": "#fbb03b",
                "line-width": 2,
            },
            filter: ["==", "$type", "Polygon"],
        },
        {
            id: this.id_layer_polygon_subline,
            type: "line",
            source: { type: "geojson", data: { type: "FeatureCollection", features: [] } },
            paint: {
                "line-color": "#fbb03b",
                "line-width": 2,
            },
        },
        {
            id: this.id_layer_polygon_circle,
            type: "circle",
            source: "",
            paint: {
                "circle-color": "#fbb03b",
                "circle-radius": 5,
                "circle-stroke-color": "#fff",
                "circle-stroke-width": 2,
            },
            filter: ["==", "$type", "Polygon"],
        },
    ];

    readonly map: maplibregl.Map;

    private _drawing = false;
    private currentFeatureId: string | undefined;

    private stopFunc?(): void;
    private escOnce: (e: KeyboardEvent) => void;

    get drawing(): boolean {
        return this._drawing;
    }

    /**
     *
     */
    constructor(
        readonly sourceProxy: GeoJSONSourceProxy,
        private options: DrawManagerOptions = {},
    ) {
        this.map = sourceProxy.map;

        //#region add layers
        this.layerSpecs.forEach((l) => {
            if (l.id !== this.id_layer_polygon_subline)
                (l as any).source = this.sourceProxy.id;

            sourceProxy.map.addLayer(l);
        });

        sourceProxy.on("clear", async () => {
            this.clearPolygonSubline();
        });

        //#endregion

        this.escOnce = (e: KeyboardEvent) => {
            // 如果按下esc
            if (e.key.toLocaleLowerCase() === "escape") {
                // 如果当前绘制数据删除
                if (this.currentFeatureId) {
                    sourceProxy.delete(this.currentFeatureId);
                    this.currentFeatureId = undefined;
                }

                // 清除临时数据
                this.clearPolygonSubline();
            }
        };
    }

    start(mode: DrawGeometryType) {
        this.stop();
        this._drawing = true;
        this.map.doubleClickZoom.disable();

        if (mode === "Point") this.stopFunc = this.drawPoint();
        else if (mode === "LineString") this.stopFunc = this.drawLine();
        else if (mode === "Polygon") this.stopFunc = this.drawPolygon();

        this.map.getCanvas().style.cursor = "crosshair";

        this.map.getCanvas().addEventListener("keydown", this.escOnce);
    }

    stop() {
        if (this.map.doubleClickZoom.isEnabled()) {
            this.map.doubleClickZoom.enable();
        }

        if (this.currentFeatureId) {
            this.sourceProxy.delete(this.currentFeatureId);
            this.currentFeatureId = undefined;
        }

        this.stopFunc?.();
        this.map.getCanvas().style.cursor = "";
        this.stopFunc = undefined;

        this.map.getCanvas().removeEventListener("keypress", this.escOnce);

        this._drawing = false;
    }

    clear(): void {
        this.sourceProxy.clear();
        this.clearPolygonSubline();
    }

    private clearPolygonSubline() {
        (this.map.getSource(this.id_layer_polygon_subline) as maplibregl.GeoJSONSource)
            .setData({ type: 'FeatureCollection', features:[]});
    }

    private drawPoint() {
        const map = this.map;

        const clickHandler = (e: any) => {
            const features = this.sourceProxy.update({
                type: "Feature",
                geometry: {
                    type: "Point",
                    coordinates: [e.lngLat.lng, e.lngLat.lat],
                },
                properties: {
                    id: uuidv7(),
                },
            });

            this.options.onDrawed?.(features.addFeatures[0]);
            if (this.options.once) {
                this.stop();
            }
        };

        map.on("click", clickHandler);
        return () => map.off("click", clickHandler);
    }

    private drawLine() {
        const map = this.map;

        const clickHandler = (e: any) => {
            const point = [e.lngLat.lng, e.lngLat.lat];

            if (this.currentFeatureId) {
                const feature = this.sourceProxy.find(this.currentFeatureId)!;
                const geometry = feature.geometry as GeoJSON.LineString;
                if (!geometry.coordinates[geometry.coordinates.length - 2]) return;

                geometry.coordinates.push(point);
                this.sourceProxy.update(feature);
            } else {
                this.currentFeatureId = uuidv7();
                this.sourceProxy.update({
                    type: "Feature",
                    geometry: {
                        type: "LineString",
                        coordinates: [point],
                    },
                    properties: {
                        id: this.currentFeatureId,
                    },
                });

                map.on("mousemove", mouseMoveHandler);
                map.on("contextmenu", rightClickHandler);
            }
        };

        const doubleClickHandler = () => {
            map.off("mousemove", mouseMoveHandler);
            map.off("contextmenu", rightClickHandler);

            const feature = this.sourceProxy.find(this.currentFeatureId ?? "");
            const geometry = feature?.geometry as GeoJSON.LineString;
            if (!feature || !geometry) return;

            this.currentFeatureId = undefined;

            // 排除最后一个点和动态点
            geometry.coordinates.pop();
            geometry.coordinates.pop();

            // 如果直接双击，删除本次测量
            if (geometry.coordinates.length < 2) {
                this.sourceProxy.delete(feature.properties.id);
            } else {
                this.sourceProxy.update(feature);
                this.options.onDrawed?.call(this, feature);
                if (this.options.once) this.stop();
            }
        };

        const mouseMoveHandler = (e: any) => {
            const point = [e.lngLat.lng, e.lngLat.lat];

            const feature = this.sourceProxy.find(this.currentFeatureId ?? "");
            const geometry = feature?.geometry as GeoJSON.LineString;
            if (!feature || !geometry) return;

            if (geometry.coordinates.length > 1) {
                geometry.coordinates.pop();
            }

            geometry.coordinates.push(point);

            this.sourceProxy.update(feature);
        };

        const rightClickHandler = (e: any) => {
            const feature = this.sourceProxy.find(this.currentFeatureId ?? "");
            const geometry = feature?.geometry as GeoJSON.LineString;
            if (!feature || !geometry) return;

            if (geometry.coordinates.length === 2) {
                // 只存在第一个点和动态点直接删除图形
                this.sourceProxy.delete(feature.properties.id);

                this.currentFeatureId = undefined;
                map.off("mousemove", mouseMoveHandler);
                map.off("contextmenu", rightClickHandler);
            } else {
                geometry.coordinates.pop();
                mouseMoveHandler(e); // 调用鼠标移动事件，重新建立动态线
            }
        };

        const backKeyHandler = (e: KeyboardEvent) => {
            if (e.key.toLowerCase() === "backspace" && this.currentFeatureId) {
                const currentFeature = this.sourceProxy.find(this.currentFeatureId);
                const lastCoord = (currentFeature!.geometry as GeoJSON.LineString).coordinates.slice(-1)[0]!;
                rightClickHandler({
                    lngLat: {
                        lat: lastCoord[1],
                        lng: lastCoord[0],
                    } as any,
                } as any);
            }
        };

        map.on("click", clickHandler);
        map.on("dblclick", doubleClickHandler);
        this.map.getCanvas().addEventListener("keydown", backKeyHandler);

        return () => {
            map.off("mousemove", mouseMoveHandler);
            map.off("contextmenu", rightClickHandler);
            map.off("click", clickHandler);
            map.off("dblclick", doubleClickHandler);
            this.map.getCanvas().removeEventListener("keydown", backKeyHandler);
        };
    }

    private drawPolygon() {
        const map = this.map;

        const clickHandler = (e: any) => {
            const point = [e.lngLat.lng, e.lngLat.lat];

            // 判断是否已经落笔
            if (this.currentFeatureId) {
                const feature = this.sourceProxy.find(this.currentFeatureId)!;
                const geometry = feature.geometry as GeoJSON.Polygon;
                const coords = geometry.coordinates[0];
                if (coords.length > 2) coords.pop(); //删除第一个点
                coords.push(point);
                coords.push(coords[0]);

                this.sourceProxy.update(feature);
            } else {
                this.currentFeatureId = uuidv7();
                this.sourceProxy.update({
                    type: "Feature",
                    geometry: {
                        type: "Polygon",
                        coordinates: [[point]],
                    },
                    properties: {
                        id: this.currentFeatureId,
                    },
                });

                map.on("mousemove", mouseMoveHandler);
                map.on("contextmenu", rightClickHandler);
            }
        };

        const doubleClickHandler = () => {
            map.off("mousemove", mouseMoveHandler);
            map.off("contextmenu", rightClickHandler);

            const feature = this.sourceProxy.find(this.currentFeatureId ?? "");
            const geometry = feature?.geometry as GeoJSON.Polygon;
            if (!feature || !geometry) return;

            this.currentFeatureId = undefined;

            const coords = geometry.coordinates[0];
            coords.pop();
            coords.pop();
            coords.pop();
            if (coords.length < 3) {
                this.sourceProxy.delete(feature.properties.id);
            } else {
                // 添加第一个点 (闭合)
                coords.push(coords[0]);
                this.sourceProxy.update(feature);
                this.options.onDrawed?.call(this, feature);

                if (this.options.once) this.stop();
            }

            this.clearPolygonSubline();
        };

        const mouseMoveHandler = (e: any) => {
            const feature = this.sourceProxy.find(this.currentFeatureId ?? "");
            const geometry = feature?.geometry as GeoJSON.Polygon;
            if (!feature || !geometry) return;

            const point = [e.lngLat.lng, e.lngLat.lat];
            const coords = geometry.coordinates[0];

            if (coords.length === 2) {
                setTimeout(() => {
                    (map.getSource(this.id_layer_polygon_subline) as maplibregl.GeoJSONSource).setData({
                        type: "Feature",
                        geometry: { type: "LineString", coordinates: coords },
                        properties: {},
                    });
                }, 50);
            }

            if (coords.length > 1) coords.pop();

            if (coords.length > 1) {
                coords.pop();
            }

            coords.push(point);

            if (coords.length > 2) coords.push(coords[0]);

            this.sourceProxy.update(feature);
        };

        const rightClickHandler = (e: any) => {
            const feature = this.sourceProxy.find(this.currentFeatureId ?? "");
            const geometry = feature?.geometry as GeoJSON.Polygon;
            if (!feature || !geometry) return;

            const coords = geometry.coordinates[0];

            if (coords.length === 2) {
                // 只存在第一个点和动态点则删除当前图形，进行下一次绘制
                map.off("mousemove", mouseMoveHandler);
                map.off("contextmenu", rightClickHandler);
                this.sourceProxy.delete(feature.properties.id);
                this.currentFeatureId = undefined;

                setTimeout(() => {
                    this.clearPolygonSubline();
                }, 50);
            } else {
                coords.pop();
                if (coords.length === 3) coords.pop(); // 辅助线 _line_addion 更新
                mouseMoveHandler(e); // 调用鼠标移动事件，重新建立动态线
            }
        };

        const backKeyHandler = (e: KeyboardEvent) => {
            if (e.key.toLowerCase() === "backspace" && this.currentFeatureId) {
                const currentFeature = this.sourceProxy.find(this.currentFeatureId);
                const lastCoord = (currentFeature!.geometry as GeoJSON.Polygon).coordinates[0].slice(-2)[0]!;
                rightClickHandler({
                    lngLat: {
                        lat: lastCoord[1],
                        lng: lastCoord[0],
                    } as any,
                } as any);
            }
        };

        map.on("click", clickHandler);
        map.on("dblclick", doubleClickHandler);
        this.map.getCanvas().addEventListener("keydown", backKeyHandler);

        return () => {
            map.off("mousemove", mouseMoveHandler);
            map.off("contextmenu", rightClickHandler);
            map.off("click", clickHandler);
            map.off("dblclick", doubleClickHandler);

            this.clearPolygonSubline();

            this.map.getCanvas().removeEventListener("keydown", backKeyHandler);
        };
    }
}
