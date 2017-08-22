:let mapleader = ","

nmap <leader>q  		:bp <BAR> bd #<CR>
nmap <leader>Q  		:bp! <BAR> bd! #<CR>
nmap <leader>b  		:ls<CR>
nmap <leader>w 			:w<CR>
nmap <leader>W 			:w !sudo tee % >/dev/null<CR>

map <leader>r 			:call RangerExplorer()<CR>

nnoremap <leader>d 		"_d
vnoremap <leader>d 		"_d
vnoremap <leader>p 		"_p

"map <C-n> 			:NERDTreeToggle<CR>

nnoremap <leader><Tab> 		:bnext<CR>
nnoremap <leader><S-Tab>	:bprevious<CR>
nnoremap <Space> 		i_<Esc>r
nnoremap <Backspace>		"_dd
nnoremap <CR> 			o<ESC>
nnoremap <Esc><Esc> 		:noh<CR>

vnoremap <Tab>			>><Esc>gv
vnoremap <S-Tab>		<<<Esc>gv
nnoremap <Tab>			>>
nnoremap <S-Tab>		<<

inoremap <expr> <C-K>   	BDG_GetDigraph() 

vmap  <expr>  <LEFT>   		DVB_Drag('left')                        
vmap  <expr>  <RIGHT>  		DVB_Drag('right')                       
vmap  <expr>  <DOWN>   		DVB_Drag('down')                        
vmap  <expr>  <UP>     		DVB_Drag('up')                          
vmap  <expr>  D        		DVB_Duplicate()                         

function RangerExplorer()
    exec "silent !ranger --choosefile=/tmp/vim_ranger_current_file " . expand("%:p:h")
	if filereadable('/tmp/vim_ranger_current_file')
        exec 'edit ' . system('cat /tmp/vim_ranger_current_file')
        call system('rm /tmp/vim_ranger_current_file')
    endif
    redraw!
endfun

let g:vcoolor_map = 'gco'
let g:vcool_ins_rgb_map = 'gcr'
let g:vcool_ins_hsl_map = 'gch'
let g:vcool_ins_rgba_map = 'gcb'

let g:airline#extensions#tabline#enabled = 1
let g:airline#extensions#tabline#fnamemod = ':t'
let g:DVB_TrimWS = 1
