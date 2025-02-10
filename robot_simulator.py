class Field:
    def __init__(self):
        self.size = 10
        self.robot = {'x': 0, 'y': 0, 'dir': 0}
        self.walls = set()  # Множество стен в формате {(x1, y1, x2, y2)}
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
            # Преобразуем стены в формат (x1, y1, x2, y2)
            self.walls = set()
            for wall in data['walls']:
                x, y, orientation = wall
                if orientation == 'horizontal':
                    self.walls.add((x, y, x + 1, y))  # Горизонтальная стена
                elif orientation == 'vertical':
                    self.walls.add((x, y, x, y + 1))  # Вертикальная стена
        if 'painted' in data:
            self.painted = set(tuple(painted) for painted in data['painted'])
        if 'robot' in data:
            self.robot = data['robot']

    def is_cell_free(self, x, y):
        if not (0 <= x < self.size and 0 <= y < self.size):
            return False

        for wall in self.walls:
            x1, y1, x2, y2 = wall
            if (x1 <= x < x2 and y1 <= y < y2) or (x2 <= x < x1 and y2 <= y < y1):
                return False
        return True

    def check_wall(self, x1, y1, x2, y2):
        # Проверяем, есть ли стена между клетками (x1, y1) и (x2, y2)
        return (x1, y1, x2, y2) in self.walls or (x2, y2, x1, y1) in self.walls


def execute_code(code, field):
    commands = parse_code(code)
    result = []
    for cmd in commands:
        if cmd['type'] == 'move':
            # Рассчитываем конечную позицию
            target_x = field.robot['x'] + cmd['dx']
            target_y = field.robot['y'] + cmd['dy']

            # Рассчитываем направление движения
            step_x = 1 if cmd['dx'] > 0 else -1 if cmd['dx'] < 0 else 0
            step_y = 1 if cmd['dy'] > 0 else -1 if cmd['dy'] < 0 else 0

            # Пошаговое движение
            while field.robot['x'] != target_x or field.robot['y'] != target_y:
                # Делаем один шаг
                new_x = field.robot['x'] + step_x
                new_y = field.robot['y'] + step_y

                # Проверка стены
                if not field.is_cell_free(new_x, new_y):
                    raise Exception(f"Столкновение со стеной на ({new_x}, {new_y})")

                # Обновляем позицию
                field.robot['x'] = new_x
                field.robot['y'] = new_y
                result.append({'action': 'move', 'x': new_x, 'y': new_y})

        elif cmd['type'] == 'paint':
            field.painted.add((field.robot['x'], field.robot['y']))
            result.append({'action': 'paint', 'x': field.robot['x'], 'y': field.robot['y']})
        elif cmd['type'] == 'loop':
            for _ in range(cmd['iterations']):
                loop_result = execute_code(cmd['body'], field)
                result.extend(loop_result)
    return result


def parse_code(code):
    commands = []
    lines = code.lower().split('\n')
    i = 0
    while i < len(lines):
        line = lines[i].strip()
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
        elif line.startswith('нц'):
            # Обработка цикла
            iterations = int(line.split()[1]) if len(line.split()) > 1 else 1
            body = []
            i += 1
            while i < len(lines) and not lines[i].strip().startswith('кц'):
                body.append(lines[i].strip())
                i += 1
            commands.append({'type': 'loop', 'iterations': iterations, 'body': '\n'.join(body)})
        i += 1
    return commands