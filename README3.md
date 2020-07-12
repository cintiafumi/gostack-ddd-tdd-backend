[↩ Voltar](README.md)

# Finalizando o backend do app
## Agenda do prestador
Para o prestador ver sua agenda, vamos criar o service `ListProviderAppointmentsService`.
```ts
import { injectable, inject } from 'tsyringe';

import Appointment from '../infra/typeorm/entities/Appointment';
import IAppointmentsRepository from '../repositories/IAppointmentsRepository';

interface IRequest {
  provider_id: string;
  day: number;
  month: number;
  year: number;
}

@injectable()
class ListProviderAppointmentsService {
  constructor(
    @inject('AppointmentsRepository')
    private appointmentsRepository: IAppointmentsRepository,
  ) {}

  public async execute({
    provider_id,
    year,
    month,
    day,
  }: IRequest): Promise<Appointment[]> {
    const appointments = await this.appointmentsRepository.findAllInDayFromProvider(
      {
        provider_id,
        year,
        month,
        day,
      },
    );

    return appointments;
  }
}

export default ListProviderAppointmentsService;
```

E seu teste
```ts
import FakeAppointmentsRepository from '@modules/appointments/repositories/fake/FakeAppointmentsRepository';
import ListProviderAppointmentsService from './ListProviderAppointmentsService';

let fakeAppointmentsRepository: FakeAppointmentsRepository;
let listProviderAppointments: ListProviderAppointmentsService;

describe('ListProviderAppointments', () => {
  beforeEach(() => {
    fakeAppointmentsRepository = new FakeAppointmentsRepository();
    listProviderAppointments = new ListProviderAppointmentsService(
      fakeAppointmentsRepository,
    );
  });

  it('should be able to list the appointments from provider on an especific day', async () => {
    const appointment1 = await fakeAppointmentsRepository.create({
      provider_id: 'provider',
      user_id: 'user',
      date: new Date(2020, 4, 20, 14, 0, 0),
    });

    const appointment2 = await fakeAppointmentsRepository.create({
      provider_id: 'provider',
      user_id: 'user',
      date: new Date(2020, 4, 20, 15, 0, 0),
    });

    const appointments = await listProviderAppointments.execute({
      provider_id: 'provider',
      year: 2020,
      month: 5,
      day: 20,
    });

    expect(appointments).toEqual([appointment1, appointment2]);
  });
});
```

Vamos fazer seu controller
```ts
import { Request, Response } from 'express';
import { container } from 'tsyringe';

import ListProviderAppointmentsService from '@modules/appointments/services/ListProviderAppointmentsService';

export default class ProviderAppointmentsController {
  public async index(request: Request, response: Response): Promise<Response> {
    const provider_id = request.user.id;
    const { day, month, year } = request.body;

    const listProviderAppointments = container.resolve(
      ListProviderAppointmentsService,
    );

    const appointments = await listProviderAppointments.execute({
      provider_id,
      year,
      month,
      day,
    });

    return response.json(appointments);
  }
}
```

E nossa rota em `appointments.route`
```ts
import ProviderAppointmentsController from '../controllers/ProviderAppointmentsController';
//...
const providerAppointmentsController = new ProviderAppointmentsController();
//...
appointmentsRouter.get('/me', providerAppointmentsController.index);
```

Rodamos a aplicação e vamos testar no Insomnia.

## Configurando MongoDB
Vamos usar 3 banco de dados diferentes somente para aprendizado. No MongoDB, não temos migrations. Utilizamos muito para Notificações.

Como estamos utilizando docker, vamos criar nosso MongoDB pelo docker.
```bash
docker run --name mongodb -p 27017:27017 -d -t mongo
```
E quando já tivermos criado, podemos só rodar.
```bash
docker start mongodb
```
Como não conseguimover ver o MongoDB pelo DBeaver, vamos baixar o Compass. Abrimos o Compass e vamos abrir nova connection e escrevemos.
```
mongodb://localhost:27017
```
No Mongo, não chamamos de _registros_ e _tabela_, chamamos de _documentos_ e _schemas_.
