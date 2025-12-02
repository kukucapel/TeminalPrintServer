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
const sizePx = (SIZE_MM / 25.4) * DPI; // ≈226px

app.get('/test', async (req, res) => {
  res.status(200).send('Ok');
});

app.post('/print', async (req, res) => {
  try {
    const { text, titleTop, titleBottom } = req.body;

    if (!text) return res.status(400).json({ error: 'text is required' });

    // Генерируем QR PNG
    const qrPng = await QRCode.toBuffer(text);

    // Создаём PDF 80×80 мм
    const filename = `qr_${Date.now()}.pdf`;
    const doc = new PDFDocument({
      size: [sizePx, sizePx],
      margins: { top: 0, left: 0, right: 0, bottom: 0 },
    });

    const stream = fs.createWriteStream(filename);
    doc.pipe(stream);

    let y = 0;

    // ---------- ТЕКСТ СВЕРХУ ----------
    if (titleTop) {
      doc.fontSize(14);
      doc.text(titleTop, 0, y, {
        width: sizePx,
        align: 'center',
      });
      y += 28; // оставляем место под текст
    }

    // ---------- QR В СЕРЕДИНЕ ----------
    const qrSize = sizePx - y - (titleBottom ? 28 : 0);
    // выделим ~28px под нижний текст

    doc.image(qrPng, (sizePx - qrSize) / 2, y, {
      width: qrSize,
      height: qrSize,
    });

    // ---------- ТЕКСТ СНИЗУ ----------
    if (titleBottom) {
      doc.fontSize(14);
      doc.text(titleBottom, 0, sizePx - 28, {
        width: sizePx,
        align: 'center',
      });
    }

    doc.end();

    // Корректно закрываем pdf-файл
    stream.on('finish', () => stream.close());

    stream.on('close', async () => {
      try {
        await printer.print(filename, {
          // printer: "YourPrinterName"
        });
      } catch (err) {
        console.error('Print error:', err);
      }

      fs.unlinkSync(filename);
      res.json({ status: 'printed' });
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'internal error' });
  }
});

app.listen(3333, () => console.log('Print server running on 3333'));
