import { isEqual } from 'date-fns';
import Appointment from '../models/Appointment';

interface CreateAppointment {
  provider: string;
  date: Date;
}

class AppointmentsRepository {
  private appointments: Appointment[];

  constructor() {
    this.appointments = [];
  }

  /**
   * List all appointments
   */
  public all(): Appointment[] {
    return this.appointments;
  }

  /**
   * find an appointment by given date
   */
  public findByDate(date: Date): Appointment | null {
    const findAppointment = this.appointments.find(appointment =>
      isEqual(date, appointment.date),
    );

    return findAppointment || null;
  }

  /**
   * create new appointment
   */
  public create({ provider, date }: CreateAppointment): Appointment {
    const appointment = new Appointment({ provider, date });

    this.appointments.push(appointment);

    return appointment;
  }
}

export default AppointmentsRepository;
