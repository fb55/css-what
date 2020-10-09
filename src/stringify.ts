import { Selector } from "./parse";

const actionTypes: { [key: string]: string } = {
    equals: "",
    element: "~",
    start: "^",
    end: "$",
    any: "*",
    not: "!",
    hyphen: "|",
};

const charsToEscape = new Set([
    ...Object.keys(actionTypes)
        .map((typeKey) => actionTypes[typeKey])
        .filter(Boolean),
    ":",
    "[",
    "]",
    " ",
    "\\",
]);

/**
 * Turns `selector` back into a string.
 *
 * @param selector Selector to stringify.
 */
export default function stringify(selector: Selector[][]): string {
    return selector.map(stringifySubselector).join(", ");
}

function stringifySubselector(token: Selector[]): string {
    return token.map(stringifyToken).join("");
}

function stringifyToken(token: Selector): string {
    switch (token.type) {
        // Simple types
        case "child":
            return " > ";
        case "parent":
            return " < ";
        case "sibling":
            return " ~ ";
        case "adjacent":
            return " + ";
        case "descendant":
            return " ";
        case "universal":
            return "*";

        case "tag":
            return escapeName(token.name);

        case "pseudo-element":
            return `::${escapeName(token.name)}`;

        case "pseudo":
            if (token.data === null) return `:${escapeName(token.name)}`;
            if (typeof token.data === "string") {
                return `:${escapeName(token.name)}(${token.data})`;
            }
            return `:${escapeName(token.name)}(${stringify(token.data)})`;

        case "attribute":
            if (token.action === "exists") {
                return `[${escapeName(token.name)}]`;
            }
            if (
                token.name === "id" &&
                token.action === "equals" &&
                !token.ignoreCase
            ) {
                return `#${escapeName(token.value)}`;
            }
            if (
                token.name === "class" &&
                token.action === "element" &&
                !token.ignoreCase
            ) {
                return `.${escapeName(token.value)}`;
            }

            return `[${escapeName(token.name)}${
                actionTypes[token.action]
            }='${escapeName(token.value)}'${token.ignoreCase ? "i" : ""}]`;
    }
}

function escapeName(str: string): string {
    return str
        .split("")
        .map((c) => (charsToEscape.has(c) ? `\\${c}` : c))
        .join("");
}
