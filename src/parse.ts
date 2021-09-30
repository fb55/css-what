export interface Options {
    /**
     * When false, tag names will not be lowercased.
     * @default true
     */
    lowerCaseAttributeNames?: boolean;
    /**
     * When false, attribute names will not be lowercased.
     * @default true
     */
    lowerCaseTags?: boolean;
    /**
     * When `true`, `xmlMode` implies both `lowerCaseTags` and `lowerCaseAttributeNames` are set to `false`.
     * Also, `ignoreCase` on attributes will not be inferred based on HTML rules anymore.
     * @default false
     */
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
    ignoreCase: boolean | null;
    namespace: string | null;
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
    namespace: string | null;
}

export interface UniversalSelector {
    type: "universal";
    namespace: string | null;
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

const reName = /^[^\\#]?(?:\\(?:[\da-f]{1,6}\s?|.)|[\w\-\u00b0-\uFFFF])+/;
const reEscape = /\\([\da-f]{1,6}\s?|(\s)|.)/gi;

const actionTypes = new Map<string, AttributeAction>([
    ["~", "element"],
    ["^", "start"],
    ["$", "end"],
    ["*", "any"],
    ["!", "not"],
    ["|", "hyphen"],
]);

const Traversals: Record<string, TraversalType> = {
    ">": "child",
    "<": "parent",
    "~": "sibling",
    "+": "adjacent",
};

const attribSelectors: Record<string, [string, AttributeAction]> = {
    "#": ["id", "equals"],
    ".": ["class", "element"],
};

// Pseudos, whose data property is parsed as well.
const unpackPseudos = new Set([
    "has",
    "not",
    "matches",
    "is",
    "where",
    "host",
    "host-context",
]);

const traversalNames = new Set<TraversalType>([
    "descendant",
    ...Object.keys(Traversals).map((k) => Traversals[k]),
]);

/**
 * Attributes that are case-insensitive in HTML.
 *
 * @private
 * @see https://html.spec.whatwg.org/multipage/semantics-other.html#case-sensitivity-of-selectors
 */
const caseInsensitiveAttributes = new Set([
    "accept",
    "accept-charset",
    "align",
    "alink",
    "axis",
    "bgcolor",
    "charset",
    "checked",
    "clear",
    "codetype",
    "color",
    "compact",
    "declare",
    "defer",
    "dir",
    "direction",
    "disabled",
    "enctype",
    "face",
    "frame",
    "hreflang",
    "http-equiv",
    "lang",
    "language",
    "link",
    "media",
    "method",
    "multiple",
    "nohref",
    "noresize",
    "noshade",
    "nowrap",
    "readonly",
    "rel",
    "rev",
    "rules",
    "scope",
    "scrolling",
    "selected",
    "shape",
    "target",
    "text",
    "type",
    "valign",
    "valuetype",
    "vlink",
]);

/**
 * Checks whether a specific selector is a traversal.
 * This is useful eg. in swapping the order of elements that
 * are not traversals.
 *
 * @param selector Selector to check.
 */
export function isTraversal(selector: Selector): selector is Traversal {
    return traversalNames.has(selector.type as TraversalType);
}

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

/**
 * Parses `selector`, optionally with the passed `options`.
 *
 * @param selector Selector to parse.
 * @param options Options for parsing.
 * @returns Returns a two-dimensional array.
 * The first dimension represents selectors separated by commas (eg. `sub1, sub2`),
 * the second contains the relevant tokens for that selector.
 */
export default function parse(
    selector: string,
    options?: Options
): Selector[][] {
    const subselects: Selector[][] = [];

    const endIndex = parseSelector(subselects, `${selector}`, options, 0);

    if (endIndex < selector.length) {
        throw new Error(`Unmatched selector: ${selector.slice(endIndex)}`);
    }

    return subselects;
}

function parseSelector(
    subselects: Selector[][],
    selector: string,
    options: Options = {},
    selectorIndex: number
): number {
    let tokens: Selector[] = [];
    let sawWS = false;

    function getName(offset: number): string {
        const match = selector.slice(selectorIndex + offset).match(reName);

        if (!match) {
            throw new Error(
                `Expected name, found ${selector.slice(selectorIndex)}`
            );
        }

        const [name] = match;
        selectorIndex += offset + name.length;
        return unescapeCSS(name);
    }

    function stripWhitespace(offset: number) {
        while (isWhitespace(selector.charAt(selectorIndex + offset))) offset++;
        selectorIndex += offset;
    }

    function isEscaped(pos: number): boolean {
        let slashCount = 0;

        while (selector.charAt(--pos) === "\\") slashCount++;
        return (slashCount & 1) === 1;
    }

    function ensureNotTraversal() {
        if (tokens.length > 0 && isTraversal(tokens[tokens.length - 1])) {
            throw new Error("Did not expect successive traversals.");
        }
    }

    stripWhitespace(0);

    while (selector !== "") {
        const firstChar = selector.charAt(selectorIndex);

        if (isWhitespace(firstChar)) {
            sawWS = true;
            stripWhitespace(1);
        } else if (firstChar in Traversals) {
            ensureNotTraversal();
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
        } else if (selector.startsWith("/*", selectorIndex)) {
            const endIndex = selector.indexOf("*/", selectorIndex + 2);

            if (endIndex < 0) {
                throw new Error("Comment was not terminated");
            }

            selectorIndex = endIndex + 2;
        } else {
            if (sawWS) {
                ensureNotTraversal();
                tokens.push({ type: "descendant" });
                sawWS = false;
            }

            if (firstChar in attribSelectors) {
                const [name, action] = attribSelectors[firstChar];
                tokens.push({
                    type: "attribute",
                    name,
                    action,
                    value: getName(1),
                    namespace: null,
                    // TODO: Add quirksMode option, which makes `ignoreCase` `true` for HTML.
                    ignoreCase: options.xmlMode ? null : false,
                });
            } else if (firstChar === "[") {
                stripWhitespace(1);

                // Determine attribute name and namespace

                let namespace: string | null = null;

                if (selector.charAt(selectorIndex) === "|") {
                    namespace = "";
                    selectorIndex += 1;
                }

                if (selector.startsWith("*|", selectorIndex)) {
                    namespace = "*";
                    selectorIndex += 2;
                }

                let name = getName(0);

                if (
                    namespace === null &&
                    selector.charAt(selectorIndex) === "|" &&
                    selector.charAt(selectorIndex + 1) !== "="
                ) {
                    namespace = name;
                    name = getName(1);
                }

                if (options.lowerCaseAttributeNames ?? !options.xmlMode) {
                    name = name.toLowerCase();
                }

                stripWhitespace(0);

                // Determine comparison operation

                let action: AttributeAction = "exists";
                const possibleAction = actionTypes.get(
                    selector.charAt(selectorIndex)
                );

                if (possibleAction) {
                    action = possibleAction;

                    if (selector.charAt(selectorIndex + 1) !== "=") {
                        throw new Error("Expected `=`");
                    }

                    stripWhitespace(2);
                } else if (selector.charAt(selectorIndex) === "=") {
                    action = "equals";
                    stripWhitespace(1);
                }

                // Determine value

                let value = "";
                let ignoreCase: boolean | null = null;

                if (action !== "exists") {
                    if (quotes.has(selector.charAt(selectorIndex))) {
                        const quote = selector.charAt(selectorIndex);
                        let sectionEnd = selectorIndex + 1;
                        while (
                            sectionEnd < selector.length &&
                            (selector.charAt(sectionEnd) !== quote ||
                                isEscaped(sectionEnd))
                        ) {
                            sectionEnd += 1;
                        }

                        if (selector.charAt(sectionEnd) !== quote) {
                            throw new Error("Attribute value didn't end");
                        }

                        value = unescapeCSS(
                            selector.slice(selectorIndex + 1, sectionEnd)
                        );
                        selectorIndex = sectionEnd + 1;
                    } else {
                        const valueStart = selectorIndex;

                        while (
                            selectorIndex < selector.length &&
                            ((!isWhitespace(selector.charAt(selectorIndex)) &&
                                selector.charAt(selectorIndex) !== "]") ||
                                isEscaped(selectorIndex))
                        ) {
                            selectorIndex += 1;
                        }

                        value = unescapeCSS(
                            selector.slice(valueStart, selectorIndex)
                        );
                    }

                    stripWhitespace(0);

                    // See if we have a force ignore flag

                    const forceIgnore = selector.charAt(selectorIndex);
                    // If the forceIgnore flag is set (either `i` or `s`), use that value
                    if (forceIgnore === "s" || forceIgnore === "S") {
                        ignoreCase = false;
                        stripWhitespace(1);
                    } else if (forceIgnore === "i" || forceIgnore === "I") {
                        ignoreCase = true;
                        stripWhitespace(1);
                    }
                }

                // If `xmlMode` is set, there are no rules; otherwise, use the `caseInsensitiveAttributes` list.
                if (!options.xmlMode) {
                    // TODO: Skip this for `exists`, as there is no value to compare to.
                    ignoreCase ??= caseInsensitiveAttributes.has(name);
                }

                if (selector.charAt(selectorIndex) !== "]") {
                    throw new Error("Attribute selector didn't terminate");
                }

                selectorIndex += 1;

                const attributeSelector: AttributeSelector = {
                    type: "attribute",
                    name,
                    action,
                    value,
                    namespace,
                    ignoreCase,
                };

                tokens.push(attributeSelector);
            } else if (firstChar === ":") {
                if (selector.charAt(selectorIndex + 1) === ":") {
                    tokens.push({
                        type: "pseudo-element",
                        name: getName(2).toLowerCase(),
                    });
                    continue;
                }

                const name = getName(1).toLowerCase();
                let data: DataType = null;

                if (selector.charAt(selectorIndex) === "(") {
                    if (unpackPseudos.has(name)) {
                        if (quotes.has(selector.charAt(selectorIndex + 1))) {
                            throw new Error(
                                `Pseudo-selector ${name} cannot be quoted`
                            );
                        }

                        data = [];
                        selectorIndex = parseSelector(
                            data,
                            selector,
                            options,
                            selectorIndex + 1
                        );

                        if (selector.charAt(selectorIndex) !== ")") {
                            throw new Error(
                                `Missing closing parenthesis in :${name} (${selector})`
                            );
                        }

                        selectorIndex += 1;
                    } else {
                        selectorIndex += 1;
                        const start = selectorIndex;
                        let counter = 1;

                        for (
                            ;
                            counter > 0 && selectorIndex < selector.length;
                            selectorIndex++
                        ) {
                            if (
                                selector.charAt(selectorIndex) === "(" &&
                                !isEscaped(selectorIndex)
                            ) {
                                counter++;
                            } else if (
                                selector.charAt(selectorIndex) === ")" &&
                                !isEscaped(selectorIndex)
                            ) {
                                counter--;
                            }
                        }

                        if (counter) {
                            throw new Error("Parenthesis not matched");
                        }

                        data = selector.slice(start, selectorIndex - 1);

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
            } else {
                let namespace = null;
                let name: string;

                if (firstChar === "*") {
                    selectorIndex += 1;
                    name = "*";
                } else if (reName.test(selector.slice(selectorIndex))) {
                    if (selector.charAt(selectorIndex) === "|") {
                        namespace = "";
                        selectorIndex += 1;
                    }
                    name = getName(0);
                } else {
                    /*
                     * We have finished parsing the selector.
                     * Remove descendant tokens at the end if they exist,
                     * and return the last index, so that parsing can be
                     * picked up from here.
                     */
                    if (
                        tokens.length &&
                        tokens[tokens.length - 1].type === "descendant"
                    ) {
                        tokens.pop();
                    }
                    addToken(subselects, tokens);
                    return selectorIndex;
                }

                if (selector.charAt(selectorIndex) === "|") {
                    namespace = name;
                    if (selector.charAt(selectorIndex + 1) === "*") {
                        name = "*";
                        selectorIndex += 2;
                    } else {
                        name = getName(1);
                    }
                }

                if (name === "*") {
                    tokens.push({ type: "universal", namespace });
                } else {
                    if (options.lowerCaseTags ?? !options.xmlMode) {
                        name = name.toLowerCase();
                    }

                    tokens.push({ type: "tag", name, namespace });
                }
            }
        }
    }

    addToken(subselects, tokens);

    return selectorIndex;
}

function addToken(subselects: Selector[][], tokens: Selector[]) {
    if (subselects.length > 0 && tokens.length === 0) {
        throw new Error("Empty sub-selector");
    }

    subselects.push(tokens);
}
