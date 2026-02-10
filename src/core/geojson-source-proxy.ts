import { uuidv7 } from 'uuidv7';

import { TIdentityGeoJSONFeature } from "../types";
import { Events } from './event';


interface GeoJSONSourceProxyOptions<TFeature extends TIdentityGeoJSONFeature = TIdentityGeoJSONFeature> {
    map: maplibregl.Map;
    data: TFeature[];
    sourceId?: string;
}

export class GeoJSONSourceProxy<TFeature extends TIdentityGeoJSONFeature = TIdentityGeoJSONFeature> extends Events.EventManager<{
    "add-features": { target: GeoJSONSourceProxy<TFeature>; features: Array<TFeature> };
    "update-features": { target: GeoJSONSourceProxy<TFeature>; features: Array<TFeature> };
    "delete-features": { target: GeoJSONSourceProxy<TFeature>; features: Array<TFeature> };
    "clear-features": { target: GeoJSONSourceProxy<TFeature>; features: Array<TFeature> };
    "hidden-features": { target: GeoJSONSourceProxy<TFeature>; features: Array<TFeature> };
    "unhidden-features": { target: GeoJSONSourceProxy<TFeature>; features: Array<TFeature> };
    "data-change": { target: GeoJSONSourceProxy<TFeature> };
}> {
    protected data = new Map<string, TFeature>();
    protected hiddenData = new Map<string, TFeature>();

    readonly map: maplibregl.Map;
    readonly sourceId: string;

    get geojsonSource() {
        return this.map.getSource(this.sourceId) as maplibregl.GeoJSONSource;
    }

    constructor(options: GeoJSONSourceProxyOptions<TFeature>) {
        super();

        this.map = options.map;
        this.sourceId = options.sourceId ?? uuidv7();

        options.data.forEach(f => {
            this.data.set(f.properties.id, f);
        });

        this.map.addSource(this.sourceId, {
            type: 'geojson',
            data: { type: "FeatureCollection", features: options.data },
            promoteId: "id"
        });
    }

    find(id: string) {
        return this.data.get(id) ?? this.hiddenData.get(id);
    }

    where(predicate: (feature: TIdentityGeoJSONFeature) => boolean) {
        return Array.from(this.data.values()).concat(Array.from(this.hiddenData.values())).filter(predicate);
    }

    update(...featrues: TFeature[]) {
        const addFeatures = new Array<TFeature>();
        const updateFeatures = new Array<TFeature>();

        featrues.forEach(f => {
            const id = f.properties.id;
            if (this.data.has(id)) {
                this.data.set(id, f);
                updateFeatures.push(f);
            } else if (this.hiddenData.has(id)) {
                this.hiddenData.set(id, f)
            } else {
                this.data.set(id, f);
                addFeatures.push(f);
            }
        });

        this.geojsonSource.updateData({
            update: updateFeatures.map(x => ({
                id: x.properties.id,
                newGeometry: x.geometry,
                addOrUpdateProperties: Object.keys(x.properties).map((y) => ({ key: y, value: (x.properties as any)[y] })),
            })),
            add: addFeatures
        });

        if (addFeatures.length > 0)
            this.fire("add-features", { target: this, features: addFeatures });
        if (updateFeatures.length > 0)
            this.fire("update-features", { target: this, features: updateFeatures });

        this.fire("data-change", { target: this });

        return { addFeatures, updateFeatures };
    }

    delete(...values: string[] | TFeature[]) {
        const deleteIds = new Array<string>();
        const deleteFeatures = new Array<TFeature>();

        values.forEach(v => {
            const id = typeof v === "string" ? v : v.properties.id;

            if (this.data.has(id)) {
                deleteFeatures.push(this.data.get(id)!);
                deleteIds.push(id);
                this.data.delete(id);
            }
            else if (this.hiddenData.has(id)) {
                deleteFeatures.push(this.hiddenData.get(id)!);
                this.hiddenData.delete(id);
            }
        });

        this.geojsonSource.updateData({
            remove: deleteIds
        });

        this.fire("delete-features", { target: this, features: deleteFeatures });
        this.fire("data-change", { target: this });

        return deleteFeatures;
    }

    clear() {
        const features = Array.from(this.data.values()).concat(Array.from(this.hiddenData.values()));
        this.data.clear();
        this.hiddenData.clear();
        this.geojsonSource.updateData({
            removeAll: true,
        });

        this.fire("clear-features", { target: this, features });
        this.fire("data-change", { target: this });
        return features;
    }

    hidden(...values: string[] | TFeature[]) {
        const hiddenFeatures = new Array<TFeature>();

        values.forEach(v => {
            const id = typeof v === "string" ? v : v.properties.id;
            const f = this.data.get(id);

            if (!f) return;

            this.data.delete(id);
            this.hiddenData.set(id, f);
            hiddenFeatures.push(f);
        });

        this.geojsonSource.updateData({
            remove: hiddenFeatures.map((x) => x.properties.id),
        });

        this.fire("hidden-features", { target: this, features: hiddenFeatures });
        this.fire("data-change", { target: this });
        return hiddenFeatures;
    }

    unhidden(...values: string[] | TFeature[]) {
        const features = new Array<TFeature>();

        if (values.length !== 0) {
            values.forEach(v => {
                const id = typeof v === "string" ? v : v.properties.id;

                const f = this.hiddenData.get(id);
                if (!f) return;

                this.hiddenData.delete(id);
                this.data.set(id, f);
                features.push(f);
            });
        } else {
            this.hiddenData.forEach((v, k) => {
                this.data.set(k, v);
                features.push(v);
            });

            this.hiddenData.clear();
        }

        this.geojsonSource.updateData({
            add: features,
        });

        this.fire("unhidden-features", { target: this, features });
        this.fire("data-change", { target: this });
        return features;
    }
}

export default GeoJSONSourceProxy;