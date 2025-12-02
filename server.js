const express = require('express');
const QRCode = require('qrcode');
const PDFDocument = require('pdfkit');
const printer = require('pdf-to-printer');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json());

// 80 мм → точки (72 dpi)
const SIZE_MM = 80;
const DPI = 72;
const sizePx = (SIZE_MM / 25.4) * DPI;

// Unicode-шрифт
const FONT_PATH = path.join(__dirname, 'fonts', 'DejaVuSans.ttf');

// Функция авто-уменьшения шрифта до нужной ширины
function fitText(doc, text, maxWidth, initialSize) {
  let size = initialSize;
  doc.fontSize(size);
  while (doc.widthOfString(text) > maxWidth && size > 6) {
    size -= 1;
    doc.fontSize(size);
  }
  return size;
}

app.post('/print', async (req, res) => {
  try {
    const { text, titleTop, titleBottom } = req.body;

    if (!text) return res.status(400).json({ error: 'text is required' });

    const qrPng = await QRCode.toBuffer(text);

    const filename = `qr_${Date.now()}.pdf`;
    const doc = new PDFDocument({
      size: [sizePx, sizePx],
      margins: { top: 0, left: 0, right: 0, bottom: 0 },
    });

    const stream = fs.createWriteStream(filename);
    doc.pipe(stream);

    doc.registerFont('unicode', FONT_PATH);
    doc.font('unicode');

    let y = 0;

    // Верхний текст (авто-уменьшение)
    if (titleTop) {
      const fontSize = fitText(doc, titleTop, sizePx - 10, 14);
      doc.fontSize(fontSize).text(titleTop, 0, y, {
        width: sizePx,
        align: 'center',
      });
      y += fontSize + 6;
    }

    // QR-код (оставляем место под нижний текст)
    const qrPaddingBottom = titleBottom ? 25 : 0;
    const qrSize = sizePx - y - qrPaddingBottom;

    doc.image(qrPng, (sizePx - qrSize) / 2, y, {
      width: qrSize,
      height: qrSize,
    });

    // Нижний текст (авто-уменьшение)
    if (titleBottom) {
      const fontSizeB = fitText(doc, titleBottom, sizePx - 10, 14);
      doc.fontSize(fontSizeB).text(titleBottom, 0, sizePx - (fontSizeB + 6), {
        width: sizePx,
        align: 'center',
      });
    }

    doc.end();

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
