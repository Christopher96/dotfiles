from ranger.api.commands import Command
import types

def list(object, methods=True):
    for name in dir(object):
        if isinstance(getattr(object, name), types.MethodType):
            if methods == True:
                print(name)
        elif methods == False:
            print(name)

class hello(Command):
    def execute(self):
        self.fm.notify(list(self.fm))

