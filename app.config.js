module.exports = ({ config }) => {
  // Lê uma variável de ambiente para saber se é dev ou prod
  const isProd = process.env.APP_ENV === 'production';
  
  // Define o pacote dependendo do ambiente
  const packageName = isProd ? 'com.mmn.zenocash' : 'com.mmn.zenocash.dev';
  
  // Define o nome do app para diferenciar na tela do celular
  const appName = isProd ? 'Zeno Cash' : 'Zeno Cash (Dev)';
  
  // Define qual ícone usar
  // NOTA: O Expo recomenda fortemente o uso de arquivos .png para ícones.
  const appIcon = isProd ? './assets/icon.png' : './assets/icon-dev.png';

  return {
    ...config,
    name: appName,
    icon: appIcon,
    ios: {
      ...config.ios,
      bundleIdentifier: packageName,
    },
    android: {
      ...config.android,
      package: packageName,
    },
  };
};
