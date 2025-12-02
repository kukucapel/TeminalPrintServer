const express = require('express');
const QRCode = require('qrcode');
const PDFDocument = require('pdfkit');
const printer = require('pdf-to-printer');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json());

// 80 мм → точки PDF (72 dpi)
const SIZE_MM = 80;
const DPI = 72;
const sizePx = (SIZE_MM / 25.4) * DPI;

// Путь к Unicode-шрифту
const FONT_PATH = path.join(__dirname, 'fonts', 'DejaVuSans.ttf');

app.post('/print', async (req, res) => {
  try {
    const { text, titleTop, titleBottom } = req.body;

    if (!text) return res.status(400).json({ error: 'text is required' });

    // QR картинка
    const qrPng = await QRCode.toBuffer(text);

    // PDF
    const filename = `qr_${Date.now()}.pdf`;
    const doc = new PDFDocument({
      size: [sizePx, sizePx],
      margins: { top: 0, left: 0, right: 0, bottom: 0 },
    });

    const stream = fs.createWriteStream(filename);
    doc.pipe(stream);

    // ЗАГРУЖАЕМ UNICODE ШРИФТ (важно!)
    doc.registerFont('unicode', FONT_PATH);
    doc.font('unicode');

    let y = 0;

    // Верхний текст
    if (titleTop) {
      doc.fontSize(16).text(titleTop, 0, y, {
        width: sizePx,
        align: 'center',
      });
      y += 30;
    }

    // QR-код
    const qrSize = sizePx - y - (titleBottom ? 30 : 0);

    doc.image(qrPng, (sizePx - qrSize) / 2, y, {
      width: qrSize,
      height: qrSize,
    });

    // Нижний текст
    if (titleBottom) {
      doc.fontSize(16).text(titleBottom, 0, sizePx - 30, {
        width: sizePx,
        align: 'center',
      });
    }

    doc.end();

    // Полностью закрываем поток
    stream.on('finish', () => stream.close());

    stream.on('close', async () => {
      try {
        await printer.print(filename, {
          // printer: "YourPrinter"
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

app.listen(3000, () => console.log('Running at http://localhost:3000'));
