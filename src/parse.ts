"use strict";

export default parse;

export interface Options {
    lowerCaseAttributeNames?: boolean;
    lowerCaseTags?: boolean;
    xmlMode?: boolean;
}

export type Selector =
    | PseudoSelector
    | PseudoElement
    | AttributeSelector
    | TagSelector
    | UniversalSelector
    | Traversal;

export interface AttributeSelector {
    type: "attribute";
    name: string;
    action: AttributeAction;
    value: string;
    ignoreCase: boolean;
}

type DataType = Selector[][] | null | string;

export interface PseudoSelector {
    type: "pseudo";
    name: string;
    data: DataType;
}

export interface PseudoElement {
    type: "pseudo-element";
    name: string;
}

export interface TagSelector {
    type: "tag";
    name: string;
}

export interface UniversalSelector {
    type: "universal";
}

export interface Traversal {
    type: TraversalType;
}

export type AttributeAction =
    | "any"
    | "element"
    | "end"
    | "equals"
    | "exists"
    | "hyphen"
    | "not"
    | "start";

export type TraversalType =
    | "adjacent"
    | "child"
    | "descendant"
    | "parent"
    | "sibling";

const reName = /^[^\\]?(?:\\(?:[\da-f]{1,6}\s?|.)|[\w\-\u00b0-\uFFFF])+/;
const reEscape = /\\([\da-f]{1,6}\s?|(\s)|.)/gi;
// Modified version of https://github.com/jquery/sizzle/blob/master/src/sizzle.js#L87
const reAttr = /^\s*((?:\\.|[\w\u00b0-\uFFFF-])+)\s*(?:(\S?)=\s*(?:(['"])([^]*?)\3|(#?(?:\\.|[\w\u00b0-\uFFFF-])*)|)|)\s*(i)?\]/;

const actionTypes: { [key: string]: AttributeAction } = {
    undefined: "exists",
    "": "equals",
    "~": "element",
    "^": "start",
    $: "end",
    "*": "any",
    "!": "not",
    "|": "hyphen",
};

const Traversals: { [key: string]: TraversalType } = {
    ">": "child",
    "<": "parent",
    "~": "sibling",
    "+": "adjacent",
};

const attribSelectors: { [key: string]: [string, AttributeAction] } = {
    "#": ["id", "equals"],
    ".": ["class", "element"],
};

// Pseudos, whose data property is parsed as well.
const unpackPseudos = new Set(["has", "not", "matches", "is"]);

const stripQuotesFromPseudos = new Set(["contains", "icontains"]);

const quotes = new Set(['"', "'"]);

// Unescape function taken from https://github.com/jquery/sizzle/blob/master/src/sizzle.js#L152
function funescape(_: string, escaped: string, escapedWhitespace?: string) {
    const high = parseInt(escaped, 16) - 0x10000;

    // NaN means non-codepoint
    return high !== high || escapedWhitespace
        ? escaped
        : high < 0
        ? // BMP codepoint
          String.fromCharCode(high + 0x10000)
        : // Supplemental Plane codepoint (surrogate pair)
          String.fromCharCode((high >> 10) | 0xd800, (high & 0x3ff) | 0xdc00);
}

function unescapeCSS(str: string) {
    return str.replace(reEscape, funescape);
}

function isWhitespace(c: string) {
    return c === " " || c === "\n" || c === "\t" || c === "\f" || c === "\r";
}

function parse(selector: string, options?: Options): Selector[][] {
    const subselects: Selector[][] = [];

    selector = parseSelector(subselects, `${selector}`, options);

    if (selector !== "") {
        throw new Error(`Unmatched selector: ${selector}`);
    }

    return subselects;
}

function parseSelector(
    subselects: Selector[][],
    selector: string,
    options?: Options
): string {
    let tokens: Selector[] = [];
    let sawWS = false;

    function getName(): string {
        const match = selector.match(reName);

        if (!match) {
            throw new Error(`Expected name, found ${selector}`);
        }

        const [sub] = match;
        selector = selector.substr(sub.length);
        return unescapeCSS(sub);
    }

    function stripWhitespace(start: number) {
        while (isWhitespace(selector.charAt(start))) start++;
        selector = selector.substr(start);
    }

    function isEscaped(pos: number): boolean {
        let slashCount = 0;

        while (selector.charAt(--pos) === "\\") slashCount++;
        return (slashCount & 1) === 1;
    }

    stripWhitespace(0);

    while (selector !== "") {
        const firstChar = selector.charAt(0);

        if (isWhitespace(firstChar)) {
            sawWS = true;
            stripWhitespace(1);
        } else if (firstChar in Traversals) {
            tokens.push({ type: Traversals[firstChar] });
            sawWS = false;

            stripWhitespace(1);
        } else if (firstChar === ",") {
            if (tokens.length === 0) {
                throw new Error("Empty sub-selector");
            }
            subselects.push(tokens);
            tokens = [];
            sawWS = false;
            stripWhitespace(1);
        } else {
            if (sawWS) {
                if (tokens.length > 0) {
                    tokens.push({ type: "descendant" });
                }
                sawWS = false;
            }

            if (firstChar === "*") {
                selector = selector.substr(1);
                tokens.push({ type: "universal" });
            } else if (firstChar in attribSelectors) {
                const [name, action] = attribSelectors[firstChar];
                selector = selector.substr(1);
                tokens.push({
                    type: "attribute",
                    name,
                    action,
                    value: getName(),
                    ignoreCase: false,
                });
            } else if (firstChar === "[") {
                selector = selector.substr(1);
                const data = selector.match(reAttr);
                if (!data) {
                    throw new Error(
                        `Malformed attribute selector: ${selector}`
                    );
                }
                selector = selector.substr(data[0].length);
                let name = unescapeCSS(data[1]);

                if (
                    !options ||
                    ("lowerCaseAttributeNames" in options
                        ? options.lowerCaseAttributeNames
                        : !options.xmlMode)
                ) {
                    name = name.toLowerCase();
                }

                tokens.push({
                    type: "attribute",
                    name,
                    action: actionTypes[data[2]],
                    value: unescapeCSS(data[4] || data[5] || ""),
                    ignoreCase: !!data[6],
                });
            } else if (firstChar === ":") {
                if (selector.charAt(1) === ":") {
                    selector = selector.substr(2);
                    tokens.push({
                        type: "pseudo-element",
                        name: getName().toLowerCase(),
                    });
                    continue;
                }

                selector = selector.substr(1);

                const name = getName().toLowerCase();
                let data: DataType = null;

                if (selector.startsWith("(")) {
                    if (unpackPseudos.has(name)) {
                        const quot = selector.charAt(1);
                        const quoted = quotes.has(quot);

                        selector = selector.substr(quoted ? 2 : 1);

                        data = [];
                        selector = parseSelector(data, selector, options);

                        if (quoted) {
                            if (!selector.startsWith(quot)) {
                                throw new Error(`Unmatched quotes in :${name}`);
                            } else {
                                selector = selector.substr(1);
                            }
                        }

                        if (!selector.startsWith(")")) {
                            throw new Error(
                                `Missing closing parenthesis in :${name} (${selector})`
                            );
                        }

                        selector = selector.substr(1);
                    } else {
                        let pos = 1;
                        let counter = 1;

                        for (; counter > 0 && pos < selector.length; pos++) {
                            if (
                                selector.charAt(pos) === "(" &&
                                !isEscaped(pos)
                            ) {
                                counter++;
                            } else if (
                                selector.charAt(pos) === ")" &&
                                !isEscaped(pos)
                            ) {
                                counter--;
                            }
                        }

                        if (counter) {
                            throw new Error("Parenthesis not matched");
                        }

                        data = selector.substr(1, pos - 2);
                        selector = selector.substr(pos);

                        if (stripQuotesFromPseudos.has(name)) {
                            const quot = data.charAt(0);

                            if (quot === data.slice(-1) && quotes.has(quot)) {
                                data = data.slice(1, -1);
                            }

                            data = unescapeCSS(data);
                        }
                    }
                }

                tokens.push({ type: "pseudo", name, data });
            } else if (reName.test(selector)) {
                let name = getName();

                if (
                    !options ||
                    ("lowerCaseTags" in options
                        ? options.lowerCaseTags
                        : !options.xmlMode)
                ) {
                    name = name.toLowerCase();
                }

                tokens.push({ type: "tag", name });
            } else {
                if (
                    tokens.length &&
                    tokens[tokens.length - 1].type === "descendant"
                ) {
                    tokens.pop();
                }
                addToken(subselects, tokens);
                return selector;
            }
        }
    }

    addToken(subselects, tokens);

    return selector;
}

function addToken(subselects: Selector[][], tokens: Selector[]) {
    if (subselects.length > 0 && tokens.length === 0) {
        throw new Error("Empty sub-selector");
    }

    subselects.push(tokens);
}
