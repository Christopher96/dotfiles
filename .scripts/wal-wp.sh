#!/usr/bin/env bash

arg=$1
img="/mnt/share/backgrounds/$arg" 
wal -i $img -e -o "$HOME/.scripts/wal-set.sh" 
