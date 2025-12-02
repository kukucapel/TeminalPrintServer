const express = require('express');
const QRCode = require('qrcode');
const PDFDocument = require('pdfkit');
const printer = require('pdf-to-printer');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json());

const SIZE_MM = 80;
const DPI = 72;
const sizePx = (SIZE_MM / 25.4) * DPI; // ≈ 226 px

const FONT_PATH = path.join(__dirname, 'fonts', 'DejaVuSans.ttf');

app.post('/print', async (req, res) => {
  try {
    const { text, titleTop, titleBottom } = req.body;
    if (!text) return res.status(400).json({ error: 'text is required' });

    const qrPng = await QRCode.toBuffer(text);

    const filename = `qr_${Date.now()}.pdf`;
    const stream = fs.createWriteStream(filename);

    const doc = new PDFDocument({
      size: [sizePx, sizePx],
      margins: { top: 0, left: 0, right: 0 },
    });

    doc.pipe(stream);

    doc.registerFont('unicode', FONT_PATH);
    doc.font('unicode');

    // Жёсткая разметка
    const TOP_PADDING = 10;
    const TOP_TEXT_SIZE = 14;
    const TOP_TEXT_HEIGHT = 16;
    const AFTER_TOP_TEXT = 10;
    const QR_SIZE = 150; // жестко фиксировано
    const BEFORE_BOTTOM_TEXT = 10;
    const BOTTOM_TEXT_SIZE = 12;
    const BOTTOM_TEXT_HEIGHT = 14;
    const BOTTOM_PADDING = 10;

    let y = TOP_PADDING;

    // ---- Верхний текст ----
    if (titleTop) {
      doc.fontSize(TOP_TEXT_SIZE).text(titleTop, 10, y, {
        width: sizePx - 20,
        align: 'center',
      });
    }

    y += TOP_TEXT_HEIGHT + AFTER_TOP_TEXT;

    // ---- QR фиксированного размера ----
    doc.image(qrPng, (sizePx - QR_SIZE) / 2, y, {
      width: QR_SIZE,
      height: QR_SIZE,
    });

    y += QR_SIZE + BEFORE_BOTTOM_TEXT;

    // ---- Нижний текст ----
    if (titleBottom) {
      doc.fontSize(BOTTOM_TEXT_SIZE).text(titleBottom, 10, y, {
        width: sizePx - 20,
        align: 'center',
      });
    }

    // ---- Фейковая страница для отключения мигания ----
    doc.addPage({ size: [1, 1] });
    doc.text('', 0, 0);

    doc.end();

    stream.on('finish', () => stream.close());

    stream.on('close', async () => {
      try {
        await printer.print(filename);
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
