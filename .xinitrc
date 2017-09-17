xset +fp ~/.fonts
xset fp rehash

if [[ -f ~/.Xresources ]] && xrdb -merge -I$HOME ~/.Xresources
exec i3
