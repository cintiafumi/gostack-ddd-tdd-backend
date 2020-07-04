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
