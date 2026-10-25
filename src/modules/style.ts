
import { RequestTransformFunction } from 'maplibre-gl';
import { CONTRACT_STRINGS } from "../core/contracts";

export namespace Style {
    /**
 * 将地图样式适配不同语言, 注意需要在 "style.load"后执行
 * @param style map.getStyle();
 * @param lang 默认中文
 * @param options 
 * @returns 
 */
    export function adaptStyleLanguage(style: maplibregl.StyleSpecification,
        lang: "ar" | "de" | "en" | "es" | "fr" | "it" | "ja" | "ko" | "mul" | "pt" | "ru" | "vi" | "zh-Hans" | "zh-Hant" = "zh-Hans",
        options: {
            languageField?: RegExp;
            fieldMake?: (lang: string) => string;
        } = {}) {
        options.languageField ??= /^name_/;

        const field = options.fieldMake ? options.fieldMake(lang) : (lang === "mul" ? "name" : `name_${lang}`);

        function isFlatExpressionField(property: maplibregl.DataDrivenPropertyValueSpecification<string>) {
            const isGetExpression = Array.isArray(property) && property[0] === "get";
            if (isGetExpression && /^\{name/.test(property[1] as any))
                console.warn(
                    "This plugin no longer supports the use of token syntax (e.g. {name}). Please use a get expression. See https://docs.mapbox.com/mapbox-gl-js/style-spec/expressions/ for more details.",
                );

            return isGetExpression && options.languageField!.test(property[1] as any);
        }

        function adaptNestedExpressionField(property: maplibregl.DataDrivenPropertyValueSpecification<string>) {
            if (Array.isArray(property)) {
                for (let i = 1; i < property.length; i++) {
                    if (Array.isArray(property[i])) {
                        if (isFlatExpressionField(property)) {
                            (property as any)[i][1] = field;
                        }
                        adaptNestedExpressionField((property as any)[i]);
                    }
                }
            }
        }

        style.layers.forEach((layer: any) => {
            if (layer.type === "symbol" && layer.layout && layer.layout["text-field"]) {
                let property = layer.layout["text-field"] as any;

                if (isFlatExpressionField(property)) {
                    property[1] = field;
                }
                if (typeof property === "string") property = property.replace("name_en", field);
                else if (typeof property === "object") property = JSON.parse(JSON.stringify(property).replace("name_en", field));

                adaptNestedExpressionField(property);

                if (property[0] === "get" && property[1] === "name") {
                    const defaultProp = property.slice();
                    const adaptedProp = ["get", field];
                    property = ["coalesce", adaptedProp, defaultProp];
                }

                layer.layout["text-field"] = property;
            }
        });

        return style;
    }


    export function createMapboxRequestTransform(access_token: string): RequestTransformFunction {
        return (url: string, resType?: maplibregl.ResourceType): maplibregl.RequestParameters | undefined => {
            const mapbox_api_url = "https://api.mapbox.com";

            if (resType === "Style") {
                const style = url.split("/").pop();
                url = `${mapbox_api_url}/styles/v1/mapbox/${style}?access_token=${access_token}`;
            } else if (resType === "Source") {
                if (url.includes("mapbox://")) url = `${url.replace("mapbox://", `${mapbox_api_url}/v4/`)}.json?secure&access_token=${access_token}`;
            } else if (resType === "Glyphs") {
                url = `${mapbox_api_url}/fonts/v1/mapbox/${url.replace("mapbox://fonts/mapbox/", "")}?access_token=${access_token}`;
            } else if (resType && resType.startsWith("Sprite")) {
                if (url.indexOf("@") !== -1) {
                    const t = url.split("@");
                    url = `${mapbox_api_url}/styles/v1/mapbox/${t[0].split("/").pop()}/sprite@${t[1]}?access_token=${access_token}`;
                } else {
                    // mapbox://sprites/mapbox/streets-v12.json
                    // mapbox://sprites/mapbox/streets-v12.png
                    const temp = url.split("/").pop();
                    const style = temp!.split(".")[0];
                    const type = temp!.split(".")[1];
                    url = `${mapbox_api_url}/styles/v1/mapbox/${style}/sprite.${type}?access_token=${access_token}`;
                }
            }

            return { url };
        };
    }

    export class StyleProxy {
        private cacheLayers = new Array<any>();

        private customLayers = new Array<any>();
        private customSources = new Map<string, any>();
        private customImages = new Map<string, any>();

        constructor(private map: maplibregl.Map) {
            map.on("style.load", () => {
                // 清空代理
                (this.map as any)[CONTRACT_STRINGS.MAP_LAYER_PROXY_SYMBOL] = {};

                // 缓存 初始style中的layer
                this.cacheLayers = map.getStyle().layers;

                // 添加自定义图片
                this.customImages.forEach((v, k) => {
                    if (!map.getImage(k)) {
                        map.addImage(k, v.data, { sdf: v.sdf });
                    }
                });

                // 添加自定义source
                this.customSources.forEach((v, k) => {
                    // 确保source没有被添加, mapbox-gl-draw 会在load之前被添加
                    if (!map.getSource(k)) map.addSource(k, v);
                });

                // 找到自定义raster的beforeId
                let customRasterBeforeId: string | undefined;
                this.cacheLayers.forEach((l, index) => {
                    if (l.type === "raster") {
                        customRasterBeforeId = this.cacheLayers[index + 1]?.id;
                    }

                    if (customRasterBeforeId === undefined && l.layout && l.layout["text-field"] !== undefined) {
                        customRasterBeforeId = l.id;
                    }
                });

                // 添加自定义layer
                this.customLayers.forEach((l) => {
                    if (!map.getLayer(l.id)) {
                        if (l.type === "raster") {
                            map.addLayer(l, customRasterBeforeId);
                        } else {
                            map.addLayer(l);
                        }
                    }
                });
            });
        }

        setStyle(style: string) {
            this.customLayers = new Array<any>();
            this.customSources = new Map<string, any>();
            this.customImages = new Map<string, any>();

            this.map.getStyle().layers.forEach((l: any) => {
                if (this.cacheLayers.some((cl) => cl.id === l.id)) return;

                const sourceId = (l as any).source as string;

                if (!this.customSources.get(sourceId)) {
                    const source = this.map.getSource(sourceId) as any;
                    if (source && source.serialize) {
                        this.customLayers.push(l);
                        this.customSources.set(sourceId, (this.map.getSource(sourceId) as any).serialize());
                    }
                } else {
                    this.customLayers.push(l);
                }
            });

            this.map.listImages().forEach((x) => {
                this.customImages.set(x, this.map.getImage(x));
            });

            this.map.setStyle(style);
        }
    }
}