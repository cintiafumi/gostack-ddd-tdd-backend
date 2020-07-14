interface IMailConfig {
  driver: 'ethereal' | 'ses';
  defaults: {
    from: {
      email: string;
      name: string;
    };
  };
}

export default {
  driver: process.env.MAIL_DRIVER || 'ethereal',

  defaults: {
    from: {
      email: 'cintiafumi@gmail.com',
      name: 'Cintia Fumi da CintiaFumi',
    },
  },
} as IMailConfig;
