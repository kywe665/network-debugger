/*jshint strict:true node:true es5:true onevar:true laxcomma:true laxbreak:true devel:true*/
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
    , uiTabs = require('./ui-tabs')
    , io = require('socket.io-browser')
    , socket
    , pd = require('pretty-data').pd
    , pure = require('./pure-inject')
    , visual = require('./visual')
    , tabs = require('./newTab')
    ;

  function processBody(options, data) {
    var xml
      , xml_pp
      , json_pp
      ;

    if (!data) {
      data = {};
    }
    if (!options || !options.hasOwnProperty('body')) {
      console.error('options has no body:', JSON.stringify(options));
      data.code += 'No Body';
      return data;
    }

    //if xml
    if (options.body.substring(0,3) === '<?x') {
      xml_pp = pd.xml(options.body);
      xml = xml_pp.replace(/&/g, '&amp;')
                  .replace(/</g, '&lt;')
                  .replace(/>/g, '&gt;');
      data.xml = xml;
    }
    //if json
    else if (options.body.charAt(0) === '{') {
      json_pp = JSON.parse(options.body);
      json_pp = JSON.stringify(json_pp, null, '  ');
      json_pp = visual.syntaxHighlight(json_pp);
      data.code += json_pp;
    }
    else {
      data.code += options.body;
    }
    return data;
  }

  function scrollLock(protocol, port) {
    var selector = '.js-ui-tab-view[data-name="'+port+'"]'
      ;

    if ($(selector +' .js-scroll.js-'+protocol).attr('checked') && $(selector +' .js-'+protocol+'-stream')[0].scrollHeight !== 0) {
      $(selector + ' .js-'+protocol+'-stream')[0].scrollTop = $(selector +' .js-'+protocol+'-stream')[0].scrollHeight;
    }
    if ($(selector +' .js-'+protocol+'-stream').children().length > 9) {
      //console.log('cleared space: '+portName);
      $(selector +' .js-'+protocol+'-stream span').first().remove();
      $(selector +' .js-'+protocol+'-stream span').first().remove();
    }
  }

  function preInjectCode(options) {
    var data = {};
    data.code = options.headers || '';
    data = processBody(options, data);

    pure.injectCode(options, data);
    scrollLock(options.protocol, options.port);
    visual.highlightMsg(options);
  }

  function injectMessage(options, port) {
    options.port = port;
    pure.injectMessage(options);
    scrollLock(options.protocol, port);
  }

  function openListener(protocol, port, reopen) {
    var options = {}
      ;

    options.body = '';
    options.protocol = protocol;
    options.port = port;

    reqwest({
      url: 'http://'+window.location.host+'/listeners/'+protocol+'/'+port
    , type: 'json'
    , method: 'post'
    , error: function (err) {
        console.error('Server Error: ', err);
        options.body = 'Cannot communicate with netbug server';
        options.cssClass = 'css-streamError';
        injectMessage(options, 'default');
      }
    , success: function (resp) {
        if (!resp.error && (!resp.result || !resp.result.error)) {
          port = resp.result.portNum;
          if (!reopen) {
            tabs.makeNew(protocol, port);
          }
          options.active = true;
          visual.stateChange(protocol, port, true);
          options.body += protocol.toUpperCase() + ' listener succesfully opened on port '+ port;
          options.cssClass = 'css-streamNewConnection';
        }
        else {
          options.cssClass = 'css-streamError';
          if (resp.hasOwnProperty('result') && resp.result.hasOwnProperty('error')) {
            options.body += resp.result.error;
          }
          if (Array.isArray(resp.errors)) {
            resp.errors.forEach(function (error) {
              if (typeof error.message === 'string') {
                options.body += error.message;
              }
              else {
                options.body += error.message.message || error.message.code;
              }
            });
          }
          if (!options.body) {
            options.body = 'Unknown error opening linstener';
          }
        }

        injectMessage(options, 'default');
        injectMessage(options, port);
      }
    });
  }

  function setListenerLogging(protocol, port, settings) {
    var options = {}
      ;

    options.body = '';
    options.protocol = protocol;
    options.port = port;

    reqwest({
      url: 'http://'+window.location.host+'/listeners/'+protocol+'/'+port
    , type: 'json'
    , method: 'put'
    , body: settings
    , error: function (err) {
        console.error('Server Error: ', err);
        options.body = 'Cannot communicate with netbug server';
        options.cssClass = 'css-streamError';
        injectMessage(options, 'default');
        injectMessage(options, options.port);
      }
    , success: function (resp) {
        // If there wasn't an error, we will get the event listenerChanged,
        // which should trigger anything we would want to do on success
        if (!resp.error && (!resp.result || !resp.result.error)) {
          return;
        }

        options.body = '';
        options.cssClass = 'css-streamError';
        if (resp.hasOwnProperty('result') && resp.result.hasOwnProperty('error')) {
          options.body += resp.result.error;
        }
        if (Array.isArray(resp.errors)) {
          resp.errors.forEach(function (error) {
            options.body += error.message;
          });
        }
        if (!options.body) {
          options.body = 'Unknown error changing log settings for listener';
        }

        injectMessage(options, 'default');
        injectMessage(options, options.port);
      }
    });

  }

  function closeListener(protocol, port) {
    var options = {}
      ;

    options.protocol = protocol;
    options.port = port;

    reqwest({
      url: 'http://'+window.location.host+'/listeners/' + options.protocol + '/' + options.port
    , type: 'json'
    , method: 'delete'
    , error: function (err) {
        console.error('Server Error: ', err);
        options.body = 'Cannot communicate with netbug server';
        options.cssClass = 'css-streamError';
        injectMessage(options, 'default');
        injectMessage(options, options.port);
      }
    , success: function (resp) {
        // If there wasn't an error, we will get the event listenerClosed,
        // which should trigger anything we would want to do on success
        if (!resp.error && (!resp.result || !resp.result.error)) {
          return;
        }

        options.body = '';
        options.cssClass = 'css-streamError';
        if (resp.hasOwnProperty('result') && resp.result.hasOwnProperty('error')) {
          options.body += resp.result.error;
        }
        if (Array.isArray(resp.errors)) {
          resp.errors.forEach(function (error) {
            options.body += error.message;
          });
        }
        if (!options.body) {
          options.body = 'Unknown error closing listener';
        }

        injectMessage(options, 'default');
        injectMessage(options, options.port);
      }
    });
  }

  //EVENT LISTENERS ALL
  $('.container').on('.js-all-stream pre', 'click', function () {
    $(this).toggleClass('css-hl-block');
  });
  $('.container').on('.js-ui-tab-view:not(.css-active) .js-openSocket', 'click', function () {
    var protocol = $(this).attr('data-protocol')
      , port = Number($('.js-portNum.js-'+protocol).val())
      , options
      ;

    if (isNaN(port) || port < 0 || port > 65535) {
      options = {};
      options.protocol = protocol;
      options.cssClass = 'css-streamError';
      options.body = 'Specified port must be a number between 0 and 65535';
      injectMessage(options, 'default');
      return;
    }
    openListener(protocol, port);
  });
  $('.container').on('.js-ui-tab-view:not(.css-active) .js-reopen', 'click', function () {
    openListener($(this).attr('data-protocol'), $(this).attr('data-port'), true);
  });
  $('.container').on('.js-ui-tab-view .js-close-tab', 'click', function () {
   var protocol = $(this).parent().attr('data-protocol')
      , port = $(this).parent().find('a').html()
      ;

    closeListener(protocol, port);
    tabs.closeTab(protocol, port, this);
  });
  $('.container').on('.js-ui-tab-view:not(.css-active) .js-portNum', 'keypress', function (e) {
    if (e.keyCode === 13) {
      $('.js-openSocket.js-'+$(this).attr('data-protocol')).trigger('click');
    }
  });
  $('.container').on('.js-scroll', 'change', function () {
    scrollLock($(this).attr('data-protocol'), $(this).closest('.js-ui-tab-view').attr('data-name'));
  });
  $('.container').on('.js-clear', 'click', function () {
    $(this).closest('.js-ui-tab-view').find('.js-'+$(this).attr('data-protocol')+'-stream').html('');
  });
  $('.container').on('.js-ui-tab-view:not(.css-inactive) .js-log', 'click', function () {
    var protocol = $(this).attr('data-protocol')
      , port = $(this).closest('.js-ui-tab-view').attr('data-name')
      ;

    setListenerLogging(protocol, port, {logData: true, separateFiles: true});
  });
  $('.container').on('.js-ui-tab-view:not(.css-inactive) .js-closeSocket', 'click', function () {
    var protocol = $(this).attr('data-protocol')
      , port = $(this).closest('.js-ui-tab-view').attr('data-name')
      ;

    closeListener(protocol, port);
  });

  //SOCKET COMMUNICATION WITH SERVER
  function openSocket(port) {
    socket = io.connect('http://'+window.location.hostname+':'+port);

    socket.on('connect', function () {
      socket.send('hi');

      socket.on('listenerCreated', function (msg) {
        console.log('TODO: implement listenerCreated:', msg);
      });

      socket.on('listenerData', function (msg) {
        preInjectCode(msg);
      });

      socket.on('connectionChange', function (msg) {
        //console.log('TODO: implement connectionChange:', msg);
        //$('.js-tcp-connection-count').html(count);
      });

      socket.on('listenerChanged', function (msg) {
        console.log('TODO: implement listenerChanged:', msg);
      });

      socket.on('listenerClosed', function (msg) {
        var options = {};

        options.body = msg.protocol.toUpperCase() + ' Listener on port ' + msg.port + ' closed';
        options.cssClass = 'css-streamCloseConnection';
        options.protocol = msg.protocol;
        injectMessage(options, 'default');
        injectMessage(options, msg.port);

        visual.stateChange(msg.protocol, msg.port, false);
      });

      socket.on('disconnect', function () {
        var options = {};

        console.log('Browser-Disconnected socket');
        options.cssClass = 'css-streamError';
        options.body = 'NetBug Server Down';
        options.protocol = 'all';
        injectMessage(options, 'default');
        options.active = false;
        $('.js-log.activeLog').trigger('click');
        visual.stateChange('all');
      });

    });
  }

  function initBuild(resp) {
    var options = {};

    openSocket(resp.result.socketPort);
    // delete the socket port to make sure it isn't interpretted as a protocol
    delete resp.result.socketPort;

    Object.keys(resp.result).forEach(function (protocol) {
      if (Array.isArray(resp.result[protocol]) && resp.result[protocol].length > 0) {
        resp.result[protocol].forEach(function (listener) {
          tabs.makeNew(protocol, listener.portNum);
          options.body = protocol.toUpperCase() + ' listener open on port '+ listener.portNum;
          options.cssClass = 'css-streamNewConnection';
          options.protocol = protocol;
          injectMessage(options, 'default');
          injectMessage(options, listener.portNum);
          visual.stateChange(protocol, listener.portNum, true);
        });
      }
    });
  }

  $(document).ready(function () {
    var options = {};
    options.protocol = 'all';
    options.body = '';

    uiTabs.create('body', '.js-ui-tab a', '.js-ui-tab', '.js-ui-tab-view', 'http/default');

    reqwest({
      url: 'http://'+window.location.host+'/onPageLoad'
    , type: 'json'
    , method: 'get'
    , error: function (err) {
        console.error('Server Error: ', err);
        options.body = 'Cannot communicate with netbug server';
        options.cssClass = 'css-streamError';
        injectMessage(options, 'default');
      }
    , success: function (resp) {
        if (!resp.error && resp.result && !resp.result.error) {
          initBuild(resp);
        }
        else {
          options.cssClass = 'css-streamError';
          if (resp.hasOwnProperty('result') && resp.result.hasOwnProperty('error')) {
            options.body += resp.result.error;
          }
          if (Array.isArray(resp.errors)) {
            resp.errors.forEach(function (error) {
              options.body += error.message;
            });
          }
          if (!options.body) {
            options.body = 'Unknown error on page load';
          }
          injectMessage(options, 'default');
        }
      }
    });
  });

}());
