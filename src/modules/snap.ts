import * as turf from "@turf/turf";

type TNearestPointType = "line-above" | "line-mid" | "vertex";

function distance(p1: GeoJSON.Position, p2: GeoJSON.Position) {
    return Math.sqrt(Math.pow(p1[0] - p2[0], 2) + Math.pow(p1[1] - p2[1], 2));
}

const nearest_point_finders: Record<TNearestPointType, (
    features: GeoJSON.Feature[],
    mousePosition: GeoJSON.Position,
    project: (point: GeoJSON.Position) => GeoJSON.Position,
    unproject: (point: GeoJSON.Position) => GeoJSON.Position,
    tolerance: number) => GeoJSON.Position | undefined> = {

    'line-mid': (features, mousePosition, project, unproject, tolerance) => {
        let minDistance = Number.MAX_VALUE;
        let nearestPoint: GeoJSON.Position | undefined;
        const midPoints = new Array<GeoJSON.Position>();
        mousePosition = project(mousePosition);

        features.forEach(f => {
            turf.segmentEach(f, (segment) => {
                if (segment) {
                    const p1 = project(segment.geometry.coordinates[0]);
                    const p2 = project(segment.geometry.coordinates[1]);
                    const midPoint = [(p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2];

                    midPoints.push(midPoint);
                }
            });
        });

        midPoints.forEach(p => {
            const d = distance(mousePosition, p);
            if (d < minDistance) {
                nearestPoint = p;
                minDistance = d;
            }
        });

        if (nearestPoint && minDistance <= tolerance) {
            return unproject(nearestPoint);
        }

    },
    "vertex": (features, mousePosition, project, unproject, tolerance) => {
        let minDistance = Number.MAX_VALUE;
        let nearestPoint: GeoJSON.Position | undefined;
        mousePosition = project(mousePosition);

        turf.coordEach({ type: "FeatureCollection", features }, coord => {
            coord = project(coord);
            const d = distance(mousePosition, coord);
            if (d < minDistance) {
                nearestPoint = coord;
                minDistance = d;
            }
        });

        if (nearestPoint && minDistance <= tolerance) {
            return unproject(nearestPoint);
        }
    },
    "line-above": (features, mousePosition, project, unproject, tolerance) => {
        let minDistance = Number.MAX_VALUE;
        let nearestPoint: GeoJSON.Position | undefined;
        mousePosition = project(mousePosition);

        function closestPointOnLine(point: GeoJSON.Position, line: [GeoJSON.Position, GeoJSON.Position]): GeoJSON.Position {
            const A = point[0] - line[0][0];
            const B = point[1] - line[0][1];
            const C = line[1][0] - line[0][0];
            const D = line[1][1] - line[0][1];

            const dot = A * C + B * D;
            const lenSq = C * C + D * D;
            let param = -1;

            if (lenSq !== 0) {
                param = dot / lenSq;
            }

            let xx: number, yy: number;

            if (param < 0) {
                // 最近点是起点
                xx = line[0][0];
                yy = line[0][1];
            } else if (param > 1) {
                // 最近点是终点
                xx = line[1][0];
                yy = line[1][0];
            } else {
                // 最近点在线上
                xx = line[0][0] + param * C;
                yy = line[0][1] + param * D;
            }

            return [xx, yy];
        }

        features.forEach(f => {
            turf.segmentEach(f, segment => {
                if (!segment) return;

                const p1 = project(segment.geometry.coordinates[0]);
                const p2 = project(segment.geometry.coordinates[1]);

                const nearest = closestPointOnLine(mousePosition, [p1, p2]);
                const d = distance(mousePosition, nearest);

                if (d < minDistance) {
                    nearestPoint = nearest;
                    minDistance = d;
                }
            });
        });

        if (nearestPoint && minDistance <= tolerance) {
            return unproject(nearestPoint);
        }
    }
}

export interface SnapManagerOptions {
    map: maplibregl.Map;
    tolerance?: number;
}

export class SnapManager {
    private map: maplibregl.Map;
    private _hitPoint: GeoJSON.Position | undefined;
    private _snapHtmlElement = document.createElement("div");
    private _svgs = new Map<TNearestPointType, string>([
        ['vertex', `<svg viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg" width="20" height="20"><path fill="#d81e06" d="M962 962H62V62h900v900zM162 862h700V162H162v700z" p-id="8857"></path></svg>`],
        ['line-above', `<svg viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg" width="22" height="22"><path fill="#d81e06" d="M231.700059 68.191078l0 233.583966 210.224955 210.224955L231.700059 722.224955l0 233.583966 560.600905 0L792.300964 722.224955 582.074985 512l210.224955-210.224955L792.299941 68.191078 231.700059 68.191078zM698.866968 745.582943l0 116.791983L325.133032 862.374926 325.133032 745.582943l186.866968-186.866968L698.866968 745.582943zM512 465.283002 325.133032 278.416034 325.133032 161.624051l373.733936 0 0 116.791983L512 465.283002z" p-id="10111"></path></svg>`],
        ['line-mid', `<svg viewBox="0 110 1024 1024" xmlns="http://www.w3.org/2000/svg" width="22" height="22"><path fill="#d81e06" d="M973.603 886.76H50.397L512 87.24l461.603 799.52z m-750-100h576.795L512 287.24 223.603 786.76z" p-id="11312"></path></svg>`]
    ]);

    private enable = false;

    allowedLayers: string[] | (() => string[]) | undefined;
    featureTranslator: ((features: maplibregl.MapGeoJSONFeature[]) => GeoJSON.Feature[]) | undefined;
    tolerance: number;


    get hitPoint(): GeoJSON.Position | undefined {
        return this._hitPoint;
    }

    /**
     *
     */
    constructor(options: SnapManagerOptions) {
        this.map = options.map;
        this.tolerance = options.tolerance || 15;
        if (this.tolerance < 0) this.tolerance = 15;

        const style = this._snapHtmlElement.style;
        style.position = "absolute";
        style.zIndex = "1";
        style.transform = "translate(-50%, -50%)";
        style.pointerEvents = "none";
        style.lineHeight = "0";
        style.fontSize = '0';
        this.map.getContainer().appendChild(this._snapHtmlElement);

        // 计算吸附点
        this.map.on("mousemove", (e: maplibregl.MapMouseEvent) => {
            if (!this.enable) return;

            let layers: undefined | string[];
            if (typeof this.allowedLayers === "function") layers = this.allowedLayers();
            else layers = this.allowedLayers;
            const features = this.map.queryRenderedFeatures({ layers });
            const renderedFeatures = this.featureTranslator ? this.featureTranslator(features) : features;

            let nearestPoint: GeoJSON.Position | undefined;
            let nearestPointType: TNearestPointType | undefined;

            for (const type in nearest_point_finders) {
                // 前置操作，判断 type 是否用户配置的，如果用户不配置，则continue

                nearestPointType = type as TNearestPointType;

                const fun = nearest_point_finders[nearestPointType];
                nearestPoint = fun(renderedFeatures, e.lngLat.toArray(), x => {
                    const nx = this.map.project(x as [number, number]);
                    return [nx.x, nx.y]
                }, x => {
                    const nx = this.map.unproject(x as [number, number]);
                    return [nx.lng, nx.lat];
                }, this.tolerance);

                if (nearestPoint) {
                    break;
                }
            }

            this.setSnapData(nearestPoint && nearestPointType ? {
                type: nearestPointType,
                point: nearestPoint
            } : undefined);

            this.updateMapMouseEvent(e);
        });

        this.map.on("click", (e) => {
            if (!this.enable) return;
            this.updateMapMouseEvent(e);
        });

        this.map.on("dblclick", (e) => {
            if (!this.enable) return;
            this.updateMapMouseEvent(e);
        });

        this.map.on("mousedown", (e) => {
            if (!this.enable) return;
            this.updateMapMouseEvent(e);
        });

        this.map.on("mouseup", (e) => {
            if (!this.enable) return;
            this.updateMapMouseEvent(e);
        });
    }

    toggleEnable() {
        this.enable = !this.enable;
        this._snapHtmlElement.style.display = this.enable ? "block" : "none";
    }

    private updateMapMouseEvent(e: any) {
        if (this.hitPoint) {
            e.lngLat.lng = this.hitPoint[0];
            e.lngLat.lat = this.hitPoint[1];
            e.point = this.map.project(e.lngLat);
        }
    }

    private setSnapData(data?: { point: GeoJSON.Position, type: TNearestPointType }) {
        this._hitPoint = data?.point;
        const style = this._snapHtmlElement.style;

        if (data) {
            const p = this.map.project(data.point as [number, number]);
            style.display = "block";
            style.left = `${p.x}px`;
            style.top = `${p.y}px`;
            this.setSnapHtmlElementStyle(data.type);
        } else {
            style.display = "none";
        }
    }


    private setSnapHtmlElementStyle(type: TNearestPointType) {
        this._snapHtmlElement.innerHTML = this._svgs.get(type)!;
    }
}
