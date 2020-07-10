import handlebars from 'handlebars';
import fs from 'fs';

import IMailTemplateProvider from '../models/IMailTemplateProvider';
import IMailTemplateParseDTO from '../dto/IMailTemplateParseDTO';

class HandlebarsMailTemplateProvider implements IMailTemplateProvider {
  public async parse({
    file,
    variables,
  }: IMailTemplateParseDTO): Promise<string> {
    const templateFileContent = await fs.promises.readFile(file, {
      encoding: 'utf-8',
    });
    const parseTemplate = handlebars.compile(templateFileContent);
    return parseTemplate(variables);
  }
}

export default HandlebarsMailTemplateProvider;
