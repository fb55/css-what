import { Selector, SelectorType, AttributeAction, IgnoreCaseMode } from "..";

export const tests: [
    selector: string,
    expected: Selector[][],
    message: string
][] = [
    // Tag names
    [
        "div",
        [
            [
                {
                    type: SelectorType.Tag,
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
                    type: SelectorType.Universal,
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
                    type: SelectorType.Tag,
                    namespace: null,
                    name: "div",
                },
                {
                    type: SelectorType.Descendant,
                },
                {
                    type: SelectorType.Tag,
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
                    type: SelectorType.Tag,
                    namespace: null,
                    name: "div",
                },
                {
                    type: SelectorType.Descendant,
                },
                {
                    type: SelectorType.Tag,
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
                    type: SelectorType.Tag,
                    namespace: null,
                    name: "div",
                },
                {
                    type: SelectorType.Adjacent,
                },
                {
                    type: SelectorType.Tag,
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
                    type: SelectorType.Tag,
                    namespace: null,
                    name: "div",
                },
                {
                    type: SelectorType.Sibling,
                },
                {
                    type: SelectorType.Tag,
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
                    type: SelectorType.Tag,
                    namespace: null,
                    name: "p",
                },
                {
                    type: SelectorType.Parent,
                },
                {
                    type: SelectorType.Tag,
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
                    type: SelectorType.Attribute,
                    namespace: null,
                    action: AttributeAction.Equals,
                    name: "id",
                    ignoreCase: IgnoreCaseMode.QuirksMode,
                    value: " ",
                },
                {
                    type: SelectorType.Child,
                },
                {
                    type: SelectorType.Tag,
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
                    type: SelectorType.Attribute,
                    namespace: null,
                    name: "class",
                    action: AttributeAction.Element,
                    ignoreCase: IgnoreCaseMode.QuirksMode,
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
                    type: SelectorType.Attribute,
                    namespace: null,
                    name: "class",
                    action: AttributeAction.Element,
                    ignoreCase: IgnoreCaseMode.QuirksMode,
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
                    type: SelectorType.Tag,
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
                    type: SelectorType.Tag,
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
                    type: SelectorType.Attribute,
                    namespace: null,
                    action: AttributeAction.Equals,
                    name: "id",
                    ignoreCase: IgnoreCaseMode.QuirksMode,
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
                    type: SelectorType.Attribute,
                    namespace: null,
                    name: "name",
                    ignoreCase: IgnoreCaseMode.Unknown,
                    action: AttributeAction.Start,
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
                    type: SelectorType.Attribute,
                    namespace: null,
                    name: "name",
                    ignoreCase: IgnoreCaseMode.Unknown,
                    action: AttributeAction.Start,
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
                    type: SelectorType.Attribute,
                    namespace: null,
                    name: "name",
                    ignoreCase: IgnoreCaseMode.Unknown,
                    action: AttributeAction.End,
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
                    type: SelectorType.Attribute,
                    namespace: null,
                    name: "href",
                    ignoreCase: IgnoreCaseMode.Unknown,
                    action: AttributeAction.Any,
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
                    type: SelectorType.Attribute,
                    namespace: null,
                    name: "value",
                    ignoreCase: IgnoreCaseMode.Unknown,
                    action: AttributeAction.Equals,
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
                    type: SelectorType.Attribute,
                    namespace: null,
                    name: "name",
                    ignoreCase: IgnoreCaseMode.Unknown,
                    action: AttributeAction.Equals,
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
                    type: SelectorType.Attribute,
                    namespace: null,
                    name: "name",
                    ignoreCase: IgnoreCaseMode.Unknown,
                    action: AttributeAction.Equals,
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
                    type: SelectorType.Attribute,
                    namespace: null,
                    name: "xml:test",
                    action: AttributeAction.Exists,
                    value: "",
                    ignoreCase: IgnoreCaseMode.Unknown,
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
                    type: SelectorType.Attribute,
                    namespace: null,
                    name: "name",
                    action: AttributeAction.Equals,
                    value: "foo ~ < > , bar",
                    ignoreCase: IgnoreCaseMode.IgnoreCase,
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
                    type: SelectorType.Attribute,
                    namespace: null,
                    action: AttributeAction.Equals,
                    name: "id",
                    ignoreCase: IgnoreCaseMode.QuirksMode,
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
                    type: SelectorType.PseudoElement,
                    name: "foo",
                    data: null,
                },
            ],
        ],
        "pseudo-element",
    ],
    [
        "::foo()",
        [
            [
                {
                    type: SelectorType.PseudoElement,
                    name: "foo",
                    data: "",
                },
            ],
        ],
        "pseudo-element",
    ],
    [
        "::foo(bar())",
        [
            [
                {
                    type: SelectorType.PseudoElement,
                    name: "foo",
                    data: "bar()",
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
                    type: SelectorType.Pseudo,
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
                    type: SelectorType.Pseudo,
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
                    type: SelectorType.Pseudo,
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
                    type: SelectorType.Pseudo,
                    name: "where",
                    data: [
                        [
                            {
                                type: SelectorType.Tag,
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
                    type: SelectorType.Pseudo,
                    name: "contains",
                    data: "(a((foo))))",
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
                    type: SelectorType.Pseudo,
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
                    type: SelectorType.Pseudo,
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
                    type: SelectorType.Tag,
                    namespace: null,
                    name: "a",
                },
            ],
            [
                {
                    type: SelectorType.Tag,
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
                    type: SelectorType.Pseudo,
                    name: "host",
                    data: [
                        [
                            {
                                type: SelectorType.Tag,
                                namespace: null,
                                name: "h1",
                            },
                        ],
                        [
                            {
                                type: SelectorType.Tag,
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
                    type: SelectorType.Attribute,
                    namespace: null,
                    action: AttributeAction.Equals,
                    name: "id",
                    ignoreCase: IgnoreCaseMode.Unknown,
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
                    type: SelectorType.Attribute,
                    namespace: null,
                    action: AttributeAction.Equals,
                    name: "name",
                    value: "foo bar",
                    ignoreCase: IgnoreCaseMode.Unknown,
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
                    type: SelectorType.Attribute,
                    namespace: null,
                    action: AttributeAction.Equals,
                    name: "name",
                    value: "foo.baz",
                    ignoreCase: IgnoreCaseMode.Unknown,
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
                    type: SelectorType.Attribute,
                    namespace: null,
                    action: AttributeAction.Equals,
                    name: "name",
                    value: "foo[baz]",
                    ignoreCase: IgnoreCaseMode.Unknown,
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
                    type: SelectorType.Attribute,
                    namespace: null,
                    action: AttributeAction.Equals,
                    name: "data-attr",
                    value: "foo_baz']",
                    ignoreCase: IgnoreCaseMode.Unknown,
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
                    type: SelectorType.Attribute,
                    namespace: null,
                    action: AttributeAction.Equals,
                    name: "data-attr",
                    value: "'",
                    ignoreCase: IgnoreCaseMode.Unknown,
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
                    type: SelectorType.Attribute,
                    namespace: null,
                    action: AttributeAction.Equals,
                    name: "data-attr",
                    value: "\\",
                    ignoreCase: IgnoreCaseMode.Unknown,
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
                    type: SelectorType.Attribute,
                    namespace: null,
                    action: AttributeAction.Equals,
                    name: "data-attr",
                    value: "\\'",
                    ignoreCase: IgnoreCaseMode.Unknown,
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
                    type: SelectorType.Attribute,
                    namespace: null,
                    action: AttributeAction.Equals,
                    name: "data-attr",
                    value: "\\\\",
                    ignoreCase: IgnoreCaseMode.Unknown,
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
                    type: SelectorType.Attribute,
                    namespace: null,
                    action: AttributeAction.Equals,
                    name: "data-attr",
                    value: "\\\\",
                    ignoreCase: IgnoreCaseMode.Unknown,
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
                    type: SelectorType.Attribute,
                    namespace: null,
                    action: AttributeAction.Equals,
                    name: "data-attr",
                    value: "\\\\",
                    ignoreCase: IgnoreCaseMode.Unknown,
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
                    type: SelectorType.Attribute,
                    namespace: null,
                    action: AttributeAction.Equals,
                    name: "data-attr",
                    value: "\\\\",
                    ignoreCase: IgnoreCaseMode.Unknown,
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
                    type: SelectorType.Attribute,
                    namespace: null,
                    action: AttributeAction.Equals,
                    name: "data-attr",
                    value: "\u4e00",
                    ignoreCase: IgnoreCaseMode.Unknown,
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
                    type: SelectorType.Attribute,
                    namespace: null,
                    action: AttributeAction.Equals,
                    name: "data-attr",
                    value: "\uD834\uDF06A",
                    ignoreCase: IgnoreCaseMode.Unknown,
                },
            ],
        ],
        "Long numeric escape (non-BMP)",
    ],
    [
        "fOo[baR]",
        [
            [
                {
                    name: "fOo",
                    type: SelectorType.Tag,
                    namespace: null,
                },
                {
                    action: AttributeAction.Exists,
                    name: "baR",
                    type: SelectorType.Attribute,
                    namespace: null,
                    value: "",
                    ignoreCase: IgnoreCaseMode.Unknown,
                },
            ],
        ],
        "Mixed case tag and attribute name",
    ],

    // Namespaces
    [
        "foo|bar",
        [
            [
                {
                    name: "bar",
                    type: SelectorType.Tag,
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
                    type: SelectorType.Tag,
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
                    type: SelectorType.Tag,
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
                    type: SelectorType.Universal,
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
                    action: AttributeAction.Exists,
                    name: "bar",
                    type: SelectorType.Attribute,
                    namespace: "foo",
                    value: "",
                    ignoreCase: IgnoreCaseMode.Unknown,
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
                    action: AttributeAction.Exists,
                    name: "bar",
                    type: SelectorType.Attribute,
                    namespace: null,
                    value: "",
                    ignoreCase: IgnoreCaseMode.Unknown,
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
                    action: AttributeAction.Equals,
                    ignoreCase: IgnoreCaseMode.IgnoreCase,
                    name: "bar",
                    type: SelectorType.Attribute,
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
                    action: AttributeAction.Equals,
                    ignoreCase: IgnoreCaseMode.IgnoreCase,
                    name: "bar",
                    type: SelectorType.Attribute,
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
                    action: AttributeAction.Equals,
                    ignoreCase: IgnoreCaseMode.CaseSensitive,
                    name: "type",
                    type: SelectorType.Attribute,
                    value: "a",
                    namespace: null,
                },
            ],
        ],
        "case-sensitive attribute selector",
    ],
    [
        "foo || bar",
        [
            [
                {
                    name: "foo",
                    namespace: null,
                    type: SelectorType.Tag,
                },
                {
                    type: SelectorType.ColumnCombinator,
                },
                {
                    name: "bar",
                    namespace: null,
                    type: SelectorType.Tag,
                },
            ],
        ],
        "column combinator",
    ],
    [
        "foo||bar",
        [
            [
                {
                    name: "foo",
                    namespace: null,
                    type: SelectorType.Tag,
                },
                {
                    type: SelectorType.ColumnCombinator,
                },
                {
                    name: "bar",
                    namespace: null,
                    type: SelectorType.Tag,
                },
            ],
        ],
        "column combinator without whitespace",
    ],
];
