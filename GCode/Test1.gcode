G1 Z5 F1200         ; Lift to safe height first
G1 X10 Y10 F6000    ; Move to start corner

G1 Z0.6 F1200       ; Drop close to bed (safe height above plate)
G1 F4000            ; Set movement speed
G1 X170 Y10
G1 X170 Y170
G1 X10 Y170
G1 X10 Y10
G1 X170 Y10
G1 X170 Y25
G1 X10 Y25
G1 X10 Y40
G1 X170 Y40
G1 X170 Y55
G1 X10 Y55
G1 X10 Y70
G1 X170 Y70
G1 X170 Y85
G1 X10 Y85
G1 X10 Y100
G1 X170 Y100
G1 X170 Y115
G1 X10 Y115
G1 X10 Y130
G1 X170 Y130
G1 X170 Y145
G1 X10 Y145
G1 X10 Y160
G1 X170 Y160
G1 Z5 F1200         ; Lift away
G1 X10 Y10 F6000    ; Return home-ish
M400                ; Wait for moves to finishv