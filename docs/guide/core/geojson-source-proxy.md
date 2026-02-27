# GeoJSONSourceProxy

`GeoJSONSourceProxy` 针对原始 `source` 扩充数据增、删、改、查等操作, 以及事件系统。但是它 `固执` 地使用了具有properties属性必须包括 `id` 的geojson数据。如果你的数据不包含 `id` ， 你可以在初始化时手动添加，在存储时手动删除。

