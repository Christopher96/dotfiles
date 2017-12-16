cdl(){
    cd $1
    ls
}

mkcd(){
    mkdir $1
    cd $1
}

apmy(){
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

r() {
    if [ -z "$RANGER_LEVEL" ]; then
        SHELL=/usr/local/bin/r.shell ranger
    else
        exit
    fi
}

# Fetches credentials from .gitconfig (don't add this config file to dotfiles repo)
github-auth() {
    username=`git config github.user`
    if [ "$username" = "" ]; then
    echo "Could not find username, run 'git config --global github.user <username>'"
    invalid_credentials=1
    fi

    token=`git config github.token`
    if [ "$token" = "" ]; then
    echo "Could not find token, run 'git config --global github.token <token>'"
    invalid_credentials=1
    fi

    if [ "$invalid_credentials" = 1 ]; then
    return 1
    fi
}

github-create() {
    repo_name=$1

    dir_name=`basename $(pwd)`

    if [ "$repo_name" = "" ]; then
    echo "Repo name (hit enter to use '$dir_name')?"
    read repo_name
    fi

    if [ "$repo_name" = "" ]; then
    repo_name=$dir_name
    fi
    
    github-auth

    echo -n "Creating Github repository '$repo_name' ..."
    response=$(curl -u "$username:$token" https://api.github.com/user/repos -d '{"name":"'$repo_name'"}' -s -o /tmp/curl_output -w "%{http_code}")

    if [ "$response" -gt "300" ]; then
        cat /tmp/curl_output
    else

    echo "Initializing git repository"
    git init
    echo "Adding all files to stage"
    git add -A
    echo "Making first commit"
    git commit -m "first commit"
	echo "Pushing local code to remote ..."
	git remote add origin git@github.com:$username/$repo_name.git > /dev/null 2>&1
	git push -u origin master > /dev/null 2>&1
	echo " done."
    fi
}

github-delete() {
    repo_name=$1

    dir_name=`basename $(pwd)`

    if [ "$repo_name" = "" ]; then
	echo "Repo name (hit enter to use '$dir_name')?"
	read repo_name
    fi

    if [ "$repo_name" = "" ]; then
	repo_name=$dir_name
    fi

    github-auth

    echo -n "Are you sure you want to delete '$repo_name' (y/n)?: "
    read response

    if [ "$response" != "y" ]; then
	return 0
    fi

    echo -n "Deleting Github repository '$repo_name' ..."
    response=$(curl -u "$username:$token" https://api.github.com/repos/"$username"/"$repo_name" -X DELETE -s -o /tmp/curl_output -w "%{http_code}")
    
    if [ "$response" -gt "300" ]; then
	cat /tmp/curl_output
    else
	echo " done."
    fi
}

github-list() {
    github-auth

    echo "Listing github repos for '$username'"
    curl -u "$username:$token" https://api.github.com/user/repos -X GET -s -w "%{http_code}" -d '{"affiliation":"owner"}' | grep "full_name" | cut -d\" -f4
}

