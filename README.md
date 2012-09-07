# netbug

Network Debugging tool. Monitor Http, Tcp, and Udp traffic on your network. Save log files for later reference.

## Install

1. Install [Nodejs](http://nodejs.org)

2. Install netbug with [npm](http://github.com/isaacs/npm):

####Linux/Mac in terminal
    sudo npm install -g netbug

####Windows recommended in powershell, but also works in cmd
    npm install -g netbug

## Run from terminal

    netbug-server <port> <log-directory>
    
ex:

    netbug-server 1234 ./logs

####Now open your browser to http://localhost:1234

If you choose to log files they will be saved in the directory that you specified.

