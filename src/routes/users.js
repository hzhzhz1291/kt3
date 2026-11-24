const { Router } = require('express');
const Joi = require('joi');
const { prisma } = require('../config');
const { validate, idParams, pageFields } = require('../middleware/validate');
const { HttpError } = require('../middleware/errorHandler');
const { paginate } = require('../utils/pagination');

const router = Router();
const fields = {
  email: Joi.string().trim().lowercase().email().max(254),
  name: Joi.string().trim().min(1).max(100),
  role: Joi.string().valid('USER', 'ADMIN'),
};

router.get('/', validate(Joi.object(pageFields), 'query'), async (req, res) => {
  res.json(await paginate(prisma, prisma.user, res.locals.query, { orderBy: { id: 'asc' } }));
});

router.get('/:id', validate(idParams, 'params'), async (req, res) => {
  const user = await prisma.user.findUnique({
    where: res.locals.params,
    include: { posts: { orderBy: [{ createdAt: 'desc' }, { id: 'desc' }] } },
  });
  if (!user) throw new HttpError(404, 'User not found');
  res.json({ data: user });
});

router.post('/', validate(Joi.object({ ...fields, email: fields.email.required(), name: fields.name.required() })), async (req, res) => {
  const user = await prisma.user.create({ data: res.locals.body });
  res.location('/api/users/' + user.id).status(201).json({ data: user });
});

router.patch('/:id', validate(idParams, 'params'), validate(Joi.object(fields).min(1)), async (req, res) => {
  const user = await prisma.user.update({ where: res.locals.params, data: res.locals.body });
  res.json({ data: user });
});

router.delete('/:id', validate(idParams, 'params'), async (req, res) => {
  await prisma.user.delete({ where: res.locals.params });
  res.sendStatus(204);
});

module.exports = router;
