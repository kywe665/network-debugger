/*jshint strict:true node:true es5:true onevar:true laxcomma:true laxbreak:true eqeqeq:true immed:true latedef:true*/
(function () {
  "use strict";

  var ender = require('ender')
    , $ = ender
    ;

  function injectTabView(protocol, port, logSettings) {
    var template = '';

    template +=   '<div data-name="'+port+'" class="js-ui-tab-view css-ui-tab-view js-all css-inactive">';

    if (logSettings.hasOwnProperty('includeHeaders')) {
    template +=     '<div class="css-log-options">';
    template +=       '<input data-protocol="'+protocol+'" type="checkbox" checked="'+logSettings.includeHeaders+'" class="js-include-headers">';
    template +=       '<p>Save headers</p>';
    template +=     '</div>';
    }

    template +=     '<div class="css-connection-info">';
    template +=       '<a data-protocol="'+protocol+'" data-port="'+port+'" class="css-button css-openSocket js-reopen js-'+port+'">Open Connection</a>';
    template +=       '<div class="css-connection-status js-'+protocol+'-connection-status off">Connection Status</div>';
    template +=     '</div>';
    template +=     '<div class="css-top right">';
    template +=       '<p>Save each packet separately</p>';
    template +=       '<input data-protocol="'+protocol+'" type="checkbox" checked="'+logSettings.separateFiles+'" class="js-separate-files">';
    template +=       '<a data-protocol="'+protocol+'" class="css-button js-log css-log js-'+protocol+ (logSettings.logData ? ' activeLog' : '') +'"></a>';
    template +=     '</div>';
    template +=     '<div class="js-'+protocol+'-stream js-all-stream css-stream">';
    template +=       '<span class="js-allstream-error"></span>';
    template +=     '</div>';
    template +=     '<div class="css-left css-bottom">';
    template +=       '<a data-protocol="'+protocol+'" class="css-button css-closeSocket js-closeSocket js-'+protocol+'">Close Connection</a>';
    template +=     '</div>';
    template +=     '<div class="css-center css-bottom">';
    template +=       '<a data-protocol="'+protocol+'" class="css-button js-clear js-'+protocol+'">Clear</a>';
    template +=     '</div>';
    template +=     '<div class="css-right css-bottom">';
    template +=       '<p>Lock scroll to bottom</p>';
    template +=       '<input type="checkbox" checked="true" data-protocol="'+protocol+'" class="js-scroll js-'+protocol+'">';
    template +=     '</div>';
    template +=   '</span>';
    template += '</div>';

    $('.js-ui-tab-view[data-name='+protocol+'] .js-tab-container').append(template);
  }

  module.exports.injectTabView = injectTabView;

}());
