import IMailTemplateParseDTO from '../dto/IMailTemplateParseDTO';

export default interface IMailTemplateProvider {
  parse(data: IMailTemplateParseDTO): Promise<string>;
}
