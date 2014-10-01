"use strict";

module.exports = parse;

var re_ws = /^\s/,
    re_name = /^(?:\\.|[\w\-\u00c0-\uFFFF])+/,
    re_escape = /\\([\da-f]{1,6}\s?|(\s)|.)/ig,
    //modified version of https://github.com/jquery/sizzle/blob/master/src/sizzle.js#L87
    re_attr = /^(\s*)((?:\\.|[\w\u00c0-\uFFFF\-])+)(\s*)(?:(\S?)=(\s*)(?:(['"])(.*?)\6|(#?(?:\\.|[\w\u00c0-\uFFFF\-])*)|)|)(\s*)(i)?\]/;

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

function getClosingPos(selector){
	var pos = 1, counter = 1, len = selector.length;

	for(; counter > 0 && pos < len; pos++){
		if(selector.charAt(pos) === "(") counter++;
		else if(selector.charAt(pos) === ")") counter--;
	}

	return pos;
}

function parse(selector, options){
  var value,
      escaped_name,
      selectorette = [],
      selectors = [];

	selector = (selector + "").trimLeft();

	var subselects = [],
	    tokens = [],
	    sawWS = false,
	    data, firstChar, name;
	
	function getName(){
		var sub =  selector.match(re_name)[0];
    escaped_name = sub;
		selector = selector.substr(sub.length);
		return unescapeCSS(sub);
	}

	while(selector !== ""){
		if(re_name.test(selector)){
			if(sawWS){
        selectorette.push(" ");
				tokens.push({type: "descendant"});
				sawWS = false;
			}

			name = getName();
      selectorette.push(escaped_name);

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
        if (sawWS){
          selectorette.push(" ");
        }
        selectorette.push(firstChar);
        tokens.push({type: simpleSelectors[firstChar]});

        if(re_ws.test(selector)){
          selectorette.push(" ");
        }
				selector = selector.trimLeft();
				sawWS = false;
				continue;
			} else if(firstChar === ","){
				if(tokens.length === 0){
					throw new SyntaxError("empty sub-selector");
				}

        subselects.push(tokens);
				tokens = [];

        selectors.push(selectorette.join(""));
        selectorette = [];

        selector = selector.trimLeft();
				sawWS = false;
				continue;
			} else if(sawWS){
        selectorette.push(" ");
        tokens.push({type: "descendant"});
				sawWS = false;
			}

			if(firstChar === "*"){
        selectorette.push(firstChar);
        tokens.push({type: "universal"});
			} else if(firstChar in attribSelectors){
        tokens.push({
					type: "attribute",
					name: attribSelectors[firstChar][0],
					action: attribSelectors[firstChar][1],
					value: getName(),
					ignoreCase: false
				});
        selectorette.push(firstChar + escaped_name);
			} else if(firstChar === "["){
				data = selector.match(re_attr);
				if(!data){
					throw new SyntaxError("Malformed attribute selector: " + selector);
				}
				selector = selector.substr(data[0].length);
				name = unescapeCSS(data[2]);

				if(
					!options || (
						"lowerCaseAttributeNames" in options ?
							options.lowerCaseAttributeNames :
							!options.xmlMode
					)
				){
					name = name.toLowerCase();
				}

        value = data[7] || data[8] || "";
				tokens.push({
					type: "attribute",
					name: name,
					action: actionTypes[data[4]],
					value: unescapeCSS(value),
					ignoreCase: !!data[10]
				});

        // reconstruct selector from data
        data[4] = data[4] !== undefined ? data[4] + "=" : "";
        data[5] = data[5] || "";
        data[6] = data[6] || "";

        selectorette.push(                   // "[ href *= 'google' i]"
          firstChar +                        // [
          data[1] + data[2] + data[3] +      // \s href \s
          data[4] + data[5] +                // *= \s
          data[6] + value + data[6] +        // \'(google || undefined || '')\'
          data[9] + (data[10] || "") +       // \s i
          "]");                              // ]

			} else if(firstChar === ":"){
				//if(selector.charAt(0) === ":"){} //TODO pseudo-element
				name = getName().toLowerCase();
				data = null;
				
				if(selector.charAt(0) === "("){
					var pos = getClosingPos(selector);
					data = selector.substr(1, pos - 2);
					selector = selector.substr(pos);
				}
				
				tokens.push({type: "pseudo", name: name, data: data});
        selectorette.push(firstChar + escaped_name + (data ? "(" + data + ")" : ""));
			} else {
				//otherwise, the parser needs to throw or it would enter an infinite loop
				throw new SyntaxError("Unmatched selector: " + firstChar + selector);
			}
		}
	}
	
	if(subselects.length > 0 && tokens.length === 0){
		throw new SyntaxError("empty sub-selector");
	}

  selectors.push(selectorette.join(""));
  if (options) {
    options.selectors = selectors;
  }

  subselects.push(tokens);

	return subselects;
}