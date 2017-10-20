// Dependencies
var dgram = require('dgram');
var server = dgram.createSocket('udp6');
var lora_packet = require('lora-packet');

var PORT = 1680;
var HOST = '::';
const regex = /\{"rxpk(.*?)\}]}/g;
let m;

// payload decoding 

function decode_payload(payload){

    // decode a packet 
    var packet = lora_packet.fromWire(new Buffer(payload, 'base64'));
    // check MIC 
    var NwkSKey = new Buffer('44024241ed4ce9a68c6a8bc055233fd3', 'hex');
    console.log("MIC check=" + (lora_packet.verifyMIC(packet, NwkSKey) ? "OK" : "fail"));
    // decrypt payload 
    var AppSKey = new Buffer('2B7E151628AED2A6ABF7158809CF4F3C', 'hex');
    data = lora_packet.decrypt(packet, AppSKey, NwkSKey).toString()
    console.log("Decrypted='" + data + "'");
    return data;
}

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
        // m.forEach((match, groupIndex) => {
            // console.log(remote.address + ' ' + remote.port +' = ' `${match}`);
        //});
        console.log(decode_payload(m[0]))
    }
});

server.bind(PORT, HOST);