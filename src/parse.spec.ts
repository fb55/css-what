import { readFileSync } from "fs";
import { parse } from ".";
import { tests } from "./__fixtures__/tests";

describe("parse own tests", () => {
    for (const [selector, expected, message] of tests) {
        test(message, () => expect(parse(selector)).toStrictEqual(expected));
    }
});

describe("Collected selectors", () => {
    test("(qwery, sizzle, nwmatcher)", () => {
        const out = JSON.parse(
            readFileSync(`${__dirname}/__fixtures__/out.json`, "utf8")
        );
        for (const s of Object.keys(out)) {
            expect(parse(s)).toStrictEqual(out[s]);
        }
    });
});
