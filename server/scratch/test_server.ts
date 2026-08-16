import express from 'express';
import procurementRouter from './procurement';

const app = express();
app.use(express.json());
app.use('/api/procurement', procurementRouter);

app.use((req, res) => {
  res.status(404).json({ error: 'Route not found', method: req.method, url: req.url });
});

app.listen(3005, () => {
  console.log('Test server running on port 3005');
});
