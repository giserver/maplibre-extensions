import { UserConfig, DefaultTheme } from 'vitepress';


export default {
    title: "maplibregl 扩展",
    lang: "zh-CN",

    head: [
        ['link', { rel: "stylesheet", href: "/.vitepress/style.css" }]
    ],
    themeConfig: {
        aside: false,
        sidebar: [{
            text: "简介",
            base: "/guide/",
            items: [
                { text: "有什么用", link: "/what" },
                { text: "快速开始", link: "/start" },
                { text: "说明", link: "/explain" }]
        }, {
            text: "功能",
            base: "/guide/usage/",
            items: [
                { text: "绘制", link: "draw" },
                { text: "测量", link: "measure" },
                { text: "捕捉", link: "snap" },
                { text: "顶点编辑", link: "vertex" },
                { text: "mapbox 映射", link: "mapbox" }
            ]
        }, {
            text: "core",
            base: "/guide/core/",
            items: [
                { text: "GeoJSONSourceProxy", link: "geojson-source-proxy" },
            ]
        }]
    }

} as UserConfig<DefaultTheme.Config>;