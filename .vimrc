" RUNTIME {{{

:runtime autoload/*
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

set tabstop=4       " The width of a TAB is set to 4.
set shiftwidth=4    " Indents will have a width of 4
set softtabstop=4   " Sets the number of columns for a TAB
set expandtab       " Expand TABs to spaces

set backup
set noswapfile
set backupdir=~/.vim/tmp
set directory=~/.vim/tmp
set undodir=~/.vim/tmp
set relativenumber

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
Plug 'KabbAmine/vCoolor.vim'
Plug 'terryma/vim-multiple-cursors'
Plug 'ctrlpvim/ctrlp.vim'
Plug 'francoiscabrol/ranger.vim'
Plug 'rbgrouleff/bclose.vim'

" Syntax
Plug 'PotatoesMaster/i3-vim-syntax'
Plug 'elixir-editors/vim-elixir'
Plug 'vim-syntastic/syntastic'
Plug 'pangloss/vim-javascript'
Plug 'mxw/vim-jsx'
Plug 'burnettk/vim-angular'
Plug 'hail2u/vim-css3-syntax'
Plug 'cakebaker/scss-syntax.vim'
Plug 'leafgarland/typescript-vim'
Plug 'othree/yajs.vim'
Plug 'mitsuhiko/vim-jinja'
Plug 'StanAngeloff/php.vim'
Plug 'posva/vim-vue'
Plug 'tmhedberg/matchit'
Plug 'leafgarland/typescript-vim'
Plug 'tasn/vim-tsx'
" Plug 'Quramy/tsuquyomi'

" Theme
Plug 'dylanaraps/wal.vim'
Plug 'vim-airline/vim-airline'
Plug 'vim-airline/vim-airline-themes'
Plug 'ap/vim-css-color'
Plug 'ryanoasis/vim-devicons'

" Autocomplete
Plug 'tpope/vim-surround'
Plug 'alvan/vim-closetag'

" Other
Plug 'djoshea/vim-autoread'

" Nvim
if has('nvim')
    Plug 'rbgrouleff/bclose.vim'
    Plug 'iamcco/markdown-preview.nvim', { 'do': 'cd app & yarn install'  }
    Plug 'neoclide/coc.nvim', {'branch': 'release'}
endif

call plug#end()

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
let g:OmniSharp_highlight_types = 2

" }}}}

" AUTOCLOSE {{{

function! s:CloseBracket()
    let line = getline('.')
    if line =~# '^\s*\(struct\|class\|enum\) '
        return "{\<Enter>};\<Esc>O"
    elseif searchpair('(', '', ')', 'bmn', '', line('.'))
        " Probably inside a function call. Close it off.
        return "{\<Enter>});\<Esc>O"
    else
        return "{\<Enter>}\<Esc>O"
    endif
endfunction
inoremap <expr> {<Enter> <SID>CloseBracket()

"}}}

" COC EXTENSIONS {{{

let g:coc_global_extensions = [
  \ 'coc-snippets',
  \ 'coc-pairs',
  \ 'coc-tsserver',
  \ 'coc-eslint', 
  \ 'coc-prettier', 
  \ 'coc-json', 
  \ ]

autocmd CursorHold * silent call CocActionAsync('highlight')

"}}}
