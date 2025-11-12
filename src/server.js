import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import { assertDbConnection } from './config/database.js';
import api from './routes/index.js';
import { errorHandler } from './middlewares/error.middleware.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', (_, res) => res.json({ ok: true }));
app.use('/api', api);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

assertDbConnection()
.then(() => {
app.listen(PORT, () => console.log(`Bank API running on :${PORT}`));
})
.catch((e) => {
console.error('DB connect error:', e.message);
process.exit(1);
});