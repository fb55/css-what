import { readFileSync } from "fs";
import { parse } from ".";
import { tests } from "./__fixtures__/tests";

describe("parse own tests", () => {
    tests.forEach(([selector, expected, message]) =>
        test(message, () => expect(parse(selector)).toStrictEqual(expected))
    );
});

describe("Collected selectors", () => {
    test("(qwery, sizzle, nwmatcher)", () => {
        const out = JSON.parse(
            readFileSync(`${__dirname}/__fixtures__/out.json`, "utf8")
        );
        Object.keys(out).forEach(s => expect(parse(s)).toStrictEqual(out[s]));
    });
});
