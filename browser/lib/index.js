/*jshint strict:true node:true es5:true onevar:true laxcomma:true laxbreak:true*/
/*
 * BROWSER
 */

(function () {
  "use strict";
  var ender = require('ender')
    , $ = ender
    , reqwest = require('reqwest')
    , window = require('window')
    , document = window.document
    , location = window.location
    , uiTabs = require('./ui-tabs')
    , io = require('socket.io-browser')
    , socket
    , pd = require('pretty-data').pd
    , pure = require('./pure-inject')
    , visual = require('./visual')
    ;

  uiTabs.create('body', '.js-ui-tab a', '.js-ui-tab', '.js-ui-tab-view', 'http');
  
  //EVENT LISTENERS ALL
  $('.container').on('.js-all-stream pre', 'click', function(){
    $(this).toggleClass('css-hl-block');
  });
  $('.container').on('.js-openSocket:not(.inactive)', 'click', function(){
    makeRequest($(this).attr('data-protocol'));
	});
  $('.container').on('.js-scroll', 'change', function(){
    scrollLock({protocol: $(this).attr('data-protocol')});
  });
  $('.container').on('.js-clear', 'click', function(){
    $('.js-'+$(this).attr('data-protocol')+'-stream').html('');
  });
  $('.container').on('.js-log', 'click', function(){
    socket.emit('log' + $(this).attr('data-protocol'));
    $('.js-log.js-' + $(this).attr('data-protocol')).toggleClass('activeLog');
  });

  //EVENT LISTENERS TCP
  
  $('.container').on('.js-tcp-closeSocket:not(.inactive)', 'click', function(){
    socket.emit('allDone');
  });
  
  //EVENT LISTENERS HTTP
  $('.container').on('.js-http-log', 'click', function(){
    socket.emit('logHttp');
    $('.js-http-log').toggleClass('activeLog');
  });
  $('.container').on('.js-include-headers', 'change', function(){
    socket.emit('includeHeaders', $('.js-include-headers').attr('checked'));
  });
  $('.container').on('.js-http-closeSocket:not(.inactive)', 'click', function(){
    socket.emit('killHttp');
  });
  //EVENT LISTENERS UDP
  $('.container').on('.js-udp-log', 'click', function(){
    socket.emit('logUdp');
    $('.js-udp-log').toggleClass('activeLog');
  });
  $('.container').on('.js-udp-closeSocket:not(.inactive)', 'click', function(){
    socket.emit('killUdp');
  });
  
  function makeRequest(protocol) {
    var options = {}
      , port = $('.js-'+protocol+'-portNum').val()
      ;
    options.body = '';
    options.protocol = protocol;
    reqwest({
      url: 'http://'+window.location.host+'/listen'+protocol+'/'+port
    , type: 'json'
    , method: 'get'
    , error: function (err) { 
        console.log('Server Error: ', err);
        options.body = 'Cannot communicate with netbug server';
        options.cssClass = 'css-streamError';
        injectMessage(options);
      }
    , success: function (resp) {
        var html, i;
        console.log('success: ', resp);
        if(!resp.error){
          options.active = true;
          visual.stateChange(options);
          options.body += 'Socket opened succesfully. Listening on port: '+ port;
          options.cssClass = 'css-streamNewConnection';
        }
        else{
          options.cssClass = 'css-streamError';
          for(i=0; i < resp.errors.length; i=i+1){
						options.body += resp.errors[i].message;
					}
        }
        injectMessage(options);
      }
    });
    openSocket(options);
  }
 
//SOCKET COMMUNICATION WITH SERVER 
  function openSocket(options) {
    socket = io.connect('http://'+window.location.hostname+':3454');
    socket.on('connect', function () {
      socket.send('hi');
      socket.on('message', function (msg) {
        options.body = msg;
        injectCode('tcp', options);
      });
      socket.on('httpData', function (msg) {
        injectCode('http', msg);
      });
      socket.on('udpData', function (msg) {
        injectCode('udp', msg);
      });
      socket.on('seperateFiles', function (protocol) {
        if($('.js-'+protocol+'-multifile').attr('checked')) {
          socket.emit('writeFile', protocol);
        }
      });
      socket.on('connectionChange', function (count, closed) {
        $('.js-tcp-connection-count').html(count);
        if(closed){
          options.body = 'Socket Closed';
          options.cssClass = 'css-streamCloseConnection';
        }
        else{
          options.body = 'New Socket Opened';
          options.cssClass = 'css-streamNewConnection';
        }
        options.protocol = 'tcp';
        injectMessage(options);
      });
      socket.on('closedConnection', function(num, protocol){
        options.body = 'Closed Connection on '+num;
        options.cssClass = 'css-streamCloseConnection';
        visual.stateChange({
          active: false,
          protocol: protocol
        });
        options.protocol = protocol;
        injectMessage(options);
      });
      socket.on('disconnect', function () { 
        console.log('Browser-Disconnected socket');
        options.cssClass = 'css-streamError';
        options.body = 'NetBug Server Down';
        options.protocol = 'all';
        injectMessage(options);
        options.active = false;
        visual.stateChange(options);
      });
    });
  }

  function scrollLock(options) {
    if($('.js-scroll.js-'+options.protocol).attr('checked')){
      $('.js-'+options.protocol+'-stream')[0].scrollTop = $('.js-'+options.protocol+'-stream')[0].scrollHeight;
    }
  }

  function injectMessage(options) {
    pure.injectMessage(options.protocol, {
      'message': options.body,
      'class': options.cssClass
    });
    scrollLock(options);
  }

  function injectCode(protocol, options) {
    var data = {};      
    data.code = options.headers || '';
    data = processBody(options, data);
    pure.injectCode(protocol, data);
    options.protocol = protocol;
    scrollLock(options);
    visual.highlightMsg(options);
  }
  
  function processBody(options, data) {
    var xml
      , xml_pp
      , json_pp
      ;
    //if xml
    if(options.body.substring(0,3) === '<?x'){
      console.log('im xml!!!');
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
      json_pp = visual.syntaxHighlight(json_pp);
      data.code += json_pp;
    }
    else{
      data.code += options.body;
    }
    return data;
  }
}());
