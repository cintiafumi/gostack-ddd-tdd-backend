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
