class Field:
    def __init__(self):
        self.width = 10
        self.height = 10
        self.obstacles = set()
        self.walls = set()  # Множество стен
        self.start = (0, 0)
        self.robot_position = (0, 0)

    def update(self, data):
        self.obstacles = set(tuple(obs) for obs in data['obstacles'])
        self.walls = set(tuple(wall) for wall in data['walls'])
        self.start = tuple(data['start'])
        self.robot_position = self.start


def execute_code(code, field):
    commands = {
        'вверх': (0, -1),
        'вниз': (0, 1),
        'влево': (-1, 0),
        'вправо': (1, 0)
    }

    path = []
    field.robot_position = field.start
    lines = code.split('\n')

    for line in lines:
        line = line.strip().lower()
        if line.startswith('нц'):
            # Обработка циклов (упрощенно)
            pass
        elif line in commands:
            dx, dy = commands[line]
            x, y = field.robot_position
            new_x = x + dx
            new_y = y + dy

            # Проверка на столкновение со стеной
            wall_key = ((x, y), (new_x, new_y))
            if wall_key in field.walls or (new_x, new_y) in field.obstacles:
                continue  # Робот не может пройти через стену

            if 0 <= new_x < field.width and 0 <= new_y < field.height:
                field.robot_position = (new_x, new_y)
            path.append(field.robot_position)

    return {
        'path': path,
        'final_position': field.robot_position,
        'obstacles': list(field.obstacles),
        'walls': list(field.walls)
    }