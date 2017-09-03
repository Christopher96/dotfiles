#!/usr/bin/env python3

import i3ipc, os

 #Create the Connection object that can be used to send commands and subscribe
 #to events.
i3 = i3ipc.Connection()


def __init__(self):
    init_cava()
    
def init_cava():
    os.command("urxvt -b 370 -tr -name cava -e cava &>/dev/null &")

# Print the name of the focused window
focused = i3.get_tree().find_focused()

print('Focused window %s is on workspace %s' %
      (focused.name, focused.workspace().name))

# Query the ipc for outputs. The result is a list that represents the parsed
# reply of a command like `i3-msg -t get_outputs`.
outputs = i3.get_outputs()

print('Active outputs:')

for output in filter(lambda o: o.active, outputs):
    print(output.name)

# Send a command to be executed synchronously.
i3.command('focus left')

# Take all fullscreen windows out of fullscreen
for container in i3.get_tree().find_fullscreen():
    container.command('fullscreen')

# Define a callback to be called when you switch workspaces.
def on_workspace_focus(self, e):
    # The first parameter is the connection to the ipc and the second is an object
    # with the data of the event sent from i3.
    if e.current:
        print('Windows on this workspace:')
        for w in e.current.leaves():
            print(w.name)

# Dynamically name your workspaces after the current window class
def on_window_focus(i3, e):
    focused = i3.get_tree().find_focused()
    ws_name = "%s:%s" % (focused.workspace().num, focused.window_class)
    i3.command('rename workspace to "%s"' % ws_name)

def on_window_new(i3, e):
    cava_is_open(e.container) 

def on_window_close(i3, e):
    print(e)

def cava_is_open(con):
    instance = con.window_instance
    if instance == "cava":
        print("eyyy")
#    for val in dir(con):
#        print(val)

# Subscribe to events
i3.on('window::new', on_window_new)
i3.on('window::close', on_window_close)
#i3.on("window::focus", on_window_focus)

# Start the main loop and wait for events to come in.
i3.main()
