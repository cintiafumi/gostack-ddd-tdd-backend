import IMAilTemplateParseDTO from '@shared/container/providers/MailTemplateProvider/dto/IMailTemplateParseDTO';

interface IMailContact {
  name: string;
  email: string;
}

export default interface ISendMailDTO {
  to: IMailContact;
  from?: IMailContact;
  subject: string;
  templateData: IMAilTemplateParseDTO;
}
