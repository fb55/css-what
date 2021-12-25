import { readFileSync } from "fs";
import { parse } from ".";
import { tests } from "./__fixtures__/tests";

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
    describe("Own tests", () => {
        for (const [selector, expected, message, options] of tests) {
            test(message, () =>
                expect(parse(selector, options)).toStrictEqual(expected)
            );
        }
    });

    describe("Collected selectors (qwery, sizzle, nwmatcher)", () => {
        const out = JSON.parse(
            readFileSync(`${__dirname}/__fixtures__/out.json`, "utf8")
        );
        for (const s of Object.keys(out)) {
            test(s, () => {
                expect(parse(s)).toStrictEqual(out[s]);
            });
        }
    });

    describe("Broken selectors", () => {
        for (const selector of broken) {
            it(`should not parse — ${selector}`, () => {
                expect(() => parse(selector)).toThrow(Error);
            });
        }
    });

    it("should ignore comments", () => {
        expect(parse("/* comment1 */ /**/ foo /*comment2*/")).toEqual([
            [
                { type: "descendant" },
                { name: "foo", namespace: null, type: "tag" },
            ],
        ]);

        expect(() => parse("/*/")).toThrowError("Comment was not terminated");
    });

    it("should support quirks mode", () => {
        expect(parse("#foo", { quirksMode: true })).toEqual([
            [
                {
                    action: "equals",
                    ignoreCase: true,
                    name: "id",
                    namespace: null,
                    type: "attribute",
                    value: "foo",
                },
            ],
        ]);
        expect(parse("#foo", { quirksMode: false })).toEqual([
            [
                {
                    action: "equals",
                    ignoreCase: false,
                    name: "id",
                    namespace: null,
                    type: "attribute",
                    value: "foo",
                },
            ],
        ]);

        expect(parse(".foo", { quirksMode: true })).toEqual([
            [
                {
                    action: "element",
                    ignoreCase: true,
                    name: "class",
                    namespace: null,
                    type: "attribute",
                    value: "foo",
                },
            ],
        ]);
        expect(parse(".foo", { quirksMode: false })).toEqual([
            [
                {
                    action: "element",
                    ignoreCase: false,
                    name: "class",
                    namespace: null,
                    type: "attribute",
                    value: "foo",
                },
            ],
        ]);
    });
});
