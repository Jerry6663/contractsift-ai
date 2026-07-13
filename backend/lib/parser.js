/**
 * Document parser: PDF/DOCX/TXT
 * Uses pdf-parse v2 (based on pdf.js) for PDF extraction
 */
const fs = require('fs');
const path = require('path');

async function parseText(content, ext) {
  switch (ext) {
    case 'txt':
      return content.toString('utf8');
    case 'pdf':
      return parsePDF(content);
    case 'docx':
      return parseDOCX(content);
    default:
      throw new Error(`Unsupported file type: ${ext}`);
  }
}

async function parsePDF(buffer) {
  try {
    const { PDFParse, VerbosityLevel } = require('pdf-parse');
    const parser = new PDFParse({
      data: new Uint8Array(buffer),
      verbosity: VerbosityLevel.ERRORS
    });
    const data = await parser.getText();
    const text = (data?.text || data || '').trim();
    if (text.length > 20) {
      return text;
    }
    // Very little text extracted — likely a scanned/image PDF
    return 'PDF解析完成，但提取的文本内容非常少（' + text.length + '字符）。该文件可能是扫描件或图片型PDF，请上传文字版PDF或TXT格式。';
  } catch (err) {
    return 'PDF解析失败: ' + err.message + '。请尝试将文件转换为TXT格式后上传。';
  }
}

function parseDOCX(buffer) {
  // DOCX is a ZIP archive containing XML
  try {
    const tmpPath = path.join(__dirname, '..', 'uploads', `_tmp_${Date.now()}.docx`);
    fs.writeFileSync(tmpPath, buffer);
    try {
      // Try unzip
      let documentXml = '';
      try {
        documentXml = require('child_process').execSync(`unzip -p "${tmpPath}" word/document.xml 2>nul`, { encoding: 'utf8', timeout: 10000 });
      } catch {}
      
      if (!documentXml) {
        // Try 7z
        try {
          const tmpDir = path.join(__dirname, '..', 'uploads', `_tmp_docx_${Date.now()}`);
          require('child_process').execSync(`7z x "${tmpPath}" -o"${tmpDir}" word/document.xml -y 2>nul`, { timeout: 10000 });
          const xmlPath = path.join(tmpDir, 'word', 'document.xml');
          if (fs.existsSync(xmlPath)) {
            documentXml = fs.readFileSync(xmlPath, 'utf8');
          }
          try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
        } catch {}
      }
      
      if (documentXml) {
        return documentXml.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
      }
    } finally {
      try { fs.unlinkSync(tmpPath); } catch {}
    }
  } catch {}
  
  // Fallback
  try {
    const text = buffer.toString('utf8');
    const extracted = text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    return extracted || '无法从DOCX中提取文本';
  } catch {
    return '无法从DOCX中提取文本';
  }
}

module.exports = { parseText };
