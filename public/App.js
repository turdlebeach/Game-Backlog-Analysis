//global state
const API = 'http://localhost:3000/games';

let selectedGame = null;
let editMode = false;

const path = require('path');
app.use(express.static(path.join(__dirname, 'public')));

//load + render games
async function loadGames(filter = 'all') {
    const res = await fetch(API);
    let games = await res.json();
    updateStatistics(games);

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

        //status colours
        if (game.status === 'Completed') {
            div.classList.add('completed');
        }

        if (game.status === 'In Progress') {
            div.classList.add('in-progress');
        }

        if (game.status === 'Dropped') {
            div.classList.add('dropped');
        }

        let progressHTML = '';

        if (game.is_open_ended === 1) {

            progressHTML = `
        <p>${game.hours_played || 0} hrs</p>
    `;

        } else {

            const percent =
                game.progress_percent || 0;

            progressHTML = `

        <div class="progress-bar">

            <div
                class="progress-fill"
                style="width: ${percent}%"
            ></div>

        </div>

        <p>${percent}%</p>
    `;
        }

        div.innerHTML = `
    <h3>${game.title}</h3>

    ${progressHTML}

    <small>${game.status || ''}</small>
`;

        div.onclick = () => selectGame(game, div);

        grid.appendChild(div);
    });
}

//select game (highlight that appears on UI)
function selectGame(game, element) {

    selectedGame = game;

    document.querySelectorAll('.card').forEach(card => {
        card.classList.remove('selected');
    });

    element.classList.add('selected');

    // LOAD DATA INTO UI

    document.getElementById('progressPercent').value =
        game.progress_percent || '';

    document.getElementById('hoursPlayed').value =
        game.hours_played || '';

    document.getElementById('status').value =
        game.status || 'Not Started';

    function updateProgressInputs() {

        const isOpenEnded =
            selectedGame?.is_open_ended === 1;

        document.getElementById('progressPercent').disabled =
            isOpenEnded;

        document.getElementById('hoursPlayed').disabled =
            !isOpenEnded;
    }
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

    const progressData = {
        progress_percent: document.getElementById('progressPercent').value || null,
        hours_played: document.getElementById('hoursPlayed').value || null,
        status: document.getElementById('status').value
    };

    await fetch(`http://localhost:3000/progress/${selectedGame.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(progressData)
    });

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

//save progress
async function saveProgress() {

    if (!selectedGame) {
        alert("Select a game first");
        return;
    }

    const progressPercent =
        document.getElementById('progressPercent').value;

    const hoursPlayed =
        document.getElementById('hoursPlayed').value;

    const status =
        document.getElementById('status').value;

    await fetch(`http://localhost:3000/progress/${selectedGame.id}`, {

        method: 'PUT',

        headers: {
            'Content-Type': 'application/json'
        },

        body: JSON.stringify({

            progress_percent:
                progressPercent || null,

            hours_played:
                hoursPlayed || null,

            status
        })
    });

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
loadRecommendation();

//progress display inside cards
`${game.title} (${game.estimated_hours || 0}h)`

function toggleProgressInputs() {
    const openEnded = document.getElementById('openEnded').checked;

    document.getElementById('progressPercent').style.display =
        openEnded ? 'none' : 'block';

    document.getElementById('hoursPlayed').style.display =
        openEnded ? 'block' : 'none';
}

// load recommendation
async function loadRecommendation() {

    const res =
        await fetch('http://localhost:3000/recommendation');

    const game = await res.json();

    document.getElementById('recommendationBox').innerHTML = `

        <h3>Recommended Next Game</h3>

        <p>${game.title}</p>

        <small>
            Score: ${game.recommendation_score}
        </small>
    `;
}

//update statistics

function updateStatistics(games) {

    const totalGames =
        games.length;

    const completedGames =
        games.filter(
            g => g.status === 'Completed'
        ).length;

    const totalHours =
        games.reduce(
            (sum, g) =>
                sum + (g.hours_played || 0),
            0
        );

    const linearGames =
        games.filter(
            g => g.progress_percent !== null
        );

    const avgCompletion =
        linearGames.length > 0

            ? linearGames.reduce(
            (sum, g) =>
                sum + (g.progress_percent || 0),
            0
        ) / linearGames.length

            : 0;

    document.getElementById('totalGamesStat')
        .innerText = totalGames;

    document.getElementById('completedStat')
        .innerText = completedGames;

    document.getElementById('hoursStat')
        .innerText = totalHours.toFixed(1);

    document.getElementById('completionStat')
        .innerText =
        avgCompletion.toFixed(1) + '%';


}

