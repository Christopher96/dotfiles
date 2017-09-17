
" RUNTIME {{{

:runtime plugin/*
:runtime autoload/*

" }}}

" AUTOCOMMANDS {{{

" Commenting blocks of code.
autocmd FileType * 		  let b:comment_leader = '! '
autocmd FileType c,cpp,java,scala let b:comment_leader = '// '
autocmd FileType sh,ruby,python   let b:comment_leader = '# '
autocmd FileType conf,fstab       let b:comment_leader = '# '
autocmd FileType tex              let b:comment_leader = '% '
autocmd FileType mail             let b:comment_leader = '> '
autocmd FileType vim              let b:comment_leader = '" '

" Resize splits when window is resized
au VimResized * exe "normal! \<c-w>="

" Make sure Vim returns to the same line when you reopen a file.
" Thanks, Amit
augroup line_return
    au!
    au BufReadPost *
        \ if line("'\"") > 0 && line("'\"") <= line("$") |
        \     execute 'normal! g`"zvzz' |
        \ endif
augroup END

" }}}

" FOLDING {{{

set foldenable
set foldlevelstart=1
set foldmarker={{{,}}}
set foldmethod=marker

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
set shiftwidth=4

set backup
set noswapfile
set backupdir=~/.vim/tmp/backup//
set directory=~/.vim/tmp/swap//
set undodir=~/.vim/tmp/undo//

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

" }}}

" COLORS {{{

colorscheme delek
syntax enable

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
"Plugin 'scrooloose/nerdtree'
Plugin 'Xuyuanp/nerdtree-git-plugin'
Plugin 'mattn/emmet-vim'
Plugin 'jiangmiao/auto-pairs'
Plugin 'OmniSharp/omnisharp-vim'
Plugin 'vim-airline/vim-airline'
Plugin 'vim-airline/vim-airline-themes'
Plugin 'vim-syntastic/syntastic'
Plugin 'KabbAmine/vCoolor.vim'
Plugin 'tpope/vim-surround'
Plugin 'tpope/vim-dispatch'
Plugin 'terryma/vim-multiple-cursors'
Plugin 'ap/vim-css-color'
Plugin 'ryanoasis/vim-devicons'

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

function RangerExplorer()
    exec "silent !ranger --choosefile=/tmp/vim_ranger_current_file " . expand("%:p:h")
    if filereadable('/tmp/vim_ranger_current_file')
	exec 'edit ' . system('cat /tmp/vim_ranger_current_file')
	call system('rm /tmp/vim_ranger_current_file')
    endif
    redraw!
endfun

" }}}

"NERDtree autospawn
"autocmd StdinReadPre * let s:std_in=1
"autocmd VimEnter * if argc() == 0 && !exists("s:std_in") | NERDTree | endif
