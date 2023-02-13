const fn = (...args) => {
    console.log('调用函数', args)
}
const p = new Proxy(fn, {
    apply(target, thisArg, argArray) {
        console.log(thisArg, argArray)
        target.call(thisArg, ...argArray)
    }
})

p(1,2,3)

const obj = {
    foo: 1,
    get bar() {
        return this.foo
    }
}
const ITERATE_KEY = Symbol()
const p2 = new Proxy(obj, {
    set(target, key, receiver) {
        return Reflect.set(target, key, receiver)
    },
    get(target, key, receiver) {
        return Reflect.get(target, key, receiver)
    },
    ownKeys(target) {
        console.log('遍历', target)
        return Reflect.ownKeys(target)
    }
})

for (let key in p2) {
    console.log('key=', key)
}

p2.name = '2222'
