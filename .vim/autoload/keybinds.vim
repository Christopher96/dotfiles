" LEADER MAPPINGS
:let mapleader = ","

" Emmet
let g:user_emmet_leader_key=','

" Ranger file explorer
noremap <leader>rr	 	:wa<CR>:RangerEdit<CR>
noremap <leader>rv	 	:wa<CR>:RangerVSplit<CR>
noremap <leader>rs	 	:wa<CR>:RangerSplit<CR>
noremap <leader>rt	 	:wa<CR>:RangerTab<CR>
noremap <leader>ri	 	:wa<CR>:RangerInsert<CR>
noremap <leader>ra	 	:wa<CR>:RangerAppend<CR>
noremap <leader>rc	 	:set operatorfunc=RangerChangeOperator<CR>g@
noremap <leader>rR	 	:set operatorfunc=RangerBrowseEdit<CR>g@
noremap <leader>rT	 	:set operatorfunc=RangerBrowseTab<CR>g@
noremap <leader>rS	 	:set operatorfunc=RangerBrowseSplit<CR>g@
noremap <leader>rV	 	:set operatorfunc=RangerBrowseVSplit<CR>g@

" Buffers
nnoremap <leader>q  		:bp! <BAR> bd! #<CR>
nnoremap <leader>s		:w !sudo tee % >/dev/null<CR>

" Commenting blocks of code.
noremap <silent> <leader>cc :<C-B>silent <C-E>s/^/<C-R>=escape(b:comment_leader,'\/')<CR>/<CR>:nohlsearch<CR>
noremap <silent> <leader>cu :<C-B>silent <C-E>s/^\V<C-R>=escape(b:comment_leader,'\/')<CR>//e<CR>:nohlsearch<CR>

" Clipboard
nnoremap <leader>y		"+y
vnoremap <leader>y		"+y
inoremap <leader>p		<Esc>"+pa
nnoremap <leader>p		"+p

" Folding

nnoremap <leader>z		zMzvzz


" CTRL MAPPINGS

let g:AutoPairsShortcutFastWrap = '<C-e>'

"map <C-n> 			:NERDTreeToggle<CR>
map 	 <C-q>  		:bp <BAR> bd #<CR>
nnoremap <C-s>			:w<CR>
inoremap <C-s>			<Esc>:w<CR>
vnoremap <C-s>			<Esc>:w<CR>
nnoremap <C-i> 			i_<Esc>r
map	 <silent> <C-c>		<C-c>:noh<CR>

" Plugins
" <C-Y> Emmet
" <C-N>, <C-U> Multiple Cursors

" Quick edit
nnoremap <C-e>v			:e ~/.vimrc<CR>
nnoremap <C-e>i			:e ~/.config/i3/config<CR>
nnoremap <C-e>p			:e ~/.config/polybar/config<CR>
nnoremap <C-e>x			:e ~/.Xresources<CR>
nnoremap <C-e>b			:e ~/.vim/autoload/keybinds.vim<CR>
nnoremap <C-e>z			:e ~/.zshrc<CR>

" KEY MAPPINGS
nnoremap J 			:bprevious<CR>
nnoremap K 			:bnext<CR>
nnoremap n			nzzzv
nnoremap N			Nzzzv

nnoremap H			g0
vnoremap H			g0
nnoremap L			g$
vnoremap L			g$

" vCoolor color picker
let g:vcoolor_map = 'gco'
let g:vcool_ins_rgb_map = 'gcr'
let g:vcool_ins_hsl_map = 'gch'
let g:vcool_ins_rgba_map = 'gcb'


" GENERAL MAPPINGS

" Folding
nnoremap <silent> <Space> 	@=(foldlevel('.')?'za':"\<Space>")<CR>
vnoremap <Space>		zf
nnoremap <S-BS>			k"_dd
nnoremap <BS>			"_dd
nnoremap <S-CR>			O<Esc>
nnoremap <CR> 			o<Esc>

" Plugins
" <F8> NextColor


" TAB MAPPINGS
nnoremap <Tab> 			>>	
nnoremap <S-Tab>		<<	
vnoremap <Tab>			>><Esc>gv
vnoremap <S-Tab>		<<<Esc>gv
inoremap <S-Tab>		<Backspace>
map 	 <Esc><Esc>		:noh<CR>


" ARROW MAPPINGS
vmap  <expr>  <LEFT>   		DVB_Drag('left')                        
vmap  <expr>  <RIGHT>  		DVB_Drag('right')                       
vmap  <expr>  <DOWN>   		DVB_Drag('down')                        
vmap  <expr>  <UP>     		DVB_Drag('up')                          
vmap  <expr>  D        		DVB_Duplicate()                         

" F-KEYS
map   <f12> 			:!ctags -R .<cr>
