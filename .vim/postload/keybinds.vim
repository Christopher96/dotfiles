" --- LEADER MAPPINGS ---
let mapleader = ","

" Emmet
let g:user_emmet_leader_key=","

" URLscan
noremap <leader>sl      :w<Home>silent <End> !urlscan<CR>
map <leader>l           :call HandleURL()<cr>

" Buffers
nnoremap <leader>q  	:bp! <BAR> bd! #<CR>
nnoremap <leader>s	    :w !sudo tee % >/dev/null<CR>

" Folding
nnoremap <leader>z		zMzvzz

" Auto indent current file
nmap <leader>i mzgg=G`z

" vCoolor
let g:vcoolor_map = '<leader>c'
let g:vcool_ins_hsl_map = '<leader>ch'		" Insert hsl color.
let g:vcool_ins_rgba_map = '<leader>ca'		" Insert rgba color.
let g:vcool_ins_rgb_map = '<leader>cr'		" Insert rgb color.

" YouCompleteMe
noremap <leader>g       :YcmCompleter GoToDeclaration<CR>
 
" --- CTRL MAPPINGS ---

" CtrlP
let g:ctrlp_map = '<c-f>'
let g:ctrlp_cmd = 'CtrlP'

" YCM 
let g:ycm_key_list_select_completion = ['<Down>']
let g:ycm_key_list_previous_completion = ['<Up>']

" Buffers
nnoremap <C-j>          :bprevious<CR>
nnoremap <C-k>          :bnext<CR>

" Ranger
noremap  <C-o>	        :wa<CR>:Ranger<CR>

" Clipboard
nnoremap <C-y>          "+y
vnoremap <C-y>          "+y
nnoremap <C-p>		    "+p
vnoremap <C-p>		    "+p
inoremap <C-p>		    <Esc>"+pa
nnoremap <C-x>          "+dd

let g:AutoPairsShortcutFastWrap = '<C-e>'

map 	 <silent> <C-q> :bd <BAR> :bnext<CR>
nnoremap <C-s>			:w<CR>
inoremap <C-s>			<Esc>:w<CR>
vnoremap <C-s>			<Esc>:w<CR>
nnoremap <C-i> 			i_<Esc>r
map	 <silent> <C-c>		<C-c>:noh<CR>

" Quick edit
nnoremap <C-e>v			:e ~/.vimrc<CR>
nnoremap <C-e>b			:e ~/.vim/postload/keybinds.vim<CR>
nnoremap <C-e>i			:e ~/.config/i3/config<CR>
nnoremap <C-e>p			:e ~/.config/polybar/config<CR>
nnoremap <C-e>x			:e ~/.config/wal/templates/colors.Xresources<CR>
nnoremap <C-e>z			:e ~/.zshrc<CR>


" Plugins
vnoremap <silent> <C-r>     :call VReplace()<cr>
nnoremap <silent> <C-e>e    :call AutoCompile()<cr>

" <C-Y> Emmet
" <C-N> Multiple Cursors


" --- KEY MAPPINGS ---
nnoremap n			nzzzv
nnoremap N			Nzzzv

nnoremap K          {
nnoremap J          }
vnoremap K          {
vnoremap J          }

nnoremap H			g0
vnoremap H			g0

nnoremap L			$
vnoremap L			$

nnoremap yH			y0
nnoremap dH			d0
nnoremap cH			c0

nnoremap yL			y$
nnoremap dL			d$
nnoremap cL			c$

" --- GENERAL MAPPINGS ---

" Folding
nnoremap <silent> <Space> 	@=(foldlevel('.')?'za':"\<Space>")<CR>
vnoremap <Space>		zf
nnoremap <S-BS>			k"_dd
nnoremap <BS>			"_dd
nnoremap <S-CR>			O<Esc>
nnoremap <CR> 			o<Esc>

" --- TAB MAPPINGS ---
imap <expr> <Tab> pumvisible() ? "\<C-y>" : "\<C-g>u\<CR>"

nnoremap <Tab> 			>>
nnoremap <S-Tab>		<<
vnoremap <Tab>			><Esc>gv
vnoremap <S-Tab>		<<Esc>gv
map 	 <Esc><Esc>		:noh<CR>

" --- ARROW MAPPINGS ---
vmap  <expr>  <LEFT>   		DVB_Drag('left')                        
vmap  <expr>  <RIGHT>  		DVB_Drag('right')                       
vmap  <expr>  <DOWN>   		DVB_Drag('down')                        
vmap  <expr>  <UP>     		DVB_Drag('up')                          
vmap  <expr>  D        		DVB_Duplicate()                         
