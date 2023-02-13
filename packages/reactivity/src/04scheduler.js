const target = {
    foo: 1
}

let activeEffect = null
const effectStack = []
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
    if (!activeEffect) return
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
    const depsToRun = new Set()
    deps.forEach((fn) => {
        if (fn !== activeEffect) {
            depsToRun.add(fn)
        }
    })
    depsToRun.forEach(fn => {
        if (fn.options?.scheduler) {
            fn.options.scheduler(fn)
        } else {
            fn()
        }
    });
}

function cleanup(effectFn) {
    for (let i = 0 ; i < effectFn.deps.length; i++) {
        const deps = effectFn.deps[i]
        deps.delete(effectFn) // 清除当前关联的该副作用函数
    }
    effectFn.deps.length = 0
}

const effect = (fn, options = {}) => {
    const effectFn = () => {
        cleanup(effectFn)
        activeEffect = effectFn
        effectStack.push(effectFn)
        fn()
        effectStack.pop()
        activeEffect = effectStack[effectStack.length -1 ]
    }
    
    effectFn.deps = []
    effectFn.options = options
    effectFn()
}
// scheduler 调度执行

// effect(() => {
//     console.log(proxy.foo)
// }, {
//     scheduler(fn) {
//         setTimeout(fn, 2000);
//     }
// })

// 控制打印次数
effect(() => {
    console.log(proxy.foo)
})
proxy.foo++
proxy.foo ++
proxy.foo ++
console.log('end')

