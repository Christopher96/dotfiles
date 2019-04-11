" RUNTIME {{{

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

" let keybinds = '$HOME/.vim/postload/keybinds.vim'
"
" augroup reload_keybinds
"     autocmd!
"     autocmd BufWritePost keybinds breakdel *
"     autocmd BufWritePost keybinds source keybinds
" augroup END
"
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

filetype plugin on
filetype off                  " required

" }}}

" COLORS {{{

syntax enable
" colorscheme wal

" }}}

" PLUGINS {{{

call plug#begin('~/.vim/plugged')

" Helpers
Plug 'vim-scripts/tComment'
Plug 'mattn/emmet-vim'
Plug 'jiangmiao/auto-pairs'
Plug 'KabbAmine/vCoolor.vim'
Plug 'terryma/vim-multiple-cursors'
Plug 'ctrlpvim/ctrlp.vim'
Plug 'iamcco/markdown-preview.nvim', { 'do': 'cd app & yarn install'  }

" Snippets
Plug 'sirver/UltiSnips'
Plug 'honza/vim-snippets'

" Syntax
Plug 'vim-syntastic/syntastic'
Plug 'jelera/vim-javascript-syntax'
Plug 'burnettk/vim-angular'
Plug 'hail2u/vim-css3-syntax'
Plug 'cakebaker/scss-syntax.vim'
Plug 'leafgarland/typescript-vim'
Plug 'othree/yajs.vim'
Plug 'mitsuhiko/vim-jinja'
Plug 'StanAngeloff/php.vim'
Plug 'posva/vim-vue'
Plug 'tmhedberg/matchit'

" Theme
Plug 'dylanaraps/wal.vim'
Plug 'vim-airline/vim-airline'
Plug 'vim-airline/vim-airline-themes'
Plug 'ap/vim-css-color'
Plug 'ryanoasis/vim-devicons'

" Autocomplete
" Plug 'Valloric/YouCompleteMe'
Plug 'tpope/vim-surround'
Plug 'alvan/vim-closetag'

" Other
Plug 'djoshea/vim-autoread'
" Plug 'OmniSharp/omnisharp-vim'

call plug#end()

" }}}

" Ultisnips {{{
let g:UltiSnipsExpandTrigger="<tab>"
let g:UltiSnipsJumpForwardTrigger="<c-b>"
let g:UltiSnipsJumpBackwardTrigger="<c-z>"

" If you want :UltiSnipsEdit to split your window.yet g:UltiSnipsEditSplit="vertical"
"}}}

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
