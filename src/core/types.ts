import maplibregl from 'maplibre-gl';

export type IdentityGeoJSONFeature<TGeometry extends GeoJSON.Geometry = GeoJSON.Geometry> = GeoJSON.Feature<TGeometry, { id: string }>;

export type IdentityGeoJSONPolygonFeature = IdentityGeoJSONFeature<GeoJSON.Polygon | GeoJSON.MultiPolygon>;
export type IdentityGeoJSONLineStringFeature = IdentityGeoJSONFeature<GeoJSON.LineString | GeoJSON.MultiLineString>;
export type IdentityGeoJSONPointFeature = IdentityGeoJSONFeature<GeoJSON.Point | GeoJSON.MultiPoint>;

export type MapEventKey = keyof maplibregl.MapEventType;