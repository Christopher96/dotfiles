function cdl(){
  cd $1
  ls
}

function mkcd(){
  mkdir $1
  cd $1
}

function apmy(){
  sudo systemctl $1 apache2
  sudo systemctl $1 mysql
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
