import {
  startOfDay,
  endOfDay,
  setSeconds,
  setMinutes,
  setHours,
  format,
  isAfter } from 'date-fns';
import { Op } from 'sequelize';
import Appointment from '../models/Appointment';

class AvailableController {
  async index(request, response) {
    const { date } = request.query;

    if (!date) {
      return response.status(400).json({ error: 'date is required' });
    }

    const searchDate = Number(date);

    const appointment = await Appointment.findAll({
      where: {
        provider_id: request.params.providerId,
        canceled_at: null,
        date: {
          [Op.between]: [startOfDay(searchDate), endOfDay(searchDate)],
        },
      },
    });

    const schedule = [
      '08:00',
      '09:00',
      '10:00',
      '11:00',
      '12:00',
      '13:00',
      '14:00',
      '15:00',
      '16:00',
      '17:00',
      '18:00',
    ];

    const avaible = schedule.map(time => {
      const [hour, minutes] = time.split(':');
      const value = setSeconds(
        setMinutes(setHours(searchDate, hour), minutes),
        0
      );

      return {
        time,
        value: format(value, "yyyy-MM-dd'T'HH:mm:ssxxx"),
        avaible:
          isAfter(value, new Date()) &&
          !appointment.find(a => format(a.date, 'HH:mm') === time),
      };
    });

    return response.json(avaible);
  }
}

export default new AvailableController();
