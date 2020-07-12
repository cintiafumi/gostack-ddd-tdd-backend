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

## Estrutura de notificações
Vamos utilizar o `TypeORM` também, então, vamos modificar um pouco o arquivo `ormconfig.json`
```json
[
  {
    "name": "default",
    "type": "postgres",
    "host": "localhost",
    "port": "5432",
    "username": "postgres",
    "password": "docker",
    "database": "gostack_gobarber",
    "entities": [
      "./src/modules/**/infra/typeorm/entities/*.ts"
    ],
    "migrations": [
      "./src/shared/infra/typeorm/migrations/*.ts"
    ],
    "cli": {
      "migrationsDir": "./src/shared/infra/typeorm/migrations"
    }
  },
  {
    "name": "mongo",
    "type": "mongodb",
    "host": "localhost",
    "port": "27017",
    "database": "gobarber",
    "useUnifiedTopology": true,
    "entities": [
      "./src/modules/**/infra/typeorm/schemas/*.ts"
    ]
  }
]
```

Também precisamos inicializar a conexão na infra `@shared/infra/typeorm/index.ts`
```ts
import { createConnections } from 'typeorm';
createConnections();
```

E adicionamos a biblioteca `mongodb` no projeto
```bash
yarn add mongodb
```

E então rodamos a aplicação para ver se a conexão deu tudo certo.
```bash
yarn dev:server
```

Vamos criar um novo módulo chamado `notifications` com o seguinte esquema de pastas.
```
modules
  notifications
    dtos
    infra
      typeorm
        schemas
    repositories
    services
```

E dentro do nosso `schema` vamos criar a entidade `Notification.ts`
```ts
import {
  Column,
  CreateDateColumn,
  Entity,
  ObjectID,
  ObjectIdColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('notifications')
class Notification {
  @ObjectIdColumn()
  id: ObjectID;

  @Column()
  content: string;

  @Column('uuid')
  recipient_id: string;

  @Column({ default: false })
  read: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}

export default Notification;
```

Vamos criar nosso `INotificationsRepository` que por enquanto só terá o método `create`
```ts
import ICreateNotificationDTO from '../dtos/ICreateNotificationDTO';
import Notification from '../infra/typeorm/schemas/Notification';

export default interface INotificationsRepository {
  create(data: ICreateNotificationDTO): Promise<Notification>;
}
```

Criamos também o `ICreateNotificationDTO` que só terá o `content` e o `recipient_id`
```ts
export default interface ICreateNotificationDTO {
  content: string;
  recipient_id: string;
}
```

Dentro da pasta `typeorm` também criamos nosso `repositories/NotificationsRepository.ts` que vai mudar agora para usar `getMongoRepository` e `MongoRepository`, além de ter que passar no segundo parâmetro o nome do banco. Antes, no Postgres, o nome estava como 'default' e por isso, não precisávamos dizer qual banco era para usar.
```ts
import { getMongoRepository, MongoRepository } from 'typeorm';

import INotificationsRepository from '@modules/notifications/repositories/INotificationsRepository';
import ICreateNotificationDTO from '@modules/notifications/dtos/ICreateNotificationDTO';

import Notification from '../schemas/Notification';

class NotificationsRepository implements INotificationsRepository {
  private ormRepository: MongoRepository<Notification>;

  constructor() {
    this.ormRepository = getMongoRepository(Notification, 'mongo');
  }

  public async create({
    content,
    recipient_id,
  }: ICreateNotificationDTO): Promise<Notification> {
    const notification = this.ormRepository.create({
      content,
      recipient_id,
    });

    await this.ormRepository.save(notification);

    return notification;
  }
}

export default NotificationsRepository;
```

## Enviando notificações
Para começarmos a enviar as notificações, vamos registrar no container da aplicação as `Notifications`
```ts
//...
import INotificationsRepository from '@modules/notifications/repositories/INotificationsRepository';
import NotificationsRepository from '@modules/notifications/infra/typeorm/repositories/NotificationsRepository';
//...
container.registerSingleton<INotificationsRepository>(
  'NotificationsRepository',
  NotificationsRepository,
);
```

Precisaremos enviar a notificação quando o usuário criar um novo appointment. Então, precisamos injetar o `INotificationRepository` dentro de `CreateAppointmentService`
```ts
class CreateAppointmentService {
  constructor(
    @inject('AppointmentsRepository')
    private appointmentsRepository: IAppointmentsRepository,

    @inject('NotificationsRepository')
    private notificationsRepository: INotificationsRepository,
  ) {}

  public async execute({
    date,
    provider_id,
    user_id,
  }: IRequest): Promise<Appointment> {
    //...
    const formattedDate = format(date, "dd/MM/yyyy 'às' HH:mm'h'");

    await this.notificationsRepository.create({
      recipient_id: provider_id,
      content: `Novo agendamento para dia ${formattedDate}`,
    });
```

E vamos testar criando um appointment pelo Insomia e verificamos no MongoDB Compass se apareceu a notificação.

## Refatorando testes
Vamos criar nosso `FakeNotificationsRepository` e precisamos instalar os types do mongodb.
```bash
yarn add -D @types/mongodb
```

```ts
import { ObjectID } from 'mongodb';

import INotificationsRepository from '@modules/notifications/repositories/INotificationsRepository';
import ICreateNotificationDTO from '@modules/notifications/dtos/ICreateNotificationDTO';

import Notification from '../../infra/typeorm/schemas/Notification';

class FakeNotificationsRepository implements INotificationsRepository {
  private notifications: Notification[] = [];

  public async create({
    content,
    recipient_id,
  }: ICreateNotificationDTO): Promise<Notification> {
    const notification = new Notification();

    Object.assign(notification, { id: new ObjectID(), content, recipient_id });

    this.notifications.push(notification);

    return notification;
  }
}

export default FakeNotificationsRepository;
```

E vamos adicionar nos testes de `CreateAppointmentService`
```ts
import FakeNotificationsRepository from '@modules/notifications/repositories/fakes/FakeNotificationsRepository';
import FakeAppointmentsRepository from '../repositories/fake/FakeAppointmentsRepository';
import CreateAppointmentService from './CreateAppointmentService';

let fakeAppointmentsRepository: FakeAppointmentsRepository;
let fakeNotificationsRepository: FakeNotificationsRepository;
let createAppointment: CreateAppointmentService;

describe('CreateAppointment', () => {
  beforeEach(() => {
    fakeAppointmentsRepository = new FakeAppointmentsRepository();
    fakeNotificationsRepository = new FakeNotificationsRepository();
    createAppointment = new CreateAppointmentService(
      fakeAppointmentsRepository,
      fakeNotificationsRepository,
    );
  });
```

Rodamos os testes e verificamos se está tudo passando.

# Personalizando para produção
## Validando dados
Vamos fazer as validações dos campos na hora do PUT e POST das nossas rotas. Vamos instalar o pacote `celebrate`
```bash
yarn add celebrate
```

Vamos validar a rota de criação de appointments. Também precisaremos importar os types do joi
```bash
yarn add -D @type/hapi__joi
```

```ts
appointmentsRouter.post(
  '/',
  celebrate({
    [Segments.BODY]: {
      provider_id: Joi.string().uuid().required(),
      date: Joi.date(),
    },
  }),
  appointmentsController.create,
);
```

E podemos testar no Insomnia. Para tratar o erro, vamos até nosso `server.ts` e vamos importar de dentro do `celebrate` os `errors` para colocar antes do nosso global exception.
```ts
import { errors } from 'celebrate';
//...
app.use(errors());
```

Testamos de novo para ver o erro.

Agora vamos para outras rotas. Faremos a validação do `provider_id` que tem que estar nos `params`.
```ts
providersRouter.get(
  '/:provider_id/month-availability',
  celebrate({
    [Segments.PARAMS]: {
      provider_id: Joi.string().uuid().required(),
    },
  }),
  providerMonthAvailabilityController.index,
);
providersRouter.get(
  '/:provider_id/day-availability',
  celebrate({
    [Segments.PARAMS]: {
      provider_id: Joi.string().uuid().required(),
    },
  }),
  providerDayAvailabilityController.index,
);
```

Nas rotas de reset de senha
```ts
passwordRouter.post(
  '/forgot',
  celebrate({
    [Segments.BODY]: {
      email: Joi.string().email().required(),
    },
  }),
  forgotPasswordController.create,
);
passwordRouter.post(
  '/reset',
  celebrate({
    [Segments.BODY]: {
      token: Joi.string().uuid().required(),
      password: Joi.string().required(),
      password_confirmation: Joi.string().required().valid(Joi.ref('password')),
    },
  }),
  resetPasswordController.create,
);
```

```ts
profileRouter.put(
  '/',
  celebrate({
    [Segments.BODY]: {
      name: Joi.string().required(),
      email: Joi.string().email().required(),
      old_password: Joi.string(),
      password: Joi.string(),
      password_confirmation: Joi.string().valid(Joi.ref('password')),
    },
  }),
  profileController.update,
);
```

```ts
sessionsRouter.post(
  '/',
  celebrate({
    [Segments.BODY]: {
      email: Joi.string().email().required(),
      password: Joi.string().required(),
    },
  }),
  sessionsController.create,
);
```

```ts
usersRouter.post(
  '/',
  celebrate({
    [Segments.BODY]: {
      name: Joi.string().required(),
      email: Joi.string().email().required(),
      password: Joi.string().required(),
    },
  }),
  usersController.create,
);
```
