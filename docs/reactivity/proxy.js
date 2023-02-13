
const obj = {
    name: 'zs',
    fn() {
        console.log(this === obj)
    }
}
const proxy = new Proxy(obj, {
    get(target, key) {
        console.log('访问了', target, key)
        return target[key]
    },
    set(target, key, newVal) {
        console.log('set')
        target[key] = newVal
    },
    apply(target, thisArg, argArray) {
        console.log('调用apply')
        target.call(thisArg, ...argArray)
    }
})

// proxy.name = 'ls'
// proxy.fn('text')

const proxyFn = new Proxy((x, y) => {
    return x + y
}, {
    get: function (target, name) {
        if (name === 'prototype') {
            return Object.prototype;
        }
        console.log(name)
        return 'Hello, ' + name;
    },
    apply: function (target, thisBinding, args) {
        console.log(thisBinding, args)
        return args[0];
    },
})

proxyFn.name
proxyFn(1,2)