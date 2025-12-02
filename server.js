const express = require('express');
const QRCode = require('qrcode');
const PDFDocument = require('pdfkit');
const printer = require('pdf-to-printer');
const fs = require('fs');

const app = express();
app.use(express.json());

const PRINTER_NAME = 'CUSTOM VKP80III';
const SIZE_MM = 80;
const DPI = 72;
const sizeInPixels = (SIZE_MM / 25.4) * DPI; // 226 px

app.get('/test', async (req, res) => {
  res.status(200).send('Ok');
});

app.post('/print', async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: 'text is required' });

    // Генерируем QR PNG
    const qrPng = await QRCode.toBuffer(text);

    // Создаём PDF размером строго 80×80 мм
    const filename = `qr_${Date.now()}.pdf`;
    const doc = new PDFDocument({
      size: [sizeInPixels, sizeInPixels], // страница 80x80 мм
      margins: { top: 0, left: 0, right: 0, bottom: 0 },
    });

    const stream = fs.createWriteStream(filename);
    doc.pipe(stream);

    // Вставляем QR по размеру всей страницы
    doc.image(qrPng, 0, 0, { width: sizeInPixels, height: sizeInPixels });

    doc.end();

    stream.on('finish', async () => {
      // Печать PDF (Windows)
      await printer.print(filename);

      // Удаляем PDF
      fs.unlinkSync(filename);

      res.json({ status: 'printed 80x80 mm' });
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'internal error' });
  }
});

app.listen(3333, () => console.log('Print server running on 3333'));
