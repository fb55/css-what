# css-what

[![Node.js CI](https://github.com/fb55/css-what/actions/workflows/nodejs-test.yml/badge.svg)](https://github.com/fb55/css-what/actions/workflows/nodejs-test.yml)
[![Coverage](https://img.shields.io/coveralls/github/fb55/css-what/master)](https://coveralls.io/github/fb55/css-what?branch=master)

A CSS selector parser.

## Example

```js
import * as CSSwhat from "css-what";

CSSwhat.parse("foo[bar]:baz")

~> [
    [
        { type: "tag", name: "foo" },
        {
            type: "attribute",
            name: "bar",
            action: "exists",
            value: "",
            ignoreCase: null
        },
        { type: "pseudo", name: "baz", data: null }
    ]
]
```

## API

**`CSSwhat.parse(selector, options?)` - Parses `selector`.**

The function returns a two-dimensional array. The first array represents selectors separated by commas (eg. `sub1, sub2`), the second contains the relevant tokens for that selector. Possible token types are:

| name                | properties                              | example       | output                                                                                   |
| ------------------- | --------------------------------------- | ------------- | ---------------------------------------------------------------------------------------- |
| `tag`               | `name`                                  | `div`         | `{ type: 'tag', name: 'div' }`                                                           |
| `universal`         | -                                       | `*`           | `{ type: 'universal' }`                                                                  |
| `pseudo`            | `name`, `data`                          | `:name(data)` | `{ type: 'pseudo', name: 'name', data: 'data' }`                                         |
| `pseudo`            | `name`, `data`                          | `:name`       | `{ type: 'pseudo', name: 'name', data: null }`                                           |
| `pseudo-element`    | `name`                                  | `::name`      | `{ type: 'pseudo-element', name: 'name' }`                                               |
| `attribute`         | `name`, `action`, `value`, `ignoreCase` | `[attr]`      | `{ type: 'attribute', name: 'attr', action: 'exists', value: '', ignoreCase: false }`    |
| `attribute`         | `name`, `action`, `value`, `ignoreCase` | `[attr=val]`  | `{ type: 'attribute', name: 'attr', action: 'equals', value: 'val', ignoreCase: false }` |
| `attribute`         | `name`, `action`, `value`, `ignoreCase` | `[attr^=val]` | `{ type: 'attribute', name: 'attr', action: 'start', value: 'val', ignoreCase: false }`  |
| `attribute`         | `name`, `action`, `value`, `ignoreCase` | `[attr$=val]` | `{ type: 'attribute', name: 'attr', action: 'end', value: 'val', ignoreCase: false }`    |
| `child`             | -                                       | `>`           | `{ type: 'child' }`                                                                      |
| `parent`            | -                                       | `<`           | `{ type: 'parent' }`                                                                     |
| `sibling`           | -                                       | `~`           | `{ type: 'sibling' }`                                                                    |
| `adjacent`          | -                                       | `+`           | `{ type: 'adjacent' }`                                                                   |
| `descendant`        | -                                       |               | `{ type: 'descendant' }`                                                                 |
| `column-combinator` | -                                       | `\|\|`        | `{ type: 'column-combinator' }`                                                          |

Set `options.forgiving` to `true` to enable forgiving selector lists in `:is()` and `:where()`. Branches that cannot be parsed are discarded, and an empty list has `data: []`. Other selector lists remain strict. The option is disabled by default; TypeScript users can import the `ParseOptions` type.

```js
CSSwhat.parse(":is(ol, ul, ??$#$@#)", { forgiving: true });
// Equivalent to CSSwhat.parse(":is(ol, ul)").

CSSwhat.parse(":where(??)", { forgiving: true });
// [[{ type: "pseudo", name: "where", data: [] }]]
```

Within forgiving lists, functions, attribute blocks, and strings can end at EOF. For example, `:is(ol, ??` keeps `ol`, and `:is(ol, [x` keeps both `ol` and `[x]`. Enclosing functions also finish when a nested forgiving list consumes EOF; their selector lists still require valid branches. The option does not relax syntax in selectors that contain no forgiving list.

Unknown pseudo-classes are preserved in the AST. Support for them depends on the selector engine using the parsed result.

**`CSSwhat.stringify(selector)` - Turns `selector` back into a string.**

---

License: BSD-2-Clause

## Security contact information

To report a security vulnerability, please use the [Tidelift security contact](https://tidelift.com/security).
Tidelift will coordinate the fix and disclosure.
