/*jshint strict:true node:true es5:true onevar:true laxcomma:true laxbreak:true*/
(function () {
  "use strict";
  var ender = require('ender')
    , $ = ender
    , hljs = require('hljs')
    ;

  function stateChange(protocol, port, open){
    if(protocol === 'all'){
      $('.js-ui-tab-view.js-all').addClass('css-inactive');
      $('.js-ui-tab-view.js-all').removeClass('css-active');
    }
    else if(open){
      $('.js-ui-tab-view[data-name="'+protocol+'"]').addClass('css-active');
      $('.js-ui-tab-view[data-name="'+protocol+'"]').removeClass('css-inactive');
      $('.js-ui-tab-view[data-name="'+protocol+'"] .js-ui-tab-view[data-name="'+port+'"]').addClass('css-active');
      $('.js-ui-tab-view[data-name="'+protocol+'"] .js-ui-tab-view[data-name="'+port+'"]').removeClass('css-inactive');
    }
    else {
      $('.js-ui-tab-view[data-name="'+protocol+'"] .js-ui-tab-view[data-name="'+port+'"]').removeClass('css-active');
      $('.js-ui-tab-view[data-name="'+protocol+'"] .js-ui-tab-view[data-name="'+port+'"]').addClass('css-inactive');

      if($('.js-ui-tab-view[data-name="'+protocol+'"] .js-tab-bar').children().length <= 1) {
        $('.js-ui-tab-view[data-name="'+protocol+'"]').removeClass('css-active');
        $('.js-ui-tab-view[data-name="'+protocol+'"]').addClass('css-inactive');
      }
    }
  }

  function syntaxHighlight(json) {
    json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g
    , function (match) {
        var cls = 'number';
        if (/^"/.test(match)) {
            if (/:$/.test(match)) {
                cls = 'key';
            } else {
                cls = 'string';
            }
        } else if (/true|false/.test(match)) {
            cls = 'boolean';
        } else if (/null/.test(match)) {
            cls = 'null';
        }
        return '<span class="' + cls + '">' + match + '</span>';
    });
  }

  function highlightMsg(options) {
    $('.js-'+options.protocol+'-stream .highlight-me').forEach(function(el) {
      hljs.highlightBlock(el);
      $(el).removeClass('highlight-me');
    });
  }

  module.exports.stateChange = stateChange;
  module.exports.syntaxHighlight = syntaxHighlight;
  module.exports.highlightMsg = highlightMsg;

}());
