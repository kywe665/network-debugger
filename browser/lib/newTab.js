/*jshint strict:true node:true es5:true onevar:true laxcomma:true laxbreak:true eqeqeq:true immed:true latedef:true*/
(function () {
  "use strict";
  var ender = require('ender')
    , $ = ender
    , pure = require('./pure-inject')
    , notPure = require('./not-so-pure')
    , window = require('window')
    , location = window.location
    ;

  function makeNew(protocol, port){
    pure.injectNewTab({
      "class": ' js-'+port,
      "protocol": protocol,
      "tabLink": '/' + protocol +'/'+port,
      "portNum": port
    });
    notPure.injectTabView(port, protocol, 'js-'+protocol);
    changeToCurrent(port, protocol);
    if(port.indexOf('poll') !== -1) {
      deleteExtras(port);
    }
  }
  
  function changeToCurrent(portNum, protocol){
    window.location.hash = '/'+protocol+'/'+portNum;
    $('.js-default').removeClass('css-hidden');
    $('.js-tab-container').css('margin-bottom', '20px');
  }
  
  function closeTab(port, that) {
    $('.js-log.activeLog.js-'+port).trigger('click');
    $(that).closest('.js-tab-template').remove();
    $('.js-ui-tab-view[data-name="'+port+'"]').remove();
    changeToCurrent('default', 'http');
    if($('.js-ui-tab-view[data-name="http"] .js-tab-bar').children().length <= 1){
      $('.js-ui-tab-view[data-name="http"] .js-tab-bar .js-default').addClass('css-hidden');
      $('.js-ui-tab-view[data-name="http"] .js-tab-container').css('margin-bottom', '0px');
    }
  }

  function deleteExtras(port) {
    $('.js-ui-tab-view[data-name="'+port+'"] .css-connection-info').remove();
    $('.js-ui-tab-view[data-name="'+port+'"] .js-all-stream + .css-left.css-bottom').remove();
    $('.js-ui-tab-view[data-name="'+port+'"] .js-all-stream + .css-center.css-bottom').remove();
    $('.js-ui-tab-view[data-name="'+port+'"] .css-log-options + .css-top.right p').remove();
    $('.js-ui-tab-view[data-name="'+port+'"] .css-log-options + .css-top.right input').remove();
    $('.js-ui-tab-view[data-name="'+port+'"] .css-log-options').remove();
  }

  module.exports.makeNew = makeNew;
  module.exports.closeTab = closeTab;
}());
