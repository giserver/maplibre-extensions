import maplibregl from 'maplibre-gl';

export type TIdentityGeoJSONFeature<TGeometry extends GeoJSON.Geometry = GeoJSON.Geometry> = GeoJSON.Feature<TGeometry, { id: string }>;

export type TIdentityGeoJSONPolygonFeature = TIdentityGeoJSONFeature<GeoJSON.Polygon | GeoJSON.MultiPolygon>;
export type TIdentityGeoJSONLineStringFeature = TIdentityGeoJSONFeature<GeoJSON.LineString | GeoJSON.MultiLineString>;
export type TIdentityGeoJSONPointFeature = TIdentityGeoJSONFeature<GeoJSON.Point | GeoJSON.MultiPoint>;

export type TMapEventKey = keyof maplibregl.MapEventType;