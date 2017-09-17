alias ..='cd ..'
alias ...='cd ../..'
alias ....='cd ../../..'
alias grep='grep --color'

alias sizmekvpn='sudo openconnect vpn.mediamind.com --authgroup SIZMEK_ISRAEL -u christopher.gauffin'

alias monitors='xrandr -q | grep " connected" | cut -d ' ' -f1'

alias fname="fc-query -f '%{family[0]}\n'"

alias rmdirs="find ./* -maxdepth 0 -type d | sudo xargs rm -rf"
alias mkzips="find ./* -maxdepth 0 -type d | xargs -I{} zip -r {}.zip {}"
alias unzips="find ./* -maxdepth 0 -name \*.zip | xargs -I{} unzip {} -d ."
alias rmzips="find ./* -maxdepth 0 -name \*.zip | xargs rm -rf"

alias grepcmd='echo ${(k)aliases} ${(k)builtins} $(ls /bin) | sed -e "s/\s\+/\n/g" | grep -i'

alias tea="tee -a"

alias del='_del(){ mv "$1" ~/.local/share/Trash/files}; _del'

alias dotfiles="/usr/bin/git --git-dir=$HOME/.dotfiles --work-tree=$HOME"
alias dotfiles_add="dotfiles ls-files | xargs -I{} git --git-dir=$HOME/.dotfiles --work-tree=$HOME add {}"
