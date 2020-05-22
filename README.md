# Back-end

## Banco de dados

Quando vamos trabalhar com banco de dados no back-end, existem 3 principais estratégias para manipular os dados:

1) Lidar direto com o driver nativo do banco de dados. Ex: node-postgres.

2) Utilizando um query builder: construir nossas queries com Javascript. Ex: Knex.js.

3) ORM (Object Relational Mapping): que é o maior nível de abstração, onde mapeamos registros do nosso banco de dados com objetos no Javascript, ou seja, vamos criar models no nosso Javascript ou Typescript. E esses models, sempre quando criarmos uma instância (criar, alterar, deletar), ele vai refletir no banco de dados.
  - Sequelize para Javascript
  - TypeORM para Typescript

**TypeORM**

Faz todas as instalações necessárias e dentro do nosso `model` vamos adicionar como `decorators` as `@Entity()` e `@Column()`.

Ao salvar no `repository`, automaticamente vai salvar também no banco de dados.

Para buscar no banco, existem os métodos `find()` ou `findOne()` enviando `id` ou um objeto com campos e valores do que queremos buscar. Então, usamos uma sintaxe Typescript para buscar informações no banco de dados.

TypeORM executa o Knex por baixo dos panos, o que permite também usar o Knex.

A abstração no TypeORM e do Knex permite que utilizemos qualquer banco de dados e mesmo se mudarmos de banco de dados, as queries continuarão funcionando.

O node-postgres, como é um driver nativo, ele vai quebrar se mudar o banco de dados.

## Docker

- Criação de ambientes isolados (container);
- Containers expõe portas para comunicação;

### Conceitos do Docker
- Imagem
- Container
- Docker Registry (Docker Hub)
- Dockerfile
  - Receita de uma imagem

```dockerfile
# Partimos de uma imagem existente
FROM node:10

# Definimos a pasta e copiamos os arquivox
WORKDIR /usr/app
COPY . ./

# Instalamos as dependências
RUN yarn

# Expomos a porta
EXPOSE 3333

# Executamos nossa aplicação
CMD yarn start
```

## Bora codar

### Docker
Procurar a imagem docker do postgres na internet.

Para verificar se a porta está disponível no mac,
```bash
lsof -i :5432
```

Executar no terminal:
```bash
docker run --name gostack_postgres -e POSTGRES_PASSWORD=docker -p 5432:5432 -d postgres
```

Para ver se o container está de pé
```bash
docker ps
```

Caso não esteja de pé, é possível ver todas as imagens que existem na sua máquina
```bash
docker ps -a
```

Para parar um container
```bash
docker stop <id>
```

Para iniciar um container
```bash
docker start <id>
```

### DBeaver
- Instalar o DBeaver
- Criar nova conexão
- Escolher PostgreSQL
  - Main:
    - Host: localhost
    - Port: 5432 (tem que ser a mesma porta informada no comando do docker run)
    - Database: postgres
    - Username: postgres
    - Password: docker (que é a mesma senha criada no comando do docker run)
  - PostgreSQL:
    - Show all databases
- Finish

### TypeORM
Ir no site do TypeORM e seguir instruções de criar um arquivo de configuração do nosso banco de dados.

Instalar a dependência no projeto
```bash
yarn add typeorm pg
```

Criar na raiz do projeto o arquivo `ormconfig.json` e adicionar `type`, `host`, `port`, `username`, `password`, `database`
```json
{
  "type": "postgres",
  "host": "localhost",
  "port": "5432",
  "username": "postgres",
  "password": "docker",
  "database": "gostack_gobarber"
}
```

Criar um arquivo de conexão com o banco de dados `src/database/index.ts`
```ts
import { createConnection } from 'typeorm';

createConnection();
```

Tanto o `createConnection` quanto a `cli` do `typeorm` leem o arquivo `ormconfig.json`

Agora é só importar no `server.ts`
```ts
import express from 'express';
import routes from './routes';

import './database';

const app = express();

app.use(express.json());
app.use(routes);

app.listen(3333, () => {
  console.log('🚀 Server started on port 3333!');
});
```

E rodar a aplicação
```bash
yarn dev:server
```

Deu um erro, pois temos que criar o banco de dados pelo DBeaver. E roda de novo a aplicação.

### Criando tabela de Appointments no banco de dados
Em `ormconfig.json` temos que configurar a pasta que vai armazenar as `migrations`.
```json
{
  // ...
  "migrations": [
    "./src/database/migrations/*.ts"
  ],
  "cli": {
    "migrationsDir": "./src/database/migrations"
  }
}
```

Como o typeorm entende tanto Typescript quanto Javascript e a cli faz as migrations em Javascript, criaremos um script novo para executar a cli do typeorm usando Typescript.
```json
{
  // ...
  "scripts": {
    "build": "tsc",
    "dev:server": "ts-node-dev --inspect --transpileOnly --ignore-watch node_modules src/server.ts",
    "typeorm": "ts-node-dev ./node_modules/typeorm/cli.js"
  },
  // ...
}
```
E executa no terminal
```bash
yarn typeorm migration:create -n CreateAppointments
```

E vamos ver que na pasta `database/migration` foi criada uma tabela.

`Migrations` é como se fosse o git do nosso banco de dados. Elas controlam a versão do banco de dados e controlam alterações simultâneas dentro do nosso banco de dados. Ao invés do desenvolvedor fazer as alterações diretamente no banco de dados, ele cria uma migration. E outro desenvolvedor que pegar o projeto, vai executar todas as migrations para ter sua base de dados atualizada. Isso evita que os bancos de dados estejam em versões diferentes em todos ambientes de desenvolvimento.

**Funcionamento da Migration**

Dentro do método `up` vamos colocar o que queremos que seja feito no banco de dados quando essa migration for executada (alterações, criações).

O método `down` utilizamos como um fallback para desfazer o que fizemos no método `up`.

Arrumar o lint `export default`, `Promise<void>` e adiciona nova regra no `eslintrc.json` para não ficar pedindo `this` dentro da `class`
```json
{
  // ...
  "rules": {
    "prettier/prettier": "error",
    "class-methods-use-this":"off",
    // ...
  }
}
```

Em `src/database/migrations/1589991332947-CreateAppointments.ts`
```ts
import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export default class CreateAppointments1589991332947
  implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'appointments',
        columns: [
          {
            name: 'id',
            type: 'varchar',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'provider',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'date',
            type: 'timestamp with time zone',
            isNullable: false,
          },
        ],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('appointments');
  }
}
```

Para rodar a migration
```bash
yarn typeorm migration:run
```

Para verificar quais migrations rodaram
```bash
yarn typeorm migration:show
```

**Importante**

Só podemos alterar a migration se ela ainda não foi enviada para o controle de versão (git). Senão, obrigatoriamente precisa criar uma nova migration.

Para desfazer a migration
```bash
yarn typeorm migration:revert
```

### Model de Agendamento

Relacionar o model de agendamentos com o banco de dados.

`Entity` é um `model` que vai ser salvo no banco de dados.

Em `tsconfig.json` habilitar as opções de `decorator` no Typescript
```json
{
  "experimentalDecorators": true,
  "emitDecoratorMetadata": true,
}
```

Aviso que toda vez que for salvo `Appointment`, será na tabela `appointments`. Adicionar `Entity`, `Column` e `PrimaryGeneratedColumn`. Agora não precisaremos mais do `constructor` pois a `Entity` já cria automaticamente. E desabilitar no `tsconfig.json`
```json
{
  "strictPropertyInitialization": false,
}
```

Em `src/models/Appointment.ts`
```ts
import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('appointments')
class Appointment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  provider: string;

  @Column('timestamp with time zone')
  date: Date;
}

export default Appointment;
```


### TypeORM Repository
O TypeORM já vem com um `repository`, então podemos excluir do código a parte do `constructor` e métodos `all` e `create`.

Só deixamos o método `findByDate` por enquanto e importamos `EntityRepository` e `Repository` de `typeorm`.

Fazendo a alteração do método `findByDate`
```ts
import { EntityRepository, Repository } from 'typeorm';

import Appointment from '../models/Appointment';

@EntityRepository(Appointment)
class AppointmentsRepository extends Repository<Appointment> {
  /**
   * find an appointment by given date
   */
  public async findByDate(date: Date): Promise<Appointment | null> {
    const findAppointment = await this.findOne({
      where: { date },
    });

    return findAppointment || null;
  }
}

export default AppointmentsRepository;
```

Agora vamos alterar o `src/services/CreateAppointmentService.ts`
```ts
import { startOfHour } from 'date-fns';
import { getCustomRepository } from 'typeorm';

import Appointment from '../models/Appointment';
import AppointmentsRepository from '../repositories/AppointmentsRepository';

interface Request {
  provider: string;
  date: Date;
}

class CreateAppointmentService {
  /**
   * execute
   */
  public async execute({ provider, date }: Request): Promise<Appointment> {
    const appointmentsRepository = getCustomRepository(AppointmentsRepository);
    const appointmentDate = startOfHour(date);

    const findAppointmentInSameDate = appointmentsRepository.findByDate(
      appointmentDate,
    );

    if (findAppointmentInSameDate) {
      throw Error('The appointment hour is not available.');
    }

    const appointment = appointmentsRepository.create({
      provider,
      date: appointmentDate,
    });

    await appointmentsRepository.save(appointment);

    return appointment;
  }
}

export default CreateAppointmentService;
```

Agora vamos alterar a rota `src/routes/appointments.routes.ts`
```ts
import { Router } from 'express';
import { parseISO } from 'date-fns';
import { getCustomRepository } from 'typeorm';

import AppointmentsRepository from '../repositories/AppointmentsRepository';
import CreateAppointmentService from '../services/CreateAppointmentService';

const appointmentsRouter = Router();

appointmentsRouter.get('/', async (request, response) => {
  const appointmentsRepository = getCustomRepository(AppointmentsRepository);
  const appointments = await appointmentsRepository.find();

  return response.json(appointments);
});

appointmentsRouter.post('/', async (request, response) => {
  try {
    const { provider, date } = request.body;

    const parsedDate = parseISO(date);

    const createAppointment = new CreateAppointmentService();

    const appointment = await createAppointment.execute({
      provider,
      date: parsedDate,
    });

    return response.json(appointment);
  } catch (err) {
    return response.status(400).json({ error: err.message });
  }
});

export default appointmentsRouter;
```

E agora vamos rodar a aplicação
```bash
yarn dev:server
```

Deu um erro, pois precisamos instalar uma dependência
```bash
yarn add reflect-metadata
```
E adicionar no `server.ts` na primeira linha
```ts
import 'reflect-metadata';
```

E adicionar em `ormconfig.json`
```json
{
    "entities": [
    "./src/models/*.ts"
  ],
}
```

Roda a aplicação e confere a criação e listagem dos `appointments` no banco. =)


## Cadastro de Usuário
### Model e migration de usuário
Vamos criar a tabela de Users
```bash
yarn typeorm migration:create -n CreateUsers
```

E vamos configurar a tabela no arquivo `src/database/migrations/1590094902911-CreateUsers.ts`
```ts
import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export default class CreateUsers1590094902911 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'users',
        columns: [
          {
            name: 'id',
            type: 'varchar',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'name',
            type: 'varchar',
          },
          {
            name: 'email',
            type: 'varchar',
            isUnique: true,
          },
          {
            name: 'password',
            type: 'varchar',
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'now()',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'now()',
          },
        ],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('users');
  }
}
```

Criar o arquivo `src/models/User.ts`
```bash
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('users')
export default class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  email: string;

  @Column()
  password: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
```

E aproveitar para adicionar esses campos de `created_at` e `updated_at` na migration da tabela `appointments` assim como em `src/models/Appointment.ts`.

Rodar o `revert` até que delete a tabela de `appointments` também.
```bash
yarn typeorm migration:revert
```

Rodar o `run` novamente
```bash
yarn typeorm migration:run
```

### Relacionamento nos models

### Criação de registros

### Criptografia de senha
