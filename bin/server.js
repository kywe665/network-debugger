#!/usr/bin/env node
/*jshint node:true laxcomma:true*/
(function () {
  "use strict";

  var port = process.argv[2] || 0
    , init = require('../server').init
    , path = require('path')
    , app
    ;

  function run() {
    var server
      ;

    function onListening() {
      var addr = server.address()
        ;

      console.log("Listening on http://%s:%d", addr.address, addr.port);
    }

    server = app.listen(port, onListening);
  }

  if (require.main === module) {
    app = init(process.argv[3] || (path.join(process.cwd(), 'netbug-logs')));
    run();
  }
}());
