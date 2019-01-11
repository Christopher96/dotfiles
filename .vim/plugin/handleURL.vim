function! HandleURL()
    let s:uri = matchstr(getline("."), '[a-z]*:\/\/[^ >,;]*')
    echo s:uri
    if s:uri != ""
        echo 'Opening URL: ' . s:uri
        silent! exec "!openURL ".s:uri
        echo 'URL opened.'
        silent! redraw!
    else
        echo "No URI found in line."
    endif
endfunction
