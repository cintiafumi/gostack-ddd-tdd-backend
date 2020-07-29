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
