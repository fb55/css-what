import { Selector } from "./parse";

const actionTypes: { [key: string]: string } = {
    equals: "",
    element: "~",
    start: "^",
    end: "$",
    any: "*",
    not: "!",
    hyphen: "|"
};

const simpleSelectors: { [key: string]: string } = {
    child: " > ",
    parent: " < ",
    sibling: " ~ ",
    adjacent: " + ",
    descendant: " ",
    universal: "*"
};

export default function stringify(token: Selector[][]): string {
    return token.map(stringifySubselector).join(", ");
}

function stringifySubselector(token: Selector[]): string {
    return token.map(stringifyToken).join("");
}

function stringifyToken(token: Selector): string {
    if (token.type in simpleSelectors) return simpleSelectors[token.type];

    if (token.type === "tag") return escapeName(token.name);
    if (token.type === "pseudo-element") return `::${escapeName(token.name)}`;

    if (token.type === "attribute") {
        if (token.action === "exists") return `[${escapeName(token.name)}]`;
        if (
            token.name === "id" &&
            token.action === "equals" &&
            !token.ignoreCase
        )
            return `#${escapeName(token.value)}`;
        if (
            token.name === "class" &&
            token.action === "element" &&
            !token.ignoreCase
        )
            return `.${escapeName(token.value)}`;
        return (
            "[" +
            escapeName(token.name) +
            actionTypes[token.action] +
            "='" +
            escapeName(token.value) +
            "'" +
            (token.ignoreCase ? "i" : "") +
            "]"
        );
    }

    if (token.type === "pseudo") {
        if (token.data === null) return `:${escapeName(token.name)}`;
        if (typeof token.data === "string") {
            return `:${escapeName(token.name)}(${token.data})`;
        }
        return `:${escapeName(token.name)}(${stringify(token.data)})`;
    }

    throw new Error("Unknown type");
}

function escapeName(str: string): string {
    //TODO
    return str;
}
