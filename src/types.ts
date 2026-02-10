import maplibregl from 'maplibre-gl';

export type TIdentityGeoJSONFeature = GeoJSON.Feature<GeoJSON.Geometry, { id: string }>;

export type TMapEventKey = keyof maplibregl. MapEventType;