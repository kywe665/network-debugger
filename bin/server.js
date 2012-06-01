#!/usr/bin/env node
/*jshint node:true laxcomma:true*/
(function () {
  "use strict";

  var port = process.argv[2] || 0
    , create = require('../server').create
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
    app = create(process.argv[3] || (path.join(process.cwd(), 'netbug-logs')));
    run();
  }
}());
