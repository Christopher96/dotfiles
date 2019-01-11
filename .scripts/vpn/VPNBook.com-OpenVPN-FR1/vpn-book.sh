#!/bin/bash
username="vpnbook"
password="283swrn"
read -sp "Enter Sudo Password: " sudopassword
/usr/bin/expect << EOF
spawn sudo openvpn vpnbook-fr1-udp25000.ovpn
expect "password for $USER: "
send "$sudopassword\r"
expect "Enter Auth Username: "
send "$username\r"
expect "Enter Auth Password: "
send "$password\r"
expect "$ "
EOF
