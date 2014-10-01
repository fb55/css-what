var assert = require("assert"),
    CSSwhat = require("../");

/**
 * tests = [test, ...] : where
 *   test = [
 *     0: selector
 *     1: expected parse result
 *     2: test name
 *     3: (optional) expected tokenized selectors (reverts to test[0] if none given)
 *   ]
 * @type {*[]}
 */
var tests = [
	//tag names
	[
		'div',
		[
			[
				{
					'type': 'tag',
					'name': 'div'
				}
			]
		],
		'simple tag'
	],
	[
		'*',
		[
			[
				{
					'type': 'universal'
				}
			]
		],
		'universal'
	],

	//traversal
	[
		'div div',
		[
			[
				{
					'type': 'tag',
					'name': 'div'
				},
				{
					'type': 'descendant'
				},
				{
					'type': 'tag',
					'name': 'div'
				}
			]
		],
		'descendant'
	],
	[
		'div\t \n \tdiv',
		[
			[
				{
					'type': 'tag',
					'name': 'div'
				},
				{
					'type': 'descendant'
				},
				{
					'type': 'tag',
					'name': 'div'
				}
			]
		],
		'descendant /w whitespace'
	],
	[
		'div + div',
		[
			[
				{
					'type': 'tag',
					'name': 'div'
				},
				{
					'type': 'adjacent'
				},
				{
					'type': 'tag',
					'name': 'div'
				}
			]
		],
		'adjacent'
	],
	[
		'div ~ div',
		[
			[
				{
					'type': 'tag',
					'name': 'div'
				},
				{
					'type': 'sibling'
				},
				{
					'type': 'tag',
					'name': 'div'
				}
			]
		],
		'sibling'
	],
	[
		'p < div',
		[
			[
				{
					'type': 'tag',
					'name': 'p'
				},
				{
					'type': 'parent'
				},
				{
					'type': 'tag',
					'name': 'div'
				}
			]
		],
		'parent'
	],


	//Escaped whitespace
	[
		'#\\  > a ',
		[
			[
				{
					'type': 'attribute',
					'action': 'equals',
					'name': 'id',
					'value': ' ',
					'ignoreCase': false
				},
				{
					'type': 'child'
				},
				{
					'type': 'tag',
					'name': 'a'
				}
			]
		],
		'Space between escaped space and combinator'
	],
	[
		'.\\  ',
		[
			[
				{
					'type': 'attribute',
					'name': 'class',
					'action': 'element',
					'value': ' ',
					'ignoreCase': false
				}
			]
		],
		'Space after escaped space'
	],
	[
		'\\61 ',
		[
			[
				{
					'type': 'tag',
					'name': 'a'
				}
			]
		],
		'Numeric escape with space (BMP)'
	],
	[
		'\\1d306\\01d306',
		[
			[
				{
					'type': 'tag',
					'name': '\uD834\uDF06\uD834\uDF06'
				}
			]
		],
		'Numeric escape (outside BMP)'
	],


	//attributes
	[
		'[name^=\'foo[\']',
		[
			[
				{
					'type': 'attribute',
					'name': 'name',
					'action': 'start',
					'value': 'foo[',
					'ignoreCase': false
				}
			]
		],
		'quoted attribute'
	],
	[
		'[name^=\'foo[bar]\']',
		[
			[
				{
					'type': 'attribute',
					'name': 'name',
					'action': 'start',
					'value': 'foo[bar]',
					'ignoreCase': false
				}
			]
		],
		'quoted attribute'
	],
	[
		'[name$=\'[bar]\']',
		[
			[
				{
					'type': 'attribute',
					'name': 'name',
					'action': 'end',
					'value': '[bar]',
					'ignoreCase': false
				}
			]
		],
		'quoted attribute'
	],
	[
		'[href *= \'google\']',
		[
			[
				{
					'type': 'attribute',
					'name': 'href',
					'action': 'any',
					'value': 'google',
					'ignoreCase': false
				}
			]
		],
		'quoted attribute with spaces'
	],
	[
		'[name=foo\\.baz]',
		[
			[
				{
					'type': 'attribute',
					'name': 'name',
					'action': 'equals',
					'value': 'foo.baz',
					'ignoreCase': false
				}
			]
		],
		'attribute with escaped dot'
	],
	[
		'[name=foo\\[bar\\]]',
		[
			[
				{
					'type': 'attribute',
					'name': 'name',
					'action': 'equals',
					'value': 'foo[bar]',
					'ignoreCase': false
				}
			]
		],
		'attribute with escaped square brackets'
	],
	[
		'[xml\\:test]',
		[
			[
				{
					'type': 'attribute',
					'name': 'xml:test',
					'action': 'exists',
					'value': '',
					'ignoreCase': false
				}
			]
		],
		'escaped attribute'
	],
	[
		'[name="foo ~ < > , bar" i]',
		[
			[
				{
					'type': 'attribute',
					'name': 'name',
					'action': 'equals',
					'value': 'foo ~ < > , bar',
					'ignoreCase': true
				}
			]
		],
		'attribute with previously normalized characters'
	],



	//pseudo selectors
	[
		':foo',
		[
			[
				{
					'type': 'pseudo',
					'name': 'foo',
					'data': null
				}
			]
		],
		'pseudo selector without any data'
	],
	[
		':bar(baz)',
		[
			[
				{
					'type': 'pseudo',
					'name': 'bar',
					'data': 'baz'
				}
			]
		],
		'pseudo selector with data'
	],
	[
		':contains(\'(foo)\')',
		[
			[
				{
					'type': 'pseudo',
					'name': 'contains',
					'data': '\'(foo)\''
				}
			]
		],
		'pseudo selector with data'
	],

	//multiple selectors
	[
		'a , b',
		[
			[
				{
					'type': 'tag',
					'name': 'a'
				}
			],
			[
				{
					'type': 'tag',
					'name': 'b'
				}
			]
		],
		'multiple selectors',
    ['a','b'] // exptected tokenized selectors
	]
];


var clean = function(str){
  return str.trim()
    .replace(/\s+/g, ' ')    // clean multiple whitespace to one
    .replace(/\\ /g, '\\  ') // add back escaped whitespace in between
    .replace(/\\$/g, '\\ ')  // add back escaped whitespace at end
};

tests.forEach(function(arr, i){
  var
    // options receives tokenized 'selectors' from CSSwhat call
    options = {},
    // tokenized selectors is 4th item in test (if given), or default to 1st item
    selectors = arr[3] || [ clean(arr[0]) ],
    testName = arr[2];

  // parse arr[0] selector, replace arr[0] with result
	arr[0] = CSSwhat(arr[0], options);

  // compare arr[0] with expected arr[1], message is arr[2]
	assert.deepEqual.apply(null, arr);

  // compare tokenized selectors
  assert.deepEqual(options.selectors, selectors, i + ' selectors check: ' + testName);

  console.log("\t%d: '%s' passed", i + 1, testName);
});


console.log("\nCollected selectors (qwery, sizzle, nwmatcher)...");

var out = require("./out.json"),
  coll = Object.keys(out),
  trim = function(str){
    return str.trim();
  };

// special cases where shouldn't split selector by comma (ie, comma is part of expression, not a separator)
// Number refers to 0-based index in out.json.
var dontSplit = [96,248,272,276,277,457,463,659,660,732,733,735];

// Fixes for complex selectors in out.json.  key is the test key, value is the expected normalized 'selectors' array
var fixes = {
  // test 453
  ":has(*,:contains(!)),:contains(!)"
    : [":has(*,:contains(!))", ":contains(!)"],
  // test 563
  "a[class*=blog]:not(:has(*, :contains(!)), :contains(!)), br:contains(]), p:contains(]), :not(:empty):not(:parent)"
    : ["a[class*=blog]:not(:has(*, :contains(!)), :contains(!))", "br:contains(])", "p:contains(])", ":not(:empty):not(:parent)"],
  // test 645
  "form[title*=\"commas,\"], input[value=\"#commaOne,#commaTwo\"]"
    : ["form[title*=\"commas,\"]", "input[value=\"#commaOne,#commaTwo\"]"],
  // test 675
  "input[name=foo\\ bar]"
    : ["input[name=foo\\ bar]"]
};


coll.forEach(function(s, i){
  var options = {},
      selectors;

  if (dontSplit.indexOf(i) !== -1) {
    selectors = [s];
  } else if (s in fixes) {
    selectors = fixes[s];
  } else { // split on comma
    selectors = s.split(',').map(clean);
  }

	assert.deepEqual(CSSwhat(s, options), out[s], i + ' ' + s);

  assert.deepEqual(options.selectors, selectors , i + ' selectors check: '
    + '\n  expected: ' + selectors
    + '\n  actual:   ' + options.selectors);
});

console.log("%d Passed!", coll.length);
