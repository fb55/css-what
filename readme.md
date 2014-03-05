#CSSwhat [![Build Status](https://secure.travis-ci.org/fb55/CSSwhat.png?branch=master)](http://travis-ci.org/fb55/CSSwhat)

a CSS selector parser

##Example

```js
require("CSSwhat")("foo[bar]:baz")

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

__`CSSwhat(selector, options)` - Parses `str`, with the past `options`.__

The function returns a two-dimensional array. The first array represents subselects separated by commas (eg. `sub1, sub2`), the second contains the relevant tokens for that selector. Possible token types are:

name | attributes | example | output
---- | ---------- | ------- | ------
`tag`| `name`    | `div`   | `{ type: 'tag', name: 'div' }`
`universal`| -   | `*`     | `{ type: 'universal' }`

//TODO complete list

__Options:__

- `xmlMode`: When enabled, tagnames will be case-sensitive (ie. the output won't be lowercased).

---

License: BSD-like
