#!/bin/sh

if [ "$1" == "--push" ]; then
    echo "asd"
elif [ "$1" == "--push" ]; then
    echo "asd"
fi

drive quota | (

while read line; do
    if [ "$line" != "${line/Used/}" ]; then
        used=${line#*(}
        used=${used%G*}
    elif [ "$line" != "${line/Total/}" ]; then
        total=${line#*(}
        total=${total%G*}
    fi
done

echo "$used/$total GB"
)


