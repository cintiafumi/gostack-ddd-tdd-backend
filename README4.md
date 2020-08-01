[↩ Voltar](README3.md)

# Ajustes na API
## Utilizando Query Params
Na rota de GET em `ProviderAppointmentsController`, `ProviderDayAvailabilityController` e `ProviderMonthAvailability`, não conseguimos pegar o `body` pela requisição GET. Então, alteramos para query params
```ts
//...
    const { year, month, day } = request.query;
    //...
      year: Number(year),
      month: Number(month),
      day: Number(day),
```

## Agendamentos no mesmo horário
Outro ajuste é que não estávamos verificando o `provider_id` quando verificávamos se um determinado horário estava ocupado. Isso barrava a agenda de todos os providers. Para arrumar, consertamos os arquivos `CreateAppointmentService`, `IAppointmentsRepository`, `FakeAppointmentsRepository` e `AppointmentsRepository` para então receber o `provider_id` como parâmetro.
```ts
//...
findByDate(date: Date, provider_id: string)
```

## Dias indisponíveis no mês
Em `ListProviderMonthAvailabilityService` não estamos verificando se a data daquele mês passou.
```ts
//...
    const availability = eachDayArray.map(day => {
      const compareDate = new Date(year, month - 1, day, 23, 59, 59);

      const appointmentsInDay = appointments.filter(appointment => {
        return getDate(appointment.date) === day;
      });

      return {
        day,
        available:
          isAfter(compareDate, new Date()) && appointmentsInDay.length < 10,
      };
    });
```

## Cliente dos agendamentos
Precisamos capturar o avatar e o nome dos clientes agendados. Algumas formas de fazer isso:

- `eager`: vai sempre trazer o dado junto na entity `Appointment`
```ts
  @ManyToOne(() => User, { eager: true })
```

- `lazy`: vai trazer como se fosse um objeto na entity `Appointment`. E depois podemos fazer: `const user = await appointments.user`.
```ts
  @ManyToOne(() => User, { lazy: true })
```

- `eager loading`: que vai fazer uma query só no banco. Vai trazer já todos users de uma vez. E fazemos isso diretamente no repositório `AppointmentsRepository`
```ts
//...
  public async findAllInDayFromProvider({
    provider_id,
    day,
    month,
    year,
  }: IFindAllInDayFromProviderDTO): Promise<Appointment[]> {
    //...
    const appointments = await this.ormRepository.find({
      where: {
        provider_id,
        date: Raw(
          dateFieldName =>
            `to_char(${dateFieldName}, 'DD-MM-YYYY') = '${parsedDay}-${parsedMonth}-${year}'`,
        ),
      },
      relations: ['user'],
    });
```

Somente modificando a rota em `SendForgotPasswordEmailService` para
```ts
          link: `${process.env.APP_WEB_URL}/reset-password?token=${token}`,
```

---

E vimos que algumas imagens não estavam carregando no front, então, voltamos para trocar a order em `server.ts`
```ts
app.use(cors());
app.use(express.json());
app.use('/files', express.static(uploadConfig.uploadFolder));
app.use(rateLimiter); // deixar após o carregamento das imagens
app.use(routes);
```
