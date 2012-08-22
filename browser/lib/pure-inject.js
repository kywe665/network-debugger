/*jshint strict:true node:true es5:true onevar:true laxcomma:true laxbreak:true*/
(function () {
  "use strict";
  var ender = require('ender')
    , $ = ender
    , pure = require('./pure').$p
    , messageDir
    , messageTemplate
    , codeDir
    , codeTemplate
    , timestampDir
    , timestampTemplate
    , tabDir
    , tabTemplate
    , tabContainerDir
    , tabContainerTemplate
    ;

  messageDir = {
    'span': 'body',
    '@class': 'cssClass'
  };
  codeDir = {
    'span': 'code',
    'code': 'xml'
  };
  timestampDir = {
    'div': 'time'
  };
  tabDir = {
    'li@class+': 'class',
    'li@data-protocol': 'protocol',
    'a@href': 'tabLink',
    'a': 'portNum'
  };
  /*tabContainerDir = {
    'div.js-ui-tab-view@data-name': 'port-num',
    '.js-ui-tab-view .css-listen-form .js-port-num@class': 'class-protocol',
    //'.js-ui-tab-view .css-listen-form span.js-port-num@data-protocol': 'protocol',
    //'.js-ui-tab-view .css-listen-form .js-port-num': 'port-num',
    //'a.js-log@class': 'class-protocol',
    'a.js-log@data-protocol': 'protocol',
    //'div.js-closeSocket@class': 'class-protocol',
    'div.js-closeSocket@data-protocol': 'protocol',
    'div.js-clear@class': 'class-protocol',
    'div.js-clear@data-protocol': 'protocol',
    'div.js-scroll@class': 'class-protocol',
    'div.js-scroll@data-protocol': 'protocol'
  };*/

  timestampTemplate = pure('.js-timestamp-template').compile(timestampDir);
  messageTemplate = pure('.js-message-template').compile(messageDir);
  codeTemplate = pure('.js-code-template').compile(codeDir);
  tabTemplate = pure('.js-tab-template').compile(tabDir);
  //tabContainerTemplate = pure('.js-tab-container-template').compile(tabContainerDir);

  function injectMessage(options, data) {

    var stream;

    if (!options.hasOwnProperty('protocol')) {
      console.error('received code injection request without protocol');
      return;
    }
    if (!options.hasOwnProperty('port')) {
      console.error('received code injection request without port');
      return;
    }
    data = data || options;

    stream = $('.js-ui-tab-view[data-name="'+options.port+'"] .js-'+options.protocol+'-stream');
    stream.append(addTime() + messageTemplate(data));
  }

  function injectCode(options, data) {
    var stream;

    if (!options.hasOwnProperty('protocol')) {
      console.error('received code injection request without protocol');
      return;
    }
    if (!options.hasOwnProperty('port')) {
      console.error('received code injection request without port');
      return;
    }

    stream = $('.js-ui-tab-view[data-name="'+options.port+'"] .js-'+options.protocol+'-stream');
    stream.append(addTime() + codeTemplate(data));
  }

  function addTime () {
    return timestampTemplate({'time': new Date().toString()});
  }
  function injectNewTab(tab, container){
    $('.js-ui-tab-view[data-name='+tab.protocol+'] '+'.js-tab-bar').append(tabTemplate(tab));
    //console.log(container);
    //$('.js-ui-tab-view[data-name='+tab.protocol+'] '+'.js-tab-container').append(tabContainerTemplate(container));
  }

  module.exports.injectCode = injectCode;
  module.exports.injectMessage = injectMessage;
  module.exports.injectNewTab = injectNewTab;
}());
