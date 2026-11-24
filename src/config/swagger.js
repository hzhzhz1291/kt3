const ref = (name) => ({ $ref: '#/components/schemas/' + name });
const id = { type: 'integer', minimum: 1, example: 1 };
const isoDate = { type: 'string', format: 'date-time' };
const email = { type: 'string', format: 'email', maxLength: 254, example: 'student@example.com' };
const name = { type: 'string', minLength: 1, maxLength: 100, example: 'Student' };
const role = { type: 'string', enum: ['USER', 'ADMIN'] };
const list = (items) => ({ type: 'array', items });
const object = (properties, required = Object.keys(properties)) => ({ type: 'object', properties, required });
const data = (schema) => object({ data: schema });
const paginated = (schema) => object({ data: list(schema), meta: ref('Meta') });
const json = (schema) => ({ 'application/json': { schema } });
const response = (description, schema) => ({ description, ...(schema ? { content: json(schema) } : {}) });
const requestBody = (name) => ({ required: true, content: json(ref(name)) });
const failures = (statuses) => Object.fromEntries(statuses.map((status) => [
  status, { $ref: '#/components/responses/Error' + status },
]));
const pathId = [{ in: 'path', name: 'id', required: true, schema: id }];
const query = (name, description, schema) => ({ in: 'query', name, description, schema });
const pagination = [
  query('page', 'Page number, starting at one', { ...id, maximum: 1000000, default: 1 }),
  query('limit', 'Items per page', { ...id, maximum: 100, default: 10 }),
];
const postInput = {
  title: { type: 'string', minLength: 1, maxLength: 200, example: 'Learning Prisma' },
  content: { type: 'string', nullable: true, maxLength: 8000 },
  published: { type: 'boolean', default: false },
  tags: { ...list({ type: 'string', minLength: 1, maxLength: 50 }), maxItems: 20, example: ['node', 'prisma'] },
};
function operation(tag, summary, status, success, { params, body, description, errors = [500] } = {}) {
  return {
    tags: [tag], summary,
    ...(description ? { description } : {}),
    ...(params ? { parameters: params } : {}),
    ...(body ? { requestBody: requestBody(body) } : {}),
    responses: { [status]: success, ...failures(errors) },
  };
}

const doc = {
  openapi: '3.0.3',
  info: { title: 'KT 3 Blog API', version: '1.0.0', description: 'Create a user first, then use its ID to create a post.' },
  servers: [{ url: '/' }],
  paths: {
    '/api/docs': {
      get: operation('System', 'Open Swagger UI', 200, { description: 'Swagger UI page', content: { 'text/html': { schema: { type: 'string' } } } },
        { errors: [] }),
    },
    '/api/docs.json': {
      get: operation('System', 'Read the OpenAPI document', 200, response('OpenAPI JSON', { type: 'object' }),
        { errors: [] }),
    },
    '/api/users': {
      get: operation('Users', 'List users', 200, response('Users page', paginated(ref('User'))),
        { params: pagination, errors: [400, 500] }),
      post: operation('Users', 'Create a user', 201, response('New user', data(ref('User'))),
        { body: 'CreateUser', errors: [400, 409, 413, 500] }),
    },
    '/api/users/{id}': {
      get: operation('Users', 'Get a user with their posts', 200, response('User and posts', data(ref('UserWithPosts'))),
        { params: pathId, description: 'Posts are ordered newest first.', errors: [400, 404, 500] }),
      patch: operation('Users', 'Edit a user profile', 200, response('Updated user', data(ref('User'))),
        { params: pathId, body: 'UpdateUser', errors: [400, 404, 409, 413, 500] }),
      delete: operation('Users', 'Delete a user', 204, response('User and dependent records deleted'),
        { params: pathId, description: 'Also deletes the user’s posts.', errors: [400, 404, 500] }),
    },
    '/api/posts': {
      get: operation('Posts', 'List posts', 200, response('Posts page', paginated(ref('Post'))),
        { params: [...pagination,
            query('search', 'Title substring, case-insensitive', { type: 'string', maxLength: 200 }),
            query('published', 'Publication status', { type: 'boolean' }),
            query('authorId', 'Author ID', id)], errors: [400, 500] }),
      post: operation('Posts', 'Create a post', 201, response('New post', data(ref('Post'))),
        { body: 'CreatePost', description: 'Pass the ID of an existing user as authorId. Tag names are reused or created.', errors: [400, 404, 409, 413, 500] }),
    },
    '/api/posts/{id}': {
      get: operation('Posts', 'Get a post with author and tags', 200, response('Post', data(ref('Post'))),
        { params: pathId, errors: [400, 404, 500] }),
      patch: operation('Posts', 'Edit a post', 200, response('Updated post', data(ref('Post'))),
        { params: pathId, body: 'UpdatePost', description: 'A supplied tags array replaces the current tags.', errors: [400, 404, 409, 413, 500] }),
      delete: operation('Posts', 'Delete a post', 204, response('Post deleted'),
        { params: pathId, errors: [400, 404, 500] }),
    },
  },
  components: {
    schemas: {
      User: object({ id, email, name, role, createdAt: isoDate }),
      Tag: object({ id, name: { type: 'string' } }),
      PostSummary: object({ id, title: postInput.title, content: postInput.content, published: postInput.published, createdAt: isoDate, authorId: id }),
      Post: { allOf: [ref('PostSummary'), object({ author: ref('User'), tags: list(ref('Tag')) })] },
      UserWithPosts: { allOf: [ref('User'), object({ posts: list(ref('PostSummary')) })] },
      Meta: object({ total: { type: 'integer', minimum: 0 }, page: id, limit: id, pages: { type: 'integer', minimum: 0 } }),
      CreateUser: object({ email, name, role }, ['email', 'name']),
      UpdateUser: { ...object({ email, name, role }, []), minProperties: 1 },
      CreatePost: object({ ...postInput, authorId: id }, ['title', 'authorId']),
      UpdatePost: { ...object({ ...postInput, authorId: id }, []), minProperties: 1 },
      Error: object({ error: object({ message: { type: 'string' }, details: list({ type: 'string' }) }, ['message']) }),
    },
    responses: Object.fromEntries([
      [400, 'Invalid input'], [404, 'Not found'],
      [409, 'Conflict'], [413, 'Request body too large'],
      [500, 'Internal error'],
    ].map(([status, description]) => ['Error' + status, response(description, ref('Error'))])),
  },
};

module.exports = doc;
