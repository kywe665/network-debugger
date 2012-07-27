/*jshint strict:true node:true es5:true onevar:true laxcomma:true laxbreak:true*/
(function () {
  "use strict";
  var ender = require('ender')
    , $ = ender
    , hljs = require('hljs')
    , pure = require('./pure-inject')
    , pd = require('pretty-data').pd
    ;
  
  function stateChange(protocol, port, open){
    if(protocol === 'all'){
      $('.js-ui-tab-view.js-all').addClass('css-inactive');
      $('.js-ui-tab-view.js-all').removeClass('css-active');
    }
    else if(open){
      $('.js-ui-tab-view[data-name="'+protocol+'"]').addClass('css-active');
      $('.js-ui-tab-view[data-name="'+protocol+'"]').removeClass('css-inactive');
      $('.js-ui-tab-view[data-name="'+port+'"]').addClass('css-active');
      $('.js-ui-tab-view[data-name="'+port+'"]').removeClass('css-inactive');
    }
    else if($('.js-ui-tab-view[data-name="'+protocol+'"] .js-tab-bar').children().length <= 1){
      $('.js-ui-tab-view[data-name="'+protocol+'"]').removeClass('css-active');
      $('.js-ui-tab-view[data-name="'+protocol+'"]').addClass('css-inactive');
      $('.js-ui-tab-view[data-name="'+port+'"]').removeClass('css-active');
      $('.js-ui-tab-view[data-name="'+port+'"]').addClass('css-inactive');
    }
    else{
      $('.js-ui-tab-view[data-name="'+port+'"]').removeClass('css-active');
      $('.js-ui-tab-view[data-name="'+port+'"]').addClass('css-inactive');
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

  function injectMessage(options, port) {
    pure.injectMessage(options.protocol, {
      'message': options.body,
      'class': options.cssClass
    }, port);
    //scrollLock(options, port);
  }

  function injectCode(protocol, options, port) {
    var data = {};      
    data.code = options.headers || '';
    data = processBody(options, data);
    pure.injectCode(protocol, data, port);
    options.protocol = protocol;
    scrollLock(options, port);
    highlightMsg(options);
  }
  
  function processBody(options, data) {
    var xml
      , xml_pp
      , json_pp
      ;
    //if xml
    if(options.body.substring(0,3) === '<?x'){
      xml_pp = pd.xml(options.body);
      xml = xml_pp.replace(/&/g, '&amp;')
                  .replace(/</g, '&lt;')
                  .replace(/>/g, '&gt;');
      data.xml = xml;
    }
    //if json
    else if(options.body.charAt(0) === '{'){
      json_pp = JSON.parse(options.body);
      json_pp = JSON.stringify(json_pp, null, '  ');
      json_pp = syntaxHighlight(json_pp);
      data.code += json_pp;
    }
    else{
      data.code += options.body;
    }
    return data;
  }

  function scrollLock(options, port) {
    var portName = port || options.protocol
      , selector = '.js-ui-tab-view[data-name="'+portName+'"]'
      ;
    if($(selector +' .js-scroll.js-'+options.protocol).attr('checked') && $(selector +' .js-'+options.protocol+'-stream')[0].scrollHeight !== 0){
      $(selector + ' .js-'+options.protocol+'-stream')[0].scrollTop = $(selector +' .js-'+options.protocol+'-stream')[0].scrollHeight;
    }
    if($(selector +' .js-'+options.protocol+'-stream').children().length > 9){
      //console.log('cleared space: '+portName);
      $(selector +' .js-'+options.protocol+'-stream span').first().remove();
      $(selector +' .js-'+options.protocol+'-stream span').first().remove();
    }
  }

  module.exports.stateChange = stateChange;
  module.exports.syntaxHighlight = syntaxHighlight;
  module.exports.highlightMsg = highlightMsg;
  module.exports.injectMessage = injectMessage;
  module.exports.injectCode = injectCode;
  module.exports.processBody = processBody;
  module.exports.scrollLock = scrollLock;
  
}());
