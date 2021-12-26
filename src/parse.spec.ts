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
        for (const [selector, expected, message] of tests) {
            test(message, () =>
                expect(parse(selector)).toStrictEqual(expected)
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
            [{ name: "foo", namespace: null, type: "tag" }],
        ]);

        expect(() => parse("/*/")).toThrowError("Comment was not terminated");
    });
});
