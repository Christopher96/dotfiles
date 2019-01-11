#!/usr/bin/env bash

source ~/.zprofile.d/environment.zsh

pkill polybar

polybar -r DVI-I-1 &>/dev/null &
polybar -r HDMI-0 &>/dev/null &
polybar -r HDMI-0-bottom &>/dev/null &
polybar -r DP-5 &>/dev/null &
