import { useEffect, useState } from 'react';

export default function App() {
  const [tasks, setTasks] = useState([]);
  const [source, setSource] = useState('');
  const [title, setTitle] = useState('');
  const [visits, setVisits] = useState(0);
  const [health, setHealth] = useState('checking...');
  const [error, setError] = useState('');

  async function loadTasks() {
    try {
      const res = await fetch('/api/tasks');
      const data = await res.json();
      setTasks(data.tasks);
      setSource(data.source);
      setError('');
    } catch (e) {
      setError('Could not reach the API');
    }
  }

  async function loadMeta() {
    try {
      const h = await fetch('/api/health').then((r) => r.json());
      setHealth(h.status === 'ok' ? 'API + DB + Redis healthy' : 'degraded');
      const s = await fetch('/api/stats').then((r) => r.json());
      setVisits(s.visits);
    } catch (e) {
      setHealth('unreachable');
    }
  }

  useEffect(() => {
    loadTasks();
    loadMeta();
  }, []);

  async function addTask(e) {
    e.preventDefault();
    if (!title.trim()) return;
    await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    });
    setTitle('');
    loadTasks();
  }

  async function removeTask(id) {
    await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
    loadTasks();
  }

  return (
    <div className="container">
      <h1>Production Compose App</h1>
      <p className="status">Status: {health} | Visits (Redis): {visits}</p>

      <form onSubmit={addTask}>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Add a new task..."
        />
        <button type="submit">Add</button>
      </form>

      {error && <p className="error">{error}</p>}

      <p className="source">
        Data served from: <strong>{source}</strong>
      </p>

      <ul>
        {tasks.map((t) => (
          <li key={t.id}>
            <span>{t.title}</span>
            <button className="del" onClick={() => removeTask(t.id)}>
              Delete
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
