" LEADER MAPPINGS
:let mapleader = ","

" Ranger file explorer
noremap <leader>rr	 	:RangerEdit<cr>
noremap <leader>rv	 	:RangerVSplit<cr>
noremap <leader>rs	 	:RangerSplit<cr>
noremap <leader>rt	 	:RangerTab<cr>
noremap <leader>ri	 	:RangerInsert<cr>
noremap <leader>ra	 	:RangerAppend<cr>
noremap <leader>rc	 	:set operatorfunc=RangerChangeOperator<cr>g@
noremap <leader>rR	 	:set operatorfunc=RangerBrowseEdit<cr>g@
noremap <leader>rT	 	:set operatorfunc=RangerBrowseTab<cr>g@
noremap <leader>rS	 	:set operatorfunc=RangerBrowseSplit<cr>g@
noremap <leader>rV	 	:set operatorfunc=RangerBrowseVSplit<cr>g@

" Quick edit
noremap <leader>ev		:w<CR>:e ~/.vimrc<CR>
noremap <leader>ei		:w<CR>:e ~/.config/i3/config<CR>
noremap <leader>ep		:w<CR>:e ~/.config/polybar/config<CR>
noremap <leader>ex		:w<CR>:e ~/.Xresources<CR>
noremap <leader>eb		:w<CR>:e ~/.vim/autoload/keybinds.vim<CR>

nnoremap <leader>q  		:bp! <BAR> bd! #<CR>
nnoremap <leader>s		:w !sudo tee % >/dev/null<CR>

" Commenting blocks of code.
noremap <silent> <leader>cc :<C-B>silent <C-E>s/^/<C-R>=escape(b:comment_leader,'\/')<CR>/<CR>:nohlsearch<CR>
noremap <silent> <leader>cu :<C-B>silent <C-E>s/^\V<C-R>=escape(b:comment_leader,'\/')<CR>//e<CR>:nohlsearch<CR>



" CTRL MAPPINGS

let g:AutoPairsShortcutFastWrap = '<C-e>'

"map <C-n> 			:NERDTreeToggle<CR>
map <C-q>  			:bp <BAR> bd #<CR>
map <C-s>			:w<CR>

inoremap <C-s>			<Esc>:w<CR>

" Plugins
" <C-Y> Emmet
" <C-N>, <C-U> Multiple Cursors



" KEY MAPPINGS
nnoremap J 			:bprevious<CR>
nnoremap K 			:bnext<CR>

" vCoolor color picker
let g:vcoolor_map = 'gco'
let g:vcool_ins_rgb_map = 'gcr'
let g:vcool_ins_hsl_map = 'gch'
let g:vcool_ins_rgba_map = 'gcb'


" GENERAL MAPPINGS
nnoremap <Space> 		i_<Esc>r
nnoremap <S-BS>			k"_dd
nnoremap <BS>			"_dd
nnoremap [13;2u]		O<Esc>
nnoremap <CR> 			o<Esc>
nnoremap <Esc><Esc> 		:noh<CR>

" Plugins
" <F8> NextColor



" TAB MAPPINGS
nnoremap <Tab> 			>>	
nnoremap <S-Tab>		<<	
vnoremap <Tab>			>><Esc>gv
vnoremap <S-Tab>		<<<Esc>gv
inoremap <S-Tab>		<Backspace>



" ARROW MAPPINGS
vmap  <expr>  <LEFT>   		DVB_Drag('left')                        
vmap  <expr>  <RIGHT>  		DVB_Drag('right')                       
vmap  <expr>  <DOWN>   		DVB_Drag('down')                        
vmap  <expr>  <UP>     		DVB_Drag('up')                          
vmap  <expr>  D        		DVB_Duplicate()                         

