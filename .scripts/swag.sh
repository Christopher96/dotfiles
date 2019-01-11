#!/bin/sh
firefox &
xdotool search --sync --onlyvisible --pid $! windowactivate key Ctrl+j
