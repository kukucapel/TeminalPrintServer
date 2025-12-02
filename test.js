const { createLabelFile } = require('./createFile');

(async () => {
  const file = await createLabelFile(
    'https://avatars.mds.yandex.net/i?id=fe0d5e06b805a921ab68ca227e8f049ee534ba75-14362031-images-thumbs&n=13',
    'Администрация городского округа города Калуги',
    'Отсканируйте QR-код для отслеживания статуса заявки.'
  );

  console.log('PDF готов:', file);
})();
