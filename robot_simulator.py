class Field:
    def __init__(self):
        self.size = 10
        self.robot = {'x': 0, 'y': 0}  # Начальная позиция робота
        self.walls = set()  # Множество стен в формате {(x1, y1, x2, y2)}
        self.painted = set()  # Закрашенные клетки

    def get_state(self):
        """Возвращает текущее состояние поля."""
        return {
            'robot': self.robot,
            'walls': list(self.walls),
            'painted': list(self.painted),
            'size': self.size
        }

    def update(self, data):
        """Обновляет состояние поля."""
        if 'walls' in data:
            self.walls = set()
            for wall in data['walls']:
                # Преобразуем формат стен из [x, y, orientation] в (x1, y1, x2, y2)
                x, y, orientation = wall
                if orientation == 'horizontal':
                    self.walls.add((x, y, x + 1, y))  # Горизонтальная стена
                elif orientation == 'vertical':
                    self.walls.add((x, y, x, y + 1))  # Вертикальная стена

        if 'painted' in data:
            self.painted = set(tuple(p) for p in data['painted'])

        if 'robot' in data:
            # Проверяем, что новые координаты робота допустимы
            x = data['robot'].get('x', 0)
            y = data['robot'].get('y', 0)
            if not (0 <= x < self.size and 0 <= y < self.size):
                raise ValueError("Недопустимые координаты робота")
            self.robot.update(data['robot'])

    def is_cell_free(self, x, y):
        """Проверяет, свободна ли клетка (x, y)."""
        if not (0 <= x < self.size and 0 <= y < self.size):
            return False  # Клетка за пределами поля

        # Проверяем, не пересекается ли клетка со стенами
        for wall in self.walls:
            x1, y1, x2, y2 = wall
            if (x1 <= x <= x2 and y1 <= y <= y2) or (x2 <= x <= x1 and y2 <= y <= y1):
                return False  # Клетка занята стеной
        return True

    def check_direction(self, dx, dy):
        """Проверяет, свободно ли направление (dx, dy)."""
        new_x = self.robot['x'] + dx
        new_y = self.robot['y'] + dy
        return self.is_cell_free(new_x, new_y)


def execute_code(code, field):
    """Выполняет код и возвращает пошаговый результат."""
    commands = parse_code(code)
    result = []
    loop_stack = []  # Стек для циклов
    pc = 0  # Счетчик команд

    while pc < len(commands):
        cmd = commands[pc]
        if cmd['type'] == 'move':
            # Движение робота
            new_x = field.robot['x'] + cmd['dx']
            new_y = field.robot['y'] + cmd['dy']
            if not field.is_cell_free(new_x, new_y):
                raise Exception(f"Робот столкнулся со стеной на клетке ({new_x}, {new_y})")
            field.robot['x'] = new_x
            field.robot['y'] = new_y
            result.append({'action': 'move', 'x': new_x, 'y': new_y})
            pc += 1

        elif cmd['type'] == 'paint':
            # Закрашивание клетки
            field.painted.add((field.robot['x'], field.robot['y']))
            result.append({'action': 'paint', 'x': field.robot['x'], 'y': field.robot['y']})
            pc += 1

        elif cmd['type'] == 'loop':
            # Начало цикла
            condition_met = check_condition(cmd['condition'], field)
            if condition_met:
                loop_stack.append(pc)  # Сохраняем позицию начала цикла
                pc += 1
            else:
                pc = cmd['end']  # Переходим к концу цикла

        elif cmd['type'] == 'end_loop':
            # Конец цикла
            if not loop_stack:
                raise Exception("Непарный конец цикла")
            pc = loop_stack.pop()  # Возвращаемся к началу цикла

        else:
            raise Exception(f"Неизвестная команда: {cmd['type']}")

    return result


def parse_code(code):
    """Парсит код и возвращает список команд."""
    lines = code.lower().split('\n')
    commands = []
    loop_stack = []  # Стек для вложенных циклов

    for line in lines:
        line = line.strip()
        if not line:
            continue  # Пропускаем пустые строки

        if line.startswith('нц пока'):
            # Обработка цикла "нц пока"
            condition_str = line[6:].strip()
            condition = parse_condition(condition_str)
            if condition is None:
                raise Exception(f"Неизвестное условие: {condition_str}")
            commands.append({
                'type': 'loop',
                'condition': condition,
                'end': None  # Позиция конца цикла будет заполнена позже
            })
            loop_stack.append(len(commands) - 1)  # Сохраняем индекс начала цикла

        elif line.startswith('кц'):
            # Обработка конца цикла
            if not loop_stack:
                raise Exception("Непарный конец цикла")
            start_idx = loop_stack.pop()
            commands.append({'type': 'end_loop'})
            commands[start_idx]['end'] = len(commands)  # Указываем конец цикла

        elif line.startswith('вправо'):
            commands.append({'type': 'move', 'dx': 1, 'dy':     0})
        elif line.startswith('влево'):
            commands.append({'type': 'move', 'dx': -1, 'dy': 0})
        elif line.startswith('вверх'):
            commands.append({'type': 'move', 'dx': 0, 'dy': -1})
        elif line.startswith('вниз'):
            commands.append({'type': 'move', 'dx': 0, 'dy': 1})
        elif line.startswith('закрасить'):
            commands.append({'type': 'paint'})
        else:
            raise Exception(f"Неизвестная команда: {line}")

    return commands


def parse_condition(condition_str):
    """Парсит условие для цикла."""
    direction_map = {
        'справа свободно': (1, 0),
        'слева свободно': (-1, 0),
        'сверху свободно': (0, -1),
        'снизу свободно': (0, 1)
    }
    return direction_map.get(condition_str, None)


def check_condition(condition, field):
    """Проверяет условие цикла."""
    dx, dy = condition
    return field.check_direction(dx, dy)