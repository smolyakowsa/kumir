let isRunning = false;
let walls = new Set();

async function fetchFieldState() {
    const response = await fetch('/api/field');
    return await response.json();
}

async function updateField(data) {
    await fetch('/api/field', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(data)
    });
}

function createWallElement(x, y, orientation) {
    const wall = document.createElement('div');
    wall.className = `wall ${orientation}-wall`;
    wall.style.cssText = orientation === 'horizontal'
        ? `left:${x*10}%;top:${y*10}%`
        : `left:${x*10}%;top:${y*10}%`;

    wall.dataset.x = x;
    wall.dataset.y = y;
    wall.dataset.orientation = orientation;

    wall.addEventListener('click', async (e) => {
        e.stopPropagation();
        const key = `${x},${y},${orientation}`;
        if(walls.has(key)) {
            walls.delete(key);
            wall.style.background = 'transparent';
        } else {
            walls.add(key);
            wall.style.background = '#666';
        }
        await updateField({walls: Array.from(walls)});
    });

    return wall;
}

function renderField(state) {
    const field = document.getElementById('field');
    field.innerHTML = '';
    walls = new Set(state.walls);

    // Создаем клетки
    for(let y = 0; y < state.size; y++) {
        for(let x = 0; x < state.size; x++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.style.cssText = `left:${x*10}%;top:${y*10}%`;
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
    for(let y = 0; y <= state.size; y++) {
        for(let x = 0; x < state.size; x++) {
            field.appendChild(createWallElement(x, y, 'horizontal'));
        }
    }

    for(let y = 0; y < state.size; y++) {
        for(let x = 0; x <= state.size; x++) {
            field.appendChild(createWallElement(x, y, 'vertical'));
        }
    }
}

async function runCode() {
    if (isRunning) return;
    isRunning = true;

    const code = document.getElementById('code').value;
    const response = await fetch('/api/run', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ code })
    });

    const result = await response.json();
    if (result.error) {
        alert(`Ошибка: ${result.error}`);
    } else {
        const fieldState = await fetchFieldState();
        renderField(fieldState);
    }

    isRunning = false;
}

function toggleTheme() {
    const body = document.body;
    body.classList.toggle('dark-theme');

    const moonIcon = document.querySelector('.fa-moon');
    const sunIcon = document.querySelector('.fa-sun');

    if(body.classList.contains('dark-theme')) {
        moonIcon.style.display = 'none';
        sunIcon.style.display = 'inline-block';
    } else {
        sunIcon.style.display = 'none';
        moonIcon.style.display = 'inline-block';
    }
}

document.querySelector('.controls').addEventListener('click', e => {
    if (e.target.classList.contains('start')) {
        runCode();
    }
    if (e.target.classList.contains('reset')) {
        updateField({ walls: [], painted: [], robot: { x: 0, y: 0, dir: 0 } });
    }
});

// Инициализация
fetchFieldState().then(renderField);