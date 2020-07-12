[↩ Voltar](README.md)

# Agendamento
## Listagem de prestadores
Lembrando o mapeamento de requisitos e regra de negócios que fizemos anteriormente.

### Funcionalidade macros
#### Painel do Prestador
  - **RF (Requisitos Funcionais)**
    - O prestador deve poder listar seus agendamentos de um dia específico
    - O prestador deve receber uma notificação sempre que houver um novo agendamento
    - O prestador deve poder visualizar as notificações não lidas

  - **RNF (Requisitos Não-Funcionais)**
    - Os agendamentos do prestador no dia devem ser armazenados em cache
    - As notificações do prestador devem ser armazenadas no MongoDB
    - As notificações do prestador devem ser enviadas em tempo real utilizando Socket.io

  - **RN (Regra de Negócios)**
    - A notificação deve ter um status de *lida* ou *não-lida* para que o prestador possa controlar


#### Agendamento de serviços
  - **RF (Requisitos Funcionais)**
    - O usuário deve poder listar todos prestadores de serviço cadastrado
    - O usuário deve poder listar os dias de um mês com pelo menos um horário disponível de um prestador
    - O usuário deve poder listar os horários disponíveis em um dia específico de um prestador
    - O usuário deve poder realizar um novo agendamento com um prestador


  - **RNF (Requisitos Não-Funcionais)**
    - A listagem de prestadores de serviço deve ser armazenada em cache

  - **RN (Regra de Negócios)**
    - Cada agendamento deve durar 1h exatamente
    - Os agendamentos devem estar disponíveis entre 8h e 18h (primeiro às 8h e último às 17h)
    - O usuário não pode agendar num horário já ocupado
    - O usuário não pode agendar num horário que já passou
    - O usuário não pode agendar serviços consigo mesmo

Vamos começar com _"O usuário deve poder listar todos prestadores de serviço cadastrado"_. E ao invés de colocar no mesmo `UsersController`, vamos colocar em outro controller, pois temos que excluir da listagem o próprio usuário logado. Tanto, que ele não pode agendar um horário com ele mesmo. Essa listagem faria sentido para um Admin, aí isso faria sentido estar no `UsersController`. E essa parte de prestadores de serviço está mais associada ao módulo de agendamentos do que de users. O Domínio é de agendamentos.

Começamos criando nosso service `ListProvidersService` e copiamos com a estrutura de `ShowProfileService`. Como o `IUsersRepository` não tem nenhum método que lista todos os usuários menos o que está logado, vamos criar um método novo `findAllProviders` nesse repositório.
```ts
export default interface IUsersRepository {
  findAllProviders(except_user_id: string): Promise<User[]>;
```

E daí, temos que arrumar nos outros arquivos: `FakeUsersRepository`.
```ts
  public async findAllProviders(except_user_id?: string): Promise<User[]> {
    let { users } = this;

    if (except_user_id) {
      users = this.users.filter(user => user.id !== except_user_id);
    }

    return users;
  }
```

Arrumamos também no `UsersRepository` que conecta com o banco.
```ts
  public async findAllProviders(except_user_id: string): Promise<User[]> {
    let users: User[];

    if (except_user_id) {
      users = await this.ormRepository.find({
        where: {
          id: Not(except_user_id),
        },
      });
    } else {
      users = await this.ormRepository.find();
    }

    return users;
  }
```

Voltando em `ListProvidersService` vemos que não fica intuitivo chamar o método passando `user_id` em `this.usersRepository.findAllProviders(user_id)`. Então, vamos criar mais um `dto` para então passar o parâmetro como o objeto.
```ts
export default interface IFindAllProvidersDTO {
  except_user_id?: string;
}
```
E
```ts
import IFindAllProvidersDTO from '../dtos/IFindAllProvidersDTO';
export default interface IUsersRepository {
  findAllProviders(data: IFindAllProvidersDTO): Promise<User[]>;
```

Agora, arrumamos novamente os repositories `UsersRepository` e `FakeUsersRepository`.
```ts
import IFindAllProvidersDTO from '@modules/users/dtos/IFindAllProvidersDTO';
//...
class FakeUsersRepository implements IUsersRepository {
  //...
  public async findAllProviders({
    except_user_id,
  }: IFindAllProvidersDTO): Promise<User[]> {
    let { users } = this;
    if (except_user_id) {
      users = this.users.filter(user => user.id !== except_user_id);
    }
    return users;
  }
```
E
```ts
import IFindAllProvidersDTO from '@modules/users/dtos/IFindAllProvidersDTO';
//...
class UsersRepository implements IUsersRepository {
  //...
  public async findAllProviders({
    except_user_id,
  }: IFindAllProvidersDTO): Promise<User[]> {
    let users: User[];
    if (except_user_id) {
      users = await this.ormRepository.find({
        where: {
          id: Not(except_user_id),
        },
      });
    } else {
      users = await this.ormRepository.find();
    }
    return users;
  }
```

Vamos criar o teste desse service
```ts
import FakeUsersRepository from '@modules/users/repositories/fake/FakeUsersRepository';
import ListProvidersService from './ListProvidersService';

let fakeUsersRepository: FakeUsersRepository;
let listProviders: ListProvidersService;

describe('ListProviders', () => {
  beforeEach(() => {
    fakeUsersRepository = new FakeUsersRepository();
    listProviders = new ListProvidersService(fakeUsersRepository);
  });

  it('should be able to list providers', async () => {
    const user1 = await fakeUsersRepository.create({
      name: 'John Doe',
      email: 'johndoe@example.com',
      password: '123456',
    });

    const user2 = await fakeUsersRepository.create({
      name: 'John Tre',
      email: 'johntre@example.com',
      password: '123456',
    });

    const loogedUser = await fakeUsersRepository.create({
      name: 'John Qua',
      email: 'johnqua@example.com',
      password: '123456',
    });

    const providers = await listProviders.execute({
      user_id: loogedUser.id,
    });

    expect(providers).toEqual([user1, user2]);
  });
});
```
Testamos.

Vamos criar o `ProvidersController` usando como base o de Appointments.
```ts
import { Request, Response } from 'express';
import { container } from 'tsyringe';

import ListProvidersService from '@modules/appointments/services/ListProvidersService';

export default class ProvidersController {
  public async index(request: Request, response: Response): Promise<Response> {
    const user_id = request.user.id;

    const listProviders = container.resolve(ListProvidersService);

    const providers = await listProviders.execute({
      user_id,
    });

    return response.json(providers);
  }
}
```

Adicionamos a rota `providers.routes` que precisa estar autenticada
```ts
import { Router } from 'express';

import ensureAuthenticated from '@modules/users/infra/http/middlewares/ensureAuthenticated';
import ProvidersController from '../controllers/ProvidersController';

const providersRouter = Router();
const providersController = new ProvidersController();

providersRouter.use(ensureAuthenticated);

providersRouter.get('/', providersController.index);

export default providersRouter;
```

Adicionamos na rota principal
```ts
import providersRouter from '@modules/appointments/infra/http/routes/providers.routes';
//...
routes.use('/providers', providersRouter);
```
Testamos no Insomnia a rota de GET em `/providers` com o token de uma sessão logada.


## Filtrando agendamentos por mês
Vamos para esse requisito: _"O usuário deve poder listar os dias de um mês com pelo menos um horário disponível de um prestador"_.

Vamos criar o service `ListProviderMonthAvailability`
```ts
import { injectable, inject } from 'tsyringe';

interface IRequest {
  user_id: string;
  month: number;
  year: number;
}

type IResponse = Array<{
  day: number;
  available: boolean;
}>;

@injectable()
class ListProviderMonthAvailabilityService {
  constructor() {}

  public async execute({ user_id, year, month }: IRequest): Promise<IResponse> {
    return [{ day: 1, available: false }];
  }
}

export default ListProviderMonthAvailabilityService;
```

E já vamos criar o primeiro teste
```ts
import FakeAppointmentsRepository from '@modules/appointments/repositories/fake/FakeAppointmentsRepository';
import ListProviderMonthAvailabilityService from './ListProviderMonthAvailabilityService';

let fakeAppointmentsRepository: FakeAppointmentsRepository;
let listProviderMonthAvailability: ListProviderMonthAvailabilityService;

describe('ListProviderMonthAvailability', () => {
  beforeEach(() => {
    fakeAppointmentsRepository = new FakeAppointmentsRepository();
    listProviderMonthAvailability = new ListProviderMonthAvailabilityService();
  });

  it('should be able to list the month availability from provider', async () => {
    await fakeAppointmentsRepository.create({
      provider_id: 'user',
      date: new Date(2020, 6, 20, 8, 0, 0),
    });

    await fakeAppointmentsRepository.create({
      provider_id: 'user',
      date: new Date(2020, 6, 20, 10, 0, 0),
    });

    await fakeAppointmentsRepository.create({
      provider_id: 'user',
      date: new Date(2020, 6, 21, 8, 0, 0),
    });

    const availability = await listProviderMonthAvailability.execute({
      user_id: 'user',
      year: 2020,
      month: 7,
    });

    expect(availability).toEqual(
      expect.arrayContaining([
        { date: 19, availability: true },
        { date: 20, availability: false },
        { date: 21, availability: false },
        { date: 22, availability: true },
      ]),
    );
  });
});
```

Para o service, precisaremos listar os appointments, então, injetamos `AppointmentsRepository` como dependência desse service e também precisamos adicionar um método e seu `dto`
```ts
export default interface IFindAllInMonth {
  provider_id: string;
  month: number;
  year: number;
}
```

Importamos no nosso `dto` no método novo `findAllInMonthFromProvider`
```ts
export default interface IAppointmentsRepository {
  //...
  findAllInMonthFromProvider(
    data: IFindAllInMonthFromProviderDTO,
  ): Promise<Appointment[]>;
```

Alteramos também no `FakeAppointmentsRepository`
```ts
class FakeAppointmentsRepository implements IAppointmentsRepository {
  //...
  public async findAllInMonthFromProvider({
    provider_id,
    month,
    year,
  }: IFindAllInMonthFromProviderDTO): Promise<Appointment[]> {
    const appointments = this.appointments.filter(
      appointment =>
        appointment.provider_id === provider_id &&
        getMonth(appointment.date) + 1 === month &&
        getYear(appointment.date) === year,
    );
    return appointments;
  }
```

E vamos no repository do banco
```ts
class AppointmentsRepository implements IAppointmentsRepository {
  //...
  public async findAllInMonthFromProvider({
    provider_id,
    month,
    year,
  }: IFindAllInMonthFromProviderDTO): Promise<Appointment[]> {
    const parsedMonth = String(month).padStart(2, '0');

    const appointments = await this.ormRepository.find({
      where: {
        provider_id,
        date: Raw(
          dateFieldName =>
            `to_char(${dateFieldName}, 'MM-YYYY') = '${parsedMonth}-${year}'`,
        ),
      },
    });
    console.log(appointments);
    return [{ day: 1, available: false }];
  }
```

## Listando dias disponíveis
Melhoramos um pouco o teste, pois precisamos ocupar todos horários de um dia inteiro para que o dia fique indisponível no mês.
```ts
it('should be able to list the month availability from provider', async () => {
    await fakeAppointmentsRepository.create({
      provider_id: 'user',
      date: new Date(2020, 3, 20, 8, 0, 0),
    });

    await fakeAppointmentsRepository.create({
      provider_id: 'user',
      date: new Date(2020, 4, 20, 8, 0, 0),
    });

    await fakeAppointmentsRepository.create({
      provider_id: 'user',
      date: new Date(2020, 4, 20, 9, 0, 0),
    });

    await fakeAppointmentsRepository.create({
      provider_id: 'user',
      date: new Date(2020, 4, 20, 10, 0, 0),
    });

    await fakeAppointmentsRepository.create({
      provider_id: 'user',
      date: new Date(2020, 4, 20, 11, 0, 0),
    });

    await fakeAppointmentsRepository.create({
      provider_id: 'user',
      date: new Date(2020, 4, 20, 12, 0, 0),
    });

    await fakeAppointmentsRepository.create({
      provider_id: 'user',
      date: new Date(2020, 4, 20, 13, 0, 0),
    });

    await fakeAppointmentsRepository.create({
      provider_id: 'user',
      date: new Date(2020, 4, 20, 14, 0, 0),
    });

    await fakeAppointmentsRepository.create({
      provider_id: 'user',
      date: new Date(2020, 4, 20, 15, 0, 0),
    });

    await fakeAppointmentsRepository.create({
      provider_id: 'user',
      date: new Date(2020, 4, 20, 16, 0, 0),
    });

    await fakeAppointmentsRepository.create({
      provider_id: 'user',
      date: new Date(2020, 4, 20, 17, 0, 0),
    });

    await fakeAppointmentsRepository.create({
      provider_id: 'user',
      date: new Date(2020, 4, 21, 8, 0, 0),
    });

    const availability = await listProviderMonthAvailability.execute({
      provider_id: 'user',
      year: 2020,
      month: 5,
    });

    expect(availability).toEqual(
      expect.arrayContaining([
        { day: 19, available: true },
        { day: 20, available: false },
        { day: 21, available: true },
        { day: 22, available: true },
      ]),
    );
  });
```

E a lógica fica então em `ListProviderMonthAvailabilityService`
```ts
//...
    const numberofDaysInMonth = getDaysInMonth(new Date(year, month - 1));

    const eachDayArray = Array.from(
      { length: numberofDaysInMonth },
      (_, index) => index + 1,
    );

    const availability = eachDayArray.map(day => {
      const appointmentsInDay = appointments.filter(appointment => {
        return getDate(appointment.date) === day;
      });
      return {
        day,
        available: appointmentsInDay.length < 10,
      };
    });

    return availability;
  }
```


## Listando horários disponíveis
Agora, vamos verificar os horários disponíveis para um dado dia. Criamos o service `ListProviderDayAvailability` e copiamos a estrutura do service de mês.
```ts
import { injectable, inject } from 'tsyringe';

import IAppointmentsRepository from '../repositories/IAppointmentsRepository';

interface IRequest {
  provider_id: string;
  month: number;
  year: number;
  day: number;
}

type IResponse = Array<{
  hour: number;
  available: boolean;
}>;

@injectable()
class ListProviderDayAvailabilityService {
  constructor(
    @inject('AppointmentsRepository')
    private appointmentsRepository: IAppointmentsRepository,
  ) {}

  public async execute({
    provider_id,
    year,
    month,
    day,
  }: IRequest): Promise<IResponse> {
    return [{ hour: 8, available: true }];
  }
}

export default ListProviderDayAvailabilityService;
```

Vamos ter que criar um método novo no nosso repository e seu `dto`.
```ts
export default interface IFindAllInDayFromProviderDTO {
  provider_id: string;
  year: number;
  month: number;
  day: number;
}
```

E no nosso repository
```ts
export default interface IAppointmentsRepository {
//...
  findAllInDayFromProvider(
    data: IFindAllInDayFromProviderDTO,
  ): Promise<Appointment[]>;
}
```

No nosso repository fake
```ts
class FakeAppointmentsRepository implements IAppointmentsRepository {
  //...
  public async findAllInDayFromProvider({
    provider_id,
    day,
    month,
    year,
  }: IFindAllInDayFromProviderDTO): Promise<Appointment[]> {
    const appointments = this.appointments.filter(
      appointment =>
        appointment.provider_id === provider_id &&
        getDate(appointment.date) === day &&
        getMonth(appointment.date) + 1 === month &&
        getYear(appointment.date) === year,
    );
    return appointments;
  }
```

E no repository real
```ts
class AppointmentsRepository implements IAppointmentsRepository {
  //...
  public async findAllInDayFromProvider({
    provider_id,
    day,
    month,
    year,
  }: IFindAllInDayFromProviderDTO): Promise<Appointment[]> {
    const parsedDay = String(day).padStart(2, '0');
    const parsedMonth = String(month).padStart(2, '0');

    const appointments = await this.ormRepository.find({
      where: {
        provider_id,
        date: Raw(
          dateFieldName =>
            `to_char(${dateFieldName}, 'DD-MM-YYYY') = '${parsedDay}-${parsedMonth}-${year}'`,
        ),
      },
    });
    return appointments;
  }
```

Vamos criar o teste
```ts
import FakeAppointmentsRepository from '@modules/appointments/repositories/fake/FakeAppointmentsRepository';
import ListProviderDayAvailabilityService from './ListProviderDayAvailabilityService';

let fakeAppointmentsRepository: FakeAppointmentsRepository;
let listProviderDayAvailability: ListProviderDayAvailabilityService;

describe('ListProviderDayAvailability', () => {
  beforeEach(() => {
    fakeAppointmentsRepository = new FakeAppointmentsRepository();
    listProviderDayAvailability = new ListProviderDayAvailabilityService(
      fakeAppointmentsRepository,
    );
  });

  it('should be able to list the day availability from provider', async () => {
    await fakeAppointmentsRepository.create({
      provider_id: 'user',
      date: new Date(2020, 3, 20, 8, 0, 0),
    });

    await fakeAppointmentsRepository.create({
      provider_id: 'user',
      date: new Date(2020, 3, 20, 10, 0, 0),
    });

    const availability = await listProviderDayAvailability.execute({
      provider_id: 'user',
      year: 2020,
      month: 5,
      day: 20,
    });

    expect(availability).toEqual(
      expect.arrayContaining([
        { hour: 8, available: false },
        { hour: 9, available: true },
        { hour: 10, available: false },
        { hour: 11, available: true },
      ]),
    );
  });
});
```

E vamos arrumar o service
```ts
class ListProviderDayAvailabilityService {
  constructor(
    @inject('AppointmentsRepository')
    private appointmentsRepository: IAppointmentsRepository,
  ) {}

  public async execute({
    provider_id,
    year,
    month,
    day,
  }: IRequest): Promise<IResponse> {
    const appointments = await this.appointmentsRepository.findAllInDayFromProvider(
      {
        provider_id,
        year,
        month,
        day,
      },
    );

    const startHour = 8;

    const eachHourArray = Array.from(
      { length: 10 },
      (_, index) => index + startHour,
    );

    const availability = eachHourArray.map(hour => {
      const hasAppointmentAtHour = appointments.find(
        appointment => getHours(appointment.date) === hour,
      );

      return {
        hour,
        available: !hasAppointmentAtHour,
      };
    });

    return availability;
  }
}
```

Testamos e está tudo certo.


## Excluindo horários antigos
Se o horário já passou, temos que remover a disponibilidade dele. Adicionamos a lógica e o teste.
```ts
    const currentDate = new Date(Date.now());

    const availability = eachHourArray.map(hour => {
      const hasAppointmentAtHour = appointments.find(
        appointment => getHours(appointment.date) === hour,
      );

      const compareDate = new Date(year, month - 1, day, hour);

      return {
        hour,
        available: !hasAppointmentAtHour && isAfter(compareDate, currentDate),
      };
    });
```
E
```ts
  it('should be able to list the day availability from provider', async () => {
    await fakeAppointmentsRepository.create({
      provider_id: 'user',
      date: new Date(2020, 4, 20, 14, 0, 0),
    });

    await fakeAppointmentsRepository.create({
      provider_id: 'user',
      date: new Date(2020, 4, 20, 15, 0, 0),
    });

    jest.spyOn(Date, 'now').mockImplementationOnce(() => {
      return new Date(2020, 4, 20, 11).getTime();
    });

    const availability = await listProviderDayAvailability.execute({
      provider_id: 'user',
      year: 2020,
      month: 5,
      day: 20,
    });

    expect(availability).toEqual(
      expect.arrayContaining([
        { hour: 8, available: false },
        { hour: 9, available: false },
        { hour: 10, available: false },
        { hour: 13, available: true },
        { hour: 14, available: false },
        { hour: 15, available: false },
        { hour: 16, available: true },
      ]),
    );
  });
```

## Criação de agendamento
Em `CreateAppointmentsService`, ainda temos que refatorar, pois permitimos que o usuário crie agendamentos consigo mesmo, em datas passadas, e não estamos coletando o usuário que está fazendo o agendamento. E para adicionar isso, precisaremos criar outra migration.
```bash
yarn typeorm migration:create -n AddUserIdToAppointments
```

```ts
import {
  MigrationInterface,
  QueryRunner,
  TableColumn,
  TableForeignKey,
} from 'typeorm';

export default class AddUserIdToAppointments1594520015227
  implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'appointments',
      new TableColumn({
        name: 'user_id',
        type: 'uuid',
        isNullable: true,
      }),
    );

    await queryRunner.createForeignKey(
      'appointments',
      new TableForeignKey({
        name: 'AppointmentUser',
        columnNames: ['user_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropForeignKey('appointments', 'AppointmentUser');
    await queryRunner.dropColumn('appointments', 'user_id');
  }
}
```

E rodamos a migration
```bash
yarn typeorm migration:run
```

E vamos adicionar nas entities essa coluna a mais
```ts
@Entity('appointments')
class Appointment {
  //...
  @Column()
  user_id: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;
```

E temos que adicionar no `dto`
```ts
export default interface ICreateAppointmentDTO {
  provider_id: string;
  user_id: string;
  date: Date;
}
```

E adicionamos também nos nossos fake, no repository do typeorm e no service dos appointments que agora teremos `user_id` no método `create`. No controller, vamos pegar o `user_id` de dentro da autenticação.

Vamos para o Insomnia para testar e rodamos a aplicação. Fazemos a autenticação numa session com um usuário, e o appointment com o id de outro usuário.

Rodamos os testes e corrigimos onde está faltando importar `user_id`
