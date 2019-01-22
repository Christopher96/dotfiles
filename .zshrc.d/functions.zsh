
wifi() {
    sudo pkill wpa_supplicant
    sudo wpa_supplicant -B -i wlan0 -c<(wpa_passphrase $1 $2)
    sudo ip route flush dev wlan0
    sudo ip addr flush dev wlan0 
    sudo dhcpcd wlan0
}

urlencode() {
    local i= char= url=$*
    declare -i len=${#url}

    for (( i = 0; i < len; i++ )); do
        char=${url:i:1}
        case "$char" in
            [a-zA-Z0-9.~_-]) printf "$char" ;;
            ' ') printf + ;;
            *) printf '%%%X' "'$char" ;;
        esac
    done
}

r() {
    if [ -z "$RANGER_LEVEL" ]; then
        SHELL=/usr/local/bin/r.shell ranger
    else
        exit
    fi
}

bits() {
    for file in "$@"; do
        [[ -d "$file" ]] && continue
        printf "%1u\t%s\n" "$(( $(wc -c < "$file") * 8 ))" "$file"
    done
}

secret() {
    file="$HOME/.secrets"
    if [ -f "$file" ]; then
        cat .secrets | grep $1 | cut -d: -f2 | tr -d '[:space:]'
    else
        echo "no .secrets file"
    fi
}

alias pb="pb --apikey=$(secret pushbullet)"
