// api/index.ts
import express from 'express';
const app = express();

app.get('/', (req, res) => {
  res.send('✅ API is working');
});

app.listen(3000, () => {
  console.log('Server listening on port 3000');
});
