xset +fp ~/.fonts
xset fp rehash

x="~/.cache/wal/colors.Xresources"

[[ -f $x ]] && xrdb -I$HOME $x
exec i3
