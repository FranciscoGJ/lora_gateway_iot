var PORT = 1680;
var HOST = '::';

var dgram = require('dgram');
var server = dgram.createSocket('udp6');

const regex = /\{"rxpk(.*?)\}]}/g;
let m;

server.on('listening', function () {
    var address = server.address();
    console.log('UDP Server listening on ' + address.address + ":" + address.port);
});

server.on('message', function (message, remote) {

    while ((m = regex.exec(message)) !== null) {
        // This is necessary to avoid infinite loops with zero-width matches
        if (m.index === regex.lastIndex) {
            regex.lastIndex++;
        }
        
        // The result can be accessed through the `m`-variable.
        m.forEach((match, groupIndex) => {
            console.log(remote.address + ' ' + remote.port +' = ' `${match}`);
        });
    }

});

server.bind(PORT, HOST);