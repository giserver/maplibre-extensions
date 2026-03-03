import { RequestTransformFunction } from 'maplibre-gl';

export namespace Mapbox {
    export function createRequestTransform(access_token: string): RequestTransformFunction {
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
}

