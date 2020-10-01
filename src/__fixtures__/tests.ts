import { Selector } from "..";

export const tests: [string, Selector[][], string][] = [
    // Tag names
    [
        "div",
        [
            [
                {
                    type: "tag",
                    name: "div",
                },
            ],
        ],
        "simple tag",
    ],
    [
        "*",
        [
            [
                {
                    type: "universal",
                },
            ],
        ],
        "universal",
    ],

    // Traversal
    [
        "div div",
        [
            [
                {
                    type: "tag",
                    name: "div",
                },
                {
                    type: "descendant",
                },
                {
                    type: "tag",
                    name: "div",
                },
            ],
        ],
        "descendant",
    ],
    [
        "div\t \n \tdiv",
        [
            [
                {
                    type: "tag",
                    name: "div",
                },
                {
                    type: "descendant",
                },
                {
                    type: "tag",
                    name: "div",
                },
            ],
        ],
        "descendant /w whitespace",
    ],
    [
        "div + div",
        [
            [
                {
                    type: "tag",
                    name: "div",
                },
                {
                    type: "adjacent",
                },
                {
                    type: "tag",
                    name: "div",
                },
            ],
        ],
        "adjacent",
    ],
    [
        "div ~ div",
        [
            [
                {
                    type: "tag",
                    name: "div",
                },
                {
                    type: "sibling",
                },
                {
                    type: "tag",
                    name: "div",
                },
            ],
        ],
        "sibling",
    ],
    [
        "p < div",
        [
            [
                {
                    type: "tag",
                    name: "p",
                },
                {
                    type: "parent",
                },
                {
                    type: "tag",
                    name: "div",
                },
            ],
        ],
        "parent",
    ],

    // Escaped whitespace
    [
        "#\\  > a ",
        [
            [
                {
                    type: "attribute",
                    action: "equals",
                    name: "id",
                    value: " ",
                    ignoreCase: false,
                },
                {
                    type: "child",
                },
                {
                    type: "tag",
                    name: "a",
                },
            ],
        ],
        "Space between escaped space and combinator",
    ],
    [
        ".\\  ",
        [
            [
                {
                    type: "attribute",
                    name: "class",
                    action: "element",
                    value: " ",
                    ignoreCase: false,
                },
            ],
        ],
        "Space after escaped space",
    ],
    [
        ".m™²³",
        [
            [
                {
                    type: "attribute",
                    name: "class",
                    action: "element",
                    value: "m™²³",
                    ignoreCase: false,
                },
            ],
        ],
        "Special charecters in selector",
    ],
    [
        "\\61 ",
        [
            [
                {
                    type: "tag",
                    name: "a",
                },
            ],
        ],
        "Numeric escape with space (BMP)",
    ],
    [
        "\\1d306\\01d306",
        [
            [
                {
                    type: "tag",
                    name: "\uD834\uDF06\uD834\uDF06",
                },
            ],
        ],
        "Numeric escape (outside BMP)",
    ],
    [
        "#\\26 B",
        [
            [
                {
                    type: "attribute",
                    action: "equals",
                    name: "id",
                    value: "&B",
                    ignoreCase: false,
                },
            ],
        ],
        "id selector with escape sequence",
    ],

    // Attributes
    [
        '[name^="foo["]',
        [
            [
                {
                    type: "attribute",
                    name: "name",
                    action: "start",
                    value: "foo[",
                    ignoreCase: false,
                },
            ],
        ],
        "quoted attribute",
    ],
    [
        '[name^="foo[bar]"]',
        [
            [
                {
                    type: "attribute",
                    name: "name",
                    action: "start",
                    value: "foo[bar]",
                    ignoreCase: false,
                },
            ],
        ],
        "quoted attribute",
    ],
    [
        '[name$="[bar]"]',
        [
            [
                {
                    type: "attribute",
                    name: "name",
                    action: "end",
                    value: "[bar]",
                    ignoreCase: false,
                },
            ],
        ],
        "quoted attribute",
    ],
    [
        '[href *= "google"]',
        [
            [
                {
                    type: "attribute",
                    name: "href",
                    action: "any",
                    value: "google",
                    ignoreCase: false,
                },
            ],
        ],
        "quoted attribute with spaces",
    ],
    [
        '[value="\nsome text\n"]',
        [
            [
                {
                    type: "attribute",
                    name: "value",
                    action: "equals",
                    value: "\nsome text\n",
                    ignoreCase: false,
                },
            ],
        ],
        "quoted attribute with internal newline",
    ],
    [
        "[name=foo\\.baz]",
        [
            [
                {
                    type: "attribute",
                    name: "name",
                    action: "equals",
                    value: "foo.baz",
                    ignoreCase: false,
                },
            ],
        ],
        "attribute with escaped dot",
    ],
    [
        "[name=foo\\[bar\\]]",
        [
            [
                {
                    type: "attribute",
                    name: "name",
                    action: "equals",
                    value: "foo[bar]",
                    ignoreCase: false,
                },
            ],
        ],
        "attribute with escaped square brackets",
    ],
    [
        "[xml\\:test]",
        [
            [
                {
                    type: "attribute",
                    name: "xml:test",
                    action: "exists",
                    value: "",
                    ignoreCase: false,
                },
            ],
        ],
        "escaped attribute",
    ],
    [
        "[name='foo ~ < > , bar' i]",
        [
            [
                {
                    type: "attribute",
                    name: "name",
                    action: "equals",
                    value: "foo ~ < > , bar",
                    ignoreCase: true,
                },
            ],
        ],
        "attribute with previously normalized characters",
    ],

    // ID starting with a dot
    [
        "#.identifier",
        [
            [
                {
                    type: "attribute",
                    action: "equals",
                    name: "id",
                    value: ".identifier",
                    ignoreCase: false,
                },
            ],
        ],
        "ID starting with a dot",
    ],

    // Pseudo selectors
    [
        ":foo",
        [
            [
                {
                    type: "pseudo",
                    name: "foo",
                    data: null,
                },
            ],
        ],
        "pseudo selector without any data",
    ],
    [
        ":bar(baz)",
        [
            [
                {
                    type: "pseudo",
                    name: "bar",
                    data: "baz",
                },
            ],
        ],
        "pseudo selector with data",
    ],
    [
        ':contains("(foo)")',
        [
            [
                {
                    type: "pseudo",
                    name: "contains",
                    data: "(foo)",
                },
            ],
        ],
        "pseudo selector with data",
    ],
    [
        ":icontains('')",
        [
            [
                {
                    type: "pseudo",
                    name: "icontains",
                    data: "",
                },
            ],
        ],
        "pseudo selector with quote-stripped data",
    ],
    [
        ':contains("(foo)")',
        [
            [
                {
                    type: "pseudo",
                    name: "contains",
                    data: "(foo)",
                },
            ],
        ],
        "pseudo selector with data",
    ],

    // Multiple selectors
    [
        "a , b",
        [
            [
                {
                    type: "tag",
                    name: "a",
                },
            ],
            [
                {
                    type: "tag",
                    name: "b",
                },
            ],
        ],
        "multiple selectors",
    ],

    [
        ":host(h1, p)",
        [
            [
                {
                    type: "pseudo",
                    name: "host",
                    data: [
                        [
                            {
                                type: "tag",
                                name: "h1",
                            },
                        ],
                        [
                            {
                                type: "tag",
                                name: "p",
                            },
                        ],
                    ],
                },
            ],
        ],
        "pseudo selector with data",
    ],

    /*
     * Bad attributes (taken from Sizzle)
     * https://github.com/jquery/sizzle/blob/af163873d7cdfc57f18b16c04b1915209533f0b1/test/unit/selector.js#L602-L651
     */
    [
        "[id=types_all]",
        [
            [
                {
                    type: "attribute",
                    action: "equals",
                    name: "id",
                    value: "types_all",
                    ignoreCase: false,
                },
            ],
        ],
        "Underscores don't need escaping",
    ],
    [
        "[name=foo\\ bar]",
        [
            [
                {
                    type: "attribute",
                    action: "equals",
                    name: "name",
                    value: "foo bar",
                    ignoreCase: false,
                },
            ],
        ],
        "Escaped space",
    ],
    [
        "[name=foo\\.baz]",
        [
            [
                {
                    type: "attribute",
                    action: "equals",
                    name: "name",
                    value: "foo.baz",
                    ignoreCase: false,
                },
            ],
        ],
        "Escaped dot",
    ],
    [
        "[name=foo\\[baz\\]]",
        [
            [
                {
                    type: "attribute",
                    action: "equals",
                    name: "name",
                    value: "foo[baz]",
                    ignoreCase: false,
                },
            ],
        ],
        "Escaped brackets",
    ],
    [
        "[data-attr='foo_baz\\']']",
        [
            [
                {
                    type: "attribute",
                    action: "equals",
                    name: "data-attr",
                    value: "foo_baz']",
                    ignoreCase: false,
                },
            ],
        ],
        "Escaped quote + right bracket",
    ],
    [
        "[data-attr='\\'']",
        [
            [
                {
                    type: "attribute",
                    action: "equals",
                    name: "data-attr",
                    value: "'",
                    ignoreCase: false,
                },
            ],
        ],
        "Quoted quote",
    ],
    [
        "[data-attr='\\\\']",
        [
            [
                {
                    type: "attribute",
                    action: "equals",
                    name: "data-attr",
                    value: "\\",
                    ignoreCase: false,
                },
            ],
        ],
        "Quoted backslash",
    ],
    [
        "[data-attr='\\\\\\'']",
        [
            [
                {
                    type: "attribute",
                    action: "equals",
                    name: "data-attr",
                    value: "\\'",
                    ignoreCase: false,
                },
            ],
        ],
        "Quoted backslash quote",
    ],
    [
        "[data-attr='\\\\\\\\']",
        [
            [
                {
                    type: "attribute",
                    action: "equals",
                    name: "data-attr",
                    value: "\\\\",
                    ignoreCase: false,
                },
            ],
        ],
        "Quoted backslash backslash",
    ],
    [
        "[data-attr='\\5C\\\\']",
        [
            [
                {
                    type: "attribute",
                    action: "equals",
                    name: "data-attr",
                    value: "\\\\",
                    ignoreCase: false,
                },
            ],
        ],
        "Quoted backslash backslash (numeric escape)",
    ],
    [
        "[data-attr='\\5C \\\\']",
        [
            [
                {
                    type: "attribute",
                    action: "equals",
                    name: "data-attr",
                    value: "\\\\",
                    ignoreCase: false,
                },
            ],
        ],
        "Quoted backslash backslash (numeric escape with trailing space)",
    ],
    [
        "[data-attr='\\5C\t\\\\']",
        [
            [
                {
                    type: "attribute",
                    action: "equals",
                    name: "data-attr",
                    value: "\\\\",
                    ignoreCase: false,
                },
            ],
        ],
        "Quoted backslash backslash (numeric escape with trailing tab)",
    ],
    [
        "[data-attr='\\04e00']",
        [
            [
                {
                    type: "attribute",
                    action: "equals",
                    name: "data-attr",
                    value: "\u4e00",
                    ignoreCase: false,
                },
            ],
        ],
        "Long numeric escape (BMP)",
    ],
    [
        "[data-attr='\\01D306A']",
        [
            [
                {
                    type: "attribute",
                    action: "equals",
                    name: "data-attr",
                    value: "\uD834\uDF06A",
                    ignoreCase: false,
                },
            ],
        ],
        "Long numeric escape (non-BMP)",
    ],
];
