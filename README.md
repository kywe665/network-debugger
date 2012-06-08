# netbug

Network Debugging tool. Monitor Http, Tcp, and Udp traffic on your network. Save log files for later reference.

## Install

1. Install [Nodejs](http://nodejs.org)

2. Install netbug with [npm](http://github.com/isaacs/npm):

    sudo npm install -g netbug

## Run

    netbug-server <port> <log-directory>
    
ex:

    netbug-server 1234 ./logs

####Now open your browser to http://localhost:1234

If you choose to log files they will be saved in the directory that you specified.
