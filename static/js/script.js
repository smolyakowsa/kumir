let isRunning = false;
let walls = new Map(); // Используем Map для хранения стен
let animationDelay = 500; // Задержка анимации (в миллисекундах)

// Функция для очистки строки от нежелательных символов
function cleanString(str) {
    str = str.replace(/[^\w\s]/g, ''); // Удаляем все символы, кроме букв, цифр и пробелов
    str = str.trim(); // Удаляем лишние пробелы
    return str;
}

// Функция для получения текущего состояния поля
async function fetchFieldState() {
    const response = await fetch('/api/field');
    const state = await response.json();
    console.log("Текущее состояние поля:", state); // Логирование состояния
    return state;
}

// Функция для обновления состояния поля на сервере
async function updateField(data) {
    console.log('Отправляемые данные:', data); // Отладочная информация
    await fetch('/api/field', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            walls: Array.from(walls.values()), // Преобразуем Map в массив объектов
            painted: data.painted || [],
            robot: data.robot || { x: 0, y: 0 }
        })
    });
}

// Создание элемента стены
function createWallElement(x, y, orientation) {
    const wallKey = `${x},${y},${orientation}`;
    const wall = document.createElement('div');
    wall.className = `wall ${orientation}-wall`;
    if (orientation === 'horizontal') {
        wall.style.cssText = `left:${x * 10}%; top:${y * 10}%; width:10%; height:2px`;
    } else {
        wall.style.cssText = `left:${x * 10}%; top:${y * 10}%; width:2px; height:10%`;
    }
    if (walls.has(wallKey)) {
        wall.classList.add('active');
    }
    wall.addEventListener('click', async (e) => {
        e.stopPropagation();
        const key = wallKey;
        const newWalls = new Map(walls);
        if (newWalls.has(key)) {
            newWalls.delete(key);
            wall.classList.remove('active');
        } else {
            newWalls.set(key, { x, y, orientation });
            wall.classList.add('active');
        }
        walls = newWalls;
        try {
            await updateField({ walls: Array.from(walls.values()) });
            const state = await fetchFieldState();
            renderField(state);
        } catch (error) {
            console.error('Ошибка при обновлении стен:', error);
        }
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
    walls.clear();
    state.walls.forEach(wall => {
        const [x1, y1, x2, y2] = wall;
        const orientation = y1 === y2 ? 'horizontal' : 'vertical';
        const key = `${x1},${y1},${orientation}`;
        walls.set(key, { x: x1, y: y1, orientation });
    });
    for (let y = 0; y < state.size; y++) {
        for (let x = 0; x < state.size; x++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.style.cssText = `left:${x * 10}%; top:${y * 10}%`;
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
// Запуск кода с пошаговым выполнением
async function runCode() {
    if (isRunning) return;
    isRunning = true;

    try {
        const state = await fetchFieldState();

        // Берем код напрямую из <textarea>
        const codeElement = document.getElementById('code');
        let code = codeElement.value.trim(); // Удаляем пробелы в начале и конце

        // Логирование отправляемого кода
        console.log("Отправленный код:", code);

        // Отправляем код на сервер
        const response = await fetch('/api/run', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code })
        });

        const result = await response.json();

        if (result.error) throw new Error(result.error);

        console.log("Шаги выполнения от сервера:", result);

        if (!Array.isArray(result) || result.length === 0) {
            alert("Алгоритм не содержит действий.");
            return;
        }

        for (const step of result) {
            await updateField({ robot: { x: step.x, y: step.y } });
            const state = await fetchFieldState();
            renderField(state);
            await new Promise(resolve => setTimeout(resolve, animationDelay));
        }
    } catch (error) {
        alert(`Ошибка: ${error.message}`);
    } finally {
        isRunning = false;
    }
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