const express = require('express');
const printer = require('printer');
const QRCode = require('qrcode');

const app = express();
app.use(express.json());

const PRINTER_NAME = 'CUSTOM VKP80III';

app.post('/print', async (req, res) => {
  const { data } = req.body;
  if (!data) return res.status(400).send('missing data');

  try {
    // генерируем QR как buffer PNG в памяти
    const qrBuffer = await QRCode.toBuffer(data, {
      margin: 1,
      width: 600,
    });

    // отправляем в драйвер напрямую
    printer.printDirect({
      data: qrBuffer,
      type: 'PNG', // важно!
      printer: PRINTER_NAME,
      error: (err) => {
        console.error('Ошибка печати:', err);
        res.status(500).send('printer error');
      },
      success: () => {
        res.send('ok');
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('internal');
  }
});

app.listen(3333, () => console.log('Print server running on 3333'));
