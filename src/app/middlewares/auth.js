import jwt from 'jsonwebtoken';
import { promisify } from 'util';
import authConfig from '../../config/auth';

export default async (request, response, next) => {
  const authHeader = request.headers.authorization;

  if (!authHeader) {
    return response.status(401).json({ error: 'token not provided' });
  }

  const [, token] = authHeader.split(' ');

  try {
    const decode = await promisify(jwt.verify)(token, authConfig.secret);
    request.userId = decode.id;
    return next();
  } catch (err) {
    return response.status(401).json({ eror: 'Token Invalid' });
  }
};
