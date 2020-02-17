import { startOfDay, endOfDay, parseISO } from 'date-fns';
import { Op } from 'sequelize';
import Appointment from '../models/Appointment';
import User from '../models/User';

class ScheduleController {
  async index(request, response) {
    /* check the usser is a provider */
    const isProvider = await User.findOne({
      where: { id: request.userId, provider: true },
    });

    if (!isProvider) {
      return response.status(401).json({ error: 'user is no a provider' });
    }

    const { date } = request.query;
    const parsedDate = parseISO(date);

    const appointments = await Appointment.findAll({
      where: {
        provider_id: request.userId,
        date: {
          [Op.between]: [startOfDay(parsedDate), endOfDay(parsedDate)],
        },
      },
      order: ['date'],
    });

    return response.json(appointments);
  }
}

export default new ScheduleController();
