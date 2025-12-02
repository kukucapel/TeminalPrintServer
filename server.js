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

// Путь к Unicode-шрифту
const FONT_PATH = path.join(__dirname, 'fonts', 'DejaVuSans.ttf');

app.post('/print', async (req, res) => {
  try {
    const { text, titleTop, titleBottom } = req.body;

    if (!text) return res.status(400).json({ error: 'text is required' });

    // QR-код
    const qrPng = await QRCode.toBuffer(text);

    // PDF файл
    const filename = `qr_${Date.now()}.pdf`;
    const stream = fs.createWriteStream(filename);

    const doc = new PDFDocument({
      size: [sizePx, sizePx],
      margins: { top: 0, left: 0, right: 0, bottom: 0 },
    });

    doc.pipe(stream);

    // Подключаем Unicode-шрифт
    doc.registerFont('unicode', FONT_PATH);
    doc.font('unicode');

    // Внутренние отступы
    const padding = 10;
    let y = padding;

    // ------- Верхний текст (16 pt) -------
    if (titleTop) {
      doc.fontSize(16).text(titleTop, padding, y, {
        width: sizePx - padding * 2,
        align: 'center',
      });

      y += 24; // место после текста
    }

    // ------- QR-код (уменьшен) -------
    const bottomReserve = titleBottom ? 22 + padding : padding;
    const qrSize = sizePx - y - bottomReserve;
    const finalQR = qrSize * 0.85;

    doc.image(qrPng, (sizePx - finalQR) / 2, y, {
      width: finalQR,
      height: finalQR,
    });

    // ------- Нижний текст (12 pt) -------
    if (titleBottom) {
      doc.fontSize(12).text(titleBottom, padding, sizePx - padding - 16, {
        width: sizePx - padding * 2,
        align: 'center',
      });
    }

    // ----------------------------------------------------
    // ⚠️ Фейковая 2-я страница — фикс мигания принтера
    // ----------------------------------------------------
    doc.addPage({ size: [1, 1] });
    doc.text('', 0, 0);
    // ----------------------------------------------------

    doc.end();

    // Закрываем поток PDF
    stream.on('finish', () => stream.close());

    stream.on('close', async () => {
      try {
        await printer.print(filename, {
          // Если нужно указать принтер:
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

app.listen(3000, () => console.log('Running at http://localhost:3000'));
