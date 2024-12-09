const data = {
    "url": "https://github.com/IFYates/pow.js",
    "title": "pow.js",
    "description": "An extremely small and lightweight templating framework.",
    "tags": [ "javascript", "templating", "framework" ],
    "creation": {
        "author": "IFYates",
        "date": "2024-12-09"
    }
}

import pow from '../../src/pow.js'
pow.apply(document.body, data)