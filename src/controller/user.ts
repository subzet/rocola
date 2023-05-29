import Router from 'express-promise-router';
import * as s from 'superstruct';

import { validate } from '../middleware';
import { userService } from '../service/user';

const router = Router();

const getUserSchema = {
  params: s.object({
    id: s.string(),
  }),
};

router.get('/:id', validate(getUserSchema), async (request, response) => {
  const id = request.params.id;

  const user = await userService.findById(id);

  return response.status(200).send(user);
});

const getUserByEmailSchema = {
  query: s.object({
    email: s.string(),
  }),
};

router.get('/', validate(getUserByEmailSchema), async (request, response) => {
  const email = request.query.email;

  const user = await userService.findByEmail(email as string);

  return response.status(200).send(user);
});

const createUserSchema = {
  body: s.object({
    name: s.string(),
    email: s.string(),
  }),
};

router.post('/', validate(createUserSchema), async (request, response) => {
  const { name, email } = request.body;

  const user = await userService.create({ name, email, active: false });

  return response.status(200).send(user);
});

export default router;
