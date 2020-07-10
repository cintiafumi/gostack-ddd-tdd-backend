import IMailTemplateProvider from '../models/IMailTemplateProvider';
import IMailTemplateParseDTO from '../dto/IMailTemplateParseDTO';

class FakeMailTemplateProvider implements IMailTemplateProvider {
  public async parse({ template }: IMailTemplateParseDTO): Promise<string> {
    return template;
  }
}

export default FakeMailTemplateProvider;
