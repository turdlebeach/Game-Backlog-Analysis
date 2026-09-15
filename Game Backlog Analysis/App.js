//global state
const API = 'http://localhost:3000/games';

let selectedGame = null;
let editMode = false;

// ADD THIS near the top (after app setup)
const path = require('path');
app.use(express.static(path.join(__dirname, 'public')));

//load + render games
async function loadGames(filter = 'all') {
    const res = await fetch(API);
    let games = await res.json();

    if (filter === 'open') {
        games = games.filter(g => g.is_open_ended === 1);
    } else if (filter === 'closed') {
        games = games.filter(g => g.is_open_ended === 0);
    }

    document.getElementById('totalGames').innerText =
        `Total Games: ${games.length}`;

    const grid = document.getElementById('gameGrid');
    grid.innerHTML = '';

    games.forEach(game => {
        const div = document.createElement('div');
        div.className = 'card';
        div.innerText = game.title;

        div.onclick = () => selectGame(game, div);

        grid.appendChild(div);
    });
}

//select game (highlight that appears on UI)
function selectGame(game, element) {
    selectedGame = game;

    document.querySelectorAll('.card').forEach(c =>
        c.classList.remove('selected')
    );

    element.classList.add('selected');
}

//add Game
function showAddForm() {
    editMode = false;
    document.getElementById('modal').classList.remove('hidden');
}

//edit game
function editSelected() {
    if (!selectedGame) return alert("Select a game first");

    editMode = true;

    document.getElementById('title').value = selectedGame.title;
    document.getElementById('genre').value = selectedGame.genre;
    document.getElementById('hours').value = selectedGame.estimated_hours || '';
    document.getElementById('openEnded').checked = selectedGame.is_open_ended === 1;

    document.getElementById('modal').classList.remove('hidden');
}

//submit (add or edit)
async function submitGame() {
    const data = {
        title: document.getElementById('title').value,
        genre: document.getElementById('genre').value,
        estimated_hours: document.getElementById('hours').value || null,
        is_open_ended: document.getElementById('openEnded').checked ? 1 : 0
    };

    if (editMode) {
        await fetch(`${API}/${selectedGame.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
    } else {
        await fetch(API, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
    }

    closeModal();
    loadGames();
}

//delete game
async function deleteSelected() {
    if (!selectedGame) return alert("Select a game first");

    await fetch(`${API}/${selectedGame.id}`, {
        method: 'DELETE'
    });

    selectedGame = null;
    loadGames();
}

//modal control
function closeModal() {
    document.getElementById('modal').classList.add('hidden');
}

//filtering
function filterGames(type) {
    loadGames(type);
}

//initial load
loadGames();

//progress dislay inside cards
`${game.title} (${game.estimated_hours || 0}h)`
