const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const QRCode = require('qrcode');
const PDFDocument = require('pdfkit');
const printer = require('pdf-to-printer'); // ← печать

const app = express();
app.use(
  cors({
    origin: '*',
  })
);
app.use(express.json());

const SIZE_MM = 80;
const DPI = 72;
const PAGE = (SIZE_MM / 25.4) * DPI;

const FONT_PATH = path.join(__dirname, 'fonts', 'DejaVuSans.ttf');

const PADDING_TOP = 15;
const PADDING_BOTTOM = 15;

const FONT_TOP = 12;
const FONT_BOTTOM = 8;

// ⭐ ТВОЯ ФУНКЦИЯ (НЕ МЕНЯЛ НИ ОДНОГО ЧИСЛА)
async function createLabelFile(text, titleTop = '', titleBottom = '') {
  return new Promise(async (resolve, reject) => {
    try {
      if (!text) throw new Error('QR text is required');

      const qrBuffer = await QRCode.toBuffer(text);
      const filename = path.join(__dirname, `label_${Date.now()}.pdf`);

      const doc = new PDFDocument({
        size: [PAGE, PAGE],
        margins: { top: 0, left: 0, right: 0, bottom: 0 },
      });

      const stream = fs.createWriteStream(filename);
      doc.pipe(stream);

      doc.registerFont('unicode', FONT_PATH);
      doc.font('unicode');

      let y = PADDING_TOP;

      let topHeight = 0;
      if (titleTop) {
        doc.fontSize(FONT_TOP);
        topHeight = doc.heightOfString(titleTop, { width: PAGE - 20 });
        doc.text(titleTop, 10, y, {
          width: PAGE - 20,
          align: 'center',
        });
        y += topHeight + 10;
      }

      let bottomHeight = 0;
      if (titleBottom) {
        doc.fontSize(FONT_BOTTOM);
        bottomHeight = doc.heightOfString(titleBottom, { width: PAGE - 20 });
      }

      // ← как у тебя: фиксированная доступная высота
      const availableHeight = 100;

      const qrSize = Math.min(availableHeight, PAGE * 0.6);

      const qrX = (PAGE - qrSize) / 2;
      doc.image(qrBuffer, qrX, y, {
        width: qrSize,
        height: qrSize,
      });

      if (titleBottom) {
        doc.fontSize(FONT_BOTTOM);
        doc.text(titleBottom, 10, y + qrSize + 10, {
          width: PAGE - 20,
          align: 'center',
        });
      }

      doc.end();

      stream.on('finish', () => resolve(filename));
      stream.on('error', reject);
    } catch (err) {
      reject(err);
    }
  });
}

// ⭐ СЕРВЕР ПЕЧАТИ
app.post('/print', async (req, res) => {
  try {
    const { text, titleTop, titleBottom, printerName } = req.body;

    const file = await createLabelFile(text, titleTop, titleBottom);

    await printer.print(file, {
      printer: printerName || undefined, // можно передавать имя принтера
    });

    // удаляем после печати
    fs.unlink(file, () => {});

    res.json({ status: 'printed' });
  } catch (err) {
    console.error('PRINT ERROR:', err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(3000, () => console.log('PRINT SERVER READY'));
