// Dependencies
var dgram = require('dgram');
var server = dgram.createSocket('udp6');
var lora_packet = require('lora-packet');

var PORT = 1680;
var HOST = '::';
const regex = /\{"rxpk(.*?)\}]}/g;
let m;

//Database Setup
var db_location = '127.0.0.1';
// var db_location = '192.168.1.89';
var db_port = '5984';
// var db_name = 'sage_test';
var db_name = 'iotrough';

global.nano = require('nano')({
    
        "url" : 'http://' + db_location + ':' + db_port
});

global.db       = global.nano.use(db_name);

//Databse Functions

//// Check if database exists
function db_check(callback){
    global.nano.db.get(db_name, function(err,body) {
        if(!err){
            console.log('db exists');
            if (callback && typeof callback=='function'){
                callback(true)
            }
            return;
        } else {
            console.log('get error',err.reason);
            if(err.error=='not_found' && (err.reason=='Database does not exist.' || err.reason=='no_db_file')) {
                global.nano.db.create(db_name,function(e,b){
                    if(!e){
                        console.log('database ' + db_name + ' created');
                        global.db = global.nano.use(db_name)

                        let view_doc = {
                            all_docs:{
                                map: function(doc){if(doc._id!='info'){emit(doc._id,{rev:doc._rev})}}
                            },
                            get_node:{
                                map: function(doc){emit(doc.node.node_id,{rev:doc._rev})}
                            }
                        }

                        let doc = {
                            _id: "info",
                            nodes: []
                        }
                        
                        global.db.insert({views:view_doc,language:"javascript"},'_design/nodes',function(error,body){
                            if(!error){
                                console.log('inserted design document');
                                global.db.insert(doc,function(e,b){
                                    if(!e){
                                        console.log('info document inserted');
                                        if (callback && typeof callback=='function'){
                                            callback(true)
                                        }
                                    } else {
                                        console.log('info doc not inserted');
                                        if (callback && typeof callback=='function'){
                                            callback(true)
                                        }
                                    }
                                    return;
                                })
                            } else {
                                console.log('design error',error.reason)
                            }
                            return;
                        });

                    } else {
                        console.log('create error',e.reason)
                        if (callback && typeof callback=='function'){
                            callback(false)
                        }
                    }
                    return;
                });
            }
        }
    })

}

//// Inputs data into database
function data_insert(data){
    if(data && typeof data=='string'){
        let data_array = data.split('|');
        if(data_array.length==5){
            db_check(function(check){
                console.log('inside db check',data_array)
                if(check){
                    
                    global.db.get('info',{include_docs:true},function(error,info){
                        if(!error){
                            console.log(info);
    
                            let node_obj = {
                                node_id:data_array[0],
                                node_name:'nodo '+parseInt(data_array[0],16),
                                added:(new Date().getTime())
                            }
    
                            if(info.nodes.findIndex(n => n.node_id==node_obj.node_id)==-1){
                                let nodes = info.nodes;
                                nodes.push(node_obj);
    
                                let new_info = {
                                    _id:'info',
                                    _rev:info._rev,
                                    nodes:nodes
                                }
    
                                db.insert(new_info,function(err,body){
                                    if(!err){
                                        console.log('database info updated');
                                    } else {
                                        console.log('error ',err.reason);
                                    }
                                })
                            }
                        } else {
                            console.log('error',error.reason);
                        }
                        return;
                    })
    
                    let doc = {
                        _id: "measure_"+(new Date().getTime()),
                        node: {
                            node_id:data_array[0],
                            node_name:'nodo '+parseInt(data_array[0],16),
                            node_location:""
                        },
                        data:{
                            sph:+data_array[1].split(':')[1],
                            sec:+data_array[2].split(':')[1],
                            tem:+data_array[3].split(':')[1],
                            lvl:+data_array[4].split(':')[1]
                        },
                        time:(new Date().getTime())
                    }
            
                    db.insert(doc,function(err,bod){
                        if(err){
                            console.log(err);
                            return;
                        } else {
                            console.log('document inserted')
                        }
                    })
    
                } else {
                    console.log("database error")
                }
            })
        } else {
            console.log('data input length mismatch');
            console.log('data input length', data_array.length)
        }
    } else {
        console.log('bad data input');
    }
}

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

function parse_packet(packet){
    packet = JSON.parse(packet);
    return packet['rxpk'][0]['data'];
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
        console.log(decode_payload(parse_packet(m[0])));
        data_insert(decode_payload(parse_packet(m[0])));
    }
});

server.bind(PORT, HOST);
