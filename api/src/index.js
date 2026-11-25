const express = require('express');
const { Pool } = require('pg');
const { createClient } = require('redis');

const app = express();
app.use(express.json());

const pool = new Pool({
  host: process.env.DB_HOST,
  port: 5432,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  database: process.env.POSTGRES_DB,
});

const redis = createClient({
  url: `redis://:${process.env.REDIS_PASSWORD}@${process.env.REDIS_HOST}:6379`,
});
redis.on('error', (err) => console.error('Redis error:', err.message));

const CACHE_KEY = 'tasks:all';

// Health check: verifies both DB and Redis
app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    await redis.ping();
    res.json({ status: 'ok', db: 'up', redis: 'up' });
  } catch (err) {
    res.status(503).json({ status: 'error', message: err.message });
  }
});

// List tasks (Redis cache first, then Postgres)
app.get('/api/tasks', async (req, res) => {
  try {
    const cached = await redis.get(CACHE_KEY);
    if (cached) {
      return res.json({ source: 'cache', tasks: JSON.parse(cached) });
    }
    const { rows } = await pool.query('SELECT * FROM tasks ORDER BY id');
    await redis.setEx(CACHE_KEY, 30, JSON.stringify(rows));
    res.json({ source: 'database', tasks: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create task
app.post('/api/tasks', async (req, res) => {
  const { title } = req.body;
  if (!title || !title.trim()) {
    return res.status(400).json({ error: 'title is required' });
  }
  try {
    const { rows } = await pool.query(
      'INSERT INTO tasks (title) VALUES ($1) RETURNING *',
      [title.trim()]
    );
    await redis.del(CACHE_KEY);
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete task
app.delete('/api/tasks/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM tasks WHERE id = $1', [req.params.id]);
    await redis.del(CACHE_KEY);
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Visit counter stored in Redis
app.get('/api/stats', async (req, res) => {
  try {
    const visits = await redis.incr('visits');
    res.json({ visits });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

async function start() {
  await redis.connect();
  const port = 3000;
  app.listen(port, '0.0.0.0', () => console.log(`API listening on ${port}`));
}

start().catch((err) => {
  console.error('Startup failure:', err);
  process.exit(1);
});
