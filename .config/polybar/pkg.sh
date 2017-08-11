#!/bin/bash
pac=$(checkupdates | wc -l)
aur=$(cower -u | wc -l)

check=$((pac + aur))
if [[ "$check" != "0" ]]
then
    echo "$pac %{F#ffffff}%{F-} $aur"
fi

if [ "$1" == "--upgrade" ]
  then
    urxvt -e sh -c "sudo pacman -Syu"
fi

if [ "$1" == "--update" ]
  then
    urxvt -e sh -c "sudo pacman -Sy && sudo aur"
fi
