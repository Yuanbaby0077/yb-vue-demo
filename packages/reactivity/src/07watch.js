const target = {
    foo: 1,
    bar: 3
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
        const res = fn()
        effectStack.pop()
        activeEffect = effectStack[effectStack.length -1 ]
        return res
    }
    
    effectFn.deps = []
    effectFn.options = options
    if (!effectFn.options?.lazy) {
        effectFn()
    }
    return effectFn
}

let isFlushing = false
const jobQueue = new Set()
const p = Promise.resolve()
const flushJob = () => {
    if (isFlushing) return
    isFlushing = true
    p.then(() => {
        jobQueue.forEach(job => job())
    }).finally(() => {
        isFlushing = false
    })
}

// 实现computed lazy实现
// 缓存值
function computed(getter) {
    let dirty = true
    const effectFn = effect(getter, {
        lazy: true,
        scheduler() {
            dirty = true
        }
    })
    let res
    const obj = {
        get value() {
            if (dirty) {
                res = effectFn()
                dirty = false
            }
            return res
        }
    }
    return obj
}
function traverse(value) {
    if (typeof value !== 'object' || value === null) return
    for (let k in value) {
        traverse(value[k])
    }
    return value
}
// watch 第一个参数是对象或者是函数
function watch(source, cb, options = {}) {
    const getter = typeof source === 'function' ? source : () => traverse(source)
    let oldVal, newVal
    const job = () => {
        newVal = effectFn()
        cb(newVal, oldVal)
        oldVal = newVal
    }
    const effectFn = effect(() => getter(), {
        scheduler() {
            job()
        }
    })
    if (options?.immediate) {
        job()
        return
    }
    oldVal = effectFn()
}
// const res = watch(proxy, (newVal, oldVal) => {
//     console.log('watch', newVal, oldVal)
// })

const resFn = watch(() => proxy.foo, (newVal, oldVal) => {
    console.log('watch', newVal, oldVal)
}, {
    immediate: true
})

proxy.foo = 3
proxy.foo = 5

