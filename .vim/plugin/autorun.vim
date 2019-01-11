function! AutoRun()
    let l:dpath = fnameescape(expand('%:h'))
    let l:fpath = fnameescape(expand('%'))
    let l:fname = fnameescape(expand('%:t:r'))
    let l:ffull = fnameescape(expand('%:t'))

    let l:cmd = '!clear && cd '.l:dpath.' && '

    " Special case for firefox dev
    if l:ffull ==# 'browser.xul'
        let l:cmd .= 'compile_firefox'

    " Normal filetype checks 
    elseif &filetype ==# 'java'
        let l:cmd .= 'javac -encoding iso-8859-1 '.l:fpath.' && java '.l:fname
    elseif &filetype ==# 'sh'
        let l:cmd .= 'sh '.l:fpath
    endif
    " echo l:cmd
    execute l:cmd
endfunction
