import {
    Selector,
    SelectorType,
    AttributeSelector,
    Traversal,
    AttributeAction,
    TraversalType,
    DataType,
} from "./types";

const reName = /^[^\\#]?(?:\\(?:[\da-f]{1,6}\s?|.)|[\w\-\u00b0-\uFFFF])+/;
const reEscape = /\\([\da-f]{1,6}\s?|(\s)|.)/gi;

const enum CharCode {
    LeftParenthesis = 40,
    RightParenthesis = 41,
    LeftSquareBracket = 91,
    RightSquareBracket = 93,
    Comma = 44,
    Period = 46,
    Colon = 58,
    SingleQuote = 39,
    DoubleQuote = 34,
    Plus = 43,
    Tilde = 126,
    QuestionMark = 63,
    ExclamationMark = 33,
    Slash = 47,
    Star = 42,
    Equal = 61,
    Dollar = 36,
    Pipe = 124,
    Circumflex = 94,
    Asterisk = 42,
    GreaterThan = 62,
    LessThan = 60,
    Hash = 35,
    LowerI = 105,
    LowerS = 115,
    BackSlash = 92,

    // Whitespace
    Space = 32,
    Tab = 9,
    NewLine = 10,
    FormFeed = 12,
    CarriageReturn = 13,
}

const actionTypes = new Map<number, AttributeAction>([
    [CharCode.Tilde, AttributeAction.Element],
    [CharCode.Circumflex, AttributeAction.Start],
    [CharCode.Dollar, AttributeAction.End],
    [CharCode.Asterisk, AttributeAction.Any],
    [CharCode.ExclamationMark, AttributeAction.Not],
    [CharCode.Pipe, AttributeAction.Hyphen],
]);

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

/**
 * Checks whether a specific selector is a traversal.
 * This is useful eg. in swapping the order of elements that
 * are not traversals.
 *
 * @param selector Selector to check.
 */
export function isTraversal(selector: Selector): selector is Traversal {
    switch (selector.type) {
        case SelectorType.Adjacent:
        case SelectorType.Child:
        case SelectorType.Descendant:
        case SelectorType.Parent:
        case SelectorType.Sibling:
        case SelectorType.ColumnCombinator:
            return true;
        default:
            return false;
    }
}

const stripQuotesFromPseudos = new Set(["contains", "icontains"]);

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

function isQuote(c: number): boolean {
    return c === CharCode.SingleQuote || c === CharCode.DoubleQuote;
}

function isWhitespace(c: number): boolean {
    return (
        c === CharCode.Space ||
        c === CharCode.Tab ||
        c === CharCode.NewLine ||
        c === CharCode.FormFeed ||
        c === CharCode.CarriageReturn
    );
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
export function parse(selector: string): Selector[][] {
    const subselects: Selector[][] = [];

    const endIndex = parseSelector(subselects, `${selector}`, 0);

    if (endIndex < selector.length) {
        throw new Error(`Unmatched selector: ${selector.slice(endIndex)}`);
    }

    return subselects;
}

function parseSelector(
    subselects: Selector[][],
    selector: string,
    selectorIndex: number
): number {
    let tokens: Selector[] = [];

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
        selectorIndex += offset;

        while (
            selectorIndex < selector.length &&
            isWhitespace(selector.charCodeAt(selectorIndex))
        ) {
            selectorIndex++;
        }
    }

    function readValueWithParenthesis(): string {
        selectorIndex += 1;
        const start = selectorIndex;
        let counter = 1;

        for (
            ;
            counter > 0 && selectorIndex < selector.length;
            selectorIndex++
        ) {
            if (
                selector.charCodeAt(selectorIndex) ===
                    CharCode.LeftParenthesis &&
                !isEscaped(selectorIndex)
            ) {
                counter++;
            } else if (
                selector.charCodeAt(selectorIndex) ===
                    CharCode.RightParenthesis &&
                !isEscaped(selectorIndex)
            ) {
                counter--;
            }
        }

        if (counter) {
            throw new Error("Parenthesis not matched");
        }

        return unescapeCSS(selector.slice(start, selectorIndex - 1));
    }

    function isEscaped(pos: number): boolean {
        let slashCount = 0;

        while (selector.charCodeAt(--pos) === CharCode.BackSlash) slashCount++;
        return (slashCount & 1) === 1;
    }

    function ensureNotTraversal() {
        if (tokens.length > 0 && isTraversal(tokens[tokens.length - 1])) {
            throw new Error("Did not expect successive traversals.");
        }
    }

    function addTraversal(type: TraversalType) {
        if (
            tokens.length > 0 &&
            tokens[tokens.length - 1].type === SelectorType.Descendant
        ) {
            tokens[tokens.length - 1].type = type;
            return;
        }

        ensureNotTraversal();

        tokens.push({ type });
    }

    function addSpecialAttribute(name: string, action: AttributeAction) {
        tokens.push({
            type: SelectorType.Attribute,
            name,
            action,
            value: getName(1),
            namespace: null,
            ignoreCase: "quirks",
        });
    }

    /**
     * We have finished parsing the current part of the selector.
     *
     * Remove descendant tokens at the end if they exist,
     * and return the last index, so that parsing can be
     * picked up from here.
     */
    function finalizeSubselector() {
        if (
            tokens.length &&
            tokens[tokens.length - 1].type === SelectorType.Descendant
        ) {
            tokens.pop();
        }

        if (tokens.length === 0) {
            throw new Error("Empty sub-selector");
        }

        subselects.push(tokens);
    }

    stripWhitespace(0);

    if (selector.length === selectorIndex) {
        return selectorIndex;
    }

    loop: while (selectorIndex < selector.length) {
        const firstChar = selector.charCodeAt(selectorIndex);

        switch (firstChar) {
            // Whitespace
            case CharCode.Space:
            case CharCode.Tab:
            case CharCode.NewLine:
            case CharCode.FormFeed:
            case CharCode.CarriageReturn: {
                if (
                    tokens.length === 0 ||
                    tokens[0].type !== SelectorType.Descendant
                ) {
                    ensureNotTraversal();
                    tokens.push({ type: SelectorType.Descendant });
                }

                stripWhitespace(1);
                break;
            }
            // Traversals
            case CharCode.GreaterThan: {
                addTraversal(SelectorType.Child);
                stripWhitespace(1);
                break;
            }
            case CharCode.LessThan: {
                addTraversal(SelectorType.Parent);
                stripWhitespace(1);
                break;
            }
            case CharCode.Tilde: {
                addTraversal(SelectorType.Sibling);
                stripWhitespace(1);
                break;
            }
            case CharCode.Plus: {
                addTraversal(SelectorType.Adjacent);
                stripWhitespace(1);
                break;
            }
            // Special attribute selectors: .class, #id
            case CharCode.Period: {
                addSpecialAttribute("class", AttributeAction.Element);
                break;
            }
            case CharCode.Hash: {
                addSpecialAttribute("id", AttributeAction.Equals);
                break;
            }
            case CharCode.LeftSquareBracket: {
                stripWhitespace(1);

                // Determine attribute name and namespace

                let name: string;
                let namespace: string | null = null;

                if (selector.charCodeAt(selectorIndex) === CharCode.Pipe) {
                    // Equivalent to no namespace
                    name = getName(1);
                } else if (selector.startsWith("*|", selectorIndex)) {
                    namespace = "*";
                    name = getName(2);
                } else {
                    name = getName(0);

                    if (
                        selector.charCodeAt(selectorIndex) === CharCode.Pipe &&
                        selector.charCodeAt(selectorIndex + 1) !==
                            CharCode.Equal
                    ) {
                        namespace = name;
                        name = getName(1);
                    }
                }

                stripWhitespace(0);

                // Determine comparison operation

                let action: AttributeAction = AttributeAction.Exists;
                const possibleAction = actionTypes.get(
                    selector.charCodeAt(selectorIndex)
                );

                if (possibleAction) {
                    action = possibleAction;

                    if (
                        selector.charCodeAt(selectorIndex + 1) !==
                        CharCode.Equal
                    ) {
                        throw new Error("Expected `=`");
                    }

                    stripWhitespace(2);
                } else if (
                    selector.charCodeAt(selectorIndex) === CharCode.Equal
                ) {
                    action = AttributeAction.Equals;
                    stripWhitespace(1);
                }

                // Determine value

                let value = "";
                let ignoreCase: boolean | null = null;

                if (action !== "exists") {
                    if (isQuote(selector.charCodeAt(selectorIndex))) {
                        const quote = selector.charCodeAt(selectorIndex);
                        let sectionEnd = selectorIndex + 1;
                        while (
                            sectionEnd < selector.length &&
                            (selector.charCodeAt(sectionEnd) !== quote ||
                                isEscaped(sectionEnd))
                        ) {
                            sectionEnd += 1;
                        }

                        if (selector.charCodeAt(sectionEnd) !== quote) {
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
                            ((!isWhitespace(
                                selector.charCodeAt(selectorIndex)
                            ) &&
                                selector.charCodeAt(selectorIndex) !==
                                    CharCode.RightSquareBracket) ||
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

                    const forceIgnore =
                        selector.charCodeAt(selectorIndex) | 0x20;

                    // If the forceIgnore flag is set (either `i` or `s`), use that value
                    if (forceIgnore === CharCode.LowerS) {
                        ignoreCase = false;
                        stripWhitespace(1);
                    } else if (forceIgnore === CharCode.LowerI) {
                        ignoreCase = true;
                        stripWhitespace(1);
                    }
                }

                if (
                    selector.charCodeAt(selectorIndex) !==
                    CharCode.RightSquareBracket
                ) {
                    throw new Error("Attribute selector didn't terminate");
                }

                selectorIndex += 1;

                const attributeSelector: AttributeSelector = {
                    type: SelectorType.Attribute,
                    name,
                    action,
                    value,
                    namespace,
                    ignoreCase,
                };

                tokens.push(attributeSelector);
                break;
            }
            case CharCode.Colon: {
                if (selector.charCodeAt(selectorIndex + 1) === CharCode.Colon) {
                    tokens.push({
                        type: SelectorType.PseudoElement,
                        name: getName(2).toLowerCase(),
                        data:
                            selector.charCodeAt(selectorIndex) ===
                            CharCode.LeftParenthesis
                                ? readValueWithParenthesis()
                                : null,
                    });
                    continue;
                }

                const name = getName(1).toLowerCase();
                let data: DataType = null;

                if (
                    selector.charCodeAt(selectorIndex) ===
                    CharCode.LeftParenthesis
                ) {
                    if (unpackPseudos.has(name)) {
                        if (isQuote(selector.charCodeAt(selectorIndex + 1))) {
                            throw new Error(
                                `Pseudo-selector ${name} cannot be quoted`
                            );
                        }

                        data = [];
                        selectorIndex = parseSelector(
                            data,
                            selector,
                            selectorIndex + 1
                        );

                        if (
                            selector.charCodeAt(selectorIndex) !==
                            CharCode.RightParenthesis
                        ) {
                            throw new Error(
                                `Missing closing parenthesis in :${name} (${selector})`
                            );
                        }

                        selectorIndex += 1;
                    } else {
                        data = readValueWithParenthesis();

                        if (stripQuotesFromPseudos.has(name)) {
                            const quot = data.charCodeAt(0);

                            if (
                                quot === data.charCodeAt(data.length - 1) &&
                                isQuote(quot)
                            ) {
                                data = data.slice(1, -1);
                            }
                        }

                        data = unescapeCSS(data);
                    }
                }

                tokens.push({ type: SelectorType.Pseudo, name, data });
                break;
            }
            case CharCode.Comma: {
                finalizeSubselector();
                tokens = [];
                stripWhitespace(1);
                break;
            }
            default: {
                if (selector.startsWith("/*", selectorIndex)) {
                    const endIndex = selector.indexOf("*/", selectorIndex + 2);

                    if (endIndex < 0) {
                        throw new Error("Comment was not terminated");
                    }

                    selectorIndex = endIndex + 2;

                    // Remove leading whitespace
                    if (tokens.length === 0) {
                        stripWhitespace(0);
                    }

                    break;
                }

                let namespace = null;
                let name: string;

                if (firstChar === CharCode.Asterisk) {
                    selectorIndex += 1;
                    name = "*";
                } else if (firstChar === CharCode.Pipe) {
                    name = "";

                    if (
                        selector.charCodeAt(selectorIndex + 1) === CharCode.Pipe
                    ) {
                        addTraversal(SelectorType.ColumnCombinator);
                        stripWhitespace(2);
                        break;
                    }
                } else if (reName.test(selector.slice(selectorIndex))) {
                    name = getName(0);
                } else {
                    break loop;
                }

                if (
                    selector.charCodeAt(selectorIndex) === CharCode.Pipe &&
                    selector.charCodeAt(selectorIndex + 1) !== CharCode.Pipe
                ) {
                    namespace = name;
                    if (
                        selector.charCodeAt(selectorIndex + 1) ===
                        CharCode.Asterisk
                    ) {
                        name = "*";
                        selectorIndex += 2;
                    } else {
                        name = getName(1);
                    }
                }

                tokens.push(
                    name === "*"
                        ? { type: SelectorType.Universal, namespace }
                        : { type: SelectorType.Tag, name, namespace }
                );
            }
        }
    }

    finalizeSubselector();
    return selectorIndex;
}
