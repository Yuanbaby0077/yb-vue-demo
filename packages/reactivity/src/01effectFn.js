const target = {
    name: 'zs',
    ok: true
}

let activeEffect = null
const bucket = new WeakMap()

const proxy = new Proxy(target, {
    get(target, key) {
        track(target, key)
        return target[key]
    },
    set(target, key, value) {
        target[key] = value
        trigger(target, key)
    }
})

function track(target, key) {
    let depsMap = bucket.get(target)
    if (!depsMap) {
        bucket.set(target, depsMap = new Map())
    }
    let deps = depsMap.get(key)
    if (!deps) {
        depsMap.set(key, deps = new Set())
    }
    deps.add(activeEffect)
    activeEffect.deps.push(deps) // 将当前属性的副作用函数集合存到副作用函数的deps中
}

function trigger(target, key) {
    const depsMap = bucket.get(target)
    if (!depsMap) return
    const deps = depsMap.get(key)
    if (!deps) return
    const depsToRun = new Set(deps)
    depsToRun.forEach(fn => fn());
}

function cleanup(effectFn) {
    for (let i = 0 ; i < effectFn.deps.length; i++) {
        const deps = effectFn.deps[i]
        deps.delete(effectFn) // 清除当前关联的该副作用函数
    }
    effectFn.deps.length = 0
}

const effect = (fn) => {
    const effectFn = () => {
        cleanup(effectFn)
        activeEffect = effectFn
        fn()
    }
    effectFn.deps = []
    effectFn()
}

effect(() => {
    global.name = proxy.ok ? proxy.name : ''
    console.log('调用副作用函数')
})
proxy.name = 'ls'
proxy.ok = false // ok设置为false后，理论上，再修改name属性，不会去调用副作用函数，因此在执行副作用函数之前清理掉关联的副作用函数
proxy.name = 'lw'
