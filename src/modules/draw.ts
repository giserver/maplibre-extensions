import { uuidv7 } from 'uuidv7';
import { GeoJSONSourceProxy, Events } from '../core';
import * as turf from '@turf/turf';

/**
 * 图层图形类型
 */
export type DrawGeometryType = "Point" | "LineString" | "Polygon" | "Rectangle2" | "Rectangle3" | "Circle";

export interface DrawManagerOptions {
    once?: boolean;
    sourceProxy: GeoJSONSourceProxy;
}

export class DrawManager extends Events.EventManager<{
    "drawed": { target: DrawManager; feature: GeoJSON.Feature };
}> {
    readonly id_layer_point = uuidv7();
    readonly id_layer_point_symbol = uuidv7();
    readonly id_layer_line = uuidv7();
    readonly id_layer_line_circle = uuidv7();
    readonly id_layer_polygon = uuidv7();
    readonly id_layer_polygon_circle = uuidv7();
    readonly id_layer_polygon_outline = uuidv7();
    readonly id_layer_polygon_subline = uuidv7();

    readonly layerSpecs: ReadonlyArray<Readonly<maplibregl.AddLayerObject>> = [
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
            filter: ["all", ["==", "$type", "Polygon"], ["!", ["boolean", ['get', "circle"], false]]],
        },
    ];

    readonly map: maplibregl.Map;
    readonly sourceProxy: GeoJSONSourceProxy;

    private _drawing = false;
    private _currentFeatureId: string | undefined;
    private currentType: DrawGeometryType | undefined;

    private stopFunc?(): void;
    private escOnce: (e: KeyboardEvent) => void;

    get drawing(): boolean {
        return this._drawing;
    }

    get currentFeatureId() {
        return this._currentFeatureId;
    }

    /**
     *
     */
    constructor(
        private options: DrawManagerOptions,
    ) {
        super();

        this.map = options.sourceProxy.map;
        this.sourceProxy = options.sourceProxy;

        //#region add layers
        this.layerSpecs.forEach((l) => {
            if (l.id !== this.id_layer_polygon_subline)
                (l as any).source = this.sourceProxy.id;

            this.sourceProxy.map.addLayer(l);
        });

        this.sourceProxy.on("clear", async () => {
            this.setPolygonSublineData([]);
        });

        //#endregion

        this.escOnce = (e: KeyboardEvent) => {
            // 如果按下esc
            if (e.key.toLocaleLowerCase() === "escape") {
                if (this.currentType) {
                    this.setPolygonSublineData([]);
                    this.start(this.currentType)
                }
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
        else if (mode === 'Rectangle2') this.stopFunc = this.drawRectangle(2);
        else if (mode === 'Rectangle3') this.stopFunc = this.drawRectangle(3);
        else if (mode === 'Circle') this.stopFunc = this.drawCircle();

        this.currentType = mode;
        this.map.getCanvas().style.cursor = "crosshair";
        this.map.getCanvas().addEventListener("keydown", this.escOnce);
    }

    stop() {
        if (this.map.doubleClickZoom.isEnabled()) {
            this.map.doubleClickZoom.enable();
        }

        if (this._currentFeatureId) {
            this.sourceProxy.delete(this._currentFeatureId);
            this._currentFeatureId = undefined;
        }

        this.stopFunc?.();
        this.map.getCanvas().style.cursor = "";
        this.stopFunc = undefined;

        this.map.getCanvas().removeEventListener("keypress", this.escOnce);

        this._drawing = false;
    }

    clear(): void {
        this.sourceProxy.clear();
        this.setPolygonSublineData([]);
    }

    private setPolygonSublineData(features: GeoJSON.Feature[]) {
        (this.map.getSource(this.id_layer_polygon_subline) as maplibregl.GeoJSONSource)
            .setData({ type: 'FeatureCollection', features });
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

            this.fire("drawed", { target: this, feature: features.addFeatures[0] });
            if (this.options.once) {
                this.stop();
            }
        };

        map.on("click", clickHandler);
        return () => map.off("click", clickHandler);
    }

    private drawLine() {
        const map = this.map;

        const clickHandler = (e: maplibregl.MapMouseEvent) => {
            const point = [e.lngLat.lng, e.lngLat.lat];

            if (this._currentFeatureId) {
                const feature = this.sourceProxy.find(this._currentFeatureId)!;
                const geometry = feature.geometry as GeoJSON.LineString;
                if (!geometry.coordinates[geometry.coordinates.length - 2]) return;

                geometry.coordinates.push(point);
                this.sourceProxy.update(feature);
            } else {
                this._currentFeatureId = uuidv7();
                this.sourceProxy.update({
                    type: "Feature",
                    geometry: {
                        type: "LineString",
                        coordinates: [point],
                    },
                    properties: {
                        id: this._currentFeatureId,
                    },
                });

                map.on("mousemove", mouseMoveHandler);
                map.on("contextmenu", rightClickHandler);
            }
        };

        const doubleClickHandler = () => {
            map.off("mousemove", mouseMoveHandler);
            map.off("contextmenu", rightClickHandler);

            const feature = this.sourceProxy.find(this._currentFeatureId ?? "");
            const geometry = feature?.geometry as GeoJSON.LineString;
            if (!feature || !geometry) return;

            this._currentFeatureId = undefined;

            // 排除最后一个点和动态点
            geometry.coordinates.pop();
            geometry.coordinates.pop();

            // 如果直接双击，删除本次测量
            if (geometry.coordinates.length < 2) {
                this.sourceProxy.delete(feature.properties.id);
            } else {
                this.sourceProxy.update(feature);
                this.fire("drawed", { target: this, feature });
                if (this.options.once) this.stop();
            }
        };

        const mouseMoveHandler = (e: maplibregl.MapMouseEvent) => {
            const point = [e.lngLat.lng, e.lngLat.lat];

            const feature = this.sourceProxy.find(this._currentFeatureId ?? "");
            const geometry = feature?.geometry as GeoJSON.LineString;
            if (!feature || !geometry) return;

            if (geometry.coordinates.length > 1) {
                geometry.coordinates.pop();
            }

            geometry.coordinates.push(point);

            this.sourceProxy.update(feature);
        };

        const rightClickHandler = (e: maplibregl.MapMouseEvent) => {
            const feature = this.sourceProxy.find(this._currentFeatureId ?? "");
            const geometry = feature?.geometry as GeoJSON.LineString;
            if (!feature || !geometry) return;

            if (geometry.coordinates.length === 2) {
                // 只存在第一个点和动态点直接删除图形
                this.sourceProxy.delete(feature.properties.id);

                this._currentFeatureId = undefined;
                map.off("mousemove", mouseMoveHandler);
                map.off("contextmenu", rightClickHandler);
            } else {
                geometry.coordinates.pop();
                mouseMoveHandler(e); // 调用鼠标移动事件，重新建立动态线
            }
        };

        const backKeyHandler = (e: KeyboardEvent) => {
            if (e.key.toLowerCase() === "backspace" && this._currentFeatureId) {
                const currentFeature = this.sourceProxy.find(this._currentFeatureId);
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

        const clickHandler = (e: maplibregl.MapMouseEvent) => {
            const point = [e.lngLat.lng, e.lngLat.lat];

            // 判断是否已经落笔
            if (this._currentFeatureId) {
                const feature = this.sourceProxy.find(this._currentFeatureId)!;
                const geometry = feature.geometry as GeoJSON.Polygon;
                const coords = geometry.coordinates[0];
                if (coords.length > 2) coords.pop(); //删除第一个点
                coords.push(point);
                coords.push(coords[0]);

                this.sourceProxy.update(feature);
            } else {
                this._currentFeatureId = uuidv7();
                this.sourceProxy.update({
                    type: "Feature",
                    geometry: {
                        type: "Polygon",
                        coordinates: [[point]],
                    },
                    properties: {
                        id: this._currentFeatureId,
                    },
                });

                map.on("mousemove", mouseMoveHandler);
                map.on("contextmenu", rightClickHandler);
            }
        };

        const doubleClickHandler = () => {
            map.off("mousemove", mouseMoveHandler);
            map.off("contextmenu", rightClickHandler);

            const feature = this.sourceProxy.find(this._currentFeatureId ?? "");
            const geometry = feature?.geometry as GeoJSON.Polygon;
            if (!feature || !geometry) return;

            this._currentFeatureId = undefined;

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
                this.fire("drawed", { target: this, feature });

                if (this.options.once) this.stop();
            }

            this.setPolygonSublineData([]);
        };

        const mouseMoveHandler = (e: maplibregl.MapMouseEvent) => {
            const feature = this.sourceProxy.find(this._currentFeatureId ?? "");
            const geometry = feature?.geometry as GeoJSON.Polygon;
            if (!feature || !geometry) return;

            const point = [e.lngLat.lng, e.lngLat.lat];
            const coords = geometry.coordinates[0];

            if (coords.length === 2) {
                setTimeout(() => {
                    this.setPolygonSublineData([{
                        type: "Feature",
                        geometry: { type: "LineString", coordinates: coords },
                        properties: {},
                    }]);
                }, 0);
            }

            if (coords.length > 1) coords.pop();

            if (coords.length > 1) {
                coords.pop();
            }

            coords.push(point);

            if (coords.length > 2) coords.push(coords[0]);

            this.sourceProxy.update(feature);
        };

        const rightClickHandler = (e: maplibregl.MapMouseEvent) => {
            const feature = this.sourceProxy.find(this._currentFeatureId ?? "");
            const geometry = feature?.geometry as GeoJSON.Polygon;
            if (!feature || !geometry) return;

            const coords = geometry.coordinates[0];

            if (coords.length === 2) {
                // 只存在第一个点和动态点则删除当前图形，进行下一次绘制
                map.off("mousemove", mouseMoveHandler);
                map.off("contextmenu", rightClickHandler);
                this.sourceProxy.delete(feature.properties.id);
                this._currentFeatureId = undefined;

                this.setPolygonSublineData([]);
            } else {
                coords.pop();
                if (coords.length === 3) coords.pop(); // 辅助线 _line_addion 更新
                mouseMoveHandler(e); // 调用鼠标移动事件，重新建立动态线
            }
        };

        const backKeyHandler = (e: KeyboardEvent) => {
            if (e.key.toLowerCase() === "backspace" && this._currentFeatureId) {
                const currentFeature = this.sourceProxy.find(this._currentFeatureId);
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

            this.setPolygonSublineData([]);

            this.map.getCanvas().removeEventListener("keydown", backKeyHandler);
        };
    }

    private drawRectangle(step: 2 | 3) {
        const map = this.map;
        let stepCount = 0;

        function createRectangle(p1: GeoJSON.Position, p2: GeoJSON.Position, p3?: GeoJSON.Position): GeoJSON.Polygon {
            if (p3) {
                p1 = turf.projection.toMercator(p1);
                p2 = turf.projection.toMercator(p2);
                p3 = turf.projection.toMercator(p3);


                const vectorP1P2 = [p2[0] - p1[0], p2[1] - p1[1]];
                const vectorP1P3 = [p3[0] - p1[0], p3[1] - p1[1]];

                const lengthP1P2 = Math.sqrt(vectorP1P2[0] ** 2 + vectorP1P2[1] ** 2);
                const unitP1P2 = [vectorP1P2[0] / lengthP1P2, vectorP1P2[1] / lengthP1P2];

                // 法向量
                const unitNormal = [-unitP1P2[1], unitP1P2[0]];

                // 计算p3在p1p2上的投影长度
                const projectionLength = vectorP1P3[0] * unitNormal[0] + vectorP1P3[1] * unitNormal[1];

                // 计算法线方向上的位移
                const normalVector = [unitNormal[0] * projectionLength, unitNormal[1] * projectionLength];

                return {
                    type: 'Polygon',
                    coordinates: [[p1, p2, [p2[0] + normalVector[0], p2[1] + normalVector[1]], [p1[0] + normalVector[0], p1[1] + normalVector[1]], p1].map(x => turf.projection.toWgs84(x))]
                }

            } else {
                return {
                    type: 'Polygon',
                    coordinates: [[p1, [p1[0], p2[1]], p2, [p2[0], p1[1]], p1]],
                }
            }
        }

        const clickHandler = (e: maplibregl.MapMouseEvent) => {
            const point = [e.lngLat.lng, e.lngLat.lat];

            if (this._currentFeatureId) {
                const feature = this.sourceProxy.find(this._currentFeatureId)!;
                const coords = (feature.geometry as GeoJSON.Polygon).coordinates[0];

                if (stepCount === step - 1) {
                    // 绘制完成
                    map.off("mousemove", mouseMoveHandler);

                    const polygon = step === 2 ? createRectangle(coords[0], point) : createRectangle(coords[0], coords[1], point);
                    feature.geometry = polygon;
                    this.sourceProxy.update(feature);

                    // 处理完成状态
                    this._currentFeatureId = undefined;
                    stepCount = 0;

                    this.fire("drawed", { target: this, feature });
                    this.setPolygonSublineData([]);
                } else {
                    coords.splice(coords.length - 1, 0, point);
                    stepCount++;
                    this.sourceProxy.update(feature);
                }
            } else {
                // 第一次点击，记录第一个点
                this._currentFeatureId = uuidv7();

                this.sourceProxy.update({
                    type: "Feature",
                    geometry: {
                        type: "Polygon",
                        coordinates: [[point, point]],
                    },
                    properties: {
                        id: this._currentFeatureId,
                    },
                });

                map.on("mousemove", mouseMoveHandler);
                stepCount = 1;
            }
        };

        const mouseMoveHandler = (e: maplibregl.MapMouseEvent) => {
            const feature = this.sourceProxy.find(this._currentFeatureId ?? "");
            const coords = (feature?.geometry as GeoJSON.Polygon).coordinates[0];
            if (!feature || !coords) return;

            const point = [e.lngLat.lng, e.lngLat.lat];

            if (step === 2) {
                const polygon = createRectangle(coords[0], point);
                feature.geometry = polygon;
            } else {
                if (stepCount === step - 1) {
                    // 形成矩形
                    const polygon = createRectangle(coords[0], coords[1], point);
                    feature.geometry = polygon;
                } else {
                    // 形成两条线
                    if (coords.length === 2) {
                        coords.splice(1, 0, point);
                    } else {
                        coords[1] = point;
                    }

                    (map.getSource(this.id_layer_polygon_subline) as maplibregl.GeoJSONSource).setData({
                        type: "Feature",
                        geometry: { type: "LineString", coordinates: coords },
                        properties: {},
                    });
                }
            }

            this.sourceProxy.update(feature);
        };

        map.on("click", clickHandler);

        return () => {
            map.off("mousemove", mouseMoveHandler);
            map.off("click", clickHandler);
        }
    }

    private drawCircle() {
        const map = this.map;
        let firstPoint: Array<number> | undefined;

        function createCircle(p1: GeoJSON.Position, p2: GeoJSON.Position): GeoJSON.Polygon {
            const length = turf.distance(p1, p2, { units: 'kilometers' });
            return turf.circle(p1, length, { steps: 100, units: 'kilometers' }).geometry;
        }

        const clickHandler = (e: maplibregl.MapMouseEvent) => {
            const point = [e.lngLat.lng, e.lngLat.lat];

            if (firstPoint && this._currentFeatureId) {
                map.off("mousemove", mouseMoveHandler);
                const circle = createCircle(firstPoint, point);

                const result = this.sourceProxy.update({
                    type: "Feature",
                    geometry: circle,
                    properties: {
                        id: this._currentFeatureId,
                        circle: true
                    } as any
                });

                this.fire("drawed", { target: this, feature: result.updateFeatures[0]! });
                firstPoint = undefined;
                this._currentFeatureId = undefined;
                this.setPolygonSublineData([]);
            } else {
                firstPoint = point;
                this._currentFeatureId = uuidv7();
                map.on("mousemove", mouseMoveHandler);
            }
        };

        const mouseMoveHandler = (e: maplibregl.MapMouseEvent) => {
            if (!firstPoint || !this._currentFeatureId) return;
            const point = [e.lngLat.lng, e.lngLat.lat];

            const circle = createCircle(firstPoint, point);

            this.setPolygonSublineData([{
                type: "Feature",
                geometry: {
                    type: 'LineString',
                    coordinates: [firstPoint, point]
                },
                properties: {}
            }]);

            this.sourceProxy.update({
                type: "Feature",
                geometry: circle,
                properties: {
                    id: this._currentFeatureId
                }
            });
        }

        map.on("click", clickHandler);

        return () => {
            map.off("mousemove", mouseMoveHandler);
            map.off("click", clickHandler);
        }
    }
}
