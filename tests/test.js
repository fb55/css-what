var deepEquals = require("assert").deepEqual,
    CSSwhat = require("../");

var tests = [
	["div", [ [ { type: 'tag', name: 'div' } ] ], "simple tag"],
	["*", 	[ [ { type: 'universal' } ] ], "universal"],
	
	//traversal
	["div div", [ [ { type: 'tag', name: 'div' },
    { type: 'descendant' },
    { type: 'tag', name: 'div' } ] ], "descendant"],
    ["div\t \n \tdiv", [ [ { type: 'tag', name: 'div' },
    { type: 'descendant' },
    { type: 'tag', name: 'div' } ] ], "descendant /w whitespace"],
    ["div + div", [ [ { type: 'tag', name: 'div' },
    { type: 'adjacent' },
    { type: 'tag', name: 'div' } ] ], "adjacent"],
    ["div ~ div", [ [ { type: 'tag', name: 'div' },
    { type: 'sibling' },
    { type: 'tag', name: 'div' } ] ], "sibling"],
    
    //attributes
    [".foo", [ [ { type: 'class', value: 'foo' } ] ], "simple class"]
    
    //TODO
];

tests.forEach(function(arr){
	arr[0] = CSSwhat(arr[0]);
	deepEquals.apply(null, arr);
	console.log(arr[2], "passed");
});