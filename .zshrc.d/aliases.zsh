alias ..='cd ..'
alias ...='cd ../..'
alias ....='cd ../../..'
alias grep='grep --color'

alias sizmekvpn='sudo openconnect vpn.mediamind.com --authgroup Sizmek -u christopher.gauffin'

alias monitors='xrandr -q | grep " connected" | cut -d ' ' -f1'

alias fname="fc-query -f '%{family[0]}\n'"

alias rmdirs="find ./* -maxdepth 0 -type d | sudo xargs rm -rf"
alias mkzips="find ./* -maxdepth 0 -type d | xargs -I{} zip -r {}.zip {}"
alias unzips="find ./* -maxdepth 0 -name \*.zip | xargs -I{} unzip {} -d ."
alias rmzips="find ./* -maxdepth 0 -name \*.zip | xargs rm -rf"

alias grepcmd='echo ${(k)aliases} ${(k)builtins} $(ls /bin) | sed -e "s/\s\+/\n/g" | grep -i'

alias del='_del(){ mv "$1" ~/.trash}; _del'

alias dotfiles="/usr/bin/git --git-dir=$HOME/.dotfiles --work-tree=$HOME"
alias dotfiles-add="dotfiles ls-files | xargs -I{} git --git-dir=$HOME/.dotfiles --work-tree=$HOME add {}"

export DOTREPO="~/.config/dotdrop"

alias dotdrop="$DOTREPO/dotdrop.sh"
alias dotgit="git -C $DOTREPO"
alias dotsync="dotgit pull && dotgit add -A && dotgit commit && dotgit push; dotdrop install"

alias tmuxk="tmux ls | grep : | cut -d. -f1 | awk '{print substr(\$1, 0, length(\$1)-1)}' | xargs kill"

alias lblk="lsblk -f -o name,fstype,size,label,mountpoint,uuid"

LS_COLORS=$(ls_colors_generator)

run_ls() {
	ls-i --color=auto -w $(tput cols) "$@"
}

run_dir() {
	dir-i --color=auto -w $(tput cols) "$@"
}

run_vdir() {
	vdir-i --color=auto -w $(tput cols) "$@"
}
alias ls="run_ls"
alias dir="run_dir"
alias vdir="run_vdir"

