const fs = require('fs');
const path = require('path');
const QRCode = require('qrcode');
const PDFDocument = require('pdfkit');

const SIZE_MM = 80;
const DPI = 72;
const PAGE = (SIZE_MM / 25.4) * DPI;

// Шрифт обязательно настоящий Unicode
const FONT_PATH = path.join(__dirname, 'fonts', 'DejaVuSans.ttf');

// Отступы
const PADDING_TOP = 15;
const PADDING_BOTTOM = 15;

// Размеры текста
const FONT_TOP = 12;
const FONT_BOTTOM = 8;

/**
 * Создаёт PDF 80×80 мм с верхним текстом, QR и нижним текстом.
 *
 * @param {string} text - содержимое QR
 * @param {string|null} titleTop - текст сверху
 * @param {string|null} titleBottom - текст снизу
 * @returns {Promise<string>} - путь к созданному PDF файлу
 */
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

      // ------ ВЕРХНИЙ ТЕКСТ ------
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

      // ------ НИЖНИЙ ТЕКСТ (merely measuring) ------
      let bottomHeight = 0;

      if (titleBottom) {
        doc.fontSize(FONT_BOTTOM);
        bottomHeight = doc.heightOfString(titleBottom, { width: PAGE - 20 });
      }

      // ------ Доступное место под QR ------
      const availableHeight = 100;

      // QR квадрат → вписываем
      const qrSize = Math.min(availableHeight, PAGE * 0.6);

      // ------ Рендер QR ------
      const qrX = (PAGE - qrSize) / 2;
      doc.image(qrBuffer, qrX, y, {
        width: qrSize,
        height: qrSize,
      });

      // ------ Нижний текст ------
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

module.exports = { createLabelFile };
