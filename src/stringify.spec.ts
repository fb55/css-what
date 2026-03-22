import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { tests } from "./__fixtures__/tests.js";
import { parse, stringify } from "./index.js";
import { type Selector, SelectorType } from "./types.js";

describe("Stringify & re-parse", () => {
    it.each(tests)("%s", (_selector, expected) => {
        expect(parse(stringify(expected))).toStrictEqual(expected);
    });

    describe("Collected Selectors (qwery, sizzle, nwmatcher)", () => {
        const out: Record<string, Selector[][]> = JSON.parse(
            readFileSync(`${__dirname}/__fixtures__/out.json`, "utf8"),
        );
        it.each(Object.entries(out))("%s", (_selector, expected) => {
            expect(parse(stringify(expected))).toStrictEqual(expected);
        });
    });
});

describe("Stringify CSS spec compliance", () => {
    const escapeCases: [string, string, string][] = [
        ["1foo", String.raw`\31 foo`, "leading digit"],
        ["-1foo", String.raw`-\31 foo`, "leading hyphen+digit"],
        ["-", String.raw`\2d `, "lone hyphen"],
        ["a\u0001b", String.raw`a\1 b`, "control character"],
        ["a\u007Fb", String.raw`a\7f b`, "DEL character"],
        ["a\u0000b", String.raw`a\fffd b`, "null → FFFD"],
        ["a'b", String.raw`a\'b`, "single quote"],
    ];

    it.each(escapeCases)("%s → %s (%s)", (name, expected) => {
        const ast = [
            [{ type: SelectorType.Tag as const, name, namespace: null }],
        ];
        expect(stringify(ast)).toBe(expected);
    });

    it.each(["--foo", "-foo"])("should not escape %s", (name) => {
        const ast = [
            [{ type: SelectorType.Tag as const, name, namespace: null }],
        ];
        expect(stringify(ast)).toBe(name);
    });
});
