import re
import unicodedata


class Field:
    def __init__(self):
        self.size = 10
        self.robot = {'x': 0, 'y': 0}
        self.walls = set()  # Множество стен в формате {(x1, y1, x2, y2)}
        self.painted = set()

    def get_state(self):
        state = {
            'robot': self.robot,
            'walls': list(self.walls),
            'painted': list(self.painted),
            'size': self.size
        }
        print(f"Текущее состояние поля: {state}")  # Логирование состояния
        return state

    def update(self, data):
        if 'walls' in data:
            self.walls = set()
            for wall in data['walls']:
                x = wall['x']
                y = wall['y']
                orientation = wall['orientation']
                if orientation == 'horizontal':
                    self.walls.add((x, y, x + 1, y))  # Горизонтальная стена
                elif orientation == 'vertical':
                    self.walls.add((x, y, x, y + 1))  # Вертикальная стена
        if 'robot' in data:
            new_x = data['robot'].get('x', 0)
            new_y = data['robot'].get('y', 0)
            if 0 <= new_x < self.size and 0 <= new_y < self.size:
                self.robot.update(data['robot'])

    def is_cell_free(self, x, y):
        if not (0 <= x < self.size and 0 <= y < self.size):
            return False
        for wall in self.walls:
            x1, y1, x2, y2 = wall
            if (min(x1, x2) <= x <= max(x1, x2)) and (min(y1, y2) <= y <= max(y1, y2)):
                return False
        return True

    def check_direction(self, dx, dy):
        new_x = self.robot['x'] + dx
        new_y = self.robot['y'] + dy
        return self.is_cell_free(new_x, new_y)


def execute_code(code, field):
    commands = parse_code(code)
    result = []
    loop_stack = []
    pc = 0

    print(f"Полученные команды: {commands}")  # Логирование команд

    while pc < len(commands):
        cmd = commands[pc]

        if cmd['type'] == 'move':
            new_x = field.robot['x'] + cmd['dx']
            new_y = field.robot['y'] + cmd['dy']
            if not field.is_cell_free(new_x, new_y):
                raise Exception(f"Робот столкнулся со стеной на клетке ({new_x}, {new_y})")
            field.robot['x'] = new_x
            field.robot['y'] = new_y
            result.append({'action': 'move', 'x': new_x, 'y': new_y})

        elif cmd['type'] == 'paint':
            field.painted.add((field.robot['x'], field.robot['y']))
            result.append({'action': 'paint', 'x': field.robot['x'], 'y': field.robot['y']})

        elif cmd['type'] == 'loop':
            condition_met = check_condition(cmd['condition'], field)
            print(f"Проверка условия цикла: {condition_met}")  # Логирование результата условия

            if condition_met:
                loop_stack.append(pc)  # Сохраняем позицию начала цикла
                pc += 1  # Переходим к следующей команде
            else:
                pc = cmd['end']  # Пропускаем цикл, если условие ложно

        elif cmd['type'] == 'end_loop':
            if not loop_stack:
                raise Exception("Непарный конец цикла")

            # Получаем начало текущего цикла
            start_idx = loop_stack[-1]
            loop_cmd = commands[start_idx]

            # Проверяем условие заново
            condition_met = check_condition(loop_cmd['condition'], field)
            print(f"Повторная проверка условия цикла: {condition_met}")

            if condition_met:
                # Возвращаемся к началу тела цикла (после команды loop)
                pc = start_idx + 1
            else:
                # Выходим из цикла
                pc = loop_cmd['end']
                loop_stack.pop()  # Удаляем позицию цикла из стека

        # Сохраняем текущее состояние робота после каждой команды
        result.append({'action': 'step', 'x': field.robot['x'], 'y': field.robot['y']})
        pc += 1  # Переходим к следующей команде вне зависимости от типа команды

    return result


def parse_code(code):
    lines = [line.strip() for line in code.lower().split('\n') if line.strip()]
    commands = []
    loop_stack = []

    for line in lines:
        if line.startswith('нц пока'):
            match = re.match(r'^нц пока\s+(.+)', line)
            if not match:
                raise Exception("Неверный формат цикла 'нц пока'")

            condition_str = match.group(1).strip()
            try:
                condition = parse_condition(condition_str)
                commands.append({
                    'type': 'loop',
                    'condition': condition,
                    'end': None
                })
                loop_stack.append(len(commands) - 1)
            except Exception as e:
                raise Exception(f"Ошибка в условии цикла: {str(e)}")

        elif line.startswith('кц'):
            if not loop_stack:
                raise Exception("Непарный конец цикла")
            start_idx = loop_stack.pop()
            commands[start_idx]['end'] = len(commands)
            commands.append({'type': 'end_loop'})

        elif line.startswith('вправо'):
            commands.append({'type': 'move', 'dx': 1, 'dy': 0})

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

    if loop_stack:
        raise Exception("Не все циклы закрыты")

    return commands


def parse_condition(cond_str):
    cond_str = ''.join(c for c in cond_str.strip().lower() if c.isalpha() or c.isspace())
    cond_str = unicodedata.normalize('NFKC', cond_str)
    parts = [p for p in cond_str.split() if p]

    if len(parts) < 2 or len(parts) > 3:
        raise Exception(f"Неверный формат: '{cond_str}'. Пример: 'справа свободно' или 'слева не свободно'")

    direction = parts[0]
    is_free = True

    if len(parts) == 3:
        if parts[1] != "не" or parts[2] != "свободно":
            raise Exception(f"Ожидалось: '[направление] не свободно'. Получено: '{cond_str}'")
        is_free = False
    elif len(parts) == 2:
        if parts[1] != "свободно":
            raise Exception(f"Ожидалось: '[направление] свободно'. Получено: '{cond_str}'")
    else:
        raise Exception(f"Неверный формат условия: '{cond_str}'")

    direction_map = {
        "справа": (1, 0),
        "слева": (-1, 0),
        "сверху": (0, -1),
        "снизу": (0, 1)
    }

    if direction not in direction_map:
        raise Exception(f"Неизвестное направление: '{direction}'. Допустимые: справа, слева, сверху, снизу")

    return {
        "direction": direction_map[direction],
        "is_free": is_free
    }


def check_condition(condition, field):
    dx, dy = condition['direction']
    actual_is_free = field.check_direction(dx, dy)
    return actual_is_free == condition['is_free']