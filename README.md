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
