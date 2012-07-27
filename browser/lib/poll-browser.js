/*jshint strict:true node:true es5:true onevar:true laxcomma:true laxbreak:true eqeqeq:true immed:true latedef:true*/
(function () {
  "use strict";
  var pure = require('./pure-inject')
    , visual = require('./visual')
    , ender = require('ender')
    , $ = ender
    ;

  function formatMsg(id, respStatus, headers, body, error){
    var msg = 'STATUS: ' + respStatus + '\r\n'
      , parseBody;
    msg += 'HEADERS: \r\n' + prettyJson(headers) + '\r\n';
    try{
      parseBody = JSON.parse(body);
    }
    catch(e){
      parseBody = body;
    }
    msg += 'BODY: \r\n' + prettyJson(parseBody) + '\r\n';
    console.log(msg);
    pure.injectCode('http', {'code': msg}, 'default');
    pure.injectCode('http', {'code': msg}, id);
  }

  function prettyJson (json) {
    var json_pp = json;
    console.log(json);
    //TODO add try catch in case it's not JSON
    json_pp = JSON.stringify(json, null, '  ');
    json_pp = visual.syntaxHighlight(json_pp);
    return json_pp;
  }

  function getId() {
    var count = 0;
    $('.js-tab-bar li').forEach(function(ele){
      $(ele).attr('class').split(' ').forEach(function(newClass) {
        if(newClass.indexOf('poll') !== -1){
          count++;
        }
      });
    });
    return 'poll'+(count+1);
  }
  
  module.exports.formatMsg = formatMsg;
  module.exports.getId = getId;
}());
