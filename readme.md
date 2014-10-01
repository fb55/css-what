#CSSwhat [![Build Status](https://secure.travis-ci.org/fb55/CSSwhat.png?branch=master)](http://travis-ci.org/fb55/CSSwhat)

a CSS selector parser

##Example

```js
require('CSSwhat')('foo[bar]:baz')

~> [ [ { type: 'tag', name: 'foo' },
    { type: 'attribute',
      name: 'bar',
      action: 'exists',
      value: '',
      ignoreCase: false },
    { type: 'pseudo',
      name: 'baz',
      data: null } ] ]
```

##API

__`CSSwhat(selector, options)` - Parses `selector` string, with the passed `options`.__

The function returns an array of tokenized selector arrays, one for each comma-separated subselector (eg. `sub1, sub2`).
The tokenized selector array contains the relevant token objects for that selector. Possible token types are:

name | attributes | example | output
---- | ---------- | ------- | ------
`tag`| `name`    | `div`   | `{ type: 'tag', name: 'div' }`
`universal`| -   | `*`     | `{ type: 'universal' }`
`pseudo`| `name`, `data`|`:name(data)`| `{ type: 'pseudo', name: 'name', data: 'data' }`
`pseudo`| `name`, `data`|`:name`| `{ type: 'pseudo', name: 'name', data: null }`
`attribute`|`name`, `action`, `value`, `ignoreCase`|`[attr]`|`{ type: 'attribute', name: 'attr', action: 'exists', value: '', ignoreCase: false }`
`attribute`|`name`, `action`, `value`, `ignoreCase`|`[attr=val]`|`{ type: 'attribute', name: 'attr', action: 'equals', value: 'val', ignoreCase: false }`
`attribute`|`name`, `action`, `value`, `ignoreCase`|`[attr^=val]`|`{ type: 'attribute', name: 'attr', action: 'start', value: 'val', ignoreCase: false }`
`attribute`|`name`, `action`, `value`, `ignoreCase`|`[attr$=val]`|`{ type: 'attribute', name: 'attr', action: 'end', value: 'val', ignoreCase: false }`

//TODO complete list

__Options:__

- `xmlMode`: When enabled, tagnames will be case-sensitive (ie. the output won't be lowercased).

- `selectors` : This is an **output** placeholder.  When `options` is given, `options.selectors` receives an array of normalized selector strings, one for each subselector. 

```javascript
 var opt = {};
 CSSwhat(' #main [ src ]  ,  div.thumbs ', opt);
 /* 
    [ [
        { type: 'attribute', name: 'id', action: 'equals', value: 'main', ignoreCase: false },
        { type: 'descendant' }, { type: 'attribute', name: 'src', action: 'exists', value: '', ignoreCase: false } 
      ], [ 
        { type: 'tag', name: 'div' },
        { type: 'attribute', name: 'class', action: 'element', value: 'thumbs', ignoreCase: false } 
      ] 
    ] 
 */
     
 console.log(opt.selectors)
 /* 
    [ 
      '#main [ src ]', 
      'div.thumbs' 
    ]
  */
```

Note that returned selector strings are normalized (trimmed left & right with extra spacing in between removed).  Spaces within attribute `[ ]` selector is left intact.


---

License: BSD-like
