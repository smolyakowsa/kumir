class ExecutionError extends Error {}

const Robot = { x:0, y:0, dir:0 };
const Field = {
    size: 10,
    cells: new Map(),
    walls: new Set(),

    init() {
        const field = document.getElementById('field');
        field.innerHTML = '';
        this.cells.clear();
        this.walls.clear();

        // Создаем клетки
        for(let y = 0; y < this.size; y++) {
            for(let x = 0; x < this.size; x++) {
                const cell = document.createElement('div');
                cell.className = 'cell';
                cell.style.cssText = `left:${x*10}%;top:${y*10}%`;
                this.cells.set(`${x},${y}`, cell);
                field.appendChild(cell);
            }
        }

        // Создаем линии для стен
        for(let y = 0; y < this.size; y++) {
            for(let x = 0; x <= this.size; x++) {
                this.createWall(x, y, 'vertical');
            }
        }

        for(let y = 0; y <= this.size; y++) {
            for(let x = 0; x < this.size; x++) {
                this.createWall(x, y, 'horizontal');
            }
        }

        this.updateRobot();
    },

    createWall(x, y, orientation) {
        const wall = document.createElement('div');
        wall.className = `wall ${orientation}-wall`;
        wall.style.cssText = orientation === 'horizontal'
            ? `left:${x*10}%;top:${y*10}%`
            : `left:${x*10}%;top:${y*10}%`;

        wall.dataset.x = x;
        wall.dataset.y = y;
        wall.dataset.orientation = orientation;

        wall.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleWall(x, y, orientation);
        });

        document.getElementById('field').appendChild(wall);
    },

    toggleWall(x, y, orientation) {
        const key = `${x},${y},${orientation}`;
        if(this.walls.has(key)) {
            this.walls.delete(key);
            document.querySelector(`[data-x="${x}"][data-y="${y}"][data-orientation="${orientation}"]`)
                .style.background = 'transparent';
        } else {
            this.walls.add(key);
            document.querySelector(`[data-x="${x}"][data-y="${y}"][data-orientation="${orientation}"]`)
                .style.background = '#666';
        }
    },

    checkWall(x1, y1, x2, y2) {
        const dx = x2 - x1;
        const dy = y2 - y1;

        if(dx === 1) return this.walls.has(`${x2},${y2},vertical`);
        if(dx === -1) return this.walls.has(`${x1},${y1},vertical`);
        if(dy === 1) return this.walls.has(`${x2},${y2},horizontal`);
        if(dy === -1) return this.walls.has(`${x1},${y1},horizontal`);

        return false;
    },

    isCellFree(x, y) {
        return x >= 0 && x < this.size && y >= 0 && y < this.size && !this.checkWall(Robot.x, Robot.y, x, y);
    },

    updateRobot() {
        this.cells.forEach((cell, key) => {
            cell.classList.remove('robot');
            if (key === `${Robot.x},${Robot.y}`) cell.classList.add('robot');
        });
    }
};

const Executor = {
    delay: 500,
    isRunning: false,

    commands: {
        'вправо': () => Robot.dir = 0,
        'вниз': () => Robot.dir = 1,
        'влево': () => Robot.dir = 2,
        'вверх': () => Robot.dir = 3,
        'закрасить': () => Field.cells.get(`${Robot.x},${Robot.y}`)?.classList.add('painted')
    },

    async start(code) {
        if (this.isRunning) return;
        this.isRunning = true;

        try {
            const commands = this.parse(code);
            await this.execute(commands);
        } catch(e) {
            alert(`Ошибка: ${e.message}`);
        }
        this.isRunning = false;
    },

    parse(code) {
        const commands = [];
        const lines = code.toLowerCase()
            .split('\n')
            .map(line => line.trim().replace(/^нач|кон$/g, ''))
            .filter(line => line);

        lines.forEach(line => {
            if (line.startsWith('нц')) {
                const condition = line.replace('нц', '').trim();
                commands.push({ type: 'loopStart', condition });
            }
            else if (line.startsWith('если')) {
                const condition = line.replace('если', '').split('то')[0].trim();
                commands.push({ type: 'if', condition });
            }
            else if (line === 'кц') {
                commands.push({ type: 'loopEnd' });
            }
            else if (line === 'все') {
                commands.push({ type: 'endIf' });
            }
            else {
                const cmd = line.match(/^(вправо|влево|вверх|вниз|закрасить)/)?.[1];
                if (cmd) commands.push({ type: 'command', cmd });
            }
        });

        return commands;
    },

    findLoopEnd(commands, startIndex) {
        let depth = 1;
        for (let i = startIndex + 1; i < commands.length; i++) {
            if (commands[i].type === 'loopStart') depth++;
            if (commands[i].type === 'loopEnd') depth--;
            if (depth === 0) return i + 1;
        }
        throw new ExecutionError('Не найдено окончание цикла');
    },

    findEndIf(commands, startIndex) {
        for (let i = startIndex + 1; i < commands.length; i++) {
            if (commands[i].type === 'endIf') return i + 1;
        }
        throw new ExecutionError('Не найдено окончание условия');
    },

    async execute(commands) {
        let ptr = 0;
        while (ptr < commands.length && this.isRunning) {
            const cmd = commands[ptr];
            console.log('Выполняем:', cmd); // Отладка

            switch(cmd.type) {
                case 'command':
                    this.execCommand(cmd.cmd);
                    await new Promise(r => setTimeout(r, this.delay));
                    ptr++;
                    break;

                case 'loopStart':
                    if (!this.checkCondition(cmd.condition)) {
                        ptr = this.findLoopEnd(commands, ptr);
                    } else {
                        ptr++;
                    }
                    break;

                case 'if':
                    if (!this.checkCondition(cmd.condition)) {
                        ptr = this.findEndIf(commands, ptr);
                    } else {
                        ptr++;
                    }
                    break;

                default:
                    ptr++;
            }
        }
        this.isRunning = false;
    },

    execCommand(cmd) {
        if (!this.commands[cmd]) throw new Error(`Неизвестная команда: ${cmd}`);

        if (['вправо','влево','вверх','вниз'].includes(cmd)) {
            const dirs = [[1,0], [0,1], [-1,0], [0,-1]];
            const [dx, dy] = dirs[Robot.dir];
            const newX = Robot.x + dx;
            const newY = Robot.y + dy;

            if (Field.checkWall(Robot.x, Robot.y, newX, newY)) {
                throw new ExecutionError('На пути стена!');
            }

            Robot.x = newX;
            Robot.y = newY;
            Field.updateRobot();
        }
        else {
            this.commands[cmd]();
        }
    },

    checkCondition(cond) {
        const dirMap = {
            'справа': 0, 'снизу': 1,
            'слева': 2, 'сверху': 3
        };

        const [dir, state] = cond.split(' ');
        const direction = dirMap[dir];

        const [dx, dy] = [[1,0], [0,1], [-1,0], [0,-1]][direction];
        const checkX = Robot.x + dx;
        const checkY = Robot.y + dy;

        return Field.isCellFree(checkX, checkY);
    }
};

// Инициализация
Field.init();
document.querySelector('.controls').addEventListener('click', e => {
    if (e.target.classList.contains('start')) {
        const code = document.getElementById('code').value;
        Executor.start(code);
    }
    if (e.target.classList.contains('reset')) Field.init();
});

function toggleTheme() {
    document.body.classList.toggle('dark-theme');
    document.querySelector('.theme-switcher button').innerHTML =
        document.body.classList.contains('dark-theme')
            ? '<i class="fas fa-sun"></i>'
            : '<i class="fas fa-moon"></i>';
}