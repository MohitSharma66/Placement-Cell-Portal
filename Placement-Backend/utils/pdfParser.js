const pdf = require('pdf-parse');

class PDFParser {
  async extractText(pdfBuffer) {
    try {
      const data = await pdf(pdfBuffer);
      return data.text;
    } catch (error) {
      throw new Error('Failed to parse PDF: ' + error.message);
    }
  }
}

module.exports = PDFParser;