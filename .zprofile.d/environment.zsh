FG=$(xrdb -query | awk '/polybar.foreground_alt:/ {print $2}')
export POLYBAR_IP="%{F"$FG"} %{F-}%local_ip%%{F"$FG"}  %{F-}"
