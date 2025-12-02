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

// Пусть к Unicode-шрифту
const FONT_PATH = path.join(__dirname, 'fonts', 'DejaVuSans.ttf');

app.post('/print', async (req, res) => {
  try {
    const { text, titleTop, titleBottom } = req.body;

    if (!text) return res.status(400).json({ error: 'text is required' });

    // QR-код в буфер
    const qrPng = await QRCode.toBuffer(text);

    // Имя PDF
    const filename = `qr_${Date.now()}.pdf`;
    const stream = fs.createWriteStream(filename);

    const doc = new PDFDocument({
      size: [sizePx, sizePx],
      margins: { top: 0, left: 0, right: 0, bottom: 0 },
    });

    doc.pipe(stream);

    // Шрифт
    doc.registerFont('unicode', FONT_PATH);
    doc.font('unicode');

    // Внутренний отступ
    const padding = 10;

    let y = padding;

    // ------- Верхний текст (увеличен) -------
    if (titleTop) {
      doc.fontSize(20).text(titleTop, padding, y, {
        width: sizePx - padding * 2,
        align: 'center',
      });

      y += 28; // больше места под крупный текст
    }

    // ------- QR-код (уменьшен) -------
    // уменьшим QR ещё на паддинги сверху/снизу
    const bottomReserve = titleBottom ? 28 + padding : padding;
    const qrSize = sizePx - y - bottomReserve;

    const finalQR = qrSize * 0.85; // ещё +15% уменьшения чтобы точно всё влазило

    doc.image(qrPng, (sizePx - finalQR) / 2, y, {
      width: finalQR,
      height: finalQR,
    });

    // ------- Нижний текст -------
    if (titleBottom) {
      doc.fontSize(14).text(titleBottom, padding, sizePx - padding - 18, {
        width: sizePx - padding * 2,
        align: 'center',
      });
    }

    // -------------------------------------------------
    // ⚠️ Фейковая 2-я страница — фикс для исчезновения мигания
    // -------------------------------------------------
    doc.addPage({ size: [1, 1] });
    doc.text('', 0, 0); // полностью пустая
    // -------------------------------------------------

    doc.end();

    // завершение потока
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

app.listen(3000, () => console.log('Running at http://localhost:3000'));
