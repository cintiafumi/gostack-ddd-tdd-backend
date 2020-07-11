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
