
def test(action):
    return {
        'swag': hello()
    }[action]

def hello():
    return 'hello'

print(test('swag'))
