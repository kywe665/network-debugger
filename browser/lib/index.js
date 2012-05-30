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
    , pd = require('pd')
    ;
  //Create Tabs
  uiTabs.create('body', '.js-ui-tab a', '.js-ui-tab', '.js-ui-tab-view', 'http');
  hljs.initHighlightingOnLoad();
  console.log(hljs);

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
        options.error = true;
        options.body = 'Cannot communicate with netbug server';
        writeMsg(options);
      }
    , success: function (resp) {
        var html, i;
        console.log('success: ', resp);
        if(!resp.error){
          options.active = true;
          stateChange(options);
          if(resp.result.socket){
            options.body += '<span class="css-streamNewConnection">TCP Socket opened succesfully. ';
          }
          if(resp.result.listening){
            options.body += 'Listening on port: '+ port +' </span>';
          }
        }
        else{
          options.error = true;
          for(i=0; i < resp.errors.length; i=i+1){
						options.body += resp.errors[i].message;
					}
        }
        writeMsg(options);
      }
    });
    openSocket(options);
	});
  //EVENT LISTENERS HTTP
  $('.container').on('.js-http-clear', 'click', function(){
    $('.js-http-stream').html('');
  });
  $('.container').on('.js-http-scroll', 'change', function(){
    scrollLock({protocol: 'http'});
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
        options.error = true;
        options.body = 'Cannot communicate with netbug server';
        writeMsg(options);
      }
    , success: function (resp) {
        var html, i;
        console.log('success: ', resp);
        if(!resp.error){
          options.active = true;
          stateChange(options);
          options.body += '<span class="css-streamNewConnection">HTTP Socket opened succesfully. ';
          options.body += 'Listening on port: '+ port +' </span>';
        }
        else{
          options.error = true;
          for(i=0; i < resp.errors.length; i=i+1){
						options.body += resp.errors[i].message;
					}
        }
        writeMsg(options);
      }
    });
    openSocket(options);
  });
  //EVENT LISTENERS UDP
  $('.container').on('.js-udp-clear', 'click', function(){
    $('.js-udp-stream').html('');
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
        options.error = true;
        options.body = 'Cannot communicate with netbug server';
        writeMsg(options);
      }
    , success: function (resp) {
        var html, i;
        console.log('success: ', resp);
        if(!resp.error){
          options.active = true;
          stateChange(options);
          options.body += '<span class="css-streamNewConnection">UDP Socket opened succesfully. ';
          options.body += 'Listening on port: '+ port +' </span>';
        }
        else{
          options.error = true;
          for(i=0; i < resp.errors.length; i=i+1){
						options.body += resp.errors[i].message;
					}
        }
        writeMsg(options);
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
        options.protocol = 'tcp';
        writeMsg(options);
      });
      socket.on('httpData', function (msg) {
        writeMsg(msg);
      });
      socket.on('udpData', function (msg) {
        msg.protocol = 'udp';
        writeMsg(msg);
      });
      socket.on('connectionChange', function (count, closed) {
        $('.js-tcp-connection-count').html(count);
        if(closed){
          options.body = '<span class="css-streamCloseConnection">Socket Closed</span>';
        }
        else{
          options.body = '<span class="css-streamNewConnection">New Socket Opened</span>';
        }
        options.protocol = 'tcp';
        writeMsg(options);
        
      });
      socket.on('closedConnection', function(num, protocol){
        options.body = '<span class="css-streamCloseConnection">Closed Connection on '+num+'</span>';
        stateChange({
          active: false,
          protocol: protocol
        });
        options.protocol = protocol;
        writeMsg(options);
      });
      socket.on('disconnect', function () { 
        console.log('Browser-Disconnected socket');
        options.error = true;
        options.body = 'NetBug Server Down';
        options.protocol = 'all';
        writeMsg(options);
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

  function prepareMsg(options) {
    var timeStamp = new Date()
      , msg = ''
      , xml
      , xml_pp
      , json_pp
      ;
    msg += '<span class="css-streamTime">'+timeStamp.toString()+'</span><br/>';
    //prepare error message
    if (options.error || options.protocol === 'all'){
      msg += '<span class="css-streamError">'+options.body+'</span>';
      return msg;
    }
    //prepare normal message w/ headers
    if(options.headers){
      msg += '<pre>'+options.headers;
      //if xml
      if(options.body.substring(0,3) === '<?x'){
        console.log('im xml!!!');
        xml_pp = pd.xml(options.body);
        xml = xml_pp.replace(/&/g, '&amp;')
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;');
        console.log({body: options.body, pp: xml_pp, xml: xml});
        msg += '<code class="highlight-me">'+xml+'</code></pre>';
      }
      //if json
      else if(options.body.charAt(0) === '{'){
        json_pp = JSON.parse(options.body);
        json_pp = JSON.stringify(json_pp, null, '  ');//pd.json(options.body);
        json_pp = syntaxHighlight(json_pp);
        msg += json_pp+'</pre>';
      }
      //normal w/ headers
      else{
        msg += options.body+'</pre>';
      }
    }
    //normal message
    else{
      msg += '<pre>'+options.body+'</pre>';
    }
    return msg;
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

  function writeMsg(options) {
    var msg = '';
    msg += prepareMsg(options);
    //Send message to all windows
    if(options.protocol === 'all') {
      $('.js-allstream').append(msg+'<br/>');
    }
    //Send to just one window
    else{
      $('.js-'+options.protocol+'-stream').append(msg+'<br/>');
    }
    //Lock the scroll
    scrollLock(options);
    highlightMsg(options);
    //Reset values just in case
    options.error = false;
		options.msg = '';
  }

  function init() {

  }
  
   module.exports.init = init;
}());


