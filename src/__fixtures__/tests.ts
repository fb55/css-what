import { Selector, Options } from "..";

export const tests: [
    selector: string,
    expected: Selector[][],
    message: string,
    options?: Options
][] = [
    // Tag names
    [
        "div",
        [
            [
                {
                    type: "tag",
                    namespace: null,
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
                    namespace: null,
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
                    namespace: null,
                    name: "div",
                },
                {
                    type: "descendant",
                },
                {
                    type: "tag",
                    namespace: null,
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
                    namespace: null,
                    name: "div",
                },
                {
                    type: "descendant",
                },
                {
                    type: "tag",
                    namespace: null,
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
                    namespace: null,
                    name: "div",
                },
                {
                    type: "adjacent",
                },
                {
                    type: "tag",
                    namespace: null,
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
                    namespace: null,
                    name: "div",
                },
                {
                    type: "sibling",
                },
                {
                    type: "tag",
                    namespace: null,
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
                    namespace: null,
                    name: "p",
                },
                {
                    type: "parent",
                },
                {
                    type: "tag",
                    namespace: null,
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
                    namespace: null,
                    action: "equals",
                    name: "id",
                    ignoreCase: false,
                    value: " ",
                },
                {
                    type: "child",
                },
                {
                    type: "tag",
                    namespace: null,
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
                    namespace: null,
                    name: "class",
                    action: "element",
                    ignoreCase: false,
                    value: " ",
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
                    namespace: null,
                    name: "class",
                    action: "element",
                    ignoreCase: false,
                    value: "m™²³",
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
                    namespace: null,
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
                    namespace: null,
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
                    namespace: null,
                    action: "equals",
                    name: "id",
                    ignoreCase: false,
                    value: "&B",
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
                    namespace: null,
                    name: "name",
                    ignoreCase: false,
                    action: "start",
                    value: "foo[",
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
                    namespace: null,
                    name: "name",
                    ignoreCase: false,
                    action: "start",
                    value: "foo[bar]",
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
                    namespace: null,
                    name: "name",
                    ignoreCase: false,
                    action: "end",
                    value: "[bar]",
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
                    namespace: null,
                    name: "href",
                    ignoreCase: false,
                    action: "any",
                    value: "google",
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
                    namespace: null,
                    name: "value",
                    ignoreCase: false,
                    action: "equals",
                    value: "\nsome text\n",
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
                    namespace: null,
                    name: "name",
                    ignoreCase: false,
                    action: "equals",
                    value: "foo.baz",
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
                    namespace: null,
                    name: "name",
                    ignoreCase: false,
                    action: "equals",
                    value: "foo[bar]",
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
                    namespace: null,
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
                    namespace: null,
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
                    namespace: null,
                    action: "equals",
                    name: "id",
                    ignoreCase: false,
                    value: ".identifier",
                },
            ],
        ],
        "ID starting with a dot",
    ],

    // Pseudo elements
    [
        "::foo",
        [
            [
                {
                    type: "pseudo-element",
                    name: "foo",
                },
            ],
        ],
        "pseudo-element",
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
        ":where(a)",
        [
            [
                {
                    type: "pseudo",
                    name: "where",
                    data: [
                        [
                            {
                                type: "tag",
                                namespace: null,
                                name: "a",
                            },
                        ],
                    ],
                },
            ],
        ],
        "pseudo selector with data",
    ],
    [
        ':contains("(a((foo\\\\\\))))")',
        [
            [
                {
                    type: "pseudo",
                    name: "contains",
                    data: "(a((foo\\))))",
                },
            ],
        ],
        "pseudo selector with escaped data",
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
                    namespace: null,
                    name: "a",
                },
            ],
            [
                {
                    type: "tag",
                    namespace: null,
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
                                namespace: null,
                                name: "h1",
                            },
                        ],
                        [
                            {
                                type: "tag",
                                namespace: null,
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
                    namespace: null,
                    action: "equals",
                    name: "id",
                    ignoreCase: false,
                    value: "types_all",
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
                    namespace: null,
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
                    namespace: null,
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
                    namespace: null,
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
                    namespace: null,
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
                    namespace: null,
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
                    namespace: null,
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
                    namespace: null,
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
                    namespace: null,
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
                    namespace: null,
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
                    namespace: null,
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
                    namespace: null,
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
                    namespace: null,
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
                    namespace: null,
                    action: "equals",
                    name: "data-attr",
                    value: "\uD834\uDF06A",
                    ignoreCase: false,
                },
            ],
        ],
        "Long numeric escape (non-BMP)",
    ],

    // Options
    [
        "fOo[baR]",
        [
            [
                {
                    name: "fOo",
                    type: "tag",
                    namespace: null,
                },
                {
                    action: "exists",
                    name: "baR",
                    type: "attribute",
                    namespace: null,
                    value: "",
                    ignoreCase: null,
                },
            ],
        ],
        "XML mode",
        { xmlMode: true },
    ],
    [
        "#myID",
        [
            [
                {
                    action: "equals",
                    name: "id",
                    type: "attribute",
                    namespace: null,
                    value: "myID",
                    ignoreCase: null,
                },
            ],
        ],
        "IDs in XML mode",
        { xmlMode: true },
    ],
    [
        "fOo[baR]",
        [
            [
                {
                    name: "foo",
                    type: "tag",
                    namespace: null,
                },
                {
                    action: "exists",
                    name: "baR",
                    type: "attribute",
                    namespace: null,
                    value: "",
                    ignoreCase: false,
                },
            ],
        ],
        "`lowerCaseAttributeNames` option",
        { lowerCaseAttributeNames: false },
    ],
    [
        "fOo[baR]",
        [
            [
                {
                    name: "fOo",
                    type: "tag",
                    namespace: null,
                },
                {
                    action: "exists",
                    name: "bar",
                    type: "attribute",
                    namespace: null,
                    value: "",
                    ignoreCase: false,
                },
            ],
        ],
        "`lowerCaseTags` option",
        { lowerCaseTags: false },
    ],

    // Namespaces
    [
        "foo|bar",
        [
            [
                {
                    name: "bar",
                    type: "tag",
                    namespace: "foo",
                },
            ],
        ],
        "basic tag namespace",
    ],
    [
        "*|bar",
        [
            [
                {
                    name: "bar",
                    type: "tag",
                    namespace: "*",
                },
            ],
        ],
        "star tag namespace",
    ],
    [
        "|bar",
        [
            [
                {
                    name: "bar",
                    type: "tag",
                    namespace: "",
                },
            ],
        ],
        "without namespace",
    ],
    [
        "*|*",
        [
            [
                {
                    type: "universal",
                    namespace: "*",
                },
            ],
        ],
        "universal with namespace",
    ],
    [
        "[foo|bar]",
        [
            [
                {
                    action: "exists",
                    name: "bar",
                    type: "attribute",
                    namespace: "foo",
                    value: "",
                    ignoreCase: false,
                },
            ],
        ],
        "basic attribute namespace, existential",
    ],
    [
        "[|bar]",
        [
            [
                {
                    action: "exists",
                    name: "bar",
                    type: "attribute",
                    namespace: "",
                    value: "",
                    ignoreCase: false,
                },
            ],
        ],
        "without namespace, existential",
    ],
    [
        "[foo|bar='baz' i]",
        [
            [
                {
                    action: "equals",
                    ignoreCase: true,
                    name: "bar",
                    type: "attribute",
                    namespace: "foo",
                    value: "baz",
                },
            ],
        ],
        "basic attribute namespace, equality",
    ],
    [
        "[*|bar='baz' i]",
        [
            [
                {
                    action: "equals",
                    ignoreCase: true,
                    name: "bar",
                    type: "attribute",
                    namespace: "*",
                    value: "baz",
                },
            ],
        ],
        "star attribute namespace",
    ],
    [
        "[type='a' S]",
        [
            [
                {
                    action: "equals",
                    ignoreCase: false,
                    name: "type",
                    type: "attribute",
                    value: "a",
                    namespace: null,
                },
            ],
        ],
        "case-sensitive attribute selector",
    ],
];
