import {
    AttributeAction,
    type AttributeSelector,
    type DataType,
    type Selector,
    SelectorType,
    type Traversal,
    type TraversalType,
} from "./types.js";

// eslint-disable-next-line unicorn/prefer-unicode-code-point-escapes -- regex has no `u` flag; code-point escapes would require it and alter matching semantics
const reName = /^[^#\\]?(?:\\(?:[\da-f]{1,6}\s?|.)|[\w\u00B0-\uFFFF-])+/;
const reEscape = /\\([\da-f]{1,6}\s?|(\s)|.)/gi;
const reNewline = /\r\n?|\f/g;

const enum CharCode {
    LeftParenthesis = 40,
    RightParenthesis = 41,
    LeftSquareBracket = 91,
    RightSquareBracket = 93,
    LeftCurlyBracket = 123,
    RightCurlyBracket = 125,
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
    Equal = 61,
    Dollar = 36,
    Pipe = 124,
    Circumflex = 94,
    Asterisk = 42,
    GreaterThan = 62,
    LessThan = 60,
    Hash = 35,
    At = 64,
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
 * Pseudo elements defined in CSS Level 1 and CSS Level 2 can be written with
 * a single colon; eg. :before will turn into ::before.
 * @see {@link https://www.w3.org/TR/2018/WD-selectors-4-20181121/#pseudo-element-syntax}
 */
const pseudosToPseudoElements = new Set([
    "before",
    "after",
    "first-line",
    "first-letter",
]);

/**
 * Checks whether a specific selector is a traversal.
 * This is useful eg. in swapping the order of elements that
 * are not traversals.
 * @param selector Selector to check.
 */
export function isTraversal(selector: Selector): selector is Traversal {
    switch (selector.type) {
        case SelectorType.Adjacent:
        case SelectorType.Child:
        case SelectorType.Descendant:
        case SelectorType.Parent:
        case SelectorType.Sibling:
        case SelectorType.ColumnCombinator: {
            return true;
        }
        case SelectorType.Attribute:
        case SelectorType.Pseudo:
        case SelectorType.PseudoElement:
        case SelectorType.Tag:
        case SelectorType.Universal: {
            return false;
        }
    }
}

const stripQuotesFromPseudos = new Set(["contains", "icontains"]);

function funescape(_: string, escaped: string, escapedWhitespace?: string) {
    const codePoint = Number.parseInt(escaped, 16);

    // NaN means non-codepoint (e.g., \X where X is not hex)
    if (Number.isNaN(codePoint) || escapedWhitespace) {
        return escaped;
    }

    // Per CSS spec: U+0000 and out-of-range values → U+FFFD
    if (codePoint === 0 || codePoint > 0x10_ff_ff) {
        return "\u{FFFD}";
    }

    return String.fromCodePoint(codePoint);
}

function unescapeCSS(cssString: string) {
    // eslint-disable-next-line unicorn/no-unsafe-string-replacement -- replacement is a function, not a string with `$` patterns; this is safe
    return cssString.replace(reEscape, funescape);
}

function unescapeCSSAtEOF(value: string, isQuoted: boolean): string {
    const parts: string[] = [];
    let sectionStart = 0;
    let selectorIndex = 0;

    while (selectorIndex < value.length) {
        if (value.charCodeAt(selectorIndex) !== CharCode.BackSlash) {
            selectorIndex += 1;
            continue;
        }

        parts.push(value.slice(sectionStart, selectorIndex));
        const escapeEnd = consumeEscape(value, selectorIndex);
        if (selectorIndex + 1 === value.length) {
            // An unfinished escape is ignored in a string and replaced in a name.
            parts.push(isQuoted ? "" : "\u{FFFD}");
        } else if (
            !(isQuoted && isNewline(value.charCodeAt(selectorIndex + 1)))
        ) {
            // Decode each source escape before removing string continuations.
            parts.push(
                unescapeCSS(
                    value
                        .slice(selectorIndex, escapeEnd)
                        .replaceAll(reNewline, "\n"),
                ),
            );
        }
        selectorIndex = escapeEnd;
        sectionStart = escapeEnd;
    }

    parts.push(value.slice(sectionStart));
    return parts.join("");
}

function isQuote(c: number): boolean {
    return c === CharCode.SingleQuote || c === CharCode.DoubleQuote;
}

function isNewline(c: number): boolean {
    return (
        // eslint-disable-next-line unicorn/prefer-includes-over-repeated-comparisons -- scanner predicate; `.includes()` allocates an array per call
        c === CharCode.NewLine ||
        c === CharCode.CarriageReturn ||
        c === CharCode.FormFeed
    );
}

// Return the closing quote, reconsumed newline, or EOF without consuming it.
function consumeString(selector: string, selectorIndex: number): number {
    const quote = selector.charCodeAt(selectorIndex++);

    while (selectorIndex < selector.length) {
        const code = selector.charCodeAt(selectorIndex);
        if (code === quote || isNewline(code)) {
            return selectorIndex;
        }

        if (code === CharCode.BackSlash) {
            selectorIndex = consumeEscape(selector, selectorIndex);
        } else {
            selectorIndex += 1;
        }
    }

    return selector.length;
}

function isWhitespace(c: number): boolean {
    return (
        // eslint-disable-next-line unicorn/prefer-includes-over-repeated-comparisons -- hot-path parser predicate; `.includes()` allocates an array per call
        c === CharCode.Space ||
        c === CharCode.Tab ||
        c === CharCode.NewLine ||
        c === CharCode.FormFeed ||
        c === CharCode.CarriageReturn
    );
}

function isHexDigit(c: number): boolean {
    return (
        (c >= 0x30 && c <= 0x39) ||
        (c >= 0x41 && c <= 0x46) ||
        (c >= 0x61 && c <= 0x66)
    );
}

function isNameChar(c: number): boolean {
    return (
        (c >= 0x30 && c <= 0x39) ||
        (c >= 0x41 && c <= 0x5a) ||
        (c >= 0x61 && c <= 0x7a) ||
        c === 0x2d ||
        c === 0x5f ||
        c >= 0x80
    );
}

function isValidEscape(selector: string, selectorIndex: number): boolean {
    return (
        selector.charCodeAt(selectorIndex) === CharCode.BackSlash &&
        !isNewline(selector.charCodeAt(selectorIndex + 1))
    );
}

// Return the first index after an escape, including optional hex whitespace.
function consumeEscape(selector: string, selectorIndex: number): number {
    const start = ++selectorIndex;
    while (
        selectorIndex < start + 6 &&
        isHexDigit(selector.charCodeAt(selectorIndex))
    ) {
        selectorIndex += 1;
    }

    if (
        selectorIndex === start ||
        isWhitespace(selector.charCodeAt(selectorIndex))
    ) {
        // CSS preprocessing treats CRLF as one character.
        if (
            selector.charCodeAt(selectorIndex) === CharCode.CarriageReturn &&
            selector.charCodeAt(selectorIndex + 1) === CharCode.NewLine
        ) {
            selectorIndex += 1;
        }
        selectorIndex += 1;
    }

    return Math.min(selectorIndex, selector.length);
}

function consumeName(selector: string, selectorIndex: number): number {
    while (
        isNameChar(selector.charCodeAt(selectorIndex)) ||
        isValidEscape(selector, selectorIndex)
    ) {
        selectorIndex =
            selector.charCodeAt(selectorIndex) === CharCode.BackSlash
                ? consumeEscape(selector, selectorIndex)
                : selectorIndex + 1;
    }
    return selectorIndex;
}

function getUrlArgumentStart(
    selector: string,
    nameStart: number,
    nameEnd: number,
): number {
    if (
        selector.charCodeAt(nameEnd) !== CharCode.LeftParenthesis ||
        unescapeCSS(
            selector.slice(nameStart, nameEnd).replaceAll("\r\n", "\n"),
        ).toLowerCase() !== "url"
    ) {
        return -1;
    }

    let argumentStart = nameEnd + 1;
    while (isWhitespace(selector.charCodeAt(argumentStart))) {
        argumentStart += 1;
    }
    return isQuote(selector.charCodeAt(argumentStart)) ? -1 : argumentStart;
}

// Unquoted URL tokens and bad-url remnants end at the first unescaped `)`.
function consumeUrl(selector: string, selectorIndex: number): number {
    while (selectorIndex < selector.length) {
        if (selector.charCodeAt(selectorIndex) === CharCode.RightParenthesis) {
            return selectorIndex + 1;
        }
        selectorIndex = isValidEscape(selector, selectorIndex)
            ? consumeEscape(selector, selectorIndex)
            : selectorIndex + 1;
    }
    return selector.length;
}

/** Options for parsing selectors. */
export interface ParseOptions {
    /** Ignore invalid branches in :is() and :where(). Defaults to false. */
    forgiving?: boolean;
}

interface ParseContext {
    forgiving: boolean;
    depth: number;
    inForgiving: boolean;
    // A forgiving subtree consumed EOF, allowing its enclosing functions to finish.
    eofRecovered: boolean;
}

class ParseError extends Error {
    // Resume at the failed token, rather than rescanning completed nested selectors.
    readonly syncStart: number;
    readonly depth: number;

    constructor(message: string, syncStart: number, depth: number) {
        super(message);
        this.syncStart = syncStart;
        this.depth = depth;
    }
}

function skipInvalidSelector(
    selector: string,
    selectorIndex: number,
    depth: number,
): number {
    // These parentheses belong to strict calls between the failure and this list.
    const closing = Array<number>(depth).fill(CharCode.RightParenthesis);

    while (selectorIndex < selector.length) {
        const code = selector.charCodeAt(selectorIndex);

        if (isQuote(code)) {
            selectorIndex = consumeString(selector, selectorIndex);
            if (selector.charCodeAt(selectorIndex) === code) {
                selectorIndex += 1;
            }
            continue;
        }

        if (selector.startsWith("/*", selectorIndex)) {
            const end = selector.indexOf("*/", selectorIndex + 2);
            if (end === -1) {
                return selector.length;
            }
            selectorIndex = end + 2;
            continue;
        }

        if (
            (code === CharCode.Hash || code === CharCode.At) &&
            (isNameChar(selector.charCodeAt(selectorIndex + 1)) ||
                isValidEscape(selector, selectorIndex + 1))
        ) {
            selectorIndex = consumeName(selector, selectorIndex + 1);
            continue;
        }

        if (isNameChar(code) || isValidEscape(selector, selectorIndex)) {
            const nameStart = selectorIndex;
            selectorIndex = consumeName(selector, selectorIndex);
            const argumentStart = getUrlArgumentStart(
                selector,
                nameStart,
                selectorIndex,
            );
            if (argumentStart >= 0) {
                selectorIndex = consumeUrl(selector, argumentStart);
            }
            continue;
        }

        switch (code) {
            case CharCode.LeftParenthesis: {
                closing.push(CharCode.RightParenthesis);
                // eslint-disable-next-line unicorn/no-break-in-nested-loop
                break;
            }
            case CharCode.LeftSquareBracket: {
                closing.push(CharCode.RightSquareBracket);
                // eslint-disable-next-line unicorn/no-break-in-nested-loop
                break;
            }
            case CharCode.LeftCurlyBracket: {
                closing.push(CharCode.RightCurlyBracket);
                // eslint-disable-next-line unicorn/no-break-in-nested-loop
                break;
            }
            case CharCode.RightParenthesis:
            case CharCode.RightSquareBracket:
            case CharCode.RightCurlyBracket: {
                if (
                    closing.length === 0 &&
                    code === CharCode.RightParenthesis
                ) {
                    return selectorIndex;
                }
                if (closing[closing.length - 1] === code) {
                    closing.pop();
                }
                // eslint-disable-next-line unicorn/no-break-in-nested-loop
                break;
            }
            case CharCode.Comma: {
                if (closing.length === 0) {
                    return selectorIndex;
                }
                // eslint-disable-next-line unicorn/no-break-in-nested-loop
                break;
            }
        }

        selectorIndex += 1;
    }

    return selector.length;
}

function parseForgivingSelector(
    subselects: Selector[][],
    selector: string,
    selectorIndex: number,
    context: ParseContext,
): number {
    while (selectorIndex < selector.length) {
        // Keep the entire branch separate until parsing it succeeds.
        const candidate: Selector[][] = [];
        try {
            selectorIndex = parseSelector(
                candidate,
                selector,
                selectorIndex,
                context,
                true,
            );
            subselects.push(...candidate);
        } catch (error) {
            if (!(error instanceof ParseError)) {
                throw error;
            }
            selectorIndex = skipInvalidSelector(
                selector,
                error.syncStart,
                error.depth - context.depth,
            );
        }

        if (selector.charCodeAt(selectorIndex) !== CharCode.Comma) {
            if (selectorIndex === selector.length) {
                context.eofRecovered = true;
            }
            return selectorIndex;
        }
        selectorIndex += 1;
    }

    context.eofRecovered = true;
    return selectorIndex;
}

/**
 * Parses `selector`.
 * @param selector Selector to parse.
 * @param options Parser options.
 * @returns Returns a two-dimensional array.
 * The first dimension represents selectors separated by commas (eg. `sub1, sub2`),
 * the second contains the relevant tokens for that selector.
 */
export function parse(
    selector: string,
    options: ParseOptions = {},
): Selector[][] {
    const subselects: Selector[][] = [];

    const endIndex = parseSelector(subselects, selector, 0, {
        forgiving: options.forgiving ?? false,
        depth: 0,
        inForgiving: false,
        eofRecovered: false,
    });

    if (endIndex < selector.length) {
        throw new Error(`Unmatched selector: ${selector.slice(endIndex)}`);
    }

    return subselects;
}

function parseSelector(
    subselects: Selector[][],
    selector: string,
    selectorIndex: number,
    context: ParseContext,
    shouldStopAtComma = false,
): number {
    let tokens: Selector[] = [];
    let tokenStart = selectorIndex;

    function syntaxError(message: string): Error {
        return context.inForgiving
            ? new ParseError(message, tokenStart, context.depth)
            : new Error(message);
    }

    function getName(offset: number): string {
        const match = selector.slice(selectorIndex + offset).match(reName);

        if (!match) {
            throw syntaxError(
                context.inForgiving
                    ? "Expected name"
                    : `Expected name, found ${selector.slice(selectorIndex)}`,
            );
        }

        const [name] = match;
        selectorIndex += offset + name.length;
        return unescapeCSS(name);
    }

    function getSelectorName(offset: number): string {
        const nameStart = selectorIndex + offset;
        if (context.inForgiving) {
            const nameEnd = consumeName(selector, nameStart);
            if (nameEnd === nameStart) {
                throw syntaxError("Expected name");
            }
            if (getUrlArgumentStart(selector, nameStart, nameEnd) >= 0) {
                // URL tokens are not selectors; recover from their atomic boundary.
                throw syntaxError("Unexpected URL token");
            }
        }
        return getName(offset);
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

    function readQuotedArgument(): string | null {
        const start = selectorIndex + 1;
        const quote = selector.charCodeAt(start);
        if (!isQuote(quote)) {
            return null;
        }

        const stringEnd = consumeString(selector, start);
        if (stringEnd === selector.length) {
            selectorIndex = selector.length;
            context.eofRecovered = true;
            return unescapeCSSAtEOF(selector.slice(start + 1), true);
        }

        const hasClosingParenthesis =
            selector.charCodeAt(stringEnd + 1) === CharCode.RightParenthesis;
        if (
            selector.charCodeAt(stringEnd) !== quote ||
            (!hasClosingParenthesis && stringEnd + 1 !== selector.length)
        ) {
            return null;
        }

        selectorIndex = hasClosingParenthesis ? stringEnd + 2 : selector.length;
        if (!hasClosingParenthesis) {
            context.eofRecovered = true;
        }
        return unescapeCSS(selector.slice(start + 1, stringEnd));
    }

    function readValueWithParenthesis(isStringArgument = false): string {
        selectorIndex += 1;
        const start = selectorIndex;
        let expectedEnd = -1;

        if (
            context.inForgiving &&
            isStringArgument &&
            isQuote(selector.charCodeAt(start))
        ) {
            const stringEnd = consumeString(selector, start);
            let end = stringEnd + 1;
            while (isWhitespace(selector.charCodeAt(end))) {
                end++;
            }

            if (
                selector.charCodeAt(stringEnd) === selector.charCodeAt(start) &&
                end > stringEnd + 1 &&
                selector.charCodeAt(end) === CharCode.RightParenthesis
            ) {
                // Validate the quoted boundary without changing legacy decoding.
                expectedEnd = end;
            }
        }

        for (
            let counter = 1;
            selectorIndex < selector.length;
            selectorIndex++
        ) {
            if (
                expectedEnd >= 0 &&
                selectorIndex >= expectedEnd &&
                (selectorIndex !== expectedEnd || counter !== 1)
            ) {
                throw syntaxError("Parenthesis not matched");
            }

            switch (selector.charCodeAt(selectorIndex)) {
                case CharCode.BackSlash: {
                    // Skip next character
                    selectorIndex += 1;
                    // eslint-disable-next-line unicorn/no-break-in-nested-loop
                    break;
                }
                case CharCode.LeftParenthesis: {
                    counter += 1;
                    // eslint-disable-next-line unicorn/no-break-in-nested-loop
                    break;
                }
                case CharCode.RightParenthesis: {
                    counter -= 1;

                    if (counter === 0) {
                        if (expectedEnd >= 0 && selectorIndex !== expectedEnd) {
                            throw syntaxError("Parenthesis not matched");
                        }
                        return unescapeCSS(
                            selector.slice(start, selectorIndex++),
                        );
                    }

                    // eslint-disable-next-line unicorn/no-break-in-nested-loop
                    break;
                }
            }
        }

        if (context.inForgiving) {
            selectorIndex = selector.length;
            context.eofRecovered = true;
            return unescapeCSS(selector.slice(start));
        }
        throw syntaxError("Parenthesis not matched");
    }

    function ensureNotTraversal() {
        if (tokens.length > 0 && isTraversal(tokens[tokens.length - 1])) {
            throw syntaxError("Did not expect successive traversals.");
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
            value: (name === "class" ? getSelectorName : getName)(1),
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
            tokens.length > 0 &&
            tokens[tokens.length - 1].type === SelectorType.Descendant
        ) {
            tokens.pop();
        }

        if (tokens.length === 0) {
            throw syntaxError("Empty sub-selector");
        }

        subselects.push(tokens);
    }

    stripWhitespace(0);

    if (selector.length === selectorIndex) {
        if (context.inForgiving) {
            throw syntaxError("Empty sub-selector");
        }
        return selectorIndex;
    }

    loop: while (selectorIndex < selector.length) {
        tokenStart = selectorIndex;
        const firstChar = selector.charCodeAt(selectorIndex);

        if (context.inForgiving && isQuote(firstChar)) {
            throw syntaxError("Expected a selector, found a string");
        }

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
                // eslint-disable-next-line unicorn/no-break-in-nested-loop
                break;
            }
            // Traversals
            case CharCode.GreaterThan: {
                addTraversal(SelectorType.Child);
                stripWhitespace(1);
                // eslint-disable-next-line unicorn/no-break-in-nested-loop
                break;
            }
            case CharCode.LessThan: {
                addTraversal(SelectorType.Parent);
                stripWhitespace(1);
                // eslint-disable-next-line unicorn/no-break-in-nested-loop
                break;
            }
            case CharCode.Tilde: {
                addTraversal(SelectorType.Sibling);
                stripWhitespace(1);
                // eslint-disable-next-line unicorn/no-break-in-nested-loop
                break;
            }
            case CharCode.Plus: {
                addTraversal(SelectorType.Adjacent);
                stripWhitespace(1);
                // eslint-disable-next-line unicorn/no-break-in-nested-loop
                break;
            }
            // Special attribute selectors: .class, #id
            case CharCode.Period: {
                addSpecialAttribute("class", AttributeAction.Element);
                // eslint-disable-next-line unicorn/no-break-in-nested-loop
                break;
            }
            case CharCode.Hash: {
                addSpecialAttribute("id", AttributeAction.Equals);
                // eslint-disable-next-line unicorn/no-break-in-nested-loop
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

                // Support unescaped colons in attribute names (e.g., xml:lang)
                while (selector.charCodeAt(selectorIndex) === CharCode.Colon) {
                    name += `:${getName(1)}`;
                }

                stripWhitespace(0);

                // Determine comparison operation

                let action: AttributeAction = AttributeAction.Exists;
                const possibleAction = actionTypes.get(
                    selector.charCodeAt(selectorIndex),
                );

                if (possibleAction) {
                    action = possibleAction;

                    if (
                        selector.charCodeAt(selectorIndex + 1) !==
                        CharCode.Equal
                    ) {
                        throw syntaxError("Expected `=`");
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
                        const sectionStart = selectorIndex + 1;
                        if (context.inForgiving) {
                            selectorIndex = consumeString(
                                selector,
                                selectorIndex,
                            );
                            if (isNewline(selector.charCodeAt(selectorIndex))) {
                                throw syntaxError("Attribute value didn't end");
                            }
                        } else {
                            selectorIndex += 1;
                            while (
                                selectorIndex < selector.length &&
                                selector.charCodeAt(selectorIndex) !== quote
                            ) {
                                selectorIndex +=
                                    // Skip next character if it is escaped
                                    selector.charCodeAt(selectorIndex) ===
                                    CharCode.BackSlash
                                        ? 2
                                        : 1;
                            }
                        }

                        if (selector.charCodeAt(selectorIndex) !== quote) {
                            if (!context.inForgiving) {
                                throw syntaxError("Attribute value didn't end");
                            }
                            selectorIndex = selector.length;
                        }

                        const rawValue = selector.slice(
                            sectionStart,
                            selectorIndex,
                        );
                        value =
                            context.inForgiving &&
                            selectorIndex === selector.length
                                ? unescapeCSSAtEOF(rawValue, true)
                                : unescapeCSS(rawValue);
                        if (selector.charCodeAt(selectorIndex) === quote) {
                            selectorIndex += 1;
                        }
                    } else {
                        const valueStart = selectorIndex;

                        while (
                            selectorIndex < selector.length &&
                            !isWhitespace(selector.charCodeAt(selectorIndex)) &&
                            selector.charCodeAt(selectorIndex) !==
                                CharCode.RightSquareBracket
                        ) {
                            selectorIndex +=
                                // Skip next character if it is escaped
                                selector.charCodeAt(selectorIndex) ===
                                CharCode.BackSlash
                                    ? 2
                                    : 1;
                        }

                        if (context.inForgiving) {
                            selectorIndex = Math.min(
                                selectorIndex,
                                selector.length,
                            );
                        }

                        const rawValue = selector.slice(
                            valueStart,
                            selectorIndex,
                        );
                        value =
                            context.inForgiving &&
                            selectorIndex === selector.length
                                ? unescapeCSSAtEOF(rawValue, false)
                                : unescapeCSS(rawValue);
                    }

                    stripWhitespace(0);

                    // See if we have a force ignore flag
                    switch (selector.charCodeAt(selectorIndex) | 0x20) {
                        // If the forceIgnore flag is set (either `i` or `s`), use that value
                        case CharCode.LowerI: {
                            ignoreCase = true;
                            stripWhitespace(1);
                            // eslint-disable-next-line unicorn/no-break-in-nested-loop
                            break;
                        }
                        case CharCode.LowerS: {
                            ignoreCase = false;
                            stripWhitespace(1);
                            // eslint-disable-next-line unicorn/no-break-in-nested-loop
                            break;
                        }
                    }
                }

                if (
                    selector.charCodeAt(selectorIndex) ===
                    CharCode.RightSquareBracket
                ) {
                    selectorIndex += 1;
                } else {
                    if (
                        !context.inForgiving ||
                        selectorIndex !== selector.length
                    ) {
                        throw syntaxError(
                            "Attribute selector didn't terminate",
                        );
                    }
                    context.eofRecovered = true;
                }

                const attributeSelector: AttributeSelector = {
                    type: SelectorType.Attribute,
                    name,
                    action,
                    value,
                    namespace,
                    ignoreCase,
                };

                tokens.push(attributeSelector);
                // eslint-disable-next-line unicorn/no-break-in-nested-loop
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
                    // eslint-disable-next-line unicorn/no-break-in-nested-loop
                    break;
                }

                const name = getName(1).toLowerCase();

                if (pseudosToPseudoElements.has(name)) {
                    tokens.push({
                        type: SelectorType.PseudoElement,
                        name,
                        data: null,
                    });
                    // eslint-disable-next-line unicorn/no-break-in-nested-loop
                    break;
                }

                let data: DataType = null;

                if (
                    selector.charCodeAt(selectorIndex) ===
                    CharCode.LeftParenthesis
                ) {
                    if (unpackPseudos.has(name)) {
                        const isForgiving =
                            context.forgiving &&
                            (name === "is" || name === "where");
                        if (
                            !isForgiving &&
                            isQuote(selector.charCodeAt(selectorIndex + 1))
                        ) {
                            throw syntaxError(
                                `Pseudo-selector ${name} cannot be quoted`,
                            );
                        }

                        data = [];
                        const childContext: ParseContext = {
                            forgiving: context.forgiving,
                            depth: context.depth + 1,
                            inForgiving: context.inForgiving || isForgiving,
                            eofRecovered: false,
                        };
                        const parseList = isForgiving
                            ? parseForgivingSelector
                            : parseSelector;
                        selectorIndex = parseList(
                            data,
                            selector,
                            selectorIndex + 1,
                            childContext,
                        );

                        if (childContext.eofRecovered) {
                            context.eofRecovered = true;
                        }

                        if (
                            selector.charCodeAt(selectorIndex) ===
                            CharCode.RightParenthesis
                        ) {
                            selectorIndex += 1;
                        } else if (
                            selectorIndex !== selector.length ||
                            !(isForgiving || childContext.eofRecovered)
                        ) {
                            throw syntaxError(
                                `Missing closing parenthesis in :${name} (${selector})`,
                            );
                        }
                    } else {
                        const isStringArgument =
                            stripQuotesFromPseudos.has(name);
                        const quotedData =
                            context.inForgiving && isStringArgument
                                ? readQuotedArgument()
                                : null;

                        if (quotedData === null) {
                            data = readValueWithParenthesis(isStringArgument);

                            if (isStringArgument) {
                                const quot = data.charCodeAt(0);

                                if (
                                    quot === data.charCodeAt(data.length - 1) &&
                                    isQuote(quot)
                                ) {
                                    data = data.slice(1, -1);
                                }
                            }

                            data = unescapeCSS(data);
                        } else {
                            data = quotedData;
                        }
                    }
                }

                tokens.push({ type: SelectorType.Pseudo, name, data });
                // eslint-disable-next-line unicorn/no-break-in-nested-loop
                break;
            }
            case CharCode.Comma: {
                finalizeSubselector();
                if (shouldStopAtComma) {
                    return selectorIndex;
                }
                tokens = [];
                stripWhitespace(1);
                // eslint-disable-next-line unicorn/no-break-in-nested-loop
                break;
            }
            default: {
                if (selector.startsWith("/*", selectorIndex)) {
                    const endIndex = selector.indexOf("*/", selectorIndex + 2);

                    if (endIndex === -1) {
                        if (!context.inForgiving) {
                            throw syntaxError("Comment was not terminated");
                        }
                        selectorIndex = selector.length;
                        context.eofRecovered = true;
                    } else {
                        selectorIndex = endIndex + 2;
                    }

                    // Remove leading whitespace
                    if (tokens.length === 0) {
                        stripWhitespace(0);
                    }

                    // eslint-disable-next-line unicorn/no-break-in-nested-loop
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
                        // eslint-disable-next-line unicorn/no-break-in-nested-loop
                        break;
                    }
                } else if (reName.test(selector.slice(selectorIndex))) {
                    name = getSelectorName(0);
                } else {
                    if (
                        context.inForgiving &&
                        firstChar !== CharCode.RightParenthesis
                    ) {
                        throw syntaxError("Invalid selector");
                    }
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
                        name = getSelectorName(1);
                    }
                }

                tokens.push(
                    name === "*"
                        ? { type: SelectorType.Universal, namespace }
                        : { type: SelectorType.Tag, name, namespace },
                );
            }
        }
    }

    finalizeSubselector();
    if (context.inForgiving && selectorIndex === selector.length) {
        context.eofRecovered = true;
    }
    return selectorIndex;
}
