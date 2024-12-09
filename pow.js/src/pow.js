// TODO: click binding, functions
export default (function () {
    function findChildTemplates(element) {
        element.removeAttribute('pow')
        const dom = element.content ?? element
        return Array.from(dom.querySelectorAll('*[pow]:not([pow] [pow])'))
    }

    function resolvePath(state, path) {
        const parts = path?.split('.') ?? []
        for (var i = 0; i < parts.length; ++i) {
            const part = parts[i]
            if (['*first', '*index', '*last', '*parent', '*path'].includes(part)) {
                state = { data: state[part.substring(1)] }
            } else if (part == '*index1') {
                state = { data: state.index != null ? state.index + 1 : undefined }
            } else if (part == '*true' || part == '*false') {
                state = { data: part == '*true' }
            } else if (part && state.data?.hasOwnProperty(part)) {
                state = { data: state.data[part] }
            } else if (part == 'length' && !Array.isArray(state.data)) {
                state = { data: Object.keys(state.data).length }
            } else if (part != '*data') {
                return undefined
            }
        }
        return path ? state.data : undefined
    }

    function updateSiblingCondition(sibling, value) {
        if (sibling?.hasAttribute('pow') && ['else-if', 'else-ifnot', 'else'].some($ => sibling.hasAttribute($))) {
            if (value) {
                sibling.remove()
                return true
            }
            sibling.setAttribute('if', sibling.getAttribute('else-if') || '*true')
            sibling.setAttribute('ifnot', sibling.getAttribute('else-ifnot') || '*true')
            sibling.removeAttribute('else-if')
            sibling.removeAttribute('else-ifnot')
            sibling.removeAttribute('else')
        }
    }

    function processElement(element, state, array = false) {
        if (element.hasAttribute('if') || element.hasAttribute('ifnot')) {
            const condition = element.getAttribute('if') || element.getAttribute('ifnot')
            console.debug('if', state.path, condition)
            const value = element.hasAttribute('if') ? !!resolvePath(state, condition) : !resolvePath(state, condition)
            while (updateSiblingCondition(element.nextElementSibling, value));
            if (!value) {
                element.remove()
                return
            }
        } else if (!array) {
            const path = element.getAttribute('bind')
            console.debug('bind', state.path, path)
            state = {
                path: state.path + '>' + (path || element.id || ''),
                data: path ? resolvePath(state, path) : state.data,
                parent: path ? state : state.parent
            }
            if (path && state.data === undefined) {
                console.warn('Template binding without data', state.path)
                return
            }
        }

        if (state.index == null && element.hasAttribute('array') && typeof state.data == 'object') {
            const array = state.data instanceof Array
                ? state.data
                : Object.entries(state.data).map(([k, v]) => ({ $key: k, $value: v }))
            const html = element.innerHTML
            for (var index = 0; index < array.length; ++index) {
                element.innerHTML = html
                processElement(element, {
                    path: state.path + '[' + index + ']',
                    index, first: index == 0, last: index == array.length - 1,
                    data: array[index],
                    parent: state
                }, true)
            }
            return
        }

        const innerTemplates = findChildTemplates(element)
        for (const childTemplate of innerTemplates) {
            if (childTemplate.parentNode) {
                processElement(childTemplate, state)
            }
        }

        const html = replacePlaceholders(element.innerHTML, state)
        const range = document.createRange()
        const target = (element instanceof HTMLTemplateElement ? element : element.childNodes[0]) ?? element
        if (!target.parentNode) { console.warn('Bad parent', target); return }
        range.setStartBefore(target)
        range.insertNode(range.createContextualFragment(html))
        while (target.nextSibling) {
            target.nextSibling.remove()
        }
        target.remove()
        return range
    }

    const _regex = /\{\{\s*((?:\*)?[\$\w]+(?:\.(?:\*)?[\$\w]+)*)\s*\}\}/g
    function replacePlaceholders(html, state) {
        var match
        while (match = _regex.exec(html)) {
            const value = resolvePath(state, match[1])
            if (value === undefined) {
                console.warn('Placeholder not resolved', state.path, match[1])
            } else {
                _regex.lastIndex = match.index + value?.length
            }
            html = html.substring(0, match.index) + (value || '') + html.substring(match.index + match[0].length)
        }
        return html
    }

    function bind(element) {
        var range
        const binding = {
            remove: () => range?.deleteContents
        }
        binding.apply = (data) => {
            range?.surroundContents(element)
            range = processElement(element, { path: '', data })
            return binding
        }
        return binding
    }
    return {
        apply(element, data) {
            return bind(element).apply(data)
        },
        bind
    }
})()