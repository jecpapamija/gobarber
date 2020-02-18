import * as Yup from 'yup';
import { startOfHour, parseISO, isBefore, format, subHours } from 'date-fns';
import pt from 'date-fns/locale/pt';
import Appointment from '../models/Appointment';
import User from '../models/User';
import File from '../models/File';
import Notification from '../schemas/Notification';

import CancellationMail from '../jobs/CancellationMail';
import Queue from '../../lib/Queue';

class AppointmentController {
  async index(request, response) {
    const { page = 1 } = request.query;
    const appointments = await Appointment.findAll({
      where: { user_id: request.userId, canceled_at: null },
      order: ['date'],
      attributes: ['id', 'date', 'past'],
      limit: 20,
      offset: (page - 1) * 20,
      include: [
        {
          model: User,
          as: 'provider',
          attributes: ['id', 'name'],
          include: [
            {
              model: File,
              as: 'avatar',
              attributes: ['path', 'url', 'id', 'name'],
            },
          ],
        },
      ],
    });
    return response.json(appointments);
  }

  async store(request, response) {
    const shema = Yup.object().shape({
      provider_id: Yup.number().required(),
      date: Yup.date().required(),
    });

    if (!(await shema.isValid(request.body))) {
      return response.status(400).json({ error: 'validations fails' });
    }

    const { provider_id, date } = request.body;

    /* check the usser is a provider */
    const isProvider = await User.findOne({
      where: { id: provider_id, provider: true },
    });

    if (!isProvider) {
      return response.status(401).json({ error: 'user is no provider' });
    }

    /* Check same appointment in hour */
    const hourStart = startOfHour(parseISO(date));
    if (isBefore(hourStart, new Date())) {
      return response
        .status(400)
        .json({ error: 'Past dates are not permitted' });
    }

    /* Check Availability */
    const checkAvailability = await Appointment.findOne({
      where: {
        provider_id,
        canceled_at: null,
        date: hourStart,
      },
    });

    if (checkAvailability) {
      return response
        .status(400)
        .json({ error: 'Appointment date is not available' });
    }

    /* Create Appointment */
    const appointment = await Appointment.create({
      user_id: request.userId,
      provider_id,
      date: hourStart,
    });

    /* Notify Appointment user */
    const user = await User.findByPk(request.userId);
    const fomarmatedDate = format(
      hourStart,
      "'dia' dd 'de' MMM', as 'H:mm'h'",
      {locale: pt}
    );

    await Notification.create({
      content: `Novo agendamento de ${user.name} para ${fomarmatedDate}`,
      user: provider_id,
    });

    return response.json(appointment);
  }

  async delete(request, response) {
    const appointment = await Appointment.findByPk(request.params.id, {
      include: [
        {
          model: User,
          as: 'provider',
          attributes: ['name', 'email'],
        },
        {
          model: User,
          as: 'user',
          attributes: ['name'],
        }
      ],
    });

    if (appointment.provider_id !== request.userId) {
      return response.status(401).json({
        error: 'You dont have permission to update'});
    }

    const dateWithSub = subHours(appointment.date, 2);
    if (isBefore(dateWithSub, new Date())) {
      return response.status(400).json({
        error: 'the date limited is 2 hour before the appointment'});
    }

    appointment.canceled_at = new Date();

    await appointment.save();

    await Queue.add(CancellationMail.key, {
      appointment,
    });

    return response.json(appointment);
  }
}

export default new AppointmentController();
