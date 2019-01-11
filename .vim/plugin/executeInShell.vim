function! ExecuteInShell(command)
  let command = join(map(split(a:command), 'expand(v:val)'))
  silent! execute 'edit cmd'
  setlocal buftype=nowrite bufhidden=wipe nobuflisted noswapfile nowrap number
  echo 'Execute ' . command . '...'
  silent! execute 'silent %!'. command
  silent! execute 'au BufUnload <buffer> execute bufwinnr(' . bufnr('#') . ') . ''wincmd w'''
  silent! redraw!
  echo 'Shell command ' . command . ' executed.'
endfunction
