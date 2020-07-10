interface ITemplateVariables {
  [key: string]: string | number;
}

export default interface IMailTemplateParseDTO {
  template: string;
  variables: ITemplateVariables;
}
