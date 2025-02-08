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
    wall.className = `${orientation}-wall wall`;
    wall.style.cssText = orientation === 'horizontal'
        ? `left:${x*10}%;top:${y*10}%`
        : `left:${x*10}%;top:${y*10}%`;

    wall.addEventListener('click', async (e) => {
        e.stopPropagation();
        const key = `${x},${y},${orientation}`;
        walls.has(key) ? walls.delete(key) : walls.add(key);
        wall.style.background = walls.has(key) ? '#666' : 'transparent';
        await updateField({walls: Array.from(walls)});
    });

    return wall;
}

function renderField(state) {
    const field = document.getElementById('field');
    field.innerHTML = '';
    walls = new Set(state.walls);

    // Cells
    for(let y = 0; y < state.size; y++) {
        for(let x = 0; x < state.size; x++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.style.cssText = `left:${x*10}%;top:${y*10}%`;

            cell.addEventListener('dblclick', () => {
                updateField({robot: {x, y, dir: 0}, walls: Array.from(walls)});
            });

            if(x === state.robot.x && y === state.robot.y) cell.classList.add('robot');
            if(state.painted.some(p => p[0] === x && p[1] === y)) cell.classList.add('painted');

            field.appendChild(cell);
        }
    }

    // Walls
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
    if(isRunning) return;
    isRunning = true;

    const fieldState = await fetchFieldState();
    await updateField({...fieldState, robot: {x:0, y:0, dir:0}});

    const response = await fetch('/api/run', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({code: document.getElementById('code').value})
    });

    const result = await response.json();
    if(result.error) alert(`Ошибка: ${result.error}`);

    renderField(await fetchFieldState());
    isRunning = false;
}

document.querySelector('.controls').addEventListener('click', e => {
    if(e.target.classList.contains('start')) runCode();
    if(e.target.classList.contains('reset')) {
        document.getElementById('code').value = 'алг Движение\nнач\n\nкон';
        updateField({walls: [], painted: [], robot: {x:0, y:0, dir:0}});
    }
});

// Инициализация
fetchFieldState().then(renderField);