import { getEnv } from './config/env.js';
import { createApp } from './app.js';

const { PORT } = getEnv();
const app = createApp();

app.listen(PORT, () => {
  console.log(`ParchApp API escuchando en http://localhost:${PORT}`);
});
