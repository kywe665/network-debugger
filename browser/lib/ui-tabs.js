/*jshint laxcomma:true es5:true node:true laxbreak:true*/

(function () {
  "use strict";

  var $ = require('ender')
    , url = require('url')
    , window = require('window')
    , document = window.document
    , location = window.location
    ;

  function create(root, uiTabs, uiTab, uiView, defaultView) {

    function displayTab() {
      var resource = location.hash
        , urlObj
        , pathname
        ;

      if (0 !== resource.indexOf('#/')) {
        location.hash = '#/' + defaultView;
        return;
      }
      
      urlObj = url.parse(resource.substr(1), true, true);

      pathname = urlObj.pathname.substr(1).replace('/', '_');
      $(uiView).hide();
      $(uiTab).removeClass('selected');
      urlObj.pathname.split('/').forEach(function(view){
        if(!view){
          return;
        }
        if (0 === $(uiView + '[data-name=' + view + ']').length) {
          location.hash = '#/' + defaultView;
          return;
        }
        $(uiView + '[data-name=' + view + ']').show();
        $(uiTab + '.js-' + view).addClass('selected');
      });
    }

    global.window.addEventListener('hashchange', displayTab);

    $.domReady(function () {
      $(root).delegate(uiTabs, 'click', function (ev) {
        var href = url.resolve(location.href, $(this).attr('href'))
          , curHref = location.href.split('#').shift()
          ;

        if (href.substr(0, curHref.length) !== curHref) {
          // in a different directory
          return;
        }

        href = href.substr(curHref.length - 1);
        //console.log(href);

        // TODO robust click-jacking support
        // valid for http/https: //domain.tld/resource
        // /path/to/res
        // path/to/res
        // ./path/to/res
        // ../path/to/res
        // resolve relative hashtags #blah -> #/current/blah; #/blah -> #/blah
        if (/^\/[^\/]?/.exec(href)) {
          location.hash = '#' + href;
          ev.preventDefault();
        }
      });

      // TODO set default index
      location.hash = location.hash.substr(1) || ('/' + defaultView);
      displayTab();
    });
  }
  
  module.exports.create = create;
}());



