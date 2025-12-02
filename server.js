const express = require('express');
const QRCode = require('qrcode');
const PDFDocument = require('pdfkit');
const printer = require('pdf-to-printer');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json());

// 80 мм → PDF в dpi=72
const SIZE_MM = 80;
const DPI = 72;
const sizePx = (SIZE_MM / 25.4) * DPI;

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
      margins: { top: 0, left: 0, right: 0, bottom: 0 },
    });

    doc.pipe(stream);
    doc.registerFont('unicode', FONT_PATH).font('unicode');

    const padding = 10;
    let y = padding;

    // ---------- Верхний текст (умеренный, точно влезает) ----------
    if (titleTop) {
      doc.fontSize(14).text(titleTop, padding, y, {
        width: sizePx - padding * 2,
        align: 'center',
      });

      y += 20; // расстояние после текста
    }

    // ---------- QR-код ----------
    // Заранее резервируем место на нижний текст
    const bottomReserve = titleBottom ? 30 : 10;

    // Максимальный размер QR — 60% площади + гарантированный запас
    const availableHeight = sizePx - y - bottomReserve;
    const finalQR = Math.min(availableHeight, sizePx * 0.55);

    doc.image(qrPng, (sizePx - finalQR) / 2, y, {
      width: finalQR,
      height: finalQR,
    });

    y += finalQR + 10;

    // ---------- Нижний текст (компактный) ----------
    if (titleBottom) {
      doc.fontSize(11).text(titleBottom, padding, sizePx - padding - 16, {
        width: sizePx - padding * 2,
        align: 'center',
      });
    }

    // ---------- Фейковая страница (фикс мигания) ----------
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
