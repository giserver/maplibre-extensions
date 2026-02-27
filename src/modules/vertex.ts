import { IdentityGeoJSONFeature } from "../core";
import * as turf from "@turf/turf";

type TCustomFeature = GeoJSON.Feature<GeoJSON.Geometry, { id: number; type?: "end" | "mid"; pid?: number; division_index?: number }>;

export class VertexEditorMananger {
    private vertexStore: VertexStore;
    readonly id = "geometry-editor";
    readonly id_layer_point = this.id + "-point";
    readonly id_layer_line = this.id + "-line";
    readonly id_layer_polygon = this.id + "-polygon";

    private hoverFeature: TCustomFeature | undefined;
    private activeFeature: TCustomFeature | undefined;

    private mosueClickHandlerCache: ((e: any) => void) | undefined;

    /**
     *
     */
    constructor(readonly map: maplibregl.Map) {
        this.map.addSource(this.id, {
            type: "geojson",
            data: {
                type: "FeatureCollection",
                features: [],
            },
            promoteId: "id",
        });

        // 面图层
        this.map.addLayer({
            id: this.id_layer_polygon,
            type: "fill",
            source: this.id,
            filter: ["==", ["geometry-type"], "Polygon"],
            paint: {
                "fill-color": "rgba(251, 176, 59, 1)",
                "fill-opacity": 0.3,
            },
        });

        // 线图层
        this.map.addLayer({
            id: this.id_layer_line,
            type: "line",
            source: this.id,
            filter: ["!=", ["geometry-type"], "Point"],
            paint: {
                "line-width": 2,
                "line-dasharray": [2, 4],
                "line-color": "#40ff00ff",
            },
        });

        // 点图层
        this.map.addLayer({
            id: this.id_layer_point,
            type: "circle",
            source: this.id,
            layout: {},
            paint: {
                "circle-radius": ["case", ["boolean", ["feature-state", "active"], false], 6, ["case", ["boolean", ["feature-state", "hover"], false], 6, 4]],
                "circle-color": ["match", ["get", "type"], "mid", "#f05b72", "#dfaf12"],
                "circle-stroke-width": [
                    "match",
                    ["get", "type"],
                    "mid",
                    0,
                    ["case", ["boolean", ["feature-state", "active"], false], 3, ["case", ["boolean", ["feature-state", "hover"], false], 3, 2]],
                ],
                "circle-stroke-color": "#ffffff",
            },
            filter: ["==", ["geometry-type"], "Point"],
        });

        this.map.on("mouseenter", this.id_layer_point, (e) => {
            const feature = e.features?.[0];
            if (feature) {
                this.hoverFeature = feature as any;
                this.map.setFeatureState({ id: this.hoverFeature!.properties.id, source: this.id }, { hover: true });
                this.map.getCanvas().style.cursor = "pointer";
            }
        });

        this.map.on("mouseleave", this.id_layer_point, (e) => {
            if (this.hoverFeature) {
                this.map.setFeatureState({ id: this.hoverFeature.properties.id, source: this.id }, { hover: false });
                this.hoverFeature = undefined;
                this.map.getCanvas().style.cursor = "";
            }
        });

        const mousemoveHandler = (e: any) => {
            const positon = [e.lngLat.lng, e.lngLat.lat];

            if (this.activeFeature) {
                const { id, pid, division_index } = this.activeFeature.properties;
                this.vertexStore.movePoint(pid ?? id, id, positon, division_index);
            }
        };

        this.map.on("mousedown", this.id_layer_point, (e) => {
            const feature = e.features?.[0];
            if (feature) {
                if (this.hoverFeature) {
                    this.map.setFeatureState({ id: this.hoverFeature.properties.id, source: this.id }, { hover: false });
                    this.hoverFeature = undefined;
                }

                if (this.activeFeature) {
                    this.map.setFeatureState({ id: this.activeFeature.properties.id, source: feature.source }, { active: false });
                }

                const { type, id, pid, division_index } = feature.properties;

                if (type === "mid") {
                    this.activeFeature = this.vertexStore.releaseMidPoint(pid, id, division_index);
                } else {
                    this.activeFeature = feature as any;
                }

                this.map.setFeatureState({ id: this.activeFeature!.properties.id, source: feature.source }, { active: true });

                this.map.dragPan.disable();
                this.map.dragRotate.disable();
                this.map.on("mousemove", mousemoveHandler);
                this.map.once("mouseup", () => {
                    this.map.off("mousemove", mousemoveHandler);
                    this.map.dragPan.enable();
                    this.map.dragRotate.enable();
                });
            }
        });

        this.map.on("click", [this.id_layer_line,this.id_layer_point,this.id_layer_polygon], e=>{
            e.preventDefault();
        });

        window.addEventListener("keydown", (e) => {
            if (e.key === "Delete" && this.activeFeature) {
                this.map.setFeatureState({ id: this.activeFeature.properties.id, source: this.id }, { active: false });
                const { pid, id, division_index } = this.activeFeature.properties;
                this.vertexStore.deletePoint(pid ?? id, id, division_index);

                this.activeFeature = undefined;
                this.map.off("mousemove", mousemoveHandler);
            }
        });

        this.vertexStore = new VertexStore(map.getSource(this.id) as maplibregl.GeoJSONSource);
    }

    setFeature<TF extends IdentityGeoJSONFeature>(feature: TF, setDone: (id: string, geometry: TF["geometry"]) => void) {
        if (this.mosueClickHandlerCache) {
            this.mosueClickHandlerCache({ features: undefined });
            this.mosueClickHandlerCache = undefined;
        }

        this.vertexStore.setFeature(feature);

        const mouseclickHandler = (e: any) => {
            if (e.defaultPrevented) {
                return;
            }

            const orgFeature = this.vertexStore.getOrgFeature();
            if (orgFeature) {
                setDone((orgFeature.properties as any).id, orgFeature.geometry);
            }

            this.map.off("click", mouseclickHandler);
            if (this.activeFeature) {
                this.map.setFeatureState({ id: this.activeFeature.properties.id, source: this.id }, { active: false });
                this.activeFeature = undefined;
            }

            if (this.hoverFeature) {
                this.map.setFeatureState({ id: this.hoverFeature.properties.id, source: this.id }, { hover: false });
                this.hoverFeature = undefined;
            }

            this.vertexStore.clear();
        };

        this.mosueClickHandlerCache = mouseclickHandler;
        this.map.on("click", mouseclickHandler);
    }
}

export class VertexStore {
    private store = new Array<Array<TCustomFeature>>();
    private orgProperties: any = {};

    /**
     *
     */
    constructor(private source: maplibregl.GeoJSONSource) {}

    setFeature(feature: GeoJSON.Feature) {
        this.orgProperties = feature.properties;
        this.store.length = 0;
        this.store = [];
        this.transGeometryToStore(feature.geometry);
        this.source.setData({
            type: "FeatureCollection",
            features: this.store.flat(),
        });
    }

    getFeatureInfo(pid: number, id: number) {
        for (const fs of this.store) {
            if (fs[0].properties.id === pid) {
                const index = fs.findIndex((x) => x.properties.id === id)!;
                return {
                    point: fs[index],
                    parent: fs[0],
                    index,
                    features: fs,
                };
            }
        }
    }

    getOrgFeature(): GeoJSON.Feature | undefined {
        if (this.store.length === 0) return undefined;

        const org = this.deepClone(this.store[0][0]);

        if (this.store.length > 0) {
            org.geometry = {
                type: ("Multi" + org.geometry.type) as any,
                coordinates: this.store.map((x) => this.deepClone((x[0].geometry as any).coordinates)),
            };
        }

        org.properties = this.orgProperties;

        return org;
    }

    releaseMidPoint(pid: number, id: number, division_index?: number) {
        const { point, parent, index } = this.getFeatureInfo(pid, id)!;
        if (point.properties.type !== "mid") {
            throw new Error("Cannot release a point that is not a mid point");
        }

        if (parent.geometry.type === "Point") {
            throw new Error("Cannot release a point that is a point");
        }

        // parent增加一个子点，这里面parent不可能是Multi
        const insertPosition = (point.geometry as GeoJSON.Point).coordinates;

        if (parent.geometry.type === "LineString") {
            parent.geometry.coordinates.splice(index / 2, 0, insertPosition);
        } else if (parent.geometry.type === "Polygon") {
            const coordinates = parent.geometry.coordinates[division_index!];

            const subLength = parent.geometry.coordinates.reduce((p, c, i) => (i < division_index! ? p + (c.length - 1) * 2 : p), 0);

            coordinates.splice((index - subLength + 1) / 2, 0, insertPosition);
        }

        this.refreshStore();

        const info = this.getFeatureInfo(pid, id + 1)!;
        return info.point;
    }

    movePoint(pid: number, id: number, position: GeoJSON.Position, division_index?: number) {
        const { point, parent, index } = this.getFeatureInfo(pid, id)!;

        // 无法拖拽中点
        if (point.properties.type === "mid") {
            throw new Error("Cannot move mid point");
        }

        // 更新坐标
        const coords = (point.geometry as GeoJSON.Point).coordinates;
        coords[0] = position[0];
        coords[1] = position[1];

        // 处理移动第一个点
        if (parent.geometry.type === "Polygon") {
            const subLength = parent.geometry.coordinates.reduce((p, c, i) => (i < division_index! ? p + (c.length - 1) * 2 : p), 0);

            if (index - subLength === 1) {
                const coords = parent.geometry.coordinates[division_index!];
                const lastPoint = coords[coords.length - 1];
                lastPoint[0] = position[0];
                lastPoint[1] = position[1];
            }
        }

        this.refreshStore();
    }

    deletePoint(pid: number, id: number, division_index?: number) {
        const { parent, index } = this.getFeatureInfo(pid, id)!;

        // 点无法删除
        if (parent.geometry.type === "Point") return;
        else if (parent.geometry.type === "LineString") {
            if (parent.geometry.coordinates.length <= 2) return;

            parent.geometry.coordinates.splice((index - 1) / 2, 1);
        } else if (parent.geometry.type === "Polygon") {
            const coords = parent.geometry.coordinates[division_index!];
            if (coords.length <= 4) return;

            const subLength = parent.geometry.coordinates.reduce((p, c, i) => (i < division_index! ? p + (c.length - 1) * 2 : p), 0);

            const deleteIndex = (index - subLength - 1) / 2;
            coords.splice(deleteIndex, 1);
            if (deleteIndex === 0) {
                coords.pop();
                coords.push(this.deepClone(coords[0]));
            }
        }

        this.refreshStore();
    }

    clear() {
        this.store.length = 0;
        this.store = [];
        this.orgProperties = {};

        this.refreshStore();
    }

    include(id: number) {
        for (const fs of this.store) {
            for (const f of fs) {
                if (f.properties.id === id) return true;
            }
        }

        return false;
    }

    private refreshStore() {
        if (this.store.length !== 0) {
            const orgFeature = this.getOrgFeature()!;
            this.store.length = 0;
            this.store = [];
            this.transGeometryToStore(orgFeature.geometry);
        }

        this.source.setData({
            type: "FeatureCollection",
            features: this.store.flat(),
        });
    }

    private transGeometryToStore(geometry: GeoJSON.Geometry, id: number = 0) {
        if (geometry.type === "Point") {
            this.store.push([
                {
                    type: "Feature",
                    geometry: geometry,
                    properties: {
                        id: ++id,
                    },
                },
            ]);
        } else if (geometry.type === "LineString") {
            const res = new Array<TCustomFeature>();
            const pid = ++id;
            res.push({
                type: "Feature",
                geometry: geometry,
                properties: {
                    id: pid,
                },
            });

            for (let i = 0; i < geometry.coordinates.length; i++) {
                const coord = geometry.coordinates[i];

                res.push({
                    type: "Feature",
                    geometry: {
                        type: "Point",
                        coordinates: coord,
                    },
                    properties: {
                        type: "end",
                        id: ++id,
                        pid,
                    },
                });

                if (i !== geometry.coordinates.length - 1) {
                    res.push({
                        type: "Feature",
                        geometry: turf.midpoint(coord, geometry.coordinates[i + 1]).geometry,
                        properties: {
                            type: "mid",
                            id: ++id,
                            pid,
                        },
                    });
                }
            }
            this.store.push(res);
        } else if (geometry.type === "Polygon") {
            const res = new Array<TCustomFeature>();
            const pid = ++id;
            res.push({
                type: "Feature",
                geometry: geometry,
                properties: {
                    id: pid,
                },
            });

            geometry.coordinates.forEach((coords, division_index) => {
                for (let i = 0; i < coords.length - 1; i++) {
                    const coord = coords[i];

                    res.push({
                        type: "Feature",
                        geometry: {
                            type: "Point",
                            coordinates: coord,
                        },
                        properties: {
                            type: "end",
                            id: ++id,
                            pid,
                            division_index,
                        },
                    });

                    res.push({
                        type: "Feature",
                        geometry: turf.midpoint(coord, coords[i + 1]).geometry,
                        properties: {
                            type: "mid",
                            id: ++id,
                            pid,
                            division_index,
                        },
                    });
                }
            });

            this.store.push(res);
        } else if (geometry.type === "GeometryCollection") {
            throw new Error("GeometryCollection not supported");
        } else {
            geometry.coordinates.forEach((coord) => {
                this.transGeometryToStore({
                    type: geometry.type.substring(5) as any,
                    coordinates: coord as any,
                });
            });
        }
    }

    private deepClone<T extends object>(obj: T): T {
        return JSON.parse(JSON.stringify(obj)) as T;
    }
}
