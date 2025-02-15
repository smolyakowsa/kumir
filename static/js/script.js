let isRunning = false;
let walls = new Map(); // Используем Map для хранения стен
let animationDelay = 300; // Задержка анимации (в миллисекундах)

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
            walls: Array.from(walls.values()), // Преобразуем Map в массив
            painted: data.painted || [],
            robot: data.robot || {x: 0, y: 0}
        })
    });
}

// Создание элемента стены
function createWallElement(x, y, orientation) {
    const wallKey = `${x},${y},${orientation}`;
    const wall = document.createElement('div');
    wall.className = `wall ${orientation}-wall`;

    // Устанавливаем стили в зависимости от ориентации
    if (orientation === 'horizontal') {
        wall.style.cssText = `left:${x * 10}%; top:${y * 10}%; width:10%; height:2px`;
    } else {
        wall.style.cssText = `left:${x * 10}%; top:${y * 10}%; width:2px; height:10%`;
    }

    // Проверяем, есть ли стена в текущем состоянии
    if (walls.has(wallKey)) {
        wall.classList.add('active');
    }

    // Обработчик клика для добавления/удаления стены
    wall.addEventListener('click', async (e) => {
        e.stopPropagation();
        const key = wallKey;

        if (walls.has(key)) {
            walls.delete(key);
            wall.classList.remove('active');
        } else {
            walls.set(key, {x, y, orientation});
            wall.classList.add('active');
        }

        await updateField({ walls: Array.from(walls.values()) });
        const state = await fetchFieldState();
        renderField(state);
    });

    return wall;
}

// Обработка двойного клика по клетке
function handleCellDoubleClick(x, y) {
    if (isRunning) return;
    updateField({
        robot: { x: x, y: y }
    }).then(() => fetchFieldState()).then(renderField);
}

// Отрисовка поля
function renderField(state) {
    const field = document.getElementById('field');
    field.innerHTML = '';

    // Синхронизация стен
    walls.clear();
    state.walls.forEach(wall => {
        const [x1, y1, x2, y2] = wall;
        const orientation = y1 === y2 ? 'horizontal' : 'vertical';
        const key = `${x1},${y1},${orientation}`;
        walls.set(key, {x: x1, y: y1, orientation});
    });

    // Отрисовка клеток
    for (let y = 0; y < state.size; y++) {
        for (let x = 0; x < state.size; x++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.style.cssText = `left:${x * 10}%; top:${y * 10}%`;

            // Обработчик двойного клика
            cell.addEventListener('dblclick', () => handleCellDoubleClick(x, y));

            // Проверка позиции робота
            if (x === state.robot.x && y === state.robot.y) {
                cell.classList.add('robot');
            }

            // Проверка закрашенных клеток
            if (state.painted.some(p => p[0] === x && p[1] === y)) {
                cell.classList.add('painted');
            }

            field.appendChild(cell);
        }
    }

    // Отрисовка стен
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
        // Получаем актуальное состояние робота
        const state = await fetchFieldState();
        await updateField({ robot: state.robot });

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
            await updateField({ robot: { x: step.x, y: step.y } });
            const state = await fetchFieldState();
            renderField(state);
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
            robot: { x: 0, y: 0 }
        });
    }
});

// Инициализация при загрузке
window.addEventListener('load', () => {
    fetchFieldState().then(renderField);
});