FG=$(xgetres polybar.foreground)
FG_ALT=$(xgetres polybar.foreground_alt)
BG=$(xgetres polybar.background)
BG_ALT=$(xgetres polybar.background_alt)

export POLY_I3_FOCUSED=%{O-18}%{F$FG_ALT}%{T3}%{T-}%{F-}%{F$FG}%{B$FG_ALT}%name%%{B-}%{F-}%{F$FG_ALT}%{T3}%{T-}%{F-}
export POLY_I3_UNFOCUSED=%{O-18}%{F$FG}%{T3}%{T-}%{F-}%{F$FG_ALT}%{B$FG}%name%%{B-}%{F-}%{F$FG}%{T3}%{T-}%{F-}



