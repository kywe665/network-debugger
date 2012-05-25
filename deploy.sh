#!/usr/bin/env bash

#npm install -g jade less pakmanager

pushd server
  npm install
popd

#pushd local
#  npm install
#popd

pushd browser
  WEBPUB='../webclient-deployed'
  rm -rf "${WEBPUB}"
  mkdir -p "${WEBPUB}/"

  jade index.jade
  mv index.html "${WEBPUB}/"

  lessc style.less > style.css
  mv style.css "${WEBPUB}/"

  pakmanager build
  rm pakmanaged.html
  uglifyjs pakmanaged.js > pakmanaged.min.js
  mv pakmanaged.* "${WEBPUB}"
popd

#pushd clients
#popd
