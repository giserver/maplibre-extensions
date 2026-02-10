const value = {
    paint: {
        a: "1"
    }
}

value.paint = new Proxy(value.paint, {
    set(target, key, value) {
        console.log("proxy", key, value);
        return Reflect.set(target, key, value);
    }
});

value.paint.a = "2";