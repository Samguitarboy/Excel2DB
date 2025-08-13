const fs = require('fs').promises;
const path = require('path');
const PizZip = require('pizzip');
const { exec } = require('child_process');
const { promisify } = require('util');
const AppError = require('./appError');
const logger = require('./logger');

const execPromise = promisify(exec);

const templatePath = path.join(__dirname, '..', 'templates', 'template.odt');
const tempDir = path.join(__dirname, '..', 'temp');
const pdfsDir = path.join(__dirname, '..', 'pdfs');

// 確保暫存與輸出的目錄存在
(async () => {
  try {
    await fs.mkdir(tempDir, { recursive: true });
    await fs.mkdir(pdfsDir, { recursive: true });
  } catch (error) {
    logger.error('Could not create temp/pdfs directories', error);
  }
})();

/**
 * 根據申請資料產生 PDF 檔案
 * @param {object} applicationData - 包含 custodian, affiliatedUnit, reason 等的申請資料
 * @returns {Promise<string>} 產生的 PDF 檔案路徑
 */
async function generatePdf(applicationData) {
  const sofficePath = process.env.SOFFICE_PATH;
  if (!sofficePath) {
    logger.error('SOFFICE_PATH environment variable is not set.');
    throw new AppError('SOFFICE_PATH environment variable is not set.', 500);
  }

  const uniqueId = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  const odtPath = path.join(tempDir, `${uniqueId}.odt`);
  const pdfPath = path.join(tempDir, `${uniqueId}.pdf`);

  try {
    // 1. 讀取範本
    const content = await fs.readFile(templatePath).catch(err => {
      logger.error(`Failed to read ODT template at ${templatePath}`, { error: err.message });
      throw new AppError('Could not read PDF template.', 500);
    });

    const zip = new PizZip(content);
    const contentXmlFile = zip.file('content.xml');
    if (!contentXmlFile) {
      throw new AppError('content.xml not found in the ODT template.', 500);
    }
    let contentXml = contentXmlFile.asText();
    // 2. 準備替換資料
    const today = new Date();
    const replacements = {
      custodian: applicationData.custodian || '',
      year: (today.getFullYear() - 1911).toString(),
      month: (today.getMonth() + 1).toString().padStart(2, '0'),
      day: today.getDate().toString().padStart(2, '0'),
      affiliatedUnit: applicationData.affiliatedUnit || '',
      reason: applicationData.reason ? `單位需申請超過一隻原因：${applicationData.reason}` : ''
    };

    // 3. 替換佔位符
    for (const [key, value] of Object.entries(replacements)) {
      const pattern = new RegExp(`{{${key}}}`, 'g');
      // 簡易的 XML 特殊字元跳脫，防止內容破壞 XML 結構
      const escapedValue = String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
      contentXml = contentXml.replace(pattern, escapedValue);
    }

    // 4. 寫入暫存 ODT
    zip.file('content.xml', contentXml);
    const buffer = zip.generate({ type: 'nodebuffer' });
    await fs.writeFile(odtPath, buffer);

    // 5. 執行 soffice 指令轉換為 PDF
    const command = `"${sofficePath}" --headless --convert-to pdf "${odtPath}" --outdir "${tempDir}"`;
    try {
      const { stdout, stderr } = await execPromise(command);
      if (stderr) {
        logger.warn(`soffice command produced stderr for application ${applicationData.id}:`, stderr);
      }
      logger.info(`soffice command stdout for application ${applicationData.id}:`, stdout);
    } catch (execError) {
      logger.error(`soffice command execution failed for application ${applicationData.id}`, { command, error: execError.message, stderr: execError.stderr });
      throw new AppError('PDF conversion command failed.', 500);
    }

    // 6. 檢查 PDF 是否已產生
    await fs.access(pdfPath).catch(err => {
      logger.error(`Converted PDF file not found at ${pdfPath} for application ${applicationData.id}`);
      throw new AppError('PDF file was not created after conversion.', 500);
    });

    return { pdfPath, odtPath, uniqueId };

  } catch (error) {
    logger.error(`❌ PDF generation process failed for application ${applicationData.id}: ${error.message}`, { applicationData });
    // 在拋出錯誤前先嘗試清理檔案
    await cleanupFiles([odtPath, pdfPath]);
    throw new AppError('PDF generation failed.', 500);
  }
}

async function cleanupFiles(files) {
    for (const file of files) {
        if (file) try { await fs.unlink(file); } catch (e) { logger.warn(`Could not clean up temp file: ${file}`, e); }
    }
}

module.exports = { generatePdf, cleanupFiles };