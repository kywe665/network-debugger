/*jshint strict:true node:true es5:true onevar:true laxcomma:true laxbreak:true eqeqeq:true immed:true latedef:true*/
(function () {
  "use strict";
  var pure = require('./pure-inject')
    , visual = require('./visual')
    , ender = require('ender')
    , $ = ender
    , pd = require('pretty-data').pd
    ;

  function formatMsg(id, respStatus, headers, body, error){
    var msg = 'STATUS: ' + respStatus + '\r\n'
      , data = processBody(body)
      ;
    if(error){
      pure.injectMessage('http', {
        "message": prettyJson(error),
        "class": "css-streamError"
      }, 'default');
      pure.injectMessage('http', {
        "message": prettyJson(error),
        "class": "css-streamError"
      }, id);
    }
    else{
      msg += 'HEADERS: \r\n' + prettyJson(headers) + '\r\n';
      if(data.code){
        msg += 'BODY: \r\n' + data.code + '\r\n';
      }
      pure.injectCode('http', {'code': msg, 'xml': data.xml}, id);
    }
    visual.scrollLock({'protocol': 'http'}, id);
    visual.scrollLock({'protocol': 'http'}, 'default');
    visual.highlightMsg({"protocol": "http"});
  }

  function prettyJson (json) {
    var json_pp = json;
    //TODO add try catch in case it's not JSON
    json_pp = JSON.stringify(json, null, '  ');
    json_pp = visual.syntaxHighlight(json_pp);
    return json_pp;
  }

  function processBody(body) {
    var xml
      , xml_pp
      , json_pp
      , data = {}
      ;
    if(typeof body !== 'string'){
      try{
        body = JSON.stringify(body);
      }
      catch(e){
        if(typeof body.toString() === 'string'){
          body = body.toString();
        }
        else{
          console.log('body not a string, unresolved datatype!');
          data.code = body;
          return data;
        }
      }
    }
    //if xml or html
    if(body.substring(0,1) === '<'){
      xml_pp = pd.xml(body);
      xml = xml_pp.replace(/&/g, '&amp;')
                  .replace(/</g, '&lt;')
                  .replace(/>/g, '&gt;');
      data.xml = xml;
    }
    //if json
    else if(body.charAt(0) === '{'){
      json_pp = JSON.parse(body);
      json_pp = JSON.stringify(json_pp, null, '  ');
      json_pp = visual.syntaxHighlight(json_pp);
      data.code += json_pp;
    }
    else{
      return {
        'code': body.replace(/&/g, '&amp;')
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;')
      };
    }
    return data;
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

