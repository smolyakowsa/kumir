let isRunning = false;

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

function renderField(state) {
    const field = document.getElementById('field');
    field.innerHTML = '';

    for (let y = 0; y < state.size; y++) {
        for (let x = 0; x < state.size; x++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.style.cssText = `left:${x * 10}%;top:${y * 10}%`;
            if (x === state.robot.x && y === state.robot.y) {
                cell.classList.add('robot');
            }
            if (state.painted.some(p => p[0] === x && p[1] === y)) {
                cell.classList.add('painted');
            }
            field.appendChild(cell);
        }
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

function toggleTheme() {
    document.body.classList.toggle('dark-theme');
    document.querySelector('.theme-switcher button').innerHTML =
        document.body.classList.contains('dark-theme')
            ? '<i class="fas fa-sun"></i>'
            : '<i class="fas fa-moon"></i>';
}

// Инициализация
fetchFieldState().then(renderField);