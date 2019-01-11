#!/usr/bin/env bash

# Source generated colors.
source "${HOME}/.cache/wal/colors.sh"

reload_dunst() {
    pid=pgrep dunst
    echo $pid
    # kill $pid && wait $pid && dunst -lb "$color2" -nb "$color2" -cb "$color2" -lf "$color15" -bf "$color15" -cf "$color15" &
}

reload_firefox() {
    wid=$(xdotool search --name "Mozilla Firefox" | tail -n 1)
    xdotool key --window "$wid" Ctrl+Tab
}

reload_polybar() {
    $HOME/.scripts/polybar.sh
}

init() {
    # reload_dunst &
    # reload_polybar
    reload_firefox
}

init


