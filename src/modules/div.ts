/**
 * 分割，使用线段分割任何东西
 */

import { uuidv7 } from 'uuidv7';
import * as turf from '@turf/turf';
import { GeoJSONSourceProxy, Events } from '../core';
import { DrawManager } from './draw';

export class DivManager extends Events.EventManager<{
    "dived": { target: DivManager, orgGeometry: GeoJSON.Geometry, divedGeometries: GeoJSON.Geometry[] }
}> {
    private readonly drawer: DrawManager;
    private readonly sourceProxy: GeoJSONSourceProxy;
    /**
     *
     */
    constructor(options: { map: maplibregl.Map }) {
        super();
        this.sourceProxy = new GeoJSONSourceProxy({
            id: uuidv7(),
            map: options.map
        });
        this.drawer = new DrawManager({ once: true, sourceProxy: this.sourceProxy });
    }

    div(geometry: GeoJSON.Geometry) {
        if (geometry.type === 'Point') {
            console.warn("point type can not div");
            return;
        }

        const that = this;
        this.drawer.once("drawed", async e => {
            // 判断绘制图形是否为线段
            if (e.feature.geometry.type !== 'LineString') {
                throw new Error("div drawer must draw linestring , but got " + e.feature.geometry.type);
            }

            // 分割算法
            const divedGeometries = splitGeometryByLine(e.feature.geometry, geometry);

            // 执行分割回调
            await that.fire("dived", {
                target: that,
                orgGeometry: geometry,
                divedGeometries
            });

            // 清空绘制的线段
            this.drawer.clear();
        });
        this.drawer.start("LineString");

        return () => {
            this.drawer.clear();
            this.drawer.stop();
        }
    }
}

const NODE_EPSILON = 1e-9;

function positionEqual(a: GeoJSON.Position, b: GeoJSON.Position) {
    return Math.abs(a[0] - b[0]) < NODE_EPSILON && Math.abs(a[1] - b[1]) < NODE_EPSILON;
}

/**
 * 求两线段互相的切点：正常相交时为单个交点；共线重叠时为重叠区间端点
 */
function segmentCuts(
    a: GeoJSON.Position, b: GeoJSON.Position, c: GeoJSON.Position, d: GeoJSON.Position
): { target: 0 | 1; point: GeoJSON.Position }[] {
    const rx = b[0] - a[0], ry = b[1] - a[1];
    const sx = d[0] - c[0], sy = d[1] - c[1];
    const denom = rx * sy - ry * sx;
    if (denom === 0) {
        // 平行：检查共线重叠，在重叠区间端点处切开
        const cross = (c[0] - a[0]) * ry - (c[1] - a[1]) * rx;
        if (Math.abs(cross) > NODE_EPSILON) return [];
        const cuts: { target: 0 | 1; point: GeoJSON.Position }[] = [];
        const rr = rx * rx + ry * ry;
        const ss = sx * sx + sy * sy;
        const tc = ((c[0] - a[0]) * rx + (c[1] - a[1]) * ry) / rr;
        const td = ((d[0] - a[0]) * rx + (d[1] - a[1]) * ry) / rr;
        const start = Math.max(0, Math.min(tc, td));
        const end = Math.min(1, Math.max(tc, td));
        if (end - start >= 1e-12) {
            if (start > 1e-12) cuts.push({ target: 0, point: [a[0] + start * rx, a[1] + start * ry] });
            if (end < 1 - 1e-12) cuts.push({ target: 0, point: [a[0] + end * rx, a[1] + end * ry] });
        }
        const sa = ((a[0] - c[0]) * sx + (a[1] - c[1]) * sy) / ss;
        const sb = ((b[0] - c[0]) * sx + (b[1] - c[1]) * sy) / ss;
        const start2 = Math.max(0, Math.min(sa, sb));
        const end2 = Math.min(1, Math.max(sa, sb));
        if (end2 - start2 >= 1e-12) {
            if (start2 > 1e-12) cuts.push({ target: 1, point: [c[0] + start2 * sx, c[1] + start2 * sy] });
            if (end2 < 1 - 1e-12) cuts.push({ target: 1, point: [c[0] + end2 * sx, c[1] + end2 * sy] });
        }
        return cuts;
    }
    const qpx = c[0] - a[0], qpy = c[1] - a[1];
    const t = (qpx * sy - qpy * sx) / denom;
    const u = (qpx * ry - qpy * rx) / denom;
    if (t < -NODE_EPSILON || t > 1 + NODE_EPSILON || u < -NODE_EPSILON || u > 1 + NODE_EPSILON) return [];
    const tc = Math.min(1, Math.max(0, t));
    const point: GeoJSON.Position = [a[0] + tc * rx, a[1] + tc * ry];
    const cuts: { target: 0 | 1; point: GeoJSON.Position }[] = [];
    if (!positionEqual(point, a) && !positionEqual(point, b)) cuts.push({ target: 0, point });
    if (!positionEqual(point, c) && !positionEqual(point, d)) cuts.push({ target: 1, point });
    return cuts;
}

/**
 * 将一组线在所有交点处切开（noding），返回两两只在端点相交、且无重复的线段集合
 */
function nodeLines(lines: GeoJSON.LineString[]): GeoJSON.LineString[] {
    const segments: { a: GeoJSON.Position; b: GeoJSON.Position }[] = [];
    lines.forEach(l =>
        l.coordinates.slice(0, -1).forEach((a, index) => segments.push({ a, b: l.coordinates[index + 1] }))
    );
    const cuts = segments.map<GeoJSON.Position[]>(() => []);
    for (let i = 0; i < segments.length; i++) {
        for (let j = i + 1; j < segments.length; j++) {
            for (const { target, point } of segmentCuts(segments[i].a, segments[i].b, segments[j].a, segments[j].b)) {
                const seg = target === 0 ? segments[i] : segments[j];
                const list = target === 0 ? cuts[i] : cuts[j];
                if (!positionEqual(point, seg.a) && !positionEqual(point, seg.b) && !list.some(p => positionEqual(p, point))) {
                    list.push(point);
                }
            }
        }
    }
    const seen = new Set<string>();
    const result: GeoJSON.LineString[] = [];
    segments.forEach((seg, i) => {
        const rx = seg.b[0] - seg.a[0], ry = seg.b[1] - seg.a[1];
        const points = [
            seg.a,
            ...cuts[i].sort((p, q) =>
                (p[0] - seg.a[0]) * rx + (p[1] - seg.a[1]) * ry - ((q[0] - seg.a[0]) * rx + (q[1] - seg.a[1]) * ry)
            ),
            seg.b
        ];
        for (let k = 0; k < points.length - 1; k++) {
            if (positionEqual(points[k], points[k + 1])) continue;
            // 方向不敏感去重，消除共线重叠产生的重复线段
            const key = [points[k], points[k + 1]]
                .map(p => p.map(v => v.toFixed(9)).join("_"))
                .sort()
                .join("|");
            if (seen.has(key)) continue;
            seen.add(key);
            result.push({ type: "LineString", coordinates: [points[k], points[k + 1]] });
        }
    });
    return result;
}

/**
 * 用分割线切开线，线与分割线无交集（含完全重合）时返回空数组
 */
function splitLineByLine(line: GeoJSON.LineString, cutter: GeoJSON.LineString): GeoJSON.LineString[] {
    // 无交集或完全重合时 lineSplit 均返回空
    return turf.lineSplit(turf.feature(line), turf.feature(cutter)).features.map(f => f.geometry);
}

/**
 * 用线分割几何图形
 * @param line 用作分割的线
 * @param geometry 被分割的几何图形
 * @returns 分割后的几何图形数组；点等不可分割类型返回原图形，
 *          线与图形无交集、与边界重合或未能切开图形时返回空数组
 */
export function splitGeometryByLine(line: GeoJSON.LineString, geometry: GeoJSON.Geometry):
    GeoJSON.Geometry[] {
    switch (geometry.type) {
        case "LineString":
            return splitLineByLine(geometry, line);
        case "MultiLineString": {
            const results = geometry.coordinates.map(c => splitLineByLine({ type: "LineString", coordinates: c }, line));
            // 全部无交集时返回空数组，否则未被切到的线原样保留
            if (results.every(r => r.length === 0)) return [];
            return results.flatMap((r, i) => r.length > 0 ? r : [{ type: "LineString", coordinates: geometry.coordinates[i] }]);
        }
        case "Polygon":
        case "MultiPolygon": {
            const original = turf.feature(geometry);
            const rings = geometry.type === "Polygon" ? geometry.coordinates : geometry.coordinates.flat();
            // 边界与分割线先在所有交点处切开，再重构成面
            const ringLines: GeoJSON.LineString[] = rings.map(r => ({ type: "LineString", coordinates: r }));
            const noded = nodeLines([...ringLines, line]);
            const polygons = turf.polygonize(turf.featureCollection(noded.map(c => turf.feature(c))));
            // polygonize 会把孔洞也生成面，只保留代表点在原图形内的面
            const pieces = polygons.features
                .filter(f => turf.booleanPointInPolygon(turf.pointOnFeature(f), original))
                .map(f => f.geometry);
            // 面数未增多说明未能切开（无交集、与边界重合、悬空线等），返回空数组
            const partCount = geometry.type === "Polygon" ? 1 : geometry.coordinates.length;
            return pieces.length > partCount ? pieces : [];
        }
        default:
            return [geometry];
    }
}