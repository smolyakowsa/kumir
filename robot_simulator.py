class Field:
    def __init__(self):
        self.size = 10
        self.robot = {'x': 0, 'y': 0, 'dir': 0}
        self.walls = set()
        self.painted = set()

    def get_state(self):
        return {
            'robot': self.robot,
            'walls': list(self.walls),
            'painted': list(self.painted),
            'size': self.size
        }

    def update(self, data):
        if 'walls' in data:
            self.walls = set(data['walls'])
        if 'painted' in data:
            self.painted = set(data['painted'])
        if 'robot' in data:
            self.robot = data['robot']

    def is_cell_free(self, x, y):
        return (
            0 <= x < self.size and
            0 <= y < self.size and
            (x, y) not in self.walls
        )

    def check_wall(self, x1, y1, x2, y2):
        return (x2, y2) in self.walls or (x1, y1) in self.walls


def execute_code(code, field):
    # Логика выполнения кода
    commands = parse_code(code)
    result = []
    for cmd in commands:
        if cmd['type'] == 'move':
            new_x = field.robot['x'] + cmd['dx']
            new_y = field.robot['y'] + cmd['dy']
            if field.is_cell_free(new_x, new_y):
                field.robot['x'] = new_x
                field.robot['y'] = new_y
                result.append({'action': 'move', 'x': new_x, 'y': new_y})
        elif cmd['type'] == 'paint':
            field.painted.add((field.robot['x'], field.robot['y']))
            result.append({'action': 'paint', 'x': field.robot['x'], 'y': field.robot['y']})
    return result


def parse_code(code):
    # Логика парсинга кода
    commands = []
    lines = code.lower().split('\n')
    for line in lines:
        line = line.strip()
        if line.startswith('вправо'):
            commands.append({'type': 'move', 'dx': 1, 'dy': 0})
        elif line.startswith('влево'):
            commands.append({'type': 'move', 'dx': -1, 'dy': 0})
        elif line.startswith('вверх'):
            commands.append({'type': 'move', 'dx': 0, 'dy': -1})
        elif line.startswith('вниз'):
            commands.append({'type': 'move', 'dx': 0, 'dy': 1})
        elif line.startswith('закрасить'):
            commands.append({'type': 'paint'})
    return commands