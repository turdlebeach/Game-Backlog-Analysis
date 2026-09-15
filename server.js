const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Connect to the database
const db = new sqlite3.Database('./test.sqlite', (err) => {
    if (err) {
        console.error("DB connection error:", err.message);
    } else {
        console.log("Connected to test.sqlite");
    }

});

db.run(`
CREATE TABLE IF NOT EXISTS games (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    genre TEXT,
    is_open_ended INTEGER NOT NULL,
    estimated_hours INTEGER
);
`);

//get all games
app.get('/games', (req, res) => {
    const sql = `
        SELECT 
            g.*,
            p.progress_percent,
            p.hours_played,
            p.status
        FROM games g
        LEFT JOIN progress p ON g.id = p.game_id
    `;

    db.all(sql, [], (err, rows) => {
        if (err) return res.status(500).json(err);
        res.json(rows);
    });
});

//create game
app.post('/games', (req, res) => {

    const {
        title,
        genre,
        is_open_ended,
        estimated_hours
    } = req.body;

    const gameSql = `
        INSERT INTO games
            (title, genre, is_open_ended, estimated_hours)

        VALUES (?, ?, ?, ?)
    `;

    db.run(
        gameSql,
        [
            title,
            genre,
            is_open_ended,
            estimated_hours
        ],

        function(err) {

            if (err) {
                return res.status(500).json(err);
            }

            const gameId = this.lastID;

            // AUTO CREATE PROGRESS ROW

            const progressSql = `
                INSERT INTO progress
                (
                    game_id,
                    progress_percent,
                    hours_played,
                    status
                )

                VALUES (?, ?, ?, ?)
            `;

            const progressPercent =
                is_open_ended ? null : 0;

            const hoursPlayed =
                is_open_ended ? 0 : null;

            db.run(
                progressSql,
                [
                    gameId,
                    progressPercent,
                    hoursPlayed,
                    'Not Started'
                ],

                function(progressErr) {

                    if (progressErr) {
                        return res.status(500).json(progressErr);
                    }

                    res.json({
                        id: gameId
                    });
                }
            );
        }
    );
});

//update game
app.put('/games/:id', (req, res) => {
    const { title, genre, is_open_ended, estimated_hours } = req.body;

    const sql = `
        UPDATE games
        SET title = ?, genre = ?, is_open_ended = ?, estimated_hours = ?
        WHERE id = ?
    `;

    db.run(sql,
        [title, genre, is_open_ended, estimated_hours, req.params.id],
        function(err) {
            if (err) return res.status(500).json(err);
            res.json({ updated: this.changes });
        }
    );
});app.put('/games/:id', (req, res) => {
    const { title, genre, is_open_ended, estimated_hours } = req.body;

    const sql = `
        UPDATE games
        SET title = ?, genre = ?, is_open_ended = ?, estimated_hours = ?
        WHERE id = ?
    `;

    db.run(sql,
        [title, genre, is_open_ended, estimated_hours, req.params.id],
        function(err) {
            if (err) return res.status(500).json(err);
            res.json({ updated: this.changes });
        }
    );
});

//delete game
app.delete('/games/:id', (req, res) => {
    db.run("DELETE FROM games WHERE id = ?", [req.params.id], function(err) {
        if (err) return res.status(500).json(err);
        res.json({ deleted: this.changes });
    });
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
//API Route for updating progress
app.put('/progress/:gameId', (req, res) => {

    const {
        progress_percent,
        hours_played,
        status
    } = req.body;

    const sql = `
        UPDATE progress
        SET
            progress_percent = ?,
            hours_played = ?,
            status = ?
        WHERE game_id = ?
    `;

    db.run(
        sql,
        [
            progress_percent,
            hours_played,
            status,
            req.params.gameId
        ],

        function(err) {

            if (err) {
                return res.status(500).json(err);
            }

            res.json({
                updated: this.changes
            });
        }
    );
});

//recommendation system
app.get('/recommendation', (req, res) => {

    const sql = `
        SELECT
            g.id,
            g.title,
            g.genre,
            g.estimated_hours,
            g.is_open_ended,

            p.progress_percent,
            p.hours_played,
            p.status

        FROM games g

        LEFT JOIN progress p
        ON g.id = p.game_id
    `;

    db.all(sql, [], (err, games) => {

        if (err) {
            return res.status(500).json(err);
        }

        // SCORE GAMES

        const scoredGames = games.map(game => {

            let score = 0;

            // STATUS

            if (game.status === 'In Progress') {
                score += 50;
            }

            if (game.status === 'Not Started') {
                score += 20;
            }

            if (game.status === 'Completed') {
                score -= 100;
            }

            if (game.status === 'Dropped') {
                score -= 50;
            }

            // SHORTER GAMES BONUS

            if (game.estimated_hours) {
                score += Math.max(0, 30 - game.estimated_hours);
            }

            // PROGRESS BONUS

            if (game.progress_percent) {
                score += game.progress_percent;
            }

            return {
                ...game,
                recommendation_score: score
            };
        });

        // SORT HIGHEST SCORE

        scoredGames.sort(
            (a, b) =>
                b.recommendation_score -
                a.recommendation_score
        );

        // BEST GAME

        res.json(scoredGames[0]);
    });
});

const path = require('path');

app.use(express.static(path.join(__dirname, 'public')));
