"use strict";

module.exports = parse;

var re_ws = /^\s/,
    re_name = /^(?:\\.|[\w\-\u00c0-\uFFFF])+/,
    re_escape = /\\([\da-f]{1,6}\s?|(\s)|.)/ig,
    //modified version of https://github.com/jquery/sizzle/blob/master/src/sizzle.js#L87
    re_attr = /^\s*((?:\\.|[\w\u00c0-\uFFFF\-])+)\s*(?:(\S?)=\s*(?:(['"])(.*?)\3|(#?(?:\\.|[\w\u00c0-\uFFFF\-])*)|)|)\s*(i)?\]/;

var actionTypes = {
	__proto__: null,
	"undefined": "exists",
	"":  "equals",
	"~": "element",
	"^": "start",
	"$": "end",
	"*": "any",
	"!": "not",
	"|": "hyphen"
};

var simpleSelectors = {
	__proto__: null,
	">": "child",
	"<": "parent",
	"~": "sibling",
	"+": "adjacent"
};

var attribSelectors = {
	__proto__: null,
	"#": ["id", "equals"],
	".": ["class", "element"]
};

//pseudos, whose data-property is parsed as well
var unpackPseudos = {
    __proto__: null,
    "has": true,
    "not": true,
    "matches": true
};

var stripQuotesFromPseudos = {
    __proto__: null,
    "contains": true
};

var quotes = {
    __proto__: null,
    "\"": true,
    "'": true
};

//unescape function taken from https://github.com/jquery/sizzle/blob/master/src/sizzle.js#L139
function funescape( _, escaped, escapedWhitespace ) {
	var high = "0x" + escaped - 0x10000;
	// NaN means non-codepoint
	// Support: Firefox
	// Workaround erroneous numeric interpretation of +"0x"
	return high !== high || escapedWhitespace ?
		escaped :
		// BMP codepoint
		high < 0 ?
			String.fromCharCode( high + 0x10000 ) :
			// Supplemental Plane codepoint (surrogate pair)
			String.fromCharCode( high >> 10 | 0xD800, high & 0x3FF | 0xDC00 );
}

function unescapeCSS(str){
	return str.replace(re_escape, funescape);
}

function parse(selector, options){
	var subselects = [];

    selector = parseSelector(subselects, selector + "", options);

    if(selector !== ""){
        throw new SyntaxError("Unmatched selector: " + selector);
    }

    return subselects;
}

function parseSelector(subselects, selector, options){
    var tokens = [],
        sawWS = false,
        data, firstChar, name, quot;

    if (!String.prototype.trimLeft) {
        String.prototype.trimLeft = function(){
            return this.replace(/^\s+/, "");
        }
    }

    selector = selector.trimLeft();

	function getName(){
		var sub = selector.match(re_name)[0];
		selector = selector.substr(sub.length);
		return unescapeCSS(sub);
	}

	while(selector !== ""){
		if(re_name.test(selector)){
			if(sawWS){
				tokens.push({type: "descendant"});
				sawWS = false;
			}

			name = getName();

			if(!options || ("lowerCaseTags" in options ? options.lowerCaseTags : !options.xmlMode)){
				name = name.toLowerCase();
			}

			tokens.push({type: "tag", name: name});
		} else if(re_ws.test(selector)){
			sawWS = true;
			selector = selector.trimLeft();
		} else {
			firstChar = selector.charAt(0);
			selector = selector.substr(1);

			if(firstChar in simpleSelectors){
				tokens.push({type: simpleSelectors[firstChar]});
				selector = selector.trimLeft();
				sawWS = false;
				continue;
			} else if(firstChar === ","){
				if(tokens.length === 0){
					throw new SyntaxError("empty sub-selector");
				}
				subselects.push(tokens);
				tokens = [];

				selector = selector.trimLeft();
				sawWS = false;
				continue;
			} else if(sawWS){
				tokens.push({type: "descendant"});
				sawWS = false;
			}

			if(firstChar === "*"){
				tokens.push({type: "universal"});
			} else if(firstChar in attribSelectors){
				tokens.push({
					type: "attribute",
					name: attribSelectors[firstChar][0],
					action: attribSelectors[firstChar][1],
					value: getName(),
					ignoreCase: false
				});
			} else if(firstChar === "["){
				data = selector.match(re_attr);
				if(!data){
					throw new SyntaxError("Malformed attribute selector: " + selector);
				}
				selector = selector.substr(data[0].length);
				name = unescapeCSS(data[1]);

				if(
					!options || (
						"lowerCaseAttributeNames" in options ?
							options.lowerCaseAttributeNames :
							!options.xmlMode
					)
				){
					name = name.toLowerCase();
				}

				tokens.push({
					type: "attribute",
					name: name,
					action: actionTypes[data[2]],
					value: unescapeCSS(data[4] || data[5] || ""),
					ignoreCase: !!data[6]
				});

			} else if(firstChar === ":"){
				//if(selector.charAt(0) === ":"){} //TODO pseudo-element
				name = getName().toLowerCase();
				data = null;

				if(selector.charAt(0) === "("){
                    if(name in unpackPseudos){
                        quot = selector.charAt(1);
                        var quoted = quot in quotes;

                        selector = selector.substr(quoted + 1);

                        data = [];
                        selector = parseSelector(data, selector, options);

                        if(quoted){
                            if(selector.charAt(0) !== quot){
                                throw new SyntaxError("unmatched quotes in :" + name);
                            } else {
                                selector = selector.substr(1);
                            }
                        }

                        if(selector.charAt(0) !== ")"){
                            throw new SyntaxError("missing closing parenthesis in :" + name + " " + selector);
                        }

                        selector = selector.substr(1);
                    } else {
                        var pos = 1, counter = 1;

                        for(; counter > 0 && pos < selector.length; pos++){
                            if(selector.charAt(pos) === "(") counter++;
                            else if(selector.charAt(pos) === ")") counter--;
                        }

                        if(counter){
                            throw new SyntaxError("parenthesis not matched");
                        }

    					data = selector.substr(1, pos - 2);
    					selector = selector.substr(pos);

                        if(name in stripQuotesFromPseudos){
                            quot = data.charAt(0);

                        	if(quot === data.slice(-1) && quot in quotes){
                        		data = data.slice(1, -1);
                        	}

                            if(name in unpackPseudos){
                                data = parse(data, options);
                            }
                        }
                    }
				}

				tokens.push({type: "pseudo", name: name, data: data});
			} else {
                if(tokens.length && tokens[tokens.length - 1].type === "descendant"){
                    tokens.pop();
                }
                addToken(subselects, tokens);
                return firstChar + selector;
			}
		}
	}

    addToken(subselects, tokens);

	return selector;
}

function addToken(subselects, tokens){
    if(subselects.length > 0 && tokens.length === 0){
    	throw new SyntaxError("empty sub-selector");
    }

	subselects.push(tokens);
}
