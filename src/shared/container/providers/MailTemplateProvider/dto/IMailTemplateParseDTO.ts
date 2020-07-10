interface ITemplateVariables {
  [key: string]: string | number;
}

export default interface IMailTemplateParseDTO {
  file: string;
  variables: ITemplateVariables;
}
