/*
MIT License

Original substitutions:  Copyright (c) 2018 Eva (Nepeta)
JavaScript library:      Copyright (c) 2019 Douglas Gardner <douglas@chippy.ch>
Rewriting for Quarky:  Copyright (c) 2023 Vukky <vukky@litdevs.org>

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
    'wat\'s dis? ', // unmerged https://github.com/zuzak/owo/pull/16
    '*purrs* ' // from vukky
]
const emotisuffixes = [
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
    ' ^-^',
    ' ^_^',
    ' x3',
    ' x3',
    ' xD',
    ' ÙωÙ',
    ' <_<', // unmerged https://github.com/zuzak/owo/pull/39
    ' <.<', // unmerged https://github.com/zuzak/owo/pull/39
    ' >.<', // unmerged https://github.com/zuzak/owo/pull/39
    ' >.>', // unmerged https://github.com/zuzak/owo/pull/39
    ' ^~^', // from amy
    ' ^w^', // from vukky
    ' >w>', // from vukky
    ' >w<', // from vukky
    ' -w-', // from vukky
    ' 3:', // from vukky
]
const suffixes = [
    ' ( ´•̥̥̥ω•̥̥̥` )',
    ' ( ͡° ᴥ ͡°)',
    ' (´・ω・｀)',
    ' (ʘᗩʘ\')',
    ' (இωஇ )',
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
    ' \\°○°/',
    ' ^•ﻌ•^',
    ' ʕʘ‿ʘʔ',
    ' ʕ•ᴥ•ʔ',
    ' ミ(．．)ミ',
    ' ㅇㅅㅇ',
    ', fwendo',
    '（＾ｖ＾）',
    ' nya~', // unmerged https://github.com/zuzak/owo/pull/19
    '~', // unmerged https://github.com/zuzak/owo/pull/36
    ' *nuzzles u*', // unmerged https://github.com/zuzak/owo/pull/33
    ' *purrs*', // from vukky
    '..' // https://github.com/zuzak/owo/commit/9d3d3f560ec13b394779215cc1a62c96348300bf
]
suffixes.push(...emotisuffixes);

const substitutions = {
    'r': 'w',
    'l': 'w',
    'R': 'W',
    'L': 'W',
//  'ow': 'OwO',
    'no': 'nyo',
    'what': 'wat',
    'na': 'nya',
    'ma': 'mya'
}

const wordsubstitutions = {
    'this': 'dis',
    'the': 'da',
    'says': 'sez',
    'has': 'haz',
    'have': 'haz',
    'you': 'uu'
}

const randomItem = (array) => array[Math.floor(Math.random()    *array.length)]
const getEmotisuffix = () => randomItem(emotisuffixes);
const substitute = (str) => {
    const replacements = Object.entries(substitutions);
    const splitString = str.split(" ");
    for (const blockNumber in splitString) {
        if(linkutils.test(splitString[blockNumber])) continue;
        if(wordsubstitutions[splitString[blockNumber]]) splitString[blockNumber] = wordsubstitutions[splitString[blockNumber]];
        for (const replacement of replacements) {
            splitString[blockNumber] = splitString[blockNumber].replaceAll(replacement[0], replacement[1]);
        }
    }
    return splitString.join(" ");
}
const allowed = () => settingGet("uwuprefix") || settingGet("uwusubst")  || settingGet("uwusuffix")

window.uwu = (str) => {
    if(settingGet("uwuprefix"))str = randomItem(prefixes) + str;
    if(settingGet("uwusubst")) str = substitute(str);
    if(settingGet("uwusuffix") && !suffixes.some(suffix => str.endsWith(suffix)))str = str + randomItem(suffixes);
    return str;
}
window.uwutils = { allowed, getEmotisuffix, substitute }