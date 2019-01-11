" RUNTIME {{{

:runtime plugin/*
:runtime postload/*

" }}}

" AUTOCOMMANDS {{{

" Resize splits when window is resized
au VimResized * exe "normal! \<c-w>="

" Make sure Vim returns to the same line when you reopen a file.
augroup line_return
    au!
    au BufReadPost *
                \ if line("'\"") > 0 && line("'\"") <= line("$") |
                \     execute 'normal! g`"zvzz' |
                \ endif
augroup END

augroup reload_vimrc
    autocmd!
    autocmd BufWritePost $MYVIMRC breakdel *
    autocmd BufWritePost $MYVIMRC source $MYVIMRC
augroup END

autocmd BufWritePost $HOME/.vim/autoload/keybinds.vim source $HOME/.vim/autoload/keybinds.vim

au FocusGained,BufEnter * :checktime
au CursorHold,CursorHoldI * checktime

" }}}

" FOLDING {{{

set foldenable
set foldlevelstart=1
set foldmarker={{{,}}}
set foldmethod=marker

" }}}

" COMMANDS {{{

command! -complete=shellcmd -nargs=+ R call ExecuteInShell(<q-args>)


" }}}

" SETTINGS {{{

set path+=**
set wildmenu
set nocompatible
set nu
set ignorecase
set smartcase
set hlsearch          
set encoding=utf8    
set fillchars=vert:\ 
set autoread
" set number relativenumber

set tabstop=4       " The width of a TAB is set to 4.
set shiftwidth=4    " Indents will have a width of 4
set softtabstop=4   " Sets the number of columns for a TAB
set expandtab       " Expand TABs to spaces

set backup
set noswapfile
set backupdir=~/.vim/tmp
set directory=~/.vim/tmp
set undodir=~/.vim/tmp


" }}}

" COLORS {{{

syntax enable
" colorscheme wal

" }}}

" PLUGINS {{{

filetype plugin on
filetype off                  " required

" set the runtime path to include Vundle and initialize
set rtp+=~/.vim/bundle/Vundle.vim
call vundle#begin()
" alternatively, pass a path where Vundle should install plugins
"call vundle#begin('~/some/path/here')

" let Vundle manage Vundle, required
Plugin 'VundleVim/Vundle.vim'

" Helpers
Plugin 'vim-scripts/tComment'
Plugin 'mattn/emmet-vim'
Plugin 'jiangmiao/auto-pairs'
Plugin 'KabbAmine/vCoolor.vim'
Plugin 'terryma/vim-multiple-cursors'
Plugin 'ctrlpvim/ctrlp.vim'

" Snippets
Plugin 'sirver/UltiSnips'
Plugin 'honza/vim-snippets'

" Syntax
Plugin 'vim-syntastic/syntastic'
Plugin 'jelera/vim-javascript-syntax'
Plugin 'burnettk/vim-angular'
Plugin 'hail2u/vim-css3-syntax'
Plugin 'cakebaker/scss-syntax.vim'
Plugin 'leafgarland/typescript-vim'
Plugin 'othree/yajs.vim'
Plugin 'mitsuhiko/vim-jinja'
Plugin 'StanAngeloff/php.vim'
Plugin 'posva/vim-vue'
Plugin 'tmhedberg/matchit'

" Theme
Plugin 'dylanaraps/wal.vim'
Plugin 'vim-airline/vim-airline'
Plugin 'vim-airline/vim-airline-themes'
Plugin 'ap/vim-css-color'
Plugin 'ryanoasis/vim-devicons'

" Autocomplete
Plugin 'Valloric/YouCompleteMe'
Plugin 'tpope/vim-surround'
Plugin 'alvan/vim-closetag'

" Other
Plugin 'djoshea/vim-autoread'
Plugin 'OmniSharp/omnisharp-vim'

" Ultisnips {{{
" Trigger configuration. Do not use <tab> if you use https://github.com/Valloric/YouCompleteMe.
let g:UltiSnipsExpandTrigger="<tab>"
let g:UltiSnipsJumpForwardTrigger="<c-b>"
let g:UltiSnipsJumpBackwardTrigger="<c-z>"

" If you want :UltiSnipsEdit to split your window.yet g:UltiSnipsEditSplit="vertical"
"}}}

" All of your Plugins must be added before the following line
call vundle#end()	    " required
filetype plugin indent on    " required
" To ignore plugin indent changes, instead use:
"filetype plugin on
"
" Brief help
" :PluginList       - lists configured plugins
" :PluginInstall    - installs plugins; append `!` to update or just :PluginUpdate
" :PluginSearch foo - searches for foo; append `!` to refresh local cache
" :PluginClean      - confirms removal of unused plugins; append `!` to auto-approve removal
"
" see :h vundle for more details or wiki for FAQ

" }}}

" RANGER {{{

" function RangerExplorer()
"     exec "silent !ranger --choosefile=/tmp/vim_ranger_current_file " . expand("%:p:h")
"     if filereadable('/tmp/vim_ranger_current_file')
" 	exec 'edit ' . system('cat /tmp/vim_ranger_current_file')
" 	call system('rm /tmp/vim_ranger_current_file')
"     endif
"     redraw!
" endfun

" }}}

" POWERLINE {{{

if system('command -v powerline-daemon') != ''
    python3 from powerline.vim import setup as powerline_setup
    python3 powerline_setup()
    python3 del powerline_setup
    set laststatus=2
    set noshowmode
endif

let g:airline#extensions#tabline#enabled = 1
let g:airline#extensions#tabline#fnamemod = ':t'
let g:airline_powerline_fonts = 1
let g:airline_theme='zenburn'
let g:airline_left_sep = ''
let g:airline_left_alt_sep = ''
let g:airline_right_sep = ''
let g:airline_right_alt_sep = ''


" }}}

" PLUGINS {{{{

let g:vue_disable_pre_processors = 1

" }}}}
