let isRunning = false;
let walls = new Set();
let animationDelay = 300; // Задержка анимации

// Функция для получения текущего состояния поля
async function fetchFieldState() {
    const response = await fetch('/api/field');
    return await response.json();
}

// Функция для обновления состояния поля на сервере
async function updateField(data) {
    await fetch('/api/field', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
            walls: Array.from(walls).map(wall => {
                const [x, y, orientation] = wall.split(',');
                return [parseInt(x), parseInt(y), orientation];
            }),
            painted: data.painted || [],
            robot: data.robot || {x: 0, y: 0, dir: 0}
        })
    });
}

// Создание элемента стены
function createWallElement(x, y, orientation) {
    const wall = document.createElement('div');
    wall.className = `wall ${orientation}-wall`;
    wall.style.cssText = orientation === 'horizontal'
        ? `left:${x * 10}%;top:${y * 10}%`
        : `left:${x * 10}%;top:${y * 10}%`;

    wall.dataset.x = x;
    wall.dataset.y = y;
    wall.dataset.orientation = orientation;

    // Проверяем, есть ли стена в текущем состоянии
    const key = `${x},${y},${orientation}`;
    if (walls.has(key)) {
        wall.style.background = '#666';
    }

    wall.addEventListener('click', async (e) => {
        e.stopPropagation();
        const key = `${x},${y},${orientation}`;
        const newWalls = new Set(walls);
        if (newWalls.has(key)) {
            newWalls.delete(key);
            wall.style.background = 'transparent';
        } else {
            newWalls.add(key);
            wall.style.background = '#666';
        }
        walls = newWalls;
        await updateField({ walls: Array.from(walls) });
    });

    return wall;
}

// Обработка двойного клика по клетке
function handleCellDoubleClick(x, y) {
    if (isRunning) return;
    updateField({
        robot: { x: x, y: y, dir: 0 },
        walls: Array.from(walls)
    }).then(() => fetchFieldState()).then(renderField);
}

// Отрисовка поля
function renderField(state) {
    const field = document.getElementById('field');
    field.innerHTML = '';
    walls = new Set(state.walls);

    // Создаем клетки
    for (let y = 0; y < state.size; y++) {
        for (let x = 0; x < state.size; x++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.style.cssText = `left:${x * 10}%;top:${y * 10}%`;

            // Обработчик двойного клика
            cell.addEventListener('dblclick', () => handleCellDoubleClick(x, y));

            if (x === state.robot.x && y === state.robot.y) {
                cell.classList.add('robot');
            }
            if (state.painted.some(p => p[0] === x && p[1] === y)) {
                cell.classList.add('painted');
            }
            field.appendChild(cell);
        }
    }

    // Создаем стены
    for (let y = 0; y <= state.size; y++) {
        for (let x = 0; x < state.size; x++) {
            field.appendChild(createWallElement(x, y, 'horizontal'));
        }
    }

    for (let y = 0; y < state.size; y++) {
        for (let x = 0; x <= state.size; x++) {
            field.appendChild(createWallElement(x, y, 'vertical'));
        }
    }
}

// Запуск кода с пошаговым выполнением
async function runCode() {
    if (isRunning) return;
    isRunning = true;

    try {
        // Сброс состояния
        await updateField({
            robot: { x: 0, y: 0, dir: 0 },
            painted: [],
            walls: Array.from(walls)
        });

        const code = document.getElementById('code').value;
        const response = await fetch('/api/run', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ code })
        });

        const result = await response.json();
        if (result.error) throw result.error;

        // Пошаговое выполнение
        for (const step of result) {
            // Обновляем только позицию робота на сервере
            await updateField({ robot: { x: step.x, y: step.y } });

            // Получаем актуальное состояние
            const state = await fetchFieldState();
            renderField(state);

            // Задержка для анимации
            await new Promise(resolve => setTimeout(resolve, animationDelay));
        }
    } catch (error) {
        alert(`Ошибка: ${error}`);
    }

    isRunning = false;
}

// Обработчики кнопок
document.querySelector('.controls').addEventListener('click', e => {
    if (e.target.classList.contains('start')) {
        runCode();
    }
    if (e.target.classList.contains('reset')) {
        document.getElementById('code').value = 'алг Движение\nнач\n\nкон';
        updateField({
            walls: [],
            painted: [],
            robot: { x: 0, y: 0, dir: 0 }
        });
    }
});

// Инициализация
fetchFieldState().then(renderField);