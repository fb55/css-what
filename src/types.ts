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

export type DataType = Selector[][] | null | string;

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
