#!/bin/bash
username="vpnbook"
password="p57u662"
read -sp "Enter Sudo Password: " sudopassword
/usr/bin/expect << EOF
spawn sudo openvpn vpnbook-euro2-tcp80.ovpn
expect "password for $USER: "
send "$sudopassword\r"
expect "Enter Auth Username: "
send "$username\r"
expect "Enter Auth Password: "
send "$password\r"
expect "$ "
EOF
