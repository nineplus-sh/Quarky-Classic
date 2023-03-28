// modified from https://markdown-it.github.io/linkify-it/

var linkify = require('linkify-it')();
linkify
  .tlds(require('tlds'))
  .tlds('onion', true)
  .add('r/', {
    validate: function (text, pos, self) {
      var tail = text.slice(pos);
  
      if (!self.re.reddit) {
        self.re.reddit =  new RegExp(
          '^([a-zA-Z0-9_]){1,15}(?!_)(?=$|' + self.re.src_ZPCc + ')'
        );
      }
      if (self.re.reddit.test(tail)) {
        return tail.match(self.re.reddit)[0].length;
      }
      return 0;
    },
    normalize: function (match) {
      match.url = 'https://reddit.com/r/' + match.url.replace(/^r\//, '');
    }
  });

function linkify2(content) {
  var out,
      matches = linkify.match(content),
      result  = [],
      last;

  if (matches) {
    last = 0;
    matches.forEach(function (match) {
      if (last < match.index) {
        result.push(content.slice(last, match.index).replace(/\r?\n/g, '<br>'));
      }
      result.push('<a target="_blank" href="');
      result.push(encodeURI(match.url));
      result.push('">');
      result.push(match.text);
      result.push('</a>');
      last = match.lastIndex;
    });
    if (last < content.length) {
      result.push(content.slice(last).replace(/\r?\n/g, '<br>'));
    }
    out = result.join('');
  }

  return out || content;
}
window.linkify = linkify2;
window.linkutils = linkify;