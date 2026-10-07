import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { tests } from "./__fixtures__/tests.js";
import { parse } from "./parse.js";

const broken = [
    "[",
    "(",
    "{",
    "()",
    "<>",
    "{}",
    ",",
    ",a",
    "a,",
    "[id=012345678901234567890123456789",
    "input[name=foo b]",
    "input[name!foo]",
    "input[name|]",
    "input[name=']",
    "input[name=foo[baz]]",
    ':has("p")',
    ":has(p",
    ":foo(p()",
    "#",
    "##foo",
    "/*",
];

describe("Parse", () => {
    it.each(tests)("%s", (selector, expected) => {
        expect(parse(selector)).toStrictEqual(expected);
    });

    describe("Forgiving selector lists", () => {
        it.each([
            [
                "bare LF",
                "is",
                "contains",
                ':is(ol,:contains("bad\n),ul).tail',
                '"bad\n',
                null,
            ],
            [
                "bare CR",
                "where",
                "icontains",
                ":where(ol,:icontains('bad\r),ul).tail",
                "'bad\r",
                null,
            ],
            [
                "bare FF",
                "is",
                "contains",
                ':is(ol,:contains("bad\f),ul).tail',
                '"bad\f',
                null,
            ],
            [
                "escaped LF",
                "is",
                "contains",
                `:is(ol,:contains("bad${String.fromCharCode(92)}\n"),ul).tail`,
                "bad\n",
                "bad\n",
            ],
            [
                "hex escape followed by LF",
                "where",
                "icontains",
                `:where(ol,:icontains('${String.fromCharCode(92)}61\n'),ul).tail`,
                "a",
                "a",
            ],
        ])(
            "should handle known quoted newline %s",
            (_, listName, name, selector, strictData, forgivingData) => {
                const expected = (data: string | null) => [
                    [
                        {
                            type: "pseudo",
                            name: listName,
                            data: [
                                [{ type: "tag", name: "ol", namespace: null }],
                                ...(data === null
                                    ? []
                                    : [[{ type: "pseudo", name, data }]]),
                                [{ type: "tag", name: "ul", namespace: null }],
                            ],
                        },
                        {
                            type: "attribute",
                            name: "class",
                            action: "element",
                            value: "tail",
                            namespace: null,
                            ignoreCase: "quirks",
                        },
                    ],
                ];
                expect(parse(selector)).toStrictEqual(expected(strictData));
                expect(parse(selector, { forgiving: false })).toStrictEqual(
                    expected(strictData),
                );
                expect(parse(selector, { forgiving: true })).toStrictEqual(
                    expected(forgivingData),
                );
            },
        );

        it.each(["(", ")"])(
            "should discard mismatched quoted %s with trailing whitespace",
            (value) => {
                const selector = `:is(ol,:contains("${value}" ),ul).tail`;
                expect(() => parse(selector)).toThrow(Error);
                expect(() => parse(selector, { forgiving: false })).toThrow(
                    Error,
                );
                expect(parse(selector, { forgiving: true })).toStrictEqual([
                    [
                        {
                            type: "pseudo",
                            name: "is",
                            data: [
                                [{ type: "tag", name: "ol", namespace: null }],
                                [{ type: "tag", name: "ul", namespace: null }],
                            ],
                        },
                        {
                            type: "attribute",
                            name: "class",
                            action: "element",
                            value: "tail",
                            namespace: null,
                            ignoreCase: "quirks",
                        },
                    ],
                ]);
            },
        );

        it.each([
            ["is", "contains", ':is(ol,:contains("x" ),ul).tail', '"x" '],
            [
                "where",
                "icontains",
                ":where(ol,:icontains('x'\t),ul).tail",
                "'x'\t",
            ],
            [
                "is",
                "contains",
                String.raw`:is(ol,:contains("\\x" ),ul).tail`,
                '"x" ',
            ],
            [
                "is",
                "contains",
                ':is(ol,:contains("(x)" \t\n\f\r),ul).tail',
                '"(x)" \t\n\f\r',
            ],
        ])(
            "should preserve existing quoted whitespace data in %s :%s %s",
            (listName, name, selector, data) => {
                const expected = [
                    [
                        {
                            type: "pseudo",
                            name: listName,
                            data: [
                                [{ type: "tag", name: "ol", namespace: null }],
                                [{ type: "pseudo", name, data }],
                                [{ type: "tag", name: "ul", namespace: null }],
                            ],
                        },
                        {
                            type: "attribute",
                            name: "class",
                            action: "element",
                            value: "tail",
                            namespace: null,
                            ignoreCase: "quirks",
                        },
                    ],
                ];
                expect(parse(selector)).toStrictEqual(expected);
                expect(parse(selector, { forgiving: false })).toStrictEqual(
                    expected,
                );
                expect(parse(selector, { forgiving: true })).toStrictEqual(
                    expected,
                );
            },
        );

        it.each([
            [
                "is",
                "contains",
                String.raw`:is(ol,:contains("\\)"),ul).tail`,
                String.raw`\)`,
                "throws",
            ],
            [
                "where",
                "icontains",
                String.raw`:where(ol,:icontains('\5c 29'),ul).tail`,
                String.raw`\29`,
                ")",
            ],
            [
                "is",
                "contains",
                String.raw`:is(ol,:contains("a\\(b)"),ul).tail`,
                String.raw`a\(b)`,
                "a(b)",
            ],
            [
                "is",
                "contains",
                String.raw`:is(ol,:contains("\)"),ul).tail`,
                ")",
                ")",
            ],
        ])(
            "should decode quoted string arguments once in %s :%s %s",
            (listName, name, selector, value, strictValue) => {
                const expected = (data: string) => [
                    [
                        {
                            type: "pseudo",
                            name: listName,
                            data: [
                                [{ type: "tag", name: "ol", namespace: null }],
                                [{ type: "pseudo", name, data }],
                                [{ type: "tag", name: "ul", namespace: null }],
                            ],
                        },
                        {
                            type: "attribute",
                            name: "class",
                            action: "element",
                            value: "tail",
                            namespace: null,
                            ignoreCase: "quirks",
                        },
                    ],
                ];
                if (strictValue === "throws") {
                    expect(() => parse(selector)).toThrow(Error);
                    expect(() => parse(selector, { forgiving: false })).toThrow(
                        Error,
                    );
                } else {
                    expect(parse(selector)).toStrictEqual(
                        expected(strictValue),
                    );
                    expect(parse(selector, { forgiving: false })).toStrictEqual(
                        expected(strictValue),
                    );
                }
                expect(parse(selector, { forgiving: true })).toStrictEqual(
                    expected(value),
                );
            },
        );

        it.each([
            [
                "is",
                "contains",
                String.raw`:is(ol,:contains("\\x"`,
                String.raw`\x`,
                "throws",
            ],
            [
                "where",
                "icontains",
                String.raw`:where(ol,:icontains('\\x`,
                String.raw`\x`,
                "throws",
            ],
            [
                "is",
                "contains",
                `:is(ol,:contains("a${String.fromCharCode(92)}`,
                "a",
                "throws",
            ],
            [
                "where",
                "icontains",
                String.raw`:where(ol,:icontains("a\"`,
                'a"',
                "throws",
            ],
            [
                "is",
                "contains",
                `:is(ol,:contains("a${String.fromCharCode(92)}\nb`,
                "ab",
                "throws",
            ],
            [
                "is",
                "contains",
                String.raw`:is(ol,:contains("\\x"))`,
                String.raw`\x`,
                "x",
            ],
            ["is", "contains", ':is(ol,:contains(""', "", "throws"],
            ["where", "icontains", ":where(ol,:icontains('", "", "throws"],
        ])(
            "should decode quoted string arguments at EOF in %s :%s %s",
            (listName, name, selector, value, strictValue) => {
                const expected = (data: string) => [
                    [
                        {
                            type: "pseudo",
                            name: listName,
                            data: [
                                [{ type: "tag", name: "ol", namespace: null }],
                                [{ type: "pseudo", name, data }],
                            ],
                        },
                    ],
                ];
                if (strictValue === "throws") {
                    expect(() => parse(selector)).toThrow(Error);
                    expect(() => parse(selector, { forgiving: false })).toThrow(
                        Error,
                    );
                } else {
                    expect(parse(selector)).toStrictEqual(
                        expected(strictValue),
                    );
                    expect(parse(selector, { forgiving: false })).toStrictEqual(
                        expected(strictValue),
                    );
                }
                expect(parse(selector, { forgiving: true })).toStrictEqual(
                    expected(value),
                );
            },
        );

        it.each([
            ["contains", "("],
            ["contains", ")"],
            ["icontains", "("],
            ["icontains", ")"],
        ])(
            "should preserve :%s() quoted %s and subsequent selectors",
            (name, value) => {
                const selector = `:is(ol,:${name}("${value}"),ul).tail`;
                expect(() => parse(selector)).toThrow(Error);
                expect(() => parse(selector, { forgiving: false })).toThrow(
                    Error,
                );
                expect(parse(selector, { forgiving: true })).toStrictEqual([
                    [
                        {
                            type: "pseudo",
                            name: "is",
                            data: [
                                [{ type: "tag", name: "ol", namespace: null }],
                                [
                                    {
                                        type: "pseudo",
                                        name,
                                        data: value,
                                    },
                                ],
                                [{ type: "tag", name: "ul", namespace: null }],
                            ],
                        },
                        {
                            type: "attribute",
                            name: "class",
                            action: "element",
                            value: "tail",
                            namespace: null,
                            ignoreCase: "quirks",
                        },
                    ],
                ]);
            },
        );

        it("should recover at a single invalid prefix before a URL token", () => {
            const selector = ':is(ol,?url(a"b),ul).tail';
            expect(() => parse(selector)).toThrow(Error);
            expect(() => parse(selector, { forgiving: false })).toThrow(Error);
            expect(parse(selector, { forgiving: true })).toStrictEqual([
                [
                    {
                        type: "pseudo",
                        name: "is",
                        data: [
                            [{ type: "tag", name: "ol", namespace: null }],
                            [{ type: "tag", name: "ul", namespace: null }],
                        ],
                    },
                    {
                        type: "attribute",
                        name: "class",
                        action: "element",
                        value: "tail",
                        namespace: null,
                        ignoreCase: "quirks",
                    },
                ],
            ]);
        });

        it.each(["is", "where"])(
            "should keep valid selectors in :%s() when enabled",
            (name) => {
                expect(
                    parse(`:${name}(ol, ul, ??$#$@#)`, { forgiving: true }),
                ).toStrictEqual([
                    [
                        {
                            type: "pseudo",
                            name,
                            data: [
                                [{ type: "tag", name: "ol", namespace: null }],
                                [{ type: "tag", name: "ul", namespace: null }],
                            ],
                        },
                    ],
                ]);
            },
        );

        it.each(["is", "where"])(
            "should remain strict in :%s() by default or when disabled",
            (name) => {
                const selector = `:${name}(ol, ul, ??$#$@#)`;
                expect(() => parse(selector)).toThrow(Error);
                expect(() => parse(selector, { forgiving: false })).toThrow(
                    Error,
                );
            },
        );

        it.each([
            [":is(??,ol,ul)", ":is(ol,ul)"],
            [":is(ol,??,ul)", ":is(ol,ul)"],
            [":is(ol,ul,??)", ":is(ol,ul)"],
            [":is(ol,ul??,li)", ":is(ol,li)"],
            [":is(ol,bad[a!value],ul)", ":is(ol,ul)"],
            [":where(ol,.a > > .b,ul)", ":where(ol,ul)"],
            [":is(,ol,,ul,)", ":is(ol,ul)"],
            [":where(ol, \t,ul)", ":where(ol,ul)"],
            [':is("bad,)",ol)', ":is(ol)"],
            [':is(ol,"bad",ul)', ":is(ol,ul)"],
            [':is(ol,??[a="x,y)"],ul)', ":is(ol,ul)"],
            [":is(ol,??(a,b),ul)", ":is(ol,ul)"],
            [":is(ol,??[a,b],ul)", ":is(ol,ul)"],
            [":is(ol,??{a,b},ul)", ":is(ol,ul)"],
            [":is(ol,??/*,)*/x,ul)", ":is(ol,ul)"],
            [String.raw`:is(ol,??\,bad,ul)`, ":is(ol,ul)"],
            [String.raw`:is(ol,??\)bad,ul)`, ":is(ol,ul)"],
            [":not(:is(ol,??),ul)", ":not(:is(ol),ul)"],
            [":has(:where(ol,??),ul)", ":has(:where(ol),ul)"],
            [":is(ol,:not(ul,??),li)", ":is(ol,li)"],
            [":where(ol,:has(> ul,??),li)", ":where(ol,li)"],
            [":is(ol,:where(ul,??),li)", ":is(ol,:where(ul),li)"],
        ])(
            "should discard complete invalid branches in %s",
            (selector, valid) => {
                expect(parse(selector, { forgiving: true })).toStrictEqual(
                    parse(valid),
                );
            },
        );

        it.each(["is", "where"])(
            "should allow empty :%s() lists when enabled",
            (name) => {
                for (const argument of ["", " ", ",", "??", "??,##,."]) {
                    expect(
                        parse(`:${name}(${argument})`, { forgiving: true }),
                    ).toStrictEqual([[{ type: "pseudo", name, data: [] }]]);
                }
            },
        );

        it.each([
            [":is(ol, ??", ":is(ol)"],
            [":where(ol, ??", ":where(ol)"],
            [":is(ol, [x,ul)", ":is(ol)"],
        ])("should recover invalid EOF branches in %s", (selector, valid) => {
            expect(() => parse(selector)).toThrow(Error);
            expect(() => parse(selector, { forgiving: false })).toThrow(Error);
            expect(parse(selector, { forgiving: true })).toStrictEqual(
                parse(valid),
            );
        });

        it.each([
            [":is(ol, [x", ":is(ol, [x])"],
            [":where(ol, [x", ":where(ol, [x])"],
            [':is(ol, [x="a,b],ul)', ':is(ol, [x="a,b],ul)"])'],
            [':where(ol, [x="a,b],ul)', ':where(ol, [x="a,b],ul)"])'],
        ])("should retain valid EOF branches in %s", (selector, valid) => {
            expect(() => parse(selector)).toThrow(Error);
            expect(() => parse(selector, { forgiving: false })).toThrow(Error);
            expect(parse(selector, { forgiving: true })).toStrictEqual(
                parse(valid),
            );
        });

        it.each([
            [":is(", ":is()"],
            [":where(??", ":where()"],
            [":is(ol,", ":is(ol)"],
            [":is(ol,ul/*", ":is(ol,ul)"],
            [":not(:is(ol,??", ":not(:is(ol))"],
            [":has(:where(ol,??", ":has(:where(ol))"],
            [":is(ol,:not(ul", ":is(ol,:not(ul))"],
            [":is(ol,:not(:where(ul,??", ":is(ol,:not(:where(ul)))"],
            [":is(ol,:not(ul,??", ":is(ol)"],
            [":is(ol,:not(ul,", ":is(ol)"],
        ])("should finish forgiving lists at EOF in %s", (selector, valid) => {
            expect(parse(selector, { forgiving: true })).toStrictEqual(
                parse(valid, { forgiving: true }),
            );
        });

        it.each([
            [":is(ol,:unknown(x", String.raw`:is(ol,:unknown(x\\))`],
            [":where(ol,:unknown(x", String.raw`:where(ol,:unknown(x\\))`],
            [":is(ol,::unknown(x", String.raw`:is(ol,::unknown(x\\))`],
            [":where(ol,::unknown(x", String.raw`:where(ol,::unknown(x\\))`],
            [":is(ol,[x=a", ":is(ol,[x=a\u{FFFD}])"],
            [":where(ol,[x=a", ":where(ol,[x=a\u{FFFD}])"],
            [':is(ol,[x="a', ':is(ol,[x="a"])'],
            [':where(ol,[x="a', ':where(ol,[x="a"])'],
        ])(
            "should finish EOF after a trailing escape in %s",
            (prefix, valid) => {
                const selector = `${prefix}${String.fromCharCode(92)}`;
                expect(() => parse(selector)).toThrow(Error);
                expect(() => parse(selector, { forgiving: false })).toThrow(
                    Error,
                );
                expect(parse(selector, { forgiving: true })).toStrictEqual(
                    parse(valid),
                );
            },
        );

        it.each([
            [':is(ol,??"bad\n,ul).tail', ":is(ol,ul).tail"],
            [':where(ol,??"bad\n,ul).tail', ":where(ol,ul).tail"],
            [':is(ol,??[x="bad\n],ul).tail', ":is(ol,ul).tail"],
            [':where(ol,??[x="bad\n],ul).tail', ":where(ol,ul).tail"],
            [':is(ol,[x="bad\n],ul).tail', ":is(ol,ul).tail"],
            [':where(ol,[x="bad\n],ul).tail', ":where(ol,ul).tail"],
        ])(
            "should resume after a bad string newline in %s",
            (selector, valid) => {
                expect(parse(selector, { forgiving: true })).toStrictEqual(
                    parse(valid),
                );
            },
        );

        it.each(["is", "where"])(
            "should keep escaped newlines in strings while recovering :%s()",
            (name) => {
                const selector = `:${name}(ol,??"bad${String.fromCharCode(92)}\n,ul).tail`;
                expect(parse(selector, { forgiving: true })).toStrictEqual(
                    parse(`:${name}(ol)`),
                );
            },
        );

        it.each([
            [':is(ol,??url(a"b),ul).tail', ":is(ol,ul).tail"],
            [":is(ol,??url(a(b),ul).tail", ":is(ol,ul).tail"],
            [':where(ol,??url(a"b),ul).tail', ":where(ol,ul).tail"],
            [":where(ol,??url(a(b),ul).tail", ":where(ol,ul).tail"],
            [':is(ol,??UrL(a"b),ul).tail', ":is(ol,ul).tail"],
            [String.raw`:is(ol,??\75 rl(a"b),ul).tail`, ":is(ol,ul).tail"],
            [String.raw`:is(ol,??u\72 l(a(b),ul).tail`, ":is(ol,ul).tail"],
            [':is(ol,??url("a)b"),ul).tail', ":is(ol,ul).tail"],
            [String.raw`:is(ol,??url(a\)b),ul).tail`, ":is(ol,ul).tail"],
            [String.raw`:is(ol,??url(a"b\)c),ul).tail`, ":is(ol,ul).tail"],
            [':is(ol,??prefixurl(a"b),ul).tail', ":is(ol)"],
            [':is(ol,??1url(a"b),ul).tail', ":is(ol)"],
            [':is(ol,??1.0url(a"b),ul).tail', ":is(ol)"],
            [':is(ol,??1e+0url(a"b),ul).tail', ":is(ol)"],
            [':is(ol,??#url(a"b),ul).tail', ":is(ol)"],
            [':is(ol,??@url(a"b),ul).tail', ":is(ol)"],
            [
                `:is(ol,??${String.fromCharCode(92)}75\r\nrl(a"b),ul).tail`,
                ":is(ol,ul).tail",
            ],
        ])(
            "should respect URL tokens while recovering %s",
            (selector, valid) => {
                expect(parse(selector, { forgiving: true })).toStrictEqual(
                    parse(valid),
                );
            },
        );

        it.each([
            [':is(ol,url(a"b),ul).tail', ":is(ol,ul).tail"],
            [":is(ol,url(a(b),ul).tail", ":is(ol,ul).tail"],
            [':where(ol,url(a"b),ul).tail', ":where(ol,ul).tail"],
            [":where(ol,url(a(b),ul).tail", ":where(ol,ul).tail"],
            [String.raw`:is(ol,u\72l(a"b),ul).tail`, ":is(ol,ul).tail"],
            [':is(ol,.url(a"b),ul).tail', ":is(ol,ul).tail"],
            [':where(ol,.url(a"b),ul).tail', ":where(ol,ul).tail"],
            [':is(ol,ns|url(a"b),ul).tail', ":is(ol,ul).tail"],
            [':where(ol,ns|url(a"b),ul).tail', ":where(ol,ul).tail"],
            [String.raw`:is(ol,.u\72l(a"b),ul).tail`, ":is(ol,ul).tail"],
        ])(
            "should recover at a URL selector boundary in %s",
            (selector, valid) => {
                expect(parse(selector, { forgiving: true })).toStrictEqual(
                    parse(valid),
                );
            },
        );

        it.each(["\n", "\r", "\r\n", "\f"])(
            "should consume hex escape whitespace within strings: %j",
            (newline) => {
                const selector = `:is(ol,??"bad${String.fromCharCode(92)}61${newline},ul).tail`;
                expect(parse(selector, { forgiving: true })).toStrictEqual(
                    parse(":is(ol)"),
                );
            },
        );

        it.each(["\r", "\r\n", "\f"])(
            "should recognize normalized newline variants: %j",
            (newline) => {
                expect(
                    parse(`:is(ol,[x="bad${newline}],ul).tail`, {
                        forgiving: true,
                    }),
                ).toStrictEqual(parse(":is(ol,ul).tail"));
                expect(
                    parse(
                        `:is(ol,??"bad${String.fromCharCode(92)}${newline},ul).tail`,
                        { forgiving: true },
                    ),
                ).toStrictEqual(parse(":is(ol)"));
            },
        );

        it.each([
            [`:is(ol,[x="a${String.fromCharCode(92)}\n`, ':is(ol,[x="a"])'],
            [
                `:where(ol,[x="${String.fromCharCode(92)}61\r\n`,
                ':where(ol,[x="a"])',
            ],
        ])(
            "should decode EOF string continuations in %s",
            (selector, valid) => {
                expect(parse(selector, { forgiving: true })).toStrictEqual(
                    parse(valid),
                );
            },
        );

        it.each(
            ["\n", "\r", "\r\n", "\f"].flatMap((newline) => [
                [
                    "where",
                    "'",
                    "6",
                    "1",
                    String.raw`:where(ol,[x="\6 1"])`,
                    newline,
                ],
                ["is", '"', "5", "c", String.raw`:is(ol,[x="\5 c"])`, newline],
                [
                    "where",
                    "'",
                    "000006",
                    "1",
                    String.raw`:where(ol,[x="\0000061"])`,
                    newline,
                ],
            ]),
        )(
            "should preserve EOF escape token boundaries in :%s(): %j %j %j %j %j",
            (name, quote, hex, suffix, valid, newline) => {
                const slash = String.fromCharCode(92);
                const selector = `:${name}(ol,[x=${quote}${slash}${hex}${slash}${newline}${suffix}`;
                expect(() => parse(selector)).toThrow(Error);
                expect(() => parse(selector, { forgiving: false })).toThrow(
                    Error,
                );
                expect(parse(selector, { forgiving: true })).toStrictEqual(
                    parse(valid),
                );
            },
        );

        it.each([
            [1, "a", "a\u{FFFD}"],
            [2, "a\\", "a\\"],
            [3, "a\\", "a\\\u{FFFD}"],
            [4, "a\\\\", "a\\\\"],
        ] as const)(
            "should preserve %s trailing escape characters at EOF",
            (count, quoted, unquoted) => {
                const slashes = String.fromCharCode(92).repeat(count);
                for (const [quote, value] of [
                    ['"', quoted],
                    ["", unquoted],
                ]) {
                    expect(
                        parse(`:is(ol,[x=${quote}a${slashes}`, {
                            forgiving: true,
                        }),
                    ).toStrictEqual(
                        parse(`:is(ol,[x=${JSON.stringify(value)}])`),
                    );
                }
            },
        );

        it.each([
            String.raw`:is(.a\,b,.a\)b,[data-x="a,b)"],ol)`,
            ":is(ol,/*,)*/ul)",
            ":is(> ul,:has(:has(a)),:unknown-pseudo(a,b),::unknown)",
            ':is(ol,:unknown(url(a"b)),:url(a"b),ul)',
            ':is(ol,:url(a"b),:url(c"d),ul).tail',
            ':is(ol,:unknown(a"b),:unknown(c"d),ul).tail',
            ':is(ol,:unknown("a),:unknown("),ul).tail',
            ':is(ol,::unknown("a),::unknown("),ul).tail',
            ":is(ol,:unknown(url(a(b))),ul).tail",
            String.raw`:is(ol,:contains("a\"(b)"),ul).tail`,
            String.raw`:where(ol,:contains('a\'(b)'),ul).tail`,
            String.raw`:is(\?url,ol).tail`,
            String.raw`:where(ol,.\?url).tail`,
            String.raw`:is(ol,[x="a\\"],[x=a\\])`,
            `:is(ol,[x="${String.fromCharCode(92)}6${String.fromCharCode(92)}\n1"])`,
        ])("should preserve existing valid ASTs for %s", (selector) => {
            expect(parse(selector, { forgiving: true })).toStrictEqual(
                parse(selector),
            );
            expect(parse(selector, { forgiving: false })).toStrictEqual(
                parse(selector),
            );
        });

        it.each([
            ":not(ol,??)",
            ":has(ol,??)",
            ":matches(ol,??)",
            ":host(ol,??)",
            ":is(ol,??),??",
            "[x",
            '[x="a,b],ul)',
            ":not(ol",
            ":unknown-pseudo(ol",
            ":not(:is(ol),??",
            ":not(:is(ol),",
        ])("should keep non-forgiving lists strict in %s", (selector) => {
            expect(() => parse(selector, { forgiving: true })).toThrow(Error);
        });

        it("should recover through nested strict wrappers", () => {
            let selector = ":is(??)";
            for (let depth = 0; depth < 64; depth++) {
                selector = `:is(:not(${selector}??))`;
            }
            expect(parse(selector, { forgiving: true })).toStrictEqual([
                [{ type: "pseudo", name: "is", data: [] }],
            ]);
        });

        it("should propagate runtime errors instead of forgiving them", () => {
            const selector = `${":is(".repeat(10_000)}a${")".repeat(10_000)}`;
            expect(() => parse(selector, { forgiving: true })).toThrow(
                RangeError,
            );
        });
    });

    describe("Collected selectors (qwery, sizzle, nwmatcher)", () => {
        const out: Record<string, unknown> = JSON.parse(
            readFileSync(`${__dirname}/__fixtures__/out.json`, "utf8"),
        );
        it.each(Object.entries(out))("%s", (selector, expected) => {
            expect(parse(selector)).toStrictEqual(expected);
        });
    });

    it.each(broken)("should not parse — %s", (selector) => {
        expect(() => parse(selector)).toThrow(Error);
    });

    it("should ignore comments", () => {
        expect(parse("/* comment1 */ /**/ foo /*comment2*/")).toEqual([
            [{ name: "foo", namespace: null, type: "tag" }],
        ]);

        expect(() => parse("/*/")).toThrowError("Comment was not terminated");
    });

    it("should support legacy pseudo-elements with single colon", () => {
        expect(parse(":before")).toEqual([
            [{ name: "before", data: null, type: "pseudo-element" }],
        ]);
    });
});
