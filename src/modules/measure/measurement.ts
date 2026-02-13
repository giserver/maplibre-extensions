import * as turf from '@turf/turf';

type TMeasureResultFeature = GeoJSON.Feature<GeoJSON.Point, {
    value: string;
    type: "point" | "line" | "line-segment" | "polygon" | "polygon-line" | "polygon-line-segment";
    parent: GeoJSON.Geometry | GeoJSON.Feature
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
    let result = new Array<TMeasureResultFeature>();

    if (g.type === 'Point') result = measurePoint(g.coordinates, options.point);
    else if (g.type === 'LineString') result = measureLineString(g.coordinates, options.line);
    else if (g.type === 'Polygon') result = measurePolygon(g.coordinates, options.polygon);

    else if (g.type === 'MultiPoint') g.coordinates.reduce((p, c) => p.concat(measurePoint(c, options.point)), result);
    else if (g.type === 'MultiLineString')  g.coordinates.reduce((p, c) => p.concat(measureLineString(c, options.line)), result);
    else if (g.type === 'MultiPolygon') g.coordinates.reduce((p, c) => p.concat(measurePolygon(c, options.polygon)), result);
    else if (g.type === 'GeometryCollection') g.geometries.reduce((p, c) => p.concat(measureGeometry(c, options)), result);

    else if (g.type === 'Feature') result = measureGeometry(g.geometry, options);

    else {
        return g.features.reduce((p, c) => p.concat(measureGeometry(c, options)), result);
    }

    result.forEach(r=>{
        r.properties.parent = g;
    });

    return result;
}