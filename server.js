const express = require('express');
const escpos = require('escpos');
const QRCode = require('qrcode');

// USB поддержка
escpos.USB = require('escpos-usb');

const app = express();
app.use(express.json());

let device;
try {
  device = new escpos.USB(); // автоматически найдёт VPK80III
} catch (err) {
  console.log('USB принтер не найден:', err);
}

const printer = device ? new escpos.Printer(device) : null;

app.get('/test', async (req, res) => {
  res.status(200).send('Ok');
});

app.post('/print', async (req, res) => {
  if (!printer) return res.status(500).send('Принтер недоступен');

  const { data } = req.body;
  if (!data) return res.status(400).send("Параметр 'data' обязателен");

  try {
    // Генерируем QR в PNG buffer
    const qrBuffer = await QRCode.toBuffer(data, {
      width: 576,
      height: 576,
      errorCorrectionLevel: 'H',
      margin: 0,
    });
    device.open(() => {
      escpos.Image.load(qrBuffer, (image) => {
        printer.align('ct').raster(image).cut().close();

        res.send('ok');
      });
    });
  } catch (err) {
    console.error('Ошибка печати:', err);
    res.status(500).send('Ошибка генерации или печати');
  }
});

app.listen(3333, () => console.log('Print server running on port 3333'));
