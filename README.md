# Primeiro projeto Node

```bash
mkdir primeiro-projeto-node
cd primeiro-projeto-node
yarn init -y
yarn add express
yarn add typescript -D
yarn tsc --init
```

Criar `src/server.ts` e alterar dentro de `tsconfig.json`
```json
{
  "outDir": "./dist",
  "rootDir": "./src",
}
```

Rodar
```bash
yarn tsc
```

Em `src/server.ts`
```ts
import express from 'express'
```

Agora já está mostrando que precisamos adicionar a dependência de tipagem do express.
```bash
yarn add -D @types/express
```

Adiciona um código simples no `src/server.ts`
```ts
import express from 'express'

const app = express()

app.get('/', (request, response) => {
  return response.json({ message: 'Hello World' })
})

app.listen(3333, () => {
  console.log('🚀 Server started on port 3333!')
})
```

E para rodar
```bash
yarn tsc
node dist/server.js
```

Para não ter que rodar esses comandos toda vez, adicionar o script no `package.json`
```json
  "scripts": {
    "build": "tsc"
  },
```

Deletar a pasta `dist` e adicionar o pacote para ficar atualizando durante o desenvolvimento
```bash
yarn add ts-node-dev -D
```
Adiciona o script em `package.json`
```json
  "scripts": {
    "build": "tsc",
    "dev:server": "ts-node-dev src/server.ts"
  },
```
E roda
```bash
yarn dev:server
```

E para evitar de ficar conferindo se está com erro ou não, adicionar `--transpileOnly` e `--ignore-watch node_modules` para evitar que tente compilar os arquivos da pasta node_modules
```json
  "scripts": {
    "build": "tsc",
    "dev:server": "ts-node-dev --transpileOnly --ignore-watch node_modules src/server.ts"
  },
```

**EditorConfig**

Adicionar a extensão EditorConfig no VSCode e na raiz do projeto, clicar com botão direito do mouse e selecionar `Generate .editorconfig`
```
root = true

[*]
end_of_line = lf
indent_style = space
indent_size = 2
charset = utf-8
trim_trailing_whitespace = true
insert_final_newline = true
```

**ESLint**

Instalar o eslint como dependência de desenvolvimento
```bash
yarn add eslint -D
yarn eslint --init

> To check syntax, find problems, and enforce code style
> JavaScript modules (import/export)
> None of these
? Does your project use TypeScript? (y/N) y
? Where does your code run?
  Browser not selected
  Node selected
> Use a popular guide
> Airbnb
> JSON
Do you want to downgrade? (Y/n) n
Do you like to install them now with npm? (Y/n) n

yarn add -D @typescript-eslint/eslint-plugin@latest eslint-config-airbnb-base@latest eslint-plugin-import@^2.20.1 @typescript-eslint/parser@latest
```
Já criou o `.eslintrc.json` com algumas configurações.

Agora adicionar o eslint no VSCode no JSON de Settings:
```json
{
      "[javascript]": {
        "editor.codeActionsOnSave": {
            "source.fixAll.eslint": true
        }
    },
    "[javascriptreact]": {
        "editor.codeActionsOnSave": {
            "source.fixAll.eslint": true
        }
    },
    "[typescript]": {
        "editor.codeActionsOnSave": {
            "source.fixAll.eslint": true
        }
    },
    "[typescriptreact]": {
        "editor.codeActionsOnSave": {
            "source.fixAll.eslint": true
        }
    },
}
```
Salvar e ao voltar no `src/server.ts` é só salvar de novo que o ESLint vai arrumar automaticamente o código.

**Importando arquivos TS**
Adicionar no projeto `src/routes/index.ts`
```ts
import { Router } from 'express';

const routes = Router();

routes.get('/', (request, response) => response.json({ message: 'Hello Gostack' }));

export default routes;
```

Mas ao importar um arquivo `.ts`, dá um erro
```ts
import routes from './routes';
```

Então, precisamos instalar uma dependência
```bash
yarn add -D eslint-import-resolver-typescript
```

Em `.eslintrc.json` adicionar
```json
  "rules": {
    "import/extensions": [
      "error",
      "ignorePackages",
      {
        "ts": "never"
      }
    ]
  },
  "settings": {
    "import/resolver": {
      "typescript": {}
    }
  }
```

Agora `routes` se torna uma middleware. Então todas as rotas são adicionadas dentro do meu `app`
```ts
import express from 'express';
import routes from './routes';

const app = express();

app.use(routes);

app.listen(3333, () => {
  console.log('🚀 Server started on port 3333!');
});
```

**Prettier**

Adiciona as dependências do Prettier
```bash
yarn add -D prettier eslint-config-prettier eslint-plugin-prettier
```
Adicionar algumas configurações no `.eslintrc.json`
```json
{
  "extends": [
  "airbnb-base",
  "plugin:@typescript-eslint/recommended",
  "prettier/@typescript-eslint",
  "plugin:prettier/recommended"
  ],
    "plugins": [
    "@typescript-eslint",
    "prettier"
  ],
  "rules": {
    "prettier/prettier": "error",
    "import/extensions": [
      "error",
      "ignorePackages",
      {
        "ts": "never"
      }
    ]
  },
}
```

Abrir os arquivos e ver os erros que já estão apontando pelo Prettier. Ao salvar, já arrumou algumas coisas, porém conflitou com ESLint em outras. Como, por exemplo, trocou as aspas simples por aspas duplas.

Adicionar na raiz do projeto um arquivo `prettier.config.js`
```js
module.exports = {
  singleQuote: true,
  trailingComma: "all",
  arrowParens: "avoid",
};
```

Adiciona um arquivo `.eslintignore` para evitar do ESLint tentar configurar alguns arquivos
```
/*.js
node_modules
dist
```

**Debugando NodeJS**
Sem ser por `console.log`, no VSCode tem o botão de um 'bug' e é só clicar em *'create a launch.json file'* e selecionar Node.js.

Altera as configurações
```json
"configurations": [
  {
    "type": "node",
    "request": "attach",
    "protocol": "inspector",
    "restart": true,
    "name": "Debug",
    "skipFiles": [
      "<node_internals>/**"
    ],
    "outFiles": [
      "${workspaceFolder}/**/*.js"
    ]
  }
]
```

E roda a aplicação
```bash
yarn dev:server
```
Mas o debugger ainda não está conseguindo ser executado enquanto a aplicação roda. Então, temos que adicionar no script a flag `--inspect`
```json
  "scripts": {
    "build": "tsc",
    "dev:server": "ts-node-dev --inspect --transpileOnly --ignore-watch node_modules src/server.ts"
  },
```

E agora, enquanto roda a aplicação, já aparece `Debugger listening on ws://127.0.0.1:9229/....` e é só clicar no play do Debugger.

Na aba `DEBUG CONSOLE` já está rodando nosso Debugger.

**Como funciona o Debug?**
Alterando a rota de get
```ts
import { Router } from 'express';

const routes = Router();

routes.get('/users', (request, response) => {
  const { name, email } = request.body;
  const user = {
    name,
    email,
  };
  return response.json(user);
});

export default routes;
```

E ao rodar isso no Insomnia, dá um erro 500.

Para fazer debug pelo VSCode, é só adicionar a bolinha vermelha na linha do `request.body`, salvo e faço a requisição pelo Insomnia.

No 'VARIABLES' não aparece o `body` dentro do `request`.

No 'WATCH' do VSCode, adicionar o `request.body` e já vemos que está undefined.

Se adicionar, por exemplo, o `request.query` vai mostrar um objeto vazio.

Faltou adicionar no `server` o formato json na aplicação
```ts
app.use(express.json());
```

O 'CALL STACK' mostra tudo que foi executado até chegar nesse ponto do debug.

O 'LOADED SCRIPTS' mostra todos arquivos executados.

O 'BREAKPOINTS' deixa remover alguns breakpoints de forma manual e para exceções ou erros cairem como breakpoints também.

---
## GoBarber

### Agendamento (Appointments)

Limpar a `src/routes/index.ts` e criar o arquivo `src/routes/appointments.routes.ts`
```ts
import { Router } from 'express';

const appointmentsRouter = Router();

export default appointmentsRouter;
```

No `src/routes/index.ts`, vamos direcionar todas as rotas `'/appointments'` para o `appointmentsRouter`
```ts
import { Router } from 'express';
import appointmentsRouter from './appointments.routes';

const routes = Router();

routes.use('/appointments', appointmentsRouter);

export default routes;
```

Como toda rota `'/appointments'` cai em `appointmentsRouter`, então, nesse caso a rota do `post` é somente `'/'`
```ts
import { Router } from 'express';

const appointmentsRouter = Router();

appointmentsRouter.post('/', (request, response) => {
  return response.json({ message: 'Hello World' });
});

export default appointmentsRouter;
```

(Configuração de workspace GoBarber no Insomnia)

**Rota de POST**

Para criar um `appointment`, iremos utilizar o nome do profissional (provider) e a data (date) do atendimento.

Nossa aplicação tem que criar um `id` para cada atendimento. Dessa forma, vamos adicionar a dependência uuidv4 (unique universal id)
```bash
yarn add uuidv4
```

Por enquanto, não estamos persistindo os dados num banco. Então, continuamos adicionando cada novo `appointment` no array `appointments`
```ts
import { Router } from 'express';
import { uuid } from 'uuidv4';

const appointmentsRouter = Router();

const appointments = [];

appointmentsRouter.post('/', (request, response) => {
  const { provider, date } = request.body;

  const appointment = {
    id: uuid(),
    provider,
    date,
  };

  appointments.push(appointment);

  return response.json(appointment);
});
```

Testar a requisição de `post` pelo Insomnia, que já ajuda na criação de body com um `Timestamp` no formato correto
```json
{
	"provider": "Cintia",
	"date": "Timestamp => ISO-8601"
}
```

**Validação da data**

Permitir que os agendamentos ocorram somente em hora cheia.

Instalar o pacote `date-fns`
```bash
yarn add date-fns
```

Importar métodos `startOfHour`, que vai pegar a data e deixar no início da hora (sem minutos e sem segundos), e `parseISO`, que vai converter a data que vem em formato `string` para formato `Date` do Javascript.
```ts
import { Router } from 'express';
import { uuid } from 'uuidv4';
import { startOfHour, parseISO } from 'date-fns';

const appointmentsRouter = Router();

const appointments = [];

appointmentsRouter.post('/', (request, response) => {
  const { provider, date } = request.body;

  const parsedDate = startOfHour(parseISO(date));

  const appointment = {
    id: uuid(),
    provider,
    date: parsedDate,
  };

  appointments.push(appointment);

  return response.json(appointment);
});

export default appointmentsRouter;
```

Permitir que só haja 1 atendimento por horário.
```ts
// ...
import { startOfHour, parseISO, isEqual } from 'date-fns';

// ...
  const findAppointmentInSameDate = appointments.find(appointment =>
    isEqual(parsedDate, appointment.date),
  );

  if (findAppointmentInSameDate) {
    return response
      .status(400)
      .json({ message: 'The appointment hour is not available.' });
  }
// ...
```

Inserindo tipagem
```ts
interface Appointment {
  id: string;
  provider: string;
  date: Date;
}

const appointments: Appointment[] = [];
```

**Model de Agendamento**

Model, ou entidade, é o formato de um dado que vai ser armazenado.

Criar uma pasta `src/models` com o arquivo `Appointment.ts` e vamos escrevê-lo na forma de `class`
```ts
import { uuid } from 'uuidv4';

class Appointment {
  id: string;

  provider: string;

  date: Date;

  constructor(provider: string, date: Date) {
    this.id = uuid();
    this.provider = provider;
    this.date = date;
  }
}

export default Appointment;
```

Agora é só importar esse objeto no arquivo `src/routes/appointments.routes.ts`
```ts
// ...
import Appointment from '../models/Appointment';

// Remover interface Appointment
// ...
  const appointment = new Appointment(provider, parsedDate);
// ...
```

**Repositórios**

Persistência <-> Repositório <-> Rota

O Repositório é uma conexão entre a Persistência dos nossos dados com a nossa Rota.

Dentro do Repositório terei os métodos, por exemplo:
- find
- create

que irão criar, armazenar, ler, deletar, alterar os dados de Appointment.

Para cada `model` teremos um `repository`. Então, criamos o arquivo `src/repositories/AppointmentsRepository.ts` e construímos sua `class`
```ts
import Appointment from '../models/Appointment';

class AppointmentsRepository {
  private appointments: Appointment[];

  constructor() {
    this.appointments = [];
  }

  /**
   * create new appointment
   */
  public create(provider: string, date: Date): Appointment {
    const appointment = new Appointment(provider, date);

    this.appointments.push(appointment);

    return appointment;
  }
}

export default AppointmentsRepository;
```
O array de `appointments` está como `private`, pois não pode ser acessível por fora da classe. E passo o método de `create` para dentro desse `repository`

Em `src/routes/appointments.routes.ts`
```ts
// ...
import AppointmentsRepository from '../repositories/AppointmentsRepository';
// ...
  const appointment = appointmentsRepository.create(provider, parsedDate);
// ...
```

Como `appointments` é uma informação privada, temos que mover a busca pela data existente para dentro da `class` também

```ts
import { isEqual } from 'date-fns';

//...
  public findByDate(date: Date): Appointment | null {
    const findAppointment = this.appointments.find(appointment =>
      isEqual(date, appointment.date),
    );

    return findAppointment || null;
  }
// ...
```

E em `src/repositories/appointments.models.ts` alteramos
```ts
// ...
  const findAppointmentInSameDate = appointmentsRepository.findByDate(
    parsedDate,
  );
// ...
```

Ou seja, movemos para um arquivo repositório tudo que vai mexer na informação dos agendamentos. O repositório é detentor das operações realizadas em cima do nosso banco de dados, livrando a rota dessas responsabilidades.

Dessa forma, deixamos a responsabilidade do formato dos dados para `models` e a responsabilidade da maneira como os dados serão armazenados `repositories`

**Rota GET**
Listagem de agendamentos
`src/repositories/AppointmentsRepository.ts`
```ts
  public all(): Appointment[] {
    return this.appointments;
  }
```

`src/routes/appointments.routes.ts`
```ts
appointmentsRouter.get('/', (request, response) => {
  const appointments = appointmentsRepository.all();

  return response.json(appointments);
});
```

**SoC**

Separation of Concerns: Separação de preocupações, onde a rota tem que ter apenas uma preocupação.


**DTO**

Data Transfer Object: para transferir um dado de um arquivo para o outro, é sempre melhor tranferir um Objeto no Javascript.

Ao invés de enviar dois ou mais parâmetros, é melhor enviar um só e fazer a desestruturação.
Mudamos a estrutura para **parâmetros nomeados**.

```ts
interface CreateAppointment {
  provider: string;
  date: Date;
}
// ...
  public create({ provider, date }: CreateAppointment): Appointment {
// ...
```

```ts
  const appointment = appointmentsRepository.create({
    provider,
    date: parsedDate,
  });
```

**Omit**

Omit é uma função helper do Typescript que ajuda na tipagem. Ela recebe dois parâmetros: o tipo e a variável que quero omitir de dentro desse tipo.
`src/routes/appointments.routes.ts`
```ts
// ...
  constructor({ provider, date }: Omit<Appointment, 'id'>) {
// ...
```

`src/repositories/AppointmentsRepository.ts`
```ts
// ...
  public create({ provider, date }: CreateAppointment): Appointment {
    const appointment = new Appointment({ provider, date });
// ...
```
