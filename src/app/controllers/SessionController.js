import jwt from 'jsonwebtoken';
import * as Yup from 'yup';
import User from '../models/User';

import authConfig from '../../config/auth';

class SessionController {
  async store(request, response) {
    const shema = Yup.object().shape({
      email: Yup.string()
        .email()
        .required(),
      password: Yup.string().required(),
    });

    if (!(await shema.isValid(request.body))) {
      return response.status(400).json({ error: 'validations fails' });
    }

    const { email, password } = request.body;
    const user = await User.findOne({ where: { email } });

    if (!user) {
      response.status(401).json({ error: 'User not found' });
    }

    if (!(await user.checkPassword(password))) {
      response.status(401).json({ error: 'Password does not match' });
    }

    const { id, name } = user;
    return response.json({
      user: {
        id,
        name,
        email,
      },
      token: jwt.sign({ id }, authConfig.secret, {
        expiresIn: authConfig.expiresIn,
      }),
    });
  }
}

export default new SessionController();
