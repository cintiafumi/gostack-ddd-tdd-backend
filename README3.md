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

## Variáveis ambiente
Criamos o arquivo `.env` na raiz do projeto e colocamos informações que não podem ficar disponíveis por aí ou que tenham diferença quando for ambiente de desenvolvimento e ambiente de produção.
```
APP_SECRET=
```
E também deixamos no `.gitignore` para não subirmos esse arquivo para o repositório público.

Vamos instalar o pacote `dotenv`
```bash
yarn add dotenv
```
Importamos lá no nosso `server.ts`
```ts
import 'dotenv/config';
```
E para isso, precisamos importar um arquivo `js`, por isso, precisamos adicionar no nosso `tsconfig` mais uma informação
```json
    "allowJs": true,
```
E voltando no nosso `config/auth`, conseguimos acessar a variável de ambiente
```ts
export default {
  jwt: {
    secret: process.env.APP_SECRET,
    expiresIn: '1d',
  },
};
```

Outro dado que podemos colocar é a url do nosso frontend que usamos no service `SendForgotPasswordEmailService`
```
APP_WEB_URL=http://localhost:3000
```

Para que outros possam saber quais variáveis estão no nosso `.env`, criamos um `.env.example` que vai subir para o github e removemos todos os dados sensíveis dele.

O arquivo `ormconfig.json` também é bom a gente deixar no `.gitignore`. Como já subimos no github, temos que remover ele do cache
```bash
git rm --cached ormconfig.json
```
Fazemos isso pois o banco de dados no ambiente de desenvolvimento e de produção serão bem diferentes.

## Utilizando Class Transformer
Vamos adicionar esse pacote
```bash
yarn add class-transformer
```
Usamos essa ferramenta para, por exemplo, quando enviamos o campo `password` para nosso front-end, não queremos mostrar isso. Então, precisamos transformar esses dados antes de enviá-los. Outra situação é que enviamos a url inteira de onde está nosso avatar do usuário.

Então, vamos fazer isso dentro das nossas `entities`
```ts
import { Exclude, Expose } from 'class-transformer';
@Entity('users')
export default class User {
//...
  @Column()
  @Exclude()
  password: string;
  //...
  @Expose({ name: 'avatar_url' })
  getAvatarUrl(): string | null {
    return this.avatar
      ? `${process.env.APP_API_URL}/files/${this.avatar}`
      : null;
  }
}
```

E vamos adicionar essa informação dentro do nosso `SessionsController` para que exclua o password e mostre a url do avatar.
```ts
import { classToClass } from 'class-transformer';
//...
export default class SessionsController {
  public async create(request: Request, response: Response): Promise<Response> {
    //...
    return response.json({ user: classToClass(user), token });
  }
}
```
E fazemos isso em todos os controllers que retornar o `user`. Removendo sempre essa linha do código e colocando `classToClass(user)` na hora de retornar.
```ts
// delete user.password;
return response.json(classToClass(user));
```

## Emails pelo Amazon SES
Vamos configurar algumas coisas do ambiente de produção da nossa aplicação. Para envio de e-mail em produção, temos: Spark Post, Mailgun, Mailchimp, e vamos usar o AmazonSES. Precisamos ter um domínio próprio.

Vamos entrar no console da Amazon e precisamos configurar o DNS e uma conta de email desse domínio (pode ser criado no Zoho, por exemplo) que temos lá no serviço SES da Amazon. Vamos usar o SMTP, mas esse tipo de serviço de envio de e-mail não é aconselhado para envio de batch de email. Porque ele sobe um servidor, envia o email e depois fecha o servidor.

Criamos o arquivo `mail.ts` dentro da pasta `config`
```ts
interface IMailConfig {
  driver: 'ethereal' | 'ses';
}

export default {
  driver: process.env.MAIL_DRIVER || 'ethereal',
} as IMailConfig;
```

Criamos nosso `SESMailProvider` bem simples e com a estrutura muito similar ao do `EtherealMailProvider` somente para testar.
```ts
import { injectable, inject } from 'tsyringe';
import nodemailer, { Transporter } from 'nodemailer';

import IMailTemplateProvider from '@shared/container/providers/MailTemplateProvider/models/IMailTemplateProvider';
import IMailProvider from '../models/IMailProvider';
import ISendMailDTO from '../dto/ISendMailDTO';

@injectable()
export default class SESMailProvider implements IMailProvider {
  private client: Transporter;

  constructor(
    @inject('MailTemplateProvider')
    private mailTemplateProvider: IMailTemplateProvider,
  ) {}

  public async sendMail({
    to,
    from,
    subject,
    templateData,
  }: ISendMailDTO): Promise<void> {
    console.log('Funcionou');
  }
}
```

Adicionamos a variável `MAIL_DRIVER=ses` em `.env`

Rodamos a aplicação e enviamos um email pelo Insomnia só para vermos o `console.log('Funcionou')`.

Podemos usar o Nodemailer com o SES, então, olhando a [documentação](https://nodemailer.com/transports/ses/), precisamos instalar o `aws-sdk`

Adicionamos nosso nome e email em `mailConfig`
```ts
interface IMailConfig {
  driver: 'ethereal' | 'ses';
  defaults: {
    from: {
      email: string;
      name: string;
    };
  };
}

export default {
  driver: process.env.MAIL_DRIVER || 'ethereal',

  defaults: {
    from: {
      email: 'cintiafumi@gmail.com',
      name: 'Cintia Fumi da CintiaFumi',
    },
  },
} as IMailConfig;
```

E no nosso provider, adicionamos essa parte de configuração do nosso email.
```ts
//...
import aws from 'aws-sdk';
import mailConfig from '@config/mail';
//...
export default class SESMailProvider implements IMailProvider {
  private client: Transporter;

  constructor(
    @inject('MailTemplateProvider')
    private mailTemplateProvider: IMailTemplateProvider,
  ) {}

  public async sendMail({
    to,
    from,
    subject,
    templateData,
  }: ISendMailDTO): Promise<void> {
    const { email, name } = mailConfig.defaults.from;

    this.client = nodemailer.createTransport({
      SES: new aws.SES({
        apiVersion: '2010-12-01',
        region: 'us-east-1',
      }),
    });

    await this.client.sendMail({
      from: {
        name: from?.name || name,
        address: from?.email || email,
      },
      to: {
        name: to.name,
        address: to.email,
      },
      subject,
      html: await this.mailTemplateProvider.parse(templateData),
    });
  }
```

No `.env`, precisamos colocar nossas credential keys da AWS
```
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
```

E dentro da AWS,
- vamos no IAM,
- adicionamos um `User` com `access type` sendo `Programmatic access`
- `Attach existing policies directly`
- filtrar `policies` por `ses`
- escolhemos `AmazonSESFullAccess`
- clica `Next tags`, `Next review` e `Create user`
- copio a `access key id` e `secret access key`

(Não testei a aplicação, mas teria que enviar o email pelo Insomnia e cair no meu email real)

## Organizando o container
Criamos um `index.ts` dentro de `container/providers/MailProvider` para que não fique esse monte de `if` dentro do código para ver qual variável de ambiente que estamos.
```ts
import { container } from 'tsyringe';
import mailConfig from '@config/mail';

import IMailProvider from './models/IMailProvider';

import EtherealMailProvider from './implementations/EtherealMailProvider';
import SESMailProvider from './implementations/SESMailProvider';

const providers = {
  ethereal: container.resolve(EtherealMailProvider),
  ses: container.resolve(SESMailProvider),
};

container.registerInstance<IMailProvider>(
  'MailProvider',
  providers[mailConfig.driver],
);
```

Também isolamos o container do `MailTemplateProvider/index.ts`
```ts
import { container } from 'tsyringe';

import IMailTemplateProvider from './models/IMailTemplateProvider';

import HandlebarsMailTemplateProvider from './implementations/HandlebarsMailTemplateProvider';

const providers = {
  handlebars: HandlebarsMailTemplateProvider,
};

container.registerSingleton<IMailTemplateProvider>(
  'MailTemplateProvider',
  providers.handlebars,
);
```

E do `StorageProvider`
```ts
import { container } from 'tsyringe';

import IStorageProvider from './models/IStorageProvider';

import DiskStorageProvider from './implementations/DiskStorageProvider';

const providers = {
  disk: DiskStorageProvider,
};

container.registerSingleton<IStorageProvider>(
  'StorageProvider',
  providers.disk,
);
```

Por fim, só importamos todos eles no `providers/index.ts`
```ts
import './StorageProvider';
import './MailTemplateProvider';
import './MailProvider';
```

Rodamos a aplicação para conferir se está funcionando.
