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
    , hljs = require('hljs')
    , pd = require('pretty-data').pd
    , pure = require('./pure-inject')
    ;

  //Create Tabs
  uiTabs.create('body', '.js-ui-tab a', '.js-ui-tab', '.js-ui-tab-view', 'http');
  hljs.initHighlightingOnLoad();
  //EVENT LISTENERS ALL
  $('.container').on('.js-allstream pre', 'click', function(){
    $(this).toggleClass('css-hl-block');
  });

  //EVENT LISTENERS TCP
  $('.container').on('.js-tcp-log', 'click', function(){
    socket.emit('logTcp');
    $('.js-tcp-log').toggleClass('activeLog');
  });
  $('.container').on('.js-tcp-clear', 'click', function(){
    $('.js-tcp-stream').html('');
  });
  $('.container').on('.js-tcp-scroll', 'change', function(){
    scrollLock({protocol: 'tcp'});
  });
  $('.container').on('.js-tcp-testSocket', 'click', function(){
    socket.emit('testSocket');
  });
  $('.container').on('.js-tcp-closeSocket:not(.inactive)', 'click', function(){
    socket.emit('allDone');
  });
  $('.container').on('.js-tcp-openSocket:not(.inactive)', 'click', function(){
    var options = {}
      , port = $('.js-tcp-portNum').val()
      ;
    options.body = '';
    options.protocol = 'tcp';
    reqwest({
      url: 'http://'+window.location.host+'/listenTCP/'+port
    , type: 'json'
    , method: 'get'
    , error: function (err) { 
        console.log('Server Error: ', err);
        options.body = 'Cannot communicate with netbug server';
        options.cssClass = 'css-streamError';
        injectMessage(options);
      }
    , success: function (resp) {
        var i;
        if(!resp.error){
          options.active = true;
          stateChange(options);
          options.body += 'TCP Socket opened succesfully. Listening on port: '+ port;
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
	});
  //EVENT LISTENERS HTTP
  $('.container').on('.js-http-clear', 'click', function(){
    $('.js-http-stream').html('');
  });
  $('.container').on('.js-http-log', 'click', function(){
    socket.emit('logHttp');
    $('.js-http-log').toggleClass('activeLog');
  });
  $('.container').on('.js-http-scroll', 'change', function(){
    scrollLock({protocol: 'http'});
  });
  $('.container').on('.js-include-headers', 'change', function(){
    socket.emit('includeHeaders', $('.js-include-headers').attr('checked'));
  });
  $('.container').on('.js-http-closeSocket:not(.inactive)', 'click', function(){
    socket.emit('killHttp');
  });
  $('.container').on('.js-http-openSocket:not(.inactive)', 'click', function(){
     var options = {}
      , port = $('.js-http-portNum').val()
      ;
    options.body = '';
    options.protocol = 'http';
    reqwest({
      url: 'http://'+window.location.host+'/listenHTTP/'+port
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
          stateChange(options);
          options.body += 'HTTP Socket opened succesfully. Listening on port: '+ port;
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
  });
  //EVENT LISTENERS UDP
  $('.container').on('.js-udp-clear', 'click', function(){
    $('.js-udp-stream').html('');
  });
  $('.container').on('.js-udp-log', 'click', function(){
    socket.emit('logUdp');
    $('.js-udp-log').toggleClass('activeLog');
  });
  $('.container').on('.js-udp-scroll', 'change', function(){
    scrollLock({protocol: 'udp'});
  });
  $('.container').on('.js-udp-closeSocket:not(.inactive)', 'click', function(){
    socket.emit('killUdp');
  });
  $('.container').on('.js-udp-openSocket:not(.inactive)', 'click', function(){
     var options = {}
      , port = $('.js-udp-portNum').val()
      ;
    options.body = '';
    options.protocol = 'udp';
    reqwest({
      url: 'http://'+window.location.host+'/listenUDP/'+port
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
          stateChange(options);
          options.body += 'UDP Socket opened succesfully. Listening on port: '+ port;
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
  });
 
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
        stateChange({
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
        stateChange(options);
      });
    });
  }

  function stateChange(options){
    if(options.protocol === 'all'){
      stateChange({protocol:'tcp'});
      stateChange({protocol:'http'});
      stateChange({protocol:'udp'});
    }
    else{
      if(options.active){
        $('.js-'+options.protocol+'-openSocket').addClass('inactive');
        $('.js-'+options.protocol+'-closeSocket').removeClass('inactive');
        $('.js-'+options.protocol+'-connection-status').removeClass('off');
        $('.js-'+options.protocol+'-connection-count').html('0');
      }
      else{
        $('.js-'+options.protocol+'-openSocket').removeClass('inactive');
        $('.js-'+options.protocol+'-closeSocket').addClass('inactive');
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

  //Lock scroll to bottom if checkbox checked
  function scrollLock(options) {
    //scroll lock
    if($('.js-'+options.protocol+'-scroll').attr('checked')){
      $('.js-'+options.protocol+'-stream')[0].scrollTop = $('.js-'+options.protocol+'-stream')[0].scrollHeight;
    }
  }
  
  //Highlight Code block if not highlighted
  function highlightMsg(options) {
    //console.log($('.js-'+options.protocol+'-stream .highlight-me'));
    $('.js-'+options.protocol+'-stream .highlight-me').forEach(function(el) {
      hljs.highlightBlock(el);
      $(el).removeClass('highlight-me');
    });
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
    highlightMsg(options);
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
      json_pp = JSON.stringify(json_pp, null, '  ');//pd.json(options.body);
      json_pp = syntaxHighlight(json_pp);
      data.code += json_pp;
    }
    //normal w/ headers
    else{
      data.code += options.body;
    }
    return data;
  }

}());


