#!/usr/bin/python

import imaplib
obj = imaplib.IMAP4_SSL('imap.gmail.com',993)
obj.login('christopher.gauffin@gmail.com','0M3lagow6n') # write your email and password
obj.select('Primary')
print(len(obj.search(None, 'UnSeen')[1][0].split()))
