import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { tests } from "./__fixtures__/tests.js";
import { parse } from "./parse.js";
import { SelectorType } from "./types.js";

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

    it("should parse deeply nested pseudo-selectors", () => {
        const depth = 100_000;
        let [[token]] = parse(`${":is(".repeat(depth)}a${")".repeat(depth)}`);
        let levels = 0;

        while (
            token.type === SelectorType.Pseudo &&
            Array.isArray(token.data)
        ) {
            [[token]] = token.data;
            levels++;
        }

        expect(levels).toBe(depth);
        expect(token).toStrictEqual({
            type: "tag",
            name: "a",
            namespace: null,
        });
    });

    it("should report unclosed deeply nested pseudo-selectors", () => {
        const selector = `:not(${":has(".repeat(100_000)}a`;
        expect(() => parse(selector)).toThrow(
            `Missing closing parenthesis in :has (${selector})`,
        );
    });
});
