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
    /**
     * Quirks mode, for HTML documents that aren't HTML5.
     */
    quirksMode?: boolean;
}

export type Selector =
    | PseudoSelector
    | PseudoElement
    | AttributeSelector
    | TagSelector
    | UniversalSelector
    | Traversal;

export enum SelectorType {
    Attribute = "attribute",
    Pseudo = "pseudo",
    PseudoElement = "pseudo-element",
    Tag = "tag",
    Universal = "universal",

    // Traversals
    Adjacent = "adjacent",
    Child = "child",
    Descendant = "descendant",
    Parent = "parent",
    Sibling = "sibling",
}

export interface AttributeSelector {
    type: SelectorType.Attribute;
    name: string;
    action: AttributeAction;
    value: string;
    ignoreCase: boolean | null;
    namespace: string | null;
}

export type DataType = Selector[][] | null | string;

export interface PseudoSelector {
    type: SelectorType.Pseudo;
    name: string;
    data: DataType;
}

export interface PseudoElement {
    type: SelectorType.PseudoElement;
    name: string;
}

export interface TagSelector {
    type: SelectorType.Tag;
    name: string;
    namespace: string | null;
}

export interface UniversalSelector {
    type: SelectorType.Universal;
    namespace: string | null;
}

export interface Traversal {
    type: TraversalType;
}

export enum AttributeAction {
    Any = "any",
    Element = "element",
    End = "end",
    Equals = "equals",
    Exists = "exists",
    Hyphen = "hyphen",
    Not = "not",
    Start = "start",
}

export type TraversalType =
    | SelectorType.Adjacent
    | SelectorType.Child
    | SelectorType.Descendant
    | SelectorType.Parent
    | SelectorType.Sibling;
