/*
MIT License

Original substitutions: Copyright (c) 2018 Eva (Nepeta)
JavaScript library:     Copyright (c) 2019 Douglas Gardner <douglas@chippy.ch>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
const randomItem = require('random-item')
const replaceString = require('replace-string')

const prefixes = [
  '<3 ',
  '0w0 ',
  'H-hewwo?? ',
  'HIIII! ',
  'Haiiii! ',
  'Huohhhh. ',
  'OWO ',
  'OwO ',
  'UwU ',
  'wat\'s dis? ' // unmerged https://github.com/zuzak/owo/pull/16
]

const suffixes = [
  ' ( ´•̥̥̥ω•̥̥̥` )',
  ' ( ˘ ³˘)♥',
  ' ( ͡° ᴥ ͡°)',
  ' (^³^)',
  ' (´・ω・｀)',
  ' (ʘᗩʘ\')',
  ' (இωஇ )',
  ' (๑•́ ₃ •̀๑)',
  ' (• o •)',
  ' (•́︿•̀)',
  ' (⁎˃ᆺ˂)',
  ' (╯﹏╰）',
  ' (●´ω｀●)',
  ' (◠‿◠✿)',
  ' (✿ ♡‿♡)',
  ' (❁´◡`❁)',
  ' (　\'◟ \')',
  ' (人◕ω◕)',
  ' (；ω；)',
  ' (｀へ´)',
  ' ._.',
  ' :3',
  ' :3c',
  ' :D',
  ' :O',
  ' :P',
  ' ;-;',
  ' ;3',
  ' ;_;',
  ' <{^v^}>',
  ' >_<',
  ' >_>',
  ' UwU',
  ' XDDD',
  ' \\°○°/',
  ' ^-^',
  ' ^_^',
  ' ^•ﻌ•^',
  ' x3',
  ' x3',
  ' xD',
  ' ÙωÙ',
  ' ʕʘ‿ʘʔ',
  ' ʕ•ᴥ•ʔ',
  ' ミ(．．)ミ',
  ' ㅇㅅㅇ',
  ', fwendo',
  '（＾ｖ＾）',
  ' nya~', // unmerged https://github.com/zuzak/owo/pull/19
  ' <_<', // unmerged https://github.com/zuzak/owo/pull/39
  ' <.<', // unmerged https://github.com/zuzak/owo/pull/39
  ' >.<', // unmerged https://github.com/zuzak/owo/pull/39
  ' >.>', // unmerged https://github.com/zuzak/owo/pull/39
  '~', // unmerged https://github.com/zuzak/owo/pull/36
  ' *nuzzles u*' // unmerged https://github.com/zuzak/owo/pull/33
]

const substitutions = {
  'r': 'w',
  'l': 'w',
  'R': 'W',
  'L': 'W',
//  'ow': 'OwO',
  'no': 'nu',
  'has': 'haz',
  'have': 'haz',
  ' says': ' sez',
  'you': 'uu',
  'the ': 'da ',
  'The ': 'Da ',
  'THE ': 'DA ',
  'what': 'wat ',
  'What ': 'Wat ',
  'WHAT ': 'WAT ',
  'this ': 'dis ',
  'This ': 'Dis ',
  'THIS ': 'DIS '
}

const addAffixes = (str) => randomItem(prefixes) + str + randomItem(suffixes)
const substitute = (str) => {
  const replacements = Object.keys(substitutions)
  replacements.forEach((x) => {
    str = replaceString(str, x, substitutions[x])
  })
  return str
}
const owo = (str) => addAffixes(substitute(str))

window.owo = owo; // added by vukky to make the thingie thing, i don't browserify

module.exports = {
  addAffixes,
  substitute,
  owo
}


},{"random-item":2,"replace-string":3}],2:[function(require,module,exports){
'use strict';

module.exports = array => {
	if (!Array.isArray(array)) {
		throw new TypeError('Expected an array');
	}

	return array[Math.floor(Math.random() * array.length)];
};

module.exports.multiple = (array, count) => {
	if (!Number.isInteger(count) && count >= 0) {
		throw new TypeError('Expected a non-negative integer');
	}

	return [...new Array(count)].map(() => module.exports(array));
};

},{}],3:[function(require,module,exports){
'use strict';

module.exports = (string, needle, replacement, options = {}) => {
	if (typeof string !== 'string') {
		throw new TypeError(`Expected input to be a string, got ${typeof string}`);
	}

	if (!(typeof needle === 'string' && needle.length > 0) ||
		!(typeof replacement === 'string' || typeof replacement === 'function')) {
		return string;
	}

	let result = '';
	let matchCount = 0;
	let prevIndex = options.fromIndex > 0 ? options.fromIndex : 0;

	if (prevIndex > string.length) {
		return string;
	}

	while (true) { // eslint-disable-line no-constant-condition
		const index = options.caseInsensitive ?
			string.toLowerCase().indexOf(needle.toLowerCase(), prevIndex) :
			string.indexOf(needle, prevIndex);

		if (index === -1) {
			break;
		}

		matchCount++;

		const replaceStr = typeof replacement === 'string' ? replacement : replacement(
			// If `caseInsensitive`` is enabled, the matched substring may be different from the needle.
			string.slice(index, index + needle.length),
			matchCount,
			string,
			index
		);

		// Get the initial part of the string on the first iteration.
		const beginSlice = matchCount === 1 ? 0 : prevIndex;

		result += string.slice(beginSlice, index) + replaceStr;

		prevIndex = index + needle.length;
	}

	if (matchCount === 0) {
		return string;
	}

	return result + string.slice(prevIndex);
};

},{}]},{},[1]);
