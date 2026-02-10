export class LayerProxy<T extends maplibregl.LayerSpecification> {
    readonly layer: T;

    get layout(){
        return this.layer.layout!;
    }

    get paint(){
        return this.layer.paint!;
    }
    

    /**
     *
     */
    constructor(map: maplibregl.Map, layer: T) {
        if (!layer.paint) layer.paint = {};
        if (!layer.layout) layer.layout = {};

        layer.paint = new Proxy(layer.paint, {
            set(taret, key, value) {
                map.setPaintProperty(layer.id, key as string, value);
                return Reflect.set(taret, key, value);
            }
        });

        layer.layout = new Proxy(layer.layout, {
            set(taret, key, value) {
                map.setLayoutProperty(layer.id, key as string, value);
                return Reflect.set(taret, key, value);
            }
        });

        this.layer = new Proxy(layer, {
            set(taret, key, value) {
                if (key === 'minzoom') {
                    const maxzoom = taret.maxzoom ?? map.getMaxZoom();
                    map.setLayerZoomRange(taret.id, value, maxzoom);
                }
                else if (key === "maxzoom") {
                    const minzoom = taret.maxzoom ?? map.getMinZoom();
                    map.setLayerZoomRange(taret.id, minzoom, value);
                }
                else if(key === "filter"){
                    map.setFilter(taret.id, value);
                }
                else {
                    return false;
                }

                return Reflect.set(taret, key, value);
            }
        });
    }

    toJSON(){
        return this.layer;
    }
}

export default LayerProxy;