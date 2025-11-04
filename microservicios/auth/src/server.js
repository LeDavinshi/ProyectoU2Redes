import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 4000;

// Healthcheck
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'auth', timestamp: new Date().toISOString() });
});

// Placeholder login route
app.post('/login', async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: 'username and password are required' });
  // TODO: validate against database and generate JWT
  return res.status(501).json({ error: 'Not implemented' });
});

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Auth service listening on port ${PORT}`);
});
