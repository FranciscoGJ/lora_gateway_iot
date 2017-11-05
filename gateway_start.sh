cd lora_gateway
./reset_lgw.sh stop 25
sleep 5
./reset_lgw.sh start 25
cd ../packet_forwarder-master/lora_pkt_fwd/
sleep 20
./lora_pkt_fwd
