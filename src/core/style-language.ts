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