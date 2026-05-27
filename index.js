require('dotenv').config()
const express = require('express')
const mysql = require('mysql2')
const cors = require('cors')
const axios = require('axios')
const jwt = require('jsonwebtoken')
const bcrypt = require('bcryptjs')

const app = express()
app.use(cors())
app.use(express.json())

// Настройки из .env (создай файл .env в папке проекта)
const SECRET_KEY = process.env.SECRET_KEY || 'super_secret_key_123'
const ADMIN_SECRET = process.env.ADMIN_SECRET || 'admin123'
const TWITCH_CLIENT_ID =
	process.env.TWITCH_CLIENT_ID || 'dundyn05ztgh2h0pkojf0z2zhyvsoa'
const TWITCH_CLIENT_SECRET =
	process.env.TWITCH_CLIENT_SECRET || 'mxw55kxt62hqryzpext6dw9zn3mf4w'

const db = mysql.createConnection({
	host: process.env.DB_HOST,
	user: process.env.DB_USER,
	password: process.env.DB_PASSWORD,
	database: process.env.DB_NAME,
})

db.connect(err => {
	if (err) {
		console.error('Ошибка подключения к БД:', err.message)
		return
	}
	console.log('--- Успешно подключено к mcsr_hub ---')
})

// Middleware
const isAdmin = (req, res, next) => {
	const adminKey = req.headers['x-admin-key']
	if (!adminKey || adminKey !== ADMIN_SECRET) {
		return res.status(403).json({ message: 'Доступ запрещен' })
	}
	next()
}

const authenticateToken = (req, res, next) => {
	const authHeader = req.headers['authorization']
	const token = authHeader && authHeader.split(' ')[1]
	if (!token) return res.status(401).json({ message: 'Требуется токен' })
	jwt.verify(token, SECRET_KEY, (err, user) => {
		if (err) return res.status(403).json({ message: 'Токен недействителен' })
		req.user = user
		next()
	})
}

async function getPlayerData(nickname) {
	try {
		const response = await axios.get(
			`https://api.mcsrranked.com/users/${nickname}`,
		)
		const userData = response.data.data
		const stats = userData.statistics.season
		const wins = stats.wins?.ranked || 0
		const total = stats.playedMatches?.ranked || 0
		const winRate = total > 0 ? Math.round((wins / total) * 100) + '%' : '0%'
		return {
			eloRank: userData.eloRank || 0,
			eloRate: userData.eloRate || 0,
			bestTime: stats.bestTime?.ranked || 0,
			winRate: winRate,
			totalMatches: total,
		}
	} catch (error) {
		return {
			eloRank: 0,
			eloRate: 0,
			bestTime: 0,
			winRate: '0%',
			totalMatches: 0,
		}
	}
}
// --- AUTH ROUTES ---
app.post('/api/auth/register', async (req, res) => {
	const { username, email, password, flag } = req.body
	try {
		const hashedPassword = await bcrypt.hash(password, 10)
		const sql =
			'INSERT INTO users (username, email, password, flag, points) VALUES (?, ?, ?, ?, 1000)'
		db.query(sql, [username, email, hashedPassword, flag], err => {
			if (err) return res.status(500).json({ error: 'Ошибка регистрации' })
			res.json({ message: 'Регистрация успешна' })
		})
	} catch (e) {
		res.status(500).json({ error: 'Ошибка сервера' })
	}
})

app.post('/api/auth/login', (req, res) => {
	const { username, password } = req.body
	db.query(
		'SELECT * FROM users WHERE username = ?',
		[username],
		async (err, results) => {
			if (err || results.length === 0)
				return res.status(401).json({ error: 'Неверные данные' })

			const user = results[0]
			const isMatch = await bcrypt.compare(password, user.password)
			if (!isMatch) return res.status(401).json({ error: 'Неверный пароль' })

			const token = jwt.sign({ id: user.id }, SECRET_KEY, { expiresIn: '24h' })
			res.json({
				token,
				user: { username: user.username, points: user.points },
			})
		},
	)
})

// --- API ТРАНСЛЯЦИЙ (TWITCH) ---
app.post('/api/streams/check', async (req, res) => {
	try {
		const { nicknames } = req.body

		if (!nicknames || !Array.isArray(nicknames) || nicknames.length === 0) {
			return res.json([])
		}

		const cleanNicks = nicknames
			.filter(n => typeof n === 'string' && n.trim().length > 0)
			.map(n => n.trim().toLowerCase())
			.filter(n => {
				const twitchUserRegex = /^[a-z][a-z0-9_]{2,24}$/
				return twitchUserRegex.test(n)
			})
			.slice(0, 100)

		const tokenResponse = await axios.post(
			`https://id.twitch.tv/oauth2/token?client_id=${TWITCH_CLIENT_ID}&client_secret=${TWITCH_CLIENT_SECRET}&grant_type=client_credentials`,
		)
		const accessToken = tokenResponse.data.access_token

		const queryParams = cleanNicks
			.map(nick => `user_login=${encodeURIComponent(nick)}`)
			.join('&')

		const streamsResponse = await axios.get(
			`https://api.twitch.tv/helix/streams?${queryParams}`,
			{
				headers: {
					'Client-ID': TWITCH_CLIENT_ID,
					Authorization: `Bearer ${accessToken}`,
				},
			},
		)

		const liveStreams = streamsResponse.data.data.map(stream => ({
			login: stream.user_login,
			name: stream.user_name,
			title: stream.title,
			viewer_count: stream.viewer_count,
			avatar: `https://mineskin.eu/helm/${stream.user_login}/64.png`,
		}))

		res.json(liveStreams)
	} catch (error) {
		console.error('Ошибка TWITCH:', error.message)
		res.status(500).json({ error: 'Internal Server Error' })
	}
})
// === API ТУРНИРОВ ===
app.get('/api/tournaments', (req, res) => {
	const sql = 'SELECT * FROM tournaments ORDER BY created_at DESC'
	db.query(sql, (err, results) => {
		if (err) return res.status(500).json({ error: err.message })
		res.json(results)
	})
})

app.get('/api/tournaments/:id', (req, res) => {
	const { id } = req.params
	const sql = 'SELECT * FROM tournaments WHERE id = ?'
	db.query(sql, [id], (err, results) => {
		if (err) return res.status(500).json({ error: err.message })
		if (results.length === 0)
			return res.status(404).json({ message: 'Турнир не найден' })
		res.json(results[0])
	})
})

app.get('/api/tournaments/:id/matches', (req, res) => {
	const { id } = req.params
	const sql = `
        SELECT m.*, t.title as tournament_name 
        FROM matches m 
        LEFT JOIN tournaments t ON m.tournament_id = t.id 
        WHERE m.tournament_id = ?
        ORDER BY m.match_date DESC
    `
	db.query(sql, [id], (err, results) => {
		if (err) return res.status(500).json({ error: err.message })
		res.json(results)
	})
})

app.post('/api/tournaments', isAdmin, (req, res) => {
	const {
		title,
		status,
		description,
		image_url,
		start_date,
		end_date,
		prize_pool,
		player_count,
	} = req.body
	const sql = `INSERT INTO tournaments 
        (title, status, description, image_url, start_date, end_date, prize_pool, player_count) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
	db.query(
		sql,
		[
			title,
			status,
			description,
			image_url,
			start_date,
			end_date,
			prize_pool,
			player_count,
		],
		(err, result) => {
			if (err) return res.status(500).json({ error: err.message })
			res.json({ id: result.insertId, message: 'Турнир создан' })
		},
	)
})

app.put('/api/tournaments/:id', isAdmin, (req, res) => {
	const { id } = req.params
	const d = req.body
	const sql = `UPDATE tournaments SET title = ?, status = ?, description = ?, image_url = ?, start_date = ?, end_date = ?, prize_pool = ?, player_count = ? WHERE id = ?`
	db.query(
		sql,
		[
			d.title,
			d.status,
			d.description,
			d.image_url,
			d.start_date,
			d.end_date,
			d.prize_pool,
			d.player_count,
			id,
		],
		(err, result) => {
			if (err) return res.status(500).json({ error: err.message })
			if (result.affectedRows === 0)
				return res.status(404).json({ message: 'Турнир не найден' })
			res.json({ message: 'Турнир успешно обновлен' })
		},
	)
})

app.delete('/api/tournaments/:id', isAdmin, (req, res) => {
	const { id } = req.params
	const deleteMatchesSql = 'DELETE FROM matches WHERE tournament_id = ?'
	db.query(deleteMatchesSql, [id], err => {
		if (err) return res.status(500).json({ error: 'Не удалось удалить матчи' })
		const deleteTournamentSql = 'DELETE FROM tournaments WHERE id = ?'
		db.query(deleteTournamentSql, [id], (err, result) => {
			if (err)
				return res.status(500).json({ error: 'Не удалось удалить турнир' })
			res.json({ message: 'Турнир и матчи удалены' })
		})
	})
})
// === API МАТЧЕЙ ===
app.get('/api/matches', (req, res) => {
	const sql = `SELECT m.*, t.title as tournament_name FROM matches m LEFT JOIN tournaments t ON m.tournament_id = t.id ORDER BY m.match_date DESC`
	db.query(sql, (err, results) => {
		if (err) return res.status(500).json({ error: err.message })
		res.json(results)
	})
})

app.get('/api/matches/:id', (req, res) => {
	const { id } = req.params
	const sql = `SELECT m.*, t.title as tournament_name FROM matches m LEFT JOIN tournaments t ON m.tournament_id = t.id WHERE m.id = ?`
	db.query(sql, [id], (err, results) => {
		if (err) return res.status(500).json({ error: err.message })
		if (results.length === 0)
			return res.status(404).json({ message: 'Матч не найден' })
		res.json(results[0])
	})
})

app.post('/api/matches', isAdmin, async (req, res) => {
	const d = req.body
	try {
		const p1 = await getPlayerData(d.player1_name)
		const p2 = await getPlayerData(d.player2_name)
		const sql = `INSERT INTO matches (tournament_id, player1_name, player2_name, match_date, status, score1, score2, video_url, match_title, format, version, category, seed1, seed2, seed3, seed4, seed5, seed6, seed7, player1_rank, player1_best_time, player1_win_rate, player1_total_runs, player2_rank, player2_best_time, player2_win_rate, player2_total_runs) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
		const params = [
			d.tournament_id || null,
			d.player1_name,
			d.player2_name,
			d.match_date,
			d.status || 'scheduled',
			0,
			0,
			d.video_url,
			d.match_title,
			d.format,
			d.version,
			d.category,
			d.seed1 || null,
			d.seed2 || null,
			d.seed3 || null,
			d.seed4 || null,
			d.seed5 || null,
			d.seed6 || null,
			d.seed7 || null,
			p1.eloRank,
			p1.bestTime,
			p1.winRate,
			p1.totalMatches,
			p2.eloRank,
			p2.bestTime,
			p2.winRate,
			p2.totalMatches,
		]
		db.query(sql, params, (err, result) => {
			if (err) return res.status(500).json({ error: err.message })
			res.json({ id: result.insertId, message: 'Матч создан' })
		})
	} catch (error) {
		res.status(500).json({ error: 'Ошибка сервера' })
	}
})

app.put('/api/matches/:id', isAdmin, async (req, res) => {
	const { id } = req.params
	const d = req.body
	try {
		const p1 = await getPlayerData(d.player1_name)
		const p2 = await getPlayerData(d.player2_name)
		const sql = `UPDATE matches SET tournament_id = ?, player1_name = ?, player2_name = ?, match_date = ?, status = ?, score1 = ?, score2 = ?, video_url = ?, match_title = ?, format = ?, version = ?, category = ?, seed1 = ?, seed2 = ?, seed3 = ?, seed4 = ?, seed5 = ?, seed6 = ?, seed7 = ?, player1_rank = ?, player1_best_time = ?, player1_win_rate = ?, player1_total_runs = ?, player2_rank = ?, player2_best_time = ?, player2_win_rate = ?, player2_total_runs = ? WHERE id = ?`
		const params = [
			d.tournament_id || null,
			d.player1_name,
			d.player2_name,
			d.match_date,
			d.status || 'scheduled',
			d.score1 || 0,
			d.score2 || 0,
			d.video_url,
			d.match_title,
			d.format,
			d.version,
			d.category,
			d.seed1 || null,
			d.seed2 || null,
			d.seed3 || null,
			d.seed4 || null,
			d.seed5 || null,
			d.seed6 || null,
			d.seed7 || null,
			p1.eloRank,
			p1.bestTime,
			p1.winRate,
			p1.totalMatches,
			p2.eloRank,
			p2.bestTime,
			p2.winRate,
			p2.totalMatches,
			id,
		]
		db.query(sql, params, (err, result) => {
			if (err) return res.status(500).json({ error: err.message })
			if (result.affectedRows === 0)
				return res.status(404).json({ message: 'Матч не найден' })
			res.json({ message: 'Матч успешно обновлен' })
		})
	} catch (error) {
		res.status(500).json({ error: 'Ошибка сервера' })
	}
})

app.delete('/api/matches/:id', isAdmin, (req, res) => {
	const { id } = req.params
	db.query('DELETE FROM matches WHERE id = ?', [id], err => {
		if (err) return res.status(500).json({ error: err.message })
		res.json({ message: 'Матч удален' })
	})
})

app.patch('/api/matches/:id/score', isAdmin, (req, res) => {
	const { id } = req.params
	const { score1, score2 } = req.body
	db.query(
		'UPDATE matches SET score1 = ?, score2 = ? WHERE id = ?',
		[score1 || 0, score2 || 0, id],
		(err, result) => {
			if (err) return res.status(500).json({ error: err.message })
			res.json({ message: 'Счет обновлен' })
		},
	)
})

// === API ПРОГНОЗОВ ===
app.post('/api/picks', authenticateToken, async (req, res) => {
	const userId = req.user.id
	const { tournamentId, matchId, predictedWinnerId } = req.body
	const sql = `INSERT INTO picks (user_id, tournament_id, match_id, predicted_winner_id) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE predicted_winner_id = VALUES(predicted_winner_id)`
	db.query(sql, [userId, tournamentId, matchId, predictedWinnerId], err => {
		if (err) return res.status(500).json({ error: err.message })
		res.json({ message: 'Прогноз сохранен' })
	})
})

app.get('/api/picks/:tournamentId', authenticateToken, (req, res) => {
	const { tournamentId } = req.params

	// ВАЖНОЕ ИЗМЕНЕНИЕ: Добавлены 'AS matchId' и 'AS predictedWinnerId'.
	// Это необходимо, чтобы Vue фронтенд (настроенный на camelCase)
	// смог правильно распарсить данные.
	db.query(
		'SELECT match_id AS matchId, predicted_winner_id AS predictedWinnerId FROM picks WHERE tournament_id = ? AND user_id = ?',
		[tournamentId, req.user.id],
		(err, results) => {
			if (err) return res.status(500).json({ error: err.message })
			res.json(results)
		},
	)
})

// === API RANKED + TWITCH (TOP 100 STREAMS) ===
app.get('/api/ranked/leaderboard', async (req, res) => {
	try {
		const response = await axios.get('https://api.mcsrranked.com/leaderboard')
		res.json(response.data)
	} catch (error) {
		console.error('Ошибка Ranked API:', error.message)
		res.status(500).json({ error: 'Не удалось получить лидерборд' })
	}
})

app.get('/api/ranked/top-streams', async (req, res) => {
	try {
		const rankedResponse = await axios.get(
			'https://api.mcsrranked.com/leaderboard',
		)
		let topPlayers =
			rankedResponse.data?.data?.users || rankedResponse.data?.data || []

		if (!Array.isArray(topPlayers) || topPlayers.length === 0) {
			return res.json([])
		}

		topPlayers = topPlayers.slice(0, 100)
		const nicknames = topPlayers.map(p => p.nickname)
		let liveStreams = []

		try {
			const tokenResponse = await axios.post(
				`https://id.twitch.tv/oauth2/token?client_id=${TWITCH_CLIENT_ID}&client_secret=${TWITCH_CLIENT_SECRET}&grant_type=client_credentials`,
			)
			const accessToken = tokenResponse.data.access_token

			const queryParams = nicknames
				.map(nick => `user_login=${encodeURIComponent(nick.toLowerCase())}`)
				.join('&')

			if (queryParams) {
				const streamsResponse = await axios.get(
					`https://api.twitch.tv/helix/streams?${queryParams}`,
					{
						headers: {
							'Client-ID': TWITCH_CLIENT_ID,
							Authorization: `Bearer ${accessToken}`,
						},
					},
				)
				liveStreams = streamsResponse.data.data || []
			}
		} catch (twitchError) {
			console.error(
				'Ошибка Twitch API, продолжаем без стримов:',
				twitchError.message,
			)
		}

		const result = topPlayers.map((player, index) => {
			const stream = liveStreams.find(
				s => s.user_login.toLowerCase() === player.nickname.toLowerCase(),
			)
			return {
				rank: player.eloRank || player.rank || index + 1,
				nickname: player.nickname,
				eloRate: player.eloRate || 0,
				isLive: !!stream,
				streamTitle: stream ? stream.title : null,
				viewerCount: stream ? stream.viewer_count : 0,
				streamData: stream || null,
			}
		})

		res.json(result)
	} catch (error) {
		console.error(
			'Критическая ошибка сборки данных top-streams:',
			error.message,
		)
		res.status(500).json({ error: 'Internal Server Error' })
	}
})

// === API СТАТИСТИКИ ===

// Получение статистики (доступно всем)
app.get('/api/stats', (req, res) => {
	db.query(
		'SELECT * FROM ranked_stats ORDER BY rank_pos ASC',
		(err, results) => {
			if (err) return res.status(500).json({ error: err.message })
			res.json(results)
		},
	)
})

// Синхронизация статистики (ТОЛЬКО ДЛЯ АДМИНА)
app.post('/api/stats/sync', isAdmin, async (req, res) => {
	try {
		// 1. Получаем данные с API
		const response = await axios.get('https://mcsrranked.com/api/leaderboard')
		const data = response.data

		if (!data || !data.players) {
			return res
				.status(500)
				.json({ error: 'Ошибка получения данных с mcsrranked.com' })
		}

		// 2. Очищаем старую таблицу
		db.query('TRUNCATE TABLE ranked_stats', err => {
			if (err)
				return res
					.status(500)
					.json({ error: 'Ошибка очистки базы: ' + err.message })

			// 3. Вставляем новые данные
			const players = data.players
			const sql =
				'INSERT INTO ranked_stats (username, rank_pos, elo, wins, losses, country_code) VALUES ?'
			const values = players.map(p => [
				p.nickname,
				p.rank,
				p.elo,
				p.wins,
				p.losses,
				p.country,
			])

			db.query(sql, [values], err => {
				if (err)
					return res
						.status(500)
						.json({ error: 'Ошибка вставки данных: ' + err.message })
				res.json({
					message: `Успешно синхронизировано ${players.length} игроков`,
				})
			})
		})
	} catch (error) {
		console.error(error)
		res
			.status(500)
			.json({ error: 'Ошибка при выполнении синхронизации: ' + error.message })
	}
})

// Слушаем порт (обязательно process.env.PORT для Render)
const PORT = process.env.PORT || 3001
app.listen(PORT, () => {
	console.log(`\x1b[32m>>> Сервер запущен на порту: ${PORT}\x1b[0m`)
})
