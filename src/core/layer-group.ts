import { Events } from "./event";

export type TLayerGroupEventDefinition = {
    "visible": { target: LayerGroup };
    "move": { target: LayerGroup };
    "destroy": { target: LayerGroup };
};

export class LayerGroup<TEventDefinition extends TLayerGroupEventDefinition & Events.EventDefinition = TLayerGroupEventDefinition> extends Events.EventManager<
    TLayerGroupEventDefinition & TEventDefinition
> {
    protected _visible: boolean = true;
    protected _layers: string[];

    get layers(): ReadonlyArray<string> {
        return this._layers;
    }

    /**
     *
     */
    constructor(
        readonly map: maplibregl.Map,
        layers: string[] | maplibregl.LayerSpecification[],
    ) {
        super();

        this._layers = layers.map((l) => {
            const id = typeof l === "string" ? l : l.id;

            // 地图中还未添加该图层
            if (!map.getLayer(id)) {
                if (typeof l === "string") throw new Error("Layer " + l + " not found in map");

                map.addLayer(l);
            }

            return id;
        });
    }

    get visible() {
        return this._visible;
    }

    set visible(value: boolean) {
        if (value === this.visible) return;

        // 设置图层显隐性
        this._layers.forEach((id) => {
            this.map.getLayerProxy(id).layer.layout!.visibility = value ? "visible" : "none";
        });

        // 记录显隐性
        this._visible = value;

        this.fire("visible", { target: this as any });
    }

    /**
     * 添加图层
     * @param layer
     */
    addLayer(layer: string | maplibregl.AddLayerObject, beforeId?: string) {
        const id = typeof layer === "string" ? layer : layer.id;
        if (!this.map.getLayer(id)) {
            if (typeof layer === "string") throw new Error("Layer " + layer + " not found in map");

            this.map.addLayer(layer, beforeId);
        }

        // 设置图层显隐性
        this.map.getLayerProxy(id).layout.visibility = this._visible ? "visible" : "none";

        // 插入到数组中
        const beforeIndex = beforeId ? this._layers.indexOf(beforeId) : -1;
        if (beforeIndex >= 0) {
            this._layers.splice(beforeIndex, 0, id);
        } else {
            this._layers.push(id);
        }
    }

    /**
     * 删除图层
     * @param layer
     */
    removeLayer(layer: string) {
        this.map.removeLayer(layer);
        this._layers.splice(this._layers.indexOf(layer), 1);
    }

    /**
     * 是否包含图层
     * @param layer
     * @returns
     */
    hasLayer(layer: string) {
        return this._layers.includes(layer);
    }

    /**
     * 移动图层至beforeId之后，如果beforeId为undefined则移动至最顶层
     * @param beforeId
     */
    moveTo(beforeId: string | undefined) {
        // 移动图层
        this._layers.forEach((id) => {
            this.map.moveLayer(id, beforeId);
        });

        // 触发移动事件
        this.fire("move", { target: this as any });
    }

    /**
     * 销毁
     */
    destroy() {
        // 删除地图中的图层
        this.layers.forEach((id) => {
            this.map.removeLayer(id);
        });

        // 触发销毁事件
        this.fire("destroy", { target: this as any });
    }
}
