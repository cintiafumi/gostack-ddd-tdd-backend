# Arquitetura DDD
## Conceitos DDD e TDD
Na nossa pasta `src` temos tudo o que acontece na aplicação. Essa separação acaba sendo por tipo de arquivo. Por exemplo, se tivermos 10 arquivos na pasta `models`, vamos gerar no total uns 40 `services`, que vão abstrair e isolar as funções de regra de negócios da aplicação.
```
src
  config
  database
  errors
  middlewares
  models
  repositories
  routes
  services
```

**Domínio:** Qual a área de conhecimento daquele módulo/arquivo. Ex: o domínio de Usuários, o domínio de Agendamentos.

O Scrum não funciona da mesma forma para todos os times e todos os projetos. Quais metodologia faz sentido ou não.

**DDD:** Domain Driven Design. Também é uma metodologia de desenvolvimento que iremos usar parte do que vai funcionar para gente. Somente para o Back-end.

**TDD:** Test Driven Development. Seria fazer a metodologia de fazer o testes antes de criar a nossa aplicação em si, ficando mais claro como que nossa aplicação deve funcionar.

## Separando em módulos
Primeiro, fazer a configuração visual do VSCode em `settings.json` para que cada pastinha tenha uma cor (perfumaria).
```json
  "material-icon-theme.files.associations": {
      "ormconfig.json": "database",
      "tsconfig.json": "tune"
  },

  "material-icon-theme.folders.associations": {
      "infra": "app",
      "entities": "class",
      "schemas": "class",
      "typeorm": "database",
      "repositores": "mappings",
      "http": "container",
      "migrations": "tools",
      "modules": "components",
      "implementations": "core",
      "dtos": "typescript",
      "fakes": "mock",
  },
```

Vamos criar os módulos `users` e `appointments`. E também criamos a pasta `services` dentro de cada um dos módulos para mover esses arquivos. E então podemos remover essa pasta `services` global. Agora criamos a pasta `repositories` dentro de `appointments`. A pasta `models` entra como `entities` em cada domínio. A entidade não tem obrigatoriedade de salvar no banco, pode ser em qualquer lugar.

Como a pasta `database` compartilha o banco de dados com toda a aplicação, então, vamos criar uma pasta `shared`.

Por enquanto, a pasta `src` ficará somente com:
```
src
  @types
  config
  modules
  shared
  server.ts
```

## Camada de infra
Separamos a camada de negócios da camada de infra. A camada de infra são as ferramentas que escolhemos para se relacionar com a camada de domínio. Então, na camada de infra ficará o banco de dados, o `express`.

A camada de domínio sabe, por exemplo, que quando um usuário se cadastra, ele deve receber um email, mas não sabe qual ferramenta que envia. Essa camada deveria ser "lida" até por leigos e não deve ser responsável pelas ferramentas, somente pela regra de negócios, sobre como a nossa aplicação deve funcionar.

Na pasta `shared` vamos colocar uma pasta `infra`, que ficará com todos arquivos específicos de alguma lib ou pacote. A pasta `database` faz parte de `infra` por usar `typeorm`, por isso, mudamos seu nome para `typeorm`. A pasta `middleware` também está associada a `infra` pois se refere ao uso do `express`, assim como `rotas` e `server.js`, mas iremos colocar todos eles dentro da pasta `http`. Dentro de cada `module`, também criamos uma camada de `infra/typeorm`.

Agora, qual entidade está ligada ao `typeorm`? Totalmente. Então, vamos colocar as `entities` dentro de `typeorm`.

Os nossos `services` isolam a regra de negócio da nossa aplicação.
```
src
  modules
    appointments
      infra
        typeorm
          entities
            Appointment.ts
      repositories
      services
    users
      infra
        typeorm
          entities
            User.ts
      services
  shared
    errors
    infra
      http
        middlewares
        routes
        server.ts
      typeorm
        migrations
        index.ts
```

## Configurando imports
Arrumando os imports depois da movimentação dos arquivos.

Antes disso, no `tsconfig.json` temos o `paths`
```json
    "baseUrl": "./src",
    "paths": {
      "@modules/*": ["modules/*"],
      "@config/*": ["config/*"],
      "@shared/*": ["shared/*"]
    },
```

E dentro de `routes` temos arquivos específicos dos módulos, então vamos movê-los para dentro de seu módulo em `infra/http/routes`.

Mover o `middleware` para dentro de `user`.

Depois de arrumar todas as importações, temos que alterar o script de inicialização da aplicação
```json
  "scripts": {
    "dev:server": "ts-node-dev --inspect --transpileOnly --ignore-watch node_modules src/shared/infra/http/server.ts",
    "start": "ts-node src/shared/infra/http/server.ts",
  },
```

E para a importação com `@` não quebrar, vamos importar a lib `ts-config/paths`
```bash
yarn add -D ts-config/paths
```

E adicionamos nos comandos
```json
  "scripts": {
    "dev:server": "ts-node-dev -r tsconfig-paths/register --inspect --transpileOnly --ignore-watch node_modules src/shared/infra/http/server.ts",
    "typeorm": "ts-node-dev -r tsconfig-paths/register ./node_modules/typeorm/cli.js"
  },
```

## Liskov Substitution Principle
Agora, ainda vemos dependência dos arquivos da camada de infra. Por exemplo, o `repository` de `appointments` é totalmente dependente de `typeorm`. Por isso, vamos mover `repositories/AppointmentsRepository.ts` para dentro de `appointments/infra/typeorm`. Mas precisamos criar uma pasta `repositories` fora de `typeorm` para quando trocarmos o `typeorm` por outra coisa, ainda tenhamos os mesmos métodos que terão os mesmos retornos e mesmos parâmetros, sem mexer em nada dos nossos `services`. Então, vamos criar uma `interface` chamada `IAppointmentsRepository.ts` com as regras de quais métodos vai ter.

Vamos colocar no `eslintrc` para forçar que o nome de arquivo de interface inicie com a letra `I`.
```json
    "@typescript-eslint/interface-name-prefix": ["error", { "prefixWithI": "always" }],
```

Agora, em `src/modules/appointments/repositories/IAppointmentsRepository.ts`, vamos colocar o retorno do método `findByDate` como sendo `Promise<Appointment | undefined>` ao invés de `null`, para criarmos um padrão. Vamos exportar
```ts
import Appointment from '../infra/typeorm/entities/Appointment';

export default interface IAppointmentsRepository {
  findByDate(date: Date): Promise<Appointment | undefined>;
}
```

E vamos importar essa `interface` dentro de `src/modules/appointments/infra/typeorm/repositories/AppointmentsRepository.ts`
```ts
import IAppointmentsRepository from '@modules/appointments/repositories/IAppointmentsRepository';

import Appointment from '../entities/Appointment';

@EntityRepository(Appointment)
class AppointmentsRepository extends Repository<Appointment>
  implements IAppointmentsRepository {
//...
```

O Liskov Substitution Principle (L do SOLID), que essas camadas que são integrações com outras bibliotecas e banco de dados, devem ser substituíveis ao definirmos um conjunto de regras. E agora, nosso service depende somente de um repository. Então, vamos desconectar totalmente o service do nosso typeorm.

## Reescrevendo repositórios
Para termos mais controle dos métodos do nosso repositório, vamos tirar os métodos que vieram pelo `extends Repository` do typeorm. E mesmo que fique mais verboso, vamos criar nossos métodos.

Em `src/modules/appointments/infra/typeorm/repositories/AppointmentsRepository.ts` vamos somente importar o `getRepository` do typeorm

Nossa variável `ormRepository` é um `Repository` do typeorm da nossa entidade `Appointment`.
```ts
class AppointmentsRepository implements IAppointmentsRepository {
  private ormRepository: Repository<Appointment>;
```
No `constructor` criamos o repository.
```ts
  constructor() {
    this.ormRepository = getRepository(Appointment);
  }
```
Agora é só substituir no método e já está funcionando.
```ts
import { getRepository, Repository } from 'typeorm';

import IAppointmentsRepository from '@modules/appointments/repositories/IAppointmentsRepository';

import Appointment from '../entities/Appointment';

class AppointmentsRepository implements IAppointmentsRepository {
  private ormRepository: Repository<Appointment>;

  constructor() {
    this.ormRepository = getRepository(Appointment);
  }

  public async findByDate(date: Date): Promise<Appointment | undefined> {
    const findAppointment = await this.ormRepository.findOne({
      where: { date },
    });

    return findAppointment || undefined;
  }
}

export default AppointmentsRepository;
```

Se formos no nosso `service`, vemos que estamos cheio de problemas. Mas antes vamos adicionar na nossa interface os métodos que estão faltando.

Vamos adicionar o método `create` na nossa interface, e como agora temos controle total da sua criação, podemos definir melhor como funcionará esse método.
Um conceito na arquitetura de software é o de DTOS (data transfer objects) que usaremos sempre que precisamos tipar uma informação composta, utilizada para criar, deletar, listar, ou seja, que vá se repetir na nossa aplicação. E vamos criar uma arquivo `ICreateApppointmentDTO` dentro de uma pasta `dtos` dentro de `modules/appointments`. Esse objeto vai definir o formato dos dados para criar um appointment.
```ts
export default interface ICreateAppointmentDTO {
  provider_id: string;
  date: Date;
}
```

Vou usá-lo agora dentro de `src/modules/appointments/repositories/IAppointmentsRepository.ts`
```ts
export default interface IAppointmentsRepository {
  create(data: ICreateAppointmentDTO): Promise<Appointment>;
  findByDate(date: Date): Promise<Appointment | undefined>;
}
```

E em `src/modules/appointments/infra/typeorm/repositories/AppointmentsRepository.ts` vamos adicionar o método `create`
```ts
  public async create({
    provider_id,
    date,
  }: ICreateAppointmentDTO): Promise<Appointment> {
    const appointment = this.ormRepository.create({ provider_id, date });

    await this.ormRepository.save(appointment);

    return appointment;
  }
```

E no nosso service `src/modules/appointments/services/CreateAppointmentService.ts` podemos remover a parte do `save` e adicionamos um `await` na parte do `create`. O que acontece agora é que está faltando o nosso repositório nesse arquivo, pois ainda está muito acoplado ao typeorm.
```ts
    const appointment = await appointmentsRepository.create({
      provider_id,
      date: appointmentDate,
    });
```

Ainda está cheio de erros, mas vamos consertando aos poucos.

## Dependency Inversion Principle
A inversão de dependência é mais um conceito de SOLID. Ao invés do service depender do repository, as rotas que usam esse service que vai informar qual repository que é. Então vamos criar o método `contructor` dentro do nosso service que vai receber como parâmetro o `repository`
```ts
class CreateAppointmentService {
  constructor(private appointmentsRepository: IAppointmentsRepository) {}
```
Que é a mesma coisa que
```ts
class CreateAppointmentService {
  private appointmentsRepository: IAppointmentsRepository;
  constructor(private appointmentsRepository: IAppointmentsRepository) {
    this.appointmentsRepository = appointmentsRepository;
  }
```

Em `eslintrc` vamos remover a regra que reclama dessa forma de criar a variável private dentro do constructor
```json
    "no-useless-constructor": "off",
  ```

Arrancamos fora o `getCustomRepository`, e toda vez que tivermos `appointmentsRepository`, trocamos por `this.appointmentsRepository`. E por último, nossa interface `Request` está reclamando por causa da nossa regra de sempre ter um `I` na frente do nome, então trocamos por `IRequest`.
```ts
import { startOfHour } from 'date-fns';

import AppError from '@shared/errors/AppError';
import Appointment from '../infra/typeorm/entities/Appointment';
import IAppointmentsRepository from '../repositories/IAppointmentsRepository';

interface IRequest {
  provider_id: string;
  date: Date;
}

class CreateAppointmentService {
  constructor(private appointmentsRepository: IAppointmentsRepository) {}

  public async execute({ date, provider_id }: IRequest): Promise<Appointment> {
    const appointmentDate = startOfHour(date);

    const findAppointmentInSameDate = await this.appointmentsRepository.findByDate(
      appointmentDate,
    );

    if (findAppointmentInSameDate) {
      throw new AppError('The appointment hour is not available.');
    }

    const appointment = await this.appointmentsRepository.create({
      provider_id,
      date: appointmentDate,
    });

    return appointment;
  }
}

export default CreateAppointmentService;
```

Agora temos que arrumar nossa rota (camada de infra) `src/modules/appointments/infra/http/routes/appointments.routes.ts` para informar ao service (camada de domínio) qual o repository (camada de infra) que vai ser usado.
```ts
import AppointmentsRepository from '@modules/appointments/infra/typeorm/repositories/AppointmentsRepository';
//...
const appointmentsRepository = new AppointmentsRepository();
//...
  const createAppointment = new CreateAppointmentService(
    appointmentsRepository,
  );
```
E por enquanto, deixamos a rota get comentada.

Não entraremos no caso, mas no nosso service, poderímos refatorar também a parte das entities para que nosso service seja totalmente independente do typorm. Então essa linha aqui seria alterada
```ts
import Appointment from '../infra/typeorm/entities/Appointment';
```
Mas não faremos isso agora.


## Refatorando módulo de usuários
Primeira coisa é criar a pasta `repositories` dentro de `modules/users` com nosso interface `IUsersRepository.ts`. Vamos observar os services para saber quais métodos usamos para esse módulo.
- findById
- findByEmail
- create
- save

Alteramos todas interfaces `Request` para `IRequest` em todos services. Além disso, como não podemos depender diretamente do typeorm dentro do nosso service, vamos criar o `UsersRepository` dentro da camada de infra em `users/infra/typeorm/repositories`

Como o método create vai receber mais informações, vou criar um `ICreateUserDTO.ts` dentro de `users/dtos`
```ts
export default interface ICreateUserDTO {
  name: string;
  email: string;
  password: string;
}
```

`src/modules/users/repositories/IUsersRepository.ts`
```ts
import User from '../infra/typeorm/entities/User';
import ICreateUserDTO from '../dtos/ICreateUserDTO';

export default interface IUsersRepository {
  findById(id: string): Promise<User | undefined>;
  findByEmail(email: string): Promise<User | undefined>;
  create(data: ICreateUserDTO): Promise<User>;
  save(user: User): Promise<User>;
}
```

E dentro de `src/modules/users/infra/typeorm/repositories/UsersRepository.ts` vamos copiar tudo de Appointments e mudar para Users
```ts
import { getRepository, Repository } from 'typeorm';

import IUsersRepository from '@modules/users/repositories/IUsersRepository';
import ICreateUserDTO from '@modules/users/dtos/ICreateUserDTO';

import User from '../entities/User';

class UsersRepository implements IUsersRepository {
  private ormRepository: Repository<User>;

  constructor() {
    this.ormRepository = getRepository(User);
  }

  public async findById(id: string): Promise<User | undefined> {
    const user = await this.ormRepository.findOne(id);

    return user || undefined;
  }

  public async findByEmail(email: string): Promise<User | undefined> {
    const user = await this.ormRepository.findOne({
      where: { email },
    });

    return user || undefined;
  }

  public async create(userData: ICreateUserDTO): Promise<User> {
    const appointment = this.ormRepository.create(userData);

    await this.ormRepository.save(appointment);

    return appointment;
  }

  public async save(user: User): Promise<User> {
    return this.ormRepository.save(user);
  }
}

export default UsersRepository;
```

Agora em cada service, vamos colocar o constructor para receber o repository como parâmetro. E em todos métodos, mudamos para `this.usersRepository`, além de arrumar para os métodos que criamos. Ex:
```ts
class CreateUserService {
  constructor(private usersRepository: IUsersRepository) {}

  public async execute({ name, email, password }: IRequest): Promise<User> {
    const checkUserExists = await this.usersRepository.findByEmail(email);
    //...
    const user = await this.usersRepository.create({
```

Nas rotas, `modules/users/infra/http/routes/users.routes.ts` e `modules/users/infra/http/routes/sessions.routes.ts` vamos instanciar `UsersRepository` e passar como parâmetro para os services.
```ts
import UsersRepository from '@modules/users/infra/typeorm/repositories/UsersRepository';
//...
const usersRepository = new UsersRepository();
//...
  const createUser = new CreateUserService(usersRepository);
```

E agora que mudamos todos os arquivos de lugar, temos que alterar o `ormconfig.json`
```json
{
  "entities": [
    "./src/modules/**/infra/typeorm/entities/*.ts"
  ],
  "migrations": [
    "./src/shared/infra/typeorm/migrations/*.ts"
  ],
  "cli": {
    "migrationsDir": "./src/shared/infra/typeorm/migrations"
  }
}
```

E ao rodar a aplicação, tivemos que mudar para dentro das rotas, pois o typeorm demora um pouco
```ts
const appointmentsRepository = new AppointmentsRepository();
```
e
```ts
const usersRepository = new UsersRepository();
```
foram para dentro da chamada das rotas por enquanto.

Rodamos a aplicação
```bash
yarn dev:server
```

## Injeção de dependências
Para não termos que ficar criando o `constructor` toda vez, vamos instalar uma biblioteca de injeção de dependências.
```bash
yarn add tsyringe
```
Vamos criar a pasta `container` dentro de `shared` que será responsável pela injeção de dependências. Vamos importar tanto a interface quanto o repository.
```ts
import { container } from 'tsyringe';

import IAppointmentsRepository from '@modules/appointments/repositories/IAppointmentsRepository';
import AppointmentsRepository from '@modules/appointments/infra/typeorm/repositories/AppointmentsRepository';

container.registerSingleton<IAppointmentsRepository>(
  'AppointmentsRepository',
  AppointmentsRepository,
);
```

E para usar, vamos voltar para o service de appointments `modules/appointments/services/CreateAppointmentService.ts`
```ts
import { injectable, inject } from 'tsyringe';

@injectable()
class CreateAppointmentService {
  constructor(
    @inject('AppointmentsRepository')
    private appointmentsRepository: IAppointmentsRepository,
  ) {}
//...
```

Mas para funcionar, precisamos ir no nosso `shared/infra/http/server.ts` para importar então esse `container`
```ts
import '@shared/container';
```

E nas rotas então, ao invés de criar um `new` repository, vamos avisar qual service o container deve resolver. Em `modules/appointments/infra/http/routes/appointments.routes.ts`
```ts
import { container } from 'tsyringe';
//...
  const createAppointment = container.resolve(CreateAppointmentService);
```
E usamos `registerSingleton` para instanciar a classe apenas uma única vez durante todo ciclo da aplicação.

Agora vamos fazer o mesmo para Users.

Rodamos a aplicação e vemos se está funcionando.

## Usando controllers
Já que nossos Services ficam com a responsabilidade da regra de negócios, nossos Repositories ficam com a responsabilidade de salvar a persistências de dados, então sobra para nossos Controllers a responsabilidade do que está dentro das nossas rotas.

Em `modules/appointments/infra/http/routes/appointments.routes.ts`
```ts
import AppointmentsController from '../controllers/AppointmentsController';
//...
const appointmentsController = new AppointmentsController();
//...
appointmentsRouter.post('/', appointmentsController.create);
```
E passamos tudo para `modules/appointments/infra/http/controllers/AppointmentsController.ts`
```ts
import { Request, Response } from 'express';
import { parseISO } from 'date-fns';
import { container } from 'tsyringe';

import CreateAppointmentService from '@modules/appointments/services/CreateAppointmentService';

export default class AppointmentsController {
  public async create(request: Request, response: Response): Promise<Response> {
    const { provider_id, date } = request.body;

    const parsedDate = parseISO(date);

    const createAppointment = container.resolve(CreateAppointmentService);

    const appointment = await createAppointment.execute({
      date: parsedDate,
      provider_id,
    });

    return response.json(appointment);
  }
}
```

Faremos o mesmo para os controllers do módulo de users, mas precisaremos tanto de `SessionsController` quanto de `UsersController`. Lembrando que no REST, temos no máximo 5 métodos (index, show, create, update, delete). E como o `update` do avatar não poderia ocupar o espaço do método dentro de UsersController, então criamos também o `UserAvatarController`.

Rodamos a aplicação para ver se está tudo funcionando.

# Testes e TDD
Testes automatizados vão garantir que a nossa aplicação continue funcionando independente do número de novas funcionalidades e do número de devs no time.

Temos alguns tipos de testes de automação:

1. Testes unitários

Testam funcionalidades específicas da nossa aplicação e precisam ser funções puras (não dependem de outra parte da aplicação e não tem efeito colateral. Jamais fazendo chamada a API ou de serviços externos).

2. Testes de integração

Testam uma funcionalidade completa, passando por várias camadas da aplicação. Ex: criação de usuário novo
```
Route -> Controller -> Service -> Repository -> ...
```

3. Testes E2E

Simulam a ação do usuário dentro da nossa aplicação.
```
1. Clique no input de email
2. Preencha cintiafumi@gmail.com
3. Clique no input de senha
4. Preencha 123456
5. Clique no botão "Logar"
6. Espero que a página tenha enviado o usuário para o dashboard
```

## TDD (Test Driven Development)
Criamos os testes antes mesmo de criarmos as funcionalidades da nossa aplicação. Os testes devem retornar o resultado que se espera daquela funcionalidade, garantindo que aquela funcionalidade se comporte de uma maneira. Ex:

- Quando o usuário se cadastrar na aplicação, ele deve receber um e-mail de boas vindas;

## Configurando Jest
Adicionar a dependência de desenvolvimento
```bash
yarn add -D jest

yarn jest --init

✔ Would you like to use Jest when running "test" script in "package.json"? … yes
✔ Choose the test environment that will be used for testing › node
✔ Do you want Jest to add coverage reports? … no
✔ Which provider should be used to instrument code for coverage? › v8
✔ Automatically clear mock calls and instances between every test? … yes
```
(Não tenho certeza quanto ao `v8`)

E foi criado um arquivo `jest.config.js`

Adicionamos a biblioteca para o jest entender arquivos de teste em typescript
```bash
yarn add -D ts-jest
```

Em `jest.config.js` que precisamos setar o `preset` e também de `testMatch`
```ts
  preset: 'ts-jest',
  //...
  testMatch: [
    "**/*.spec.ts"
  ],
```

Para testar, vamos criar um arquivo `src/modules/appointments/services/CreateAppointmentService.spec.ts` e digitar `test()`, mas como não reconheceu, precisamos instalar o pacote dos types
```bash
yarn add -D @types/jest
```
Além disso, também devemos adicionar no `eslintrc` as variáveis globais do `jest`
```json
  "env": {
    "es6": true,
    "node": true,
    "jest": true
  },
```
E criamos um teste bem simples somente para testar
```ts
test('sum two numbers', () => {
  expect(1 + 2).toBe(3);
});
```
E testamos
```bash
yarn test
```

## Pensando nos testes
Vamos começar a fazer os testes das funcionalidades já existentes da nossa aplicação. Vamos começar pelos nossos services. E vamos ter no mínimo 1 teste para cada service. E pode ser que cada funcionalidade tenha inúmeros testes.

Começamos importando nosso service. E vamos categorizar os testes pelo `describe()`. Existem 2 formas de criar os testes. Uma é com `test()` e outra como `it()`, que deixa mais fácil a compreensão do que está sendo testado.

Em `modules/appointments/services/CreateAppointmentService.spec.ts`
```ts
import CreateAppointmentService from './CreateAppointmentService';

describe('CreateAppointment', () => {
  it('should be able to create a new appointment', () => {
    expect(1 + 2).toBe(3);
  });
});
```

Para criarmos um appointment, precisamos passar um `provider_id` e uma `date`. E como iremos escolher o `provider_id`? Nós iremos usar um user do nosso banco de dados? Então, preciso de um banco de dados só para o teste? Nosso CI também vai fazer os testes, então precisaria de outro banco de dados só para os testes de CI?

Quando dependemos de banco de dados, de envio de e-mails, ou seja, de quaisquer serviços externos, fica difícil fazer esses testes. E para um teste unitário, ele não deve depender de nada externo. Então, vamos criar um `fake repository` para não tocarmos no banco de dados e que não tem funcionalidade nenhuma.

## Criando o primeiro teste
Vamos criar então os `fake repositories`. Em `modules/appointments/repositories/fake/FakeAppointmentsRepository.ts`, vamos copiar tudo do `AppointmentsRepository.ts` e vamos remover todas as importações que dependem do typeorm e iremos usar puramenente JS para esses métodos. Na criação de um appointment então, iremos instanciar `Appointment` e vamos também criar um array de appointments. E para adicionar as informações dentro de appointment, podemos usar o `Object.assign`. E no método `findByDate` também fazemos o find em cima do array criado.
```ts
import { uuid } from 'uuidv4';
import IAppointmentsRepository from '@modules/appointments/repositories/IAppointmentsRepository';
import ICreateAppointmentDTO from '@modules/appointments/dtos/ICreateAppointmentDTO';

import Appointment from '../../infra/typeorm/entities/Appointment';

class AppointmentsRepository implements IAppointmentsRepository {
  private appointments: Appointment[] = [];

  public async findByDate(date: Date): Promise<Appointment | undefined> {
    const findAppointment = this.appointments.find(
      appointment => appointment.date === date,
    );
    return findAppointment;
  }

  public async create({
    provider_id,
    date,
  }: ICreateAppointmentDTO): Promise<Appointment> {
    const appointment = new Appointment();
    Object.assign(appointment, { id: uuid(), date, provider_id });
    this.appointments.push(appointment);
    return appointment;
  }
}

export default AppointmentsRepository;
```

Lá nos testes, vamos importar esse fakeAppointmentsRepository
```ts
import FakeAppointmentsRepository from '../repositories/fake/FakeAppointmentsRepository';
import CreateAppointmentService from './CreateAppointmentService';

describe('CreateAppointment', () => {
  it('should be able to create a new appointment', async () => {
    const fakeAppointmentsRepository = new FakeAppointmentsRepository();
    const createAppointment = new CreateAppointmentService(
      fakeAppointmentsRepository,
    );

    const appointment = await createAppointment.execute({
      date: new Date(),
      provider_id: '123123123',
    });

    expect(appointment).toHaveProperty('id');
    expect(appointment.provider_id).toBe('123123123');
  });
});
```

E quando rodamos o teste, deu alguns erros. Esquecemos de alterar o `jest.config.js` para a importação que fazemos com `@`
```js
const { pathsToModuleNameMapper } = require('ts-jest');
const { compilerOptions } = require('./tsconfig.json');

module.exports = {
//...
  moduleNameMapper: pathsToModuleNameMapper(compilerOptions.paths, { prefix: '<rootDir>/src/' }),
//...
}
```

E em `tsconfig.json`, vamos remover todas as linhas de comentários, pois o jest não aceita.

## Coverage report
Ferramenta que vai dizer a quantidade de código que está coberta com teste. No `jest.config.js`
```js
module.exports {
  collectCoverage: true,
  collectCoverageFrom: [
    '<rootDir>/src/modules/**/services/*.ts'
  ],
  coverageDirectory: 'coverage',
  coverageProvider: "v8",
  coverageReporters: [
    "text-summary",
    "lcov",
  ],
}
```
E rodamos no terminal novamente
```bash
yarn test
```
E conseguimos abrir no navegador o arquivo `coverage/lcov-report/index.html`, que mostra um relatório dos arquivos cobertos por testes.

## Testes de agendamento
Vamos criar o teste que entra no `if` de não poder criar 2 agendamentos na mesma data. Adicionamos mais um teste no `CreateAppointmentService.spec.ts`
```ts
import AppError from '@shared/errors/AppError';
//...
  it('should not be able to create two appointments at the same time', async () => {
    const fakeAppointmentsRepository = new FakeAppointmentsRepository();
    const createAppointment = new CreateAppointmentService(
      fakeAppointmentsRepository,
    );

    const appointmentDate = new Date(2020, 6, 5, 11);

    await createAppointment.execute({
      date: appointmentDate,
      provider_id: '123123123',
    });

    expect(
      createAppointment.execute({
        date: appointmentDate,
        provider_id: '123123123',
      }),
    ).rejects.toBeInstanceOf(AppError);
  });
```
Mas como pegamos um erro de verificação da data, alteramos também nosso `FakeAppointmentsRepository`
```ts
import { isEqual } from 'date-fns';
//...
    const findAppointment = this.appointments.find(appointment =>
      isEqual(appointment.date, date),
    );
```
Rodamos o teste e agora o coverage nesse service está 100% coberto de testes.

## Testando criação de usuário
Vamos criar o `modules/users/repositories/fake/FakeUsersRepository.ts`
```ts
import IUsersRepository from '@modules/users/repositories/IUsersRepository';
import ICreateUserDTO from '@modules/users/dtos/ICreateUserDTO';

import { uuid } from 'uuidv4';
import User from '../../infra/typeorm/entities/User';

class UsersRepository implements IUsersRepository {
  private users: User[] = [];

  public async findById(id: string): Promise<User | undefined> {
    const findUser = this.users.find(user => user.id === id);
    return findUser;
  }

  public async findByEmail(email: string): Promise<User | undefined> {
    const findUser = this.users.find(user => user.email === email);
    return findUser;
  }

  public async create(userData: ICreateUserDTO): Promise<User> {
    const user = new User();

    Object.assign(user, { id: uuid() }, userData);

    this.users.push(user);

    return user;
  }

  public async save(user: User): Promise<User> {
    const findIndex = this.users.findIndex(findUser => findUser.id === user.id);

    this.users[findIndex] = user;

    return user;
  }
}

export default UsersRepository;
```

Agora podemos criar nossos testes de criação de usuário
```ts
import AppError from '@shared/errors/AppError';

import FakeUsersRepository from '../repositories/fake/FakeUsersRepository';
import CreateUserService from './CreateUserService';

describe('CreateUser', () => {
  it('should be able to create a new user', async () => {
    const fakeUsersRepository = new FakeUsersRepository();
    const createUser = new CreateUserService(fakeUsersRepository);

    const user = await createUser.execute({
      name: 'John Doe',
      email: 'johndoei@example.com',
      password: '123456',
    });

    expect(user).toHaveProperty('id');
    expect(user.name).toBe('John Doe');
    expect(user.email).toBe('johndoei@example.com');
  });

  it('should not be able to create a new user with an existence e-mail', async () => {
    const fakeUsersRepository = new FakeUsersRepository();
    const createUser = new CreateUserService(fakeUsersRepository);

    await createUser.execute({
      name: 'John Doe',
      email: 'johndoei@example.com',
      password: '123456',
    });

    expect(
      createUser.execute({
        name: 'John Doe',
        email: 'johndoei@example.com',
        password: '123456',
      }),
    ).rejects.toBeInstanceOf(AppError);
  });
});
```

## Testando autenticação
Como todos os testes são independentes, para autenticar um usuário, primeiro eu precisarei criá-lo. Então, vamos ter que importar o `CreateUserService` para esse teste.
```ts
import FakeUsersRepository from '../repositories/fake/FakeUsersRepository';
import AuthenticateUserService from './AuthenticateUserService';
import CreateUserService from './CreateUserService';

describe('AuthenticateUser', () => {
  it('should be able to authenticate', async () => {
    const fakeUsersRepository = new FakeUsersRepository();

    const createUser = new CreateUserService(fakeUsersRepository);
    const authenticateUser = new AuthenticateUserService(fakeUsersRepository);

    const user = await createUser.execute({
      name: 'John Doe',
      email: 'johndoei@example.com',
      password: '123456',
    });

    const response = await authenticateUser.execute({
      email: 'johndoei@example.com',
      password: '123456',
    });

    expect(response).toHaveProperty('token');
    expect(response.user).toEqual(user);
  });
});
```
Como nosso service de criação de usuário fere um dos princípios do SOLID, o de *S - Single Responsability Principle*, devido também se responsabilizar pela criação do hash da senha, então, vamos isolar a criação de senhas em outro arquivo. Usaremos a inversão de dependências, *D - Dependency inversion principle*, e a injeção de dependências como fizemos nos repositories. Mas como é uma função somente usada pelos users, não iremos colocar dentro da nossa pasta `shared/container`.

Criamos uma pasta `providers` dentro do módulo de `user`
```
src
  modules
    users
      providers
        HashProvider
          fakes
          implementation
          models
            IHashProvider
```

Na pasta `models`, vamos colocar `src/modules/users/providers/HashProvider/models/IHashProvider.ts` contendo os métodos que o HashProvider vai ter, assim, podemos futuramente alterar a biblioteca que usamos para criar o hash e também criar outros métodos (ex: update de senha) sem que tenhamos que alterar outros arquivos.
```ts
export default interface IHashProvider {
  generateHash(payload: string): Promise<string>;
  compareHash(payload: string, hashed: string): Promise<boolean>;
}
```

Na pasta `implementations`, vamos colocar a biblioteca que iremos usar por enquanto nossa `BCryptHashProvider.ts`
```ts
import { hash, compare } from 'bcryptjs';
import IHashProvider from '../models/IHashProvider';

export default class BCryptHashProvider implements IHashProvider {
  public async generateHash(payload: string): Promise<string> {
    return hash(payload, 8);
  }

  public async compareHash(payload: string, hashed: string): Promise<boolean> {
    return compare(payload, hashed);
  }
}
```

Agora no nosso service `CreateUserService`, vamos importar nosso `IHashProvider`. Lembrando que não importamos a `class` de implementation diretamente, sempre importamos a interface.
```ts
@injectable()
class CreateUserService {
  constructor(
    @inject('UsersRepository')
    private usersRepository: IUsersRepository,

    private hashProvider: IHashProvider,
  ) {}
  //...
    const hashedPassword = await this.hashProvider.generateHash(password);
```

E agora, temos que criar nossa injeção de dependência. Na pasta dos nossos `providers`, vamos criar um `index.ts` que fará isso. Importamos nosso HashProvider e a inteface.
```ts
import { container } from 'tsyringe';

import IHashProvider from './HashProvider/models/IHashProvider';
import BCryptHashProvider from './HashProvider/implementation/BCryptHashProvider';

container.registerSingleton<IHashProvider>('HashProvider', BCryptHashProvider);
```

Colocamos o `inject()` lá no nosso service
```ts
@injectable()
class CreateUserService {
  constructor(
//...
    @inject('HashProvider')
    private hashProvider: IHashProvider,
  ) {}
```

E, por fim, adicionamos no nosso `container`
```ts
import '@modules/users/providers';
```

Como criamos nosso provider, precisamos agora criar também seu fake provider `modules/users/providers/HashProvider/fakes/FakeHashProvider.ts`
```ts
import IHashProvider from '../models/IHashProvider';

export default class FakeHashProvider implements IHashProvider {
  public async generateHash(payload: string): Promise<string> {
    return payload;
  }

  public async compareHash(payload: string, hashed: string): Promise<boolean> {
    return payload === hashed;
  }
}
```

E no nosso teste de autenticação, agora posso importar o `FakeHashProvider`, assim como, no service de autenticação e também no teste de criação de usuário
```ts
describe('AuthenticateUser', () => {
  it('should be able to authenticate', async () => {
    const fakeUsersRepository = new FakeUsersRepository();
    const fakeHashProvider = new FakeHashProvider();

    const createUser = new CreateUserService(
      fakeUsersRepository,
      fakeHashProvider,
    );
    const authenticateUser = new AuthenticateUserService(
      fakeUsersRepository,
      fakeHashProvider,
    );
```

```ts
@injectable()
export default class AuthenticateUserService {
  constructor(
    //...
    @inject('HashProvider')
    private hashProvider: IHashProvider,
  ) {}
  //...
      const passwordMatched = await this.hashProvider.compareHash(
      password,
      user.password,
    );
```

```ts
describe('CreateUser', () => {
  it('should be able to create a new user', async () => {
    const fakeUsersRepository = new FakeUsersRepository();
    const fakeHashProvider = new FakeHashProvider();
    const createUser = new CreateUserService(
      fakeUsersRepository,
      fakeHashProvider,
    );
```

## Testes de autenticação
Faltaram os testes quando usuário tenta autenticar com usuário inexistente
```ts
  it('should not be able to authenticate with a not registered user', async () => {
    const fakeUsersRepository = new FakeUsersRepository();
    const fakeHashProvider = new FakeHashProvider();

    const authenticateUser = new AuthenticateUserService(
      fakeUsersRepository,
      fakeHashProvider,
    );

    expect(
      authenticateUser.execute({
        email: 'johndoei@example.com',
        password: '123456',
      }),
    ).rejects.toBeInstanceOf(AppError);
  });
```

E quando o usuário tenta logar com senha errada
```ts
  it('should not be able to authenticate with wrong password', async () => {
    const fakeUsersRepository = new FakeUsersRepository();
    const fakeHashProvider = new FakeHashProvider();

    const createUser = new CreateUserService(
      fakeUsersRepository,
      fakeHashProvider,
    );
    const authenticateUser = new AuthenticateUserService(
      fakeUsersRepository,
      fakeHashProvider,
    );

    await createUser.execute({
      name: 'John Doe',
      email: 'johndoei@example.com',
      password: '123456',
    });

    expect(
      authenticateUser.execute({
        email: 'johndoei@example.com',
        password: 'wrong-password',
      }),
    ).rejects.toBeInstanceOf(AppError);
  });
```

## Provider de storage
Para testar a parte de salvar o Avatar, chegamos num impasse, pois estamos salvando na pasta `tmp` (no nosso disco). Mas isso funciona muito bem somente na nossa máquina local. Ao colocar nossa aplicação na nuvem, precisaríamos armazenar as imagens em servidores específicos (CDN - Content Delivery Network) como Amazon S3, Google Cloud Storage, Digital Ocean Spaces...

Para resolver isso, precisamos tirar a responsabilidade de armazenamento da imagem de dentro do nosso Service. Então, precisamos de uma camada desse provider que vai dizer como vamos salvar e deletar um arquivo. Como poderemos mais para frente armazenar outros tipos de arquivos, vamos criar esse arquivo dentro da pasta mais global `shared/container/providers/StorageProvider/`.
```
  src
    shared
      container
        providers
          StorageProvider
            fakes
            implementations
            models
            index.ts
```

Vamos começando a criar nosso model `IStorageProvider.ts` que só vai ter dois métodos o de salvar e o de deletar
```ts
export default interface IStorageProvider {
  saveFile(file: string): Promise<string>;
  deleteFile(file: string): Promise<void>;
}
```

Agora vamos criar em implementations nosso `DiskStorageProvider.ts` que é onde vamos salvar na nossa máquina. Mais para frente, podemos ter o AmazonS3Provider, GoogleCloudStorageProvider. Como o multer salva o arquivo dentro da nossa pasta `tmp`, vamos alterar um pouco a lógica para que essa pasta seja realmente temporária e que o upload seja considerado concluído quando for para a pasta `tmp/uploads`

Antes, fazemos a alteração de `@config/upload.ts` adicinando mais um folder
```ts
export default {
  tmpFolder,
  uploadFolder: path.resolve(tmpFolder, 'uploads'),
  //...
```

```ts
import fs from 'fs';
import path from 'path';
import uploadConfig from '@config/upload';
import IStorageProvider from '../models/IStorageProvider';

class DiskStorageProvider implements IStorageProvider {
  public async saveFile(file: string): Promise<string> {
    await fs.promises.rename(
      path.resolve(uploadConfig.tmpFolder, file),
      path.resolve(uploadConfig.uploadFolder, file),
    );
    return file;
  }

  public async deleteFile(file: string): Promise<void> {
    const filePath = path.resolve(uploadConfig.uploadFolder, file);

    try {
      fs.promises.stat(filePath);
    } catch {
      return;
    }
    await fs.promises.unlink(filePath);
  }
}

export default DiskStorageProvider;
```

Em `@shared/container/providers/index.js` vamos importar tanto o provider quanto a interface para fazermos a injeção de dependência.
```ts
import { container } from 'tsyringe';

import IStorageProvider from './StorageProvider/models/IStorageProvider';
import DiskStorageProvider from './StorageProvider/implementations/DiskStorageProvider';

container.registerSingleton<IStorageProvider>(
  'StorageProvider',
  DiskStorageProvider,
);
```

Fazemos a importação simples em `@shared/container/index.ts`
```ts
import './providers';
```

Agora vamos colocar `inject` no service de updload de avatar
```ts
@injectable()
class UpdateUserAvatarService {
  constructor(
//...
    @inject('StorageProvider')
    private storageProvider: IStorageProvider,
  ) {}
  //...
    if (user.avatar) {
      await this.storageProvider.deleteFile(user.avatar);
    }

    const filename = await this.storageProvider.saveFile(avatarFilename);

    user.avatar = filename;
```

E para testarmos, precisamos criar nosso `FakeStorageProvider` similar ao `DiskStorageProvider`
```ts
import IStorageProvider from '../models/IStorageProvider';

class FakeStorageProvider implements IStorageProvider {
  private storage: string[] = [];

  public async saveFile(file: string): Promise<string> {
    this.storage.push(file);
    return file;
  }

  public async deleteFile(file: string): Promise<void> {
    const findIndex = this.storage.findIndex(
      storageFile => storageFile === file,
    );

    this.storage.splice(findIndex, 1);
  }
}

export default FakeStorageProvider;
```
