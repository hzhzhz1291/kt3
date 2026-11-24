const express = require('express');
const swagger = require('swagger-ui-express');
const openapi = require('./config/swagger');
const { env, prisma } = require('./config');
const posts = require('./routes/posts');
const users = require('./routes/users');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();
app.use(express.json({ limit: '10kb' }));
app.get('/api/docs.json', (req, res) => res.json(openapi));
app.use('/api/docs', swagger.serve, swagger.setup(openapi, {
  customSiteTitle: openapi.info.title,
  swaggerOptions: { validatorUrl: null },
}));

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
