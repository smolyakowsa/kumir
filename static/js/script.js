let isRunning = false;
let walls = new Set();

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
                // Исправлено: гарантированное преобразование в строку
                const parts = String(wall).split(',');
                return [parseInt(parts[0]), parseInt(parts[1]), parts[2]];
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

    // Исправлено: ключ стены как строки
    const wallKey = `${x},${y},${orientation}`;
    wall.dataset.key = wallKey;

    // Проверка наличия стены
    if (walls.has(wallKey)) {
        wall.style.background = '#666';
    }

    wall.addEventListener('click', async (e) => {
        e.stopPropagation();
        const key = e.target.dataset.key;
        const newWalls = new Set(walls);
        newWalls.has(key) ? newWalls.delete(key) : newWalls.add(key);
        walls = newWalls;
        await updateField({ walls: Array.from(walls) });
        renderField(await fetchFieldState());
    });

    return wall;
}

// Отрисовка поля
function renderField(state) {
    const field = document.getElementById('field');
    field.innerHTML = '';

    // Исправлено: преобразование стен в строки
    walls = new Set(state.walls.map(w => `${w[0]},${w[1]},${w[2]}`));

    // Отрисовка клеток...
    for (let y = 0; y < state.size; y++) {
        for (let x = 0; x < state.size; x++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.style.cssText = `left:${x * 10}%;top:${y * 10}%`;
            if (x === state.robot.x && y === state.robot.y) cell.classList.add('robot');
            if (state.painted.some(p => p[0] === x && p[1] === y)) cell.classList.add('painted');
            field.appendChild(cell);
        }
    }

    // Отрисовка стен...
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
            await new Promise(resolve => setTimeout(resolve, 300));
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