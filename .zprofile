# Remaps
xmodmap -e 'clear Lock' -e 'keycode 0x42 = Escape'

if [ -z "$DISPLAY" ] && [ -n "$XDG_VTNR" ] && [ "$XDG_VTNR" -eq 1 ]; then
    startx
fi
