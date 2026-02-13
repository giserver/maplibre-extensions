import * as turf from '@turf/turf';

type TMeasureResultFeature = GeoJSON.Feature<GeoJSON.Point, {
    value: string;
    type: "point" | "line" | "line-segment" | "polygon" | "polygon-line" | "polygon-line-segment";
}>;

type TMeasurePointOptions = {
    format(position: GeoJSON.Position): string;
}

type TMeasureLineStringOptions = {
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
}


type TMeasurePolygonOptions = {
    format(area: number): string;
    withLineString?: boolean;
    measureLineStringOptions: TMeasureLineStringOptions;
};

type TMeasureGeometryOptions = {
    point: TMeasurePointOptions;
    line: TMeasureLineStringOptions;
    polygon: TMeasurePolygonOptions;
}

function measurePoint(g: GeoJSON.Position, options: TMeasurePointOptions): TMeasureResultFeature[] {
    const value = options.format(g);

    return [{
        type: "Feature",
        geometry: {
            type: 'Point',
            coordinates: g
        },
        properties: {
            value,
            type: 'point'
        }
    }]
}

function measureLineString(g: GeoJSON.Position[], options: TMeasureLineStringOptions): TMeasureResultFeature[] {

}

function measurePolygon(g: GeoJSON.Position[][], options: TMeasurePolygonOptions): TMeasureResultFeature[] {

}

function measureGeometry(g: GeoJSON.Geometry | GeoJSON.Feature | GeoJSON.FeatureCollection, options: TMeasureGeometryOptions): TMeasureResultFeature[] {
    if (g.type === 'Point') return measurePoint(g.coordinates, options.point);
    if (g.type === 'LineString') return measureLineString(g.coordinates, options.line);
    if (g.type === 'Polygon') return measurePolygon(g.coordinates, options.polygon);

    const result = new Array<TMeasureResultFeature>();
    if (g.type === 'MultiPoint') return g.coordinates.reduce((p, c) => p.concat(measurePoint(c, options.point)), result);
    if (g.type === 'MultiLineString') return g.coordinates.reduce((p, c) => p.concat(measureLineString(c, options.line)), result);
    if (g.type === 'MultiPolygon') return g.coordinates.reduce((p, c) => p.concat(measurePolygon(c, options.polygon)), result);

    if (g.type === 'GeometryCollection') return g.geometries.reduce((p, c) => p.concat(measureGeometry(c, options)), result);

    if (g.type === 'Feature') return measureGeometry(g.geometry, options);
    return g.features.reduce((p, c) => p.concat(measureGeometry(c, options)), result);
}