/*jshint strict:true node:true es5:true onevar:true laxcomma:true laxbreak:true*/
(function () {
  "use strict";
  var ender = require('ender')
    , $ = ender
    , hljs = require('hljs')
    ;
  
  function stateChange(options){
    if(options.protocol === 'all'){
      stateChange({protocol:'tcp'});
      stateChange({protocol:'http'});
      stateChange({protocol:'udp'});
    }
    else{
      if(options.active){
        $('.js-openSocket.js-'+options.protocol).addClass('inactive');
        $('.js-closeSocket.js-'+options.protocol).removeClass('inactive');
        $('.js-'+options.protocol+'-connection-status').removeClass('off');
        $('.js-'+options.protocol+'-connection-count').html('0');
      }
      else{
        $('.js-openSocket.js-'+options.protocol).removeClass('inactive');
        $('.js-closeSocket.js-'+options.protocol).addClass('inactive');
        $('.js-'+options.protocol+'-connection-status').addClass('off');
        $('.js-'+options.protocol+'-connection-count').html('0');
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
