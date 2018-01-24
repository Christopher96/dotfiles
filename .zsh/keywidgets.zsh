#tmux
# function tmux() {

#     zle accept-line
# }
#
# zle -N tmux
# bindkey "^t" tmux
# up
function up_widget() {
    BUFFER="cd .."
    zle accept-line
}
zle -N up_widget
bindkey "" up_widget

# git
# 	function git_prepare() {
# 		if [ -n "$BUFFER" ];
# 			then
# 				BUFFER="git add -A; git commit -m \"$BUFFER\" && git push"
# 		fi
# 
# 		if [ -z "$BUFFER" ];
# 			then
# 				BUFFER="git add -A; git commit -v && git push"
# 		fi
# 				
# 		zle accept-line
# 	}
# 	zle -N git_prepare
# 	bindkey "^g" git_prepare

# home
function goto_home() { 
    BUFFER="cd ~/"$BUFFER
    zle end-of-line
    zle accept-line
}
zle -N goto_home
bindkey "" goto_home

# Edit and rerun
#	function edit_and_run() {
#		BUFFER="fc"
#		zle accept-line
#	}
#	zle -N edit_and_run
#	bindkey "^v" edit_and_run

# LS
function ctrl_l() {
	BUFFER="ls"
	zle accept-line
}
zle -N ctrl_l
bindkey "" ctrl_l

# Sudo
function add_sudo() {
    BUFFER="sudo "$BUFFER
    zle end-of-line
}
zle -N add_sudo
bindkey "" add_sudo

# Yes
function add_yes() {
    BUFFER="yes | "$BUFFER
    zle end-of-line
}
zle -N add_yes
bindkey "" add_yes

# Scrolling, binds to urxvt keysyms
# function scroll_up() {
#     xdotool key 0xff55
# }
# zle -N scroll_up
# bindkey "" scroll_up
#
# function scroll_down() {
#     xdotool key 0xff56
# }
# zle -N scroll_down
# bindkey "" scroll_down



