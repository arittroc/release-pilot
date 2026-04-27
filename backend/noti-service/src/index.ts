import express from 'express';
import cors from 'cors';

const app = express();
const port = 4005;

app.use(cors());
app.use(express.json());

// The exact endpoint your React dashboard is pinging for health!
app.get('/api/noti-services/health', (req, res) => {
  res.json({ status: 'ok', service: 'noti-service' });
});

app.listen(port, () => {
  console.log(`🔔 Notification Service running on port ${port}`);
});
