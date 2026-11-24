const express = require('express');
const { env, prisma } = require('./config');
const posts = require('./routes/posts');
const users = require('./routes/users');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();
app.use(express.json({ limit: '10kb' }));
app.use('/api/users', users);
app.use('/api/posts', posts);
app.use(notFound);
app.use(errorHandler);

async function main() {
  await prisma.$connect();
  app.listen(env.PORT, () => console.log('Blog API listening on port ' + env.PORT));
}

main().catch(async (error) => {
  console.error(error.message);
  await prisma.$disconnect();
  process.exitCode = 1;
});
