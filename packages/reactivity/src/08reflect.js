const target = {
    foo: 1,
    get bar() {
        return this.foo
    }
}

let activeEffect = null
const effectStack = []
const bucket = new WeakMap()
const ITERATE_KEY = Symbol()
function reactive(target) {
    return new Proxy(target, {
        get(target, key, receiver) {
            track(target, key)
            return Reflect.get(target, key, receiver)
        },
        set(target, key, value, receiver) {
            const oldVal = target[key]
            Reflect.set(target, key, value, receiver)
            const type = Object.prototype.hasOwnProperty.call(target, key) ? TriggerType.SET : TriggerType.ADD
            if (oldVal !== value && (oldVal === oldVal) && (value === value)) {
                trigger(target, key, type)
            }
        },
        has(target, key) {
            track(target, key)
            return Reflect.has(target, key)
        },
        ownKeys(target) {
            track(target, ITERATE_KEY)
            return Reflect.ownKeys(target)
        },
        deleteProperty(target, key) {
            const res = Reflect.deleteProperty(target, key)
            if (res) {
                trigger(target, key, TriggerType.DELETE)
            }
            return res
        }
    })
}

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

const TriggerType= {
    ADD: 'ADD',
    SET: 'SET',
    DELETE: 'DELETE'
}
function trigger(target, key, type) {
    const depsMap = bucket.get(target)
    if (!depsMap) return
    const deps = depsMap.get(key)
    const iterateDeps = depsMap.get(ITERATE_KEY)
    const depsToRun = new Set()
    deps && deps.forEach((fn) => {
        if (fn !== activeEffect) {
            depsToRun.add(fn)
        }
    })
    if (type === TriggerType.ADD || type === TriggerType.DELETE) {
        iterateDeps && iterateDeps.forEach(fn => {
            if (fn !== activeEffect) {
                depsToRun.add(fn)
            }
        })
    }
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


const proxy = reactive(target)
effect(() => {
    
    console.log('执行副作用函数', proxy.bar)
})

proxy.foo = 333