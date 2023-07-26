import { readFileSync } from "fs";
import { parse, stringify } from ".";
import { tests } from "./__fixtures__/tests";

describe("Stringify & re-parse", () => {
    describe("Own tests", () => {
        for (const [selector, expected, message] of tests) {
            test(`${message} (${selector})`, () => {
                expect(parse(stringify(expected))).toStrictEqual(expected);
            });
        }
    });

    it("Collected Selectors (qwery, sizzle, nwmatcher)", () => {
        const out = JSON.parse(
            readFileSync(`${__dirname}/__fixtures__/out.json`, "utf8")
        );
        for (const s of Object.keys(out)) {
            expect(parse(stringify(out[s]))).toStrictEqual(out[s]);
        }
    });
});
