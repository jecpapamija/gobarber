import * as Yup from 'yup';
import User from '../models/User';

class UserController {
  async store(req, res) {
    const shema = Yup.object().shape({
      name: Yup.string().required(),
      email: Yup.string()
        .email()
        .required(),
      password: Yup.string()
        .required()
        .min(6),
    });

    if (!(await shema.isValid(req.body))) {
      return res.status(400).json({ error: 'validations fails' });
    }

    const usertExits = await User.findOne({ where: { email: req.body.email } });
    if (usertExits) {
      return res.status(400).json({ error: 'user already exists' });
    }
    const { id, name, email, provider } = await User.create(req.body);
    return res.json({ id, name, email, provider });
  }

  async update(request, response) {
    const shema = Yup.object().shape({
      name: Yup.string(),
      email: Yup.string().email(),
      oldpassword: Yup.string().min(6),
      password: Yup.string()
        .min(6)
        .when('oldPassword', (oldPassword, field) =>
          oldPassword ? field.required() : field
        ),
      confirmPassword: Yup.string().when('password', (password, field) =>
        password ? field.required().oneOf([Yup.ref('password')]) : field
      ),
    });

    if (!(await shema.isValid(request.body))) {
      return response.status(400).json({ error: 'validations fails' });
    }

    const { email, oldPassword } = request.body;

    const user = await User.findByPk(request.userId);

    if (email && email !== user.email) {
      const usertExits = await User.findOne({ where: { email } });
      if (usertExits) {
        return response.status(400).json({ error: 'user already exists' });
      }
    }

    if (oldPassword && !(await user.checkPassword(oldPassword))) {
      return response.status(401).json({ error: 'password does not match' });
    }

    const { id, name, provider, avatar_id } = await user.update(request.body);

    return response.json({ id, name, email, provider, avatar_id });
  }
}

export default new UserController();
