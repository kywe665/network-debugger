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

  function makeNew(protocol, port) {
    pure.injectNewTab({
      "class": ' js-'+port,
      "protocol": protocol,
      "tabLink": '/' + protocol +'/'+port,
      "portNum": port
    });

    notPure.injectTabView(port, protocol, 'js-'+protocol);
    changeToCurrent(protocol, port);
  }

  function changeToCurrent(protocol, port) {
    window.location.hash = '/'+protocol+'/'+port;
    $('.js-default').removeClass('css-hidden');
    $('.js-tab-container').css('margin-bottom', '20px');
  }

  function closeTab(protocol, port, that) {
    $('.js-log.activeLog.js-'+port).trigger('click');
    $(that).closest('.js-tab-template').remove();
    $('.js-ui-tab-view[data-name="'+port+'"]').remove();
    changeToCurrent(protocol, 'default');

    if ($('.js-ui-tab-view[data-name="' + protocol + '"] .js-tab-bar').children().length <= 1){
      $('.js-ui-tab-view[data-name="' + protocol + '"] .js-tab-bar .js-default').addClass('css-hidden');
      $('.js-ui-tab-view[data-name="' + protocol + '"] .js-tab-container').css('margin-bottom', '0px');
    }
  }

  module.exports.makeNew = makeNew;
  module.exports.closeTab = closeTab;
}());
