function createRenderer(options) {
    const { createElement, insert, setElementText } = options
    function mountElement(vnode, container) {
        const el = createElement(vnode.type)
        if (vnode.props) {
            for (const prop in vnode.props) {
                el.setAttribute(prop, vnode.props[prop])
            }
        }
        if (typeof vnode.children === 'string') {
            setElementText(el, vnode.children)
        } else if (Array.isArray(vnode.children)) {
            vnode.children.forEach(c => {
                patch(null, c, el)
            })
        }
        insert(el, container)
    }

    function patch(oldVnode, newVnode, container) {
        // oldVnode不存在，挂载
        if (!oldVnode) {
            mountElement(newVnode, container)
        } else {
            // oldVnode存在，则patch
        }
    }
    function render(vnode, container) {
        if (vnode) {
            // 新的vnode存在，新旧vnode都传给patch函数，进行打补丁
            patch(container._vnode, vnode, container)
        } else {
            if (container._vnode) {
                container.innerHTML = ''
            }
        }
        // 将新的vnode存到container._vnode下，当作后续渲染的旧vNode
        container._vnode = vnode
    }
    return {
        render
    }
}

const renderer = createRenderer({
    createElement(tag) {
        return document.createElement(tag)
    },
    setElementText(el, text) {
        el.textContent = text
    },
    insert(el, parent, anchor = null) {
        parent.children = el
    }
})
const vnode = {
    type: 'h1',
    props: {
        id: 'foo'
    },
    children: 'hello'
}
// 第一次渲染
renderer.render(vnode, document.querySelector('#app'))
// 第二次渲染
// renderer.render(vnode, document.querySelector('#app'))

