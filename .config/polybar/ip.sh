#!/bin/bash
script=`realpath $0`
path=`dirname $script`
ipsave="${path}/ip.txt"

if [ "$1" == "--public" ]
  then
    ip=$(curl -s ident.me)
    echo $ip > $ipsave
fi

if [ "$1" == "--local" ]
  then
    ip=$(ip addr show | grep -Eo 'inet (addr:)?([0-9]*\.){3}[0-9]*' | grep -Eo '([0-9]*\.){3}[0-9]*' | grep -v '127.0.0.1')
    echo $ip > $ipsave
fi


ip=$(cat $ipsave)
icon1="%{F#ffffff} %{F-}"
icon2="%{F#ffffff} %{F-}"
echo "$icon1$ip$icon2"
