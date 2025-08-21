const express = require('express');
const router = express.Router();
const logger = require('../utils/logger'); // 引入日誌工具
const AppError = require('../utils/appError'); // 引入自定義錯誤類別
const { authenticateJWT } = require('../auth'); // 引入認證中介軟體
const { readApplications, writeApplications } = require('../utils/applicationData');
const { generatePdf, cleanupFiles } = require('../utils/pdfGenerator');

const { v4: uuidv4 } = require('uuid');
const fsp = require('fs').promises;
const path = require('path');

const getTimestamp = () => new Date().toISOString();

// 接收可攜式儲存媒體申請表單的資料
router.post('/', async (req, res, next) => {
  // --- IP 清理邏輯 ---
  let sourceIp = req.ip;
  if (sourceIp) {
    // 處理 ::ffff:127.0.0.1 這種 IPv4-mapped IPv6 位址
    if (sourceIp.startsWith('::ffff:')) {
      sourceIp = sourceIp.substring(7);
    }
    // 如果是包含 port 的 IPv4 位址 (例如 XXX.XX.XX.XX:54492)，則移除 port
    if (sourceIp.includes('.') && sourceIp.includes(':')) {
      sourceIp = sourceIp.split(':')[0];
    }
  }
  // --- IP 清理邏輯結束 ---

  const start = Date.now();
  logger.info(`[${getTimestamp()}] [API] POST /applications 申請送出，收到資料 from IP: ${sourceIp}`, req.body);
  try {
    const { affiliatedUnit, applications: newApplications } = req.body;
    logger.info(`[${getTimestamp()}] [API] 申請資料解析`, { affiliatedUnit, newApplications });
    const allApplications = await readApplications();
    logger.info(`[${getTimestamp()}] [API] 目前所有申請數量:`, allApplications.length);

    const processedApps = newApplications.map(app => ({
      id: uuidv4(),
      affiliatedUnit: affiliatedUnit,
      ...app,
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      sourceIp: sourceIp, // 紀錄清理後的來源 IP
    }));
    allApplications.push(...processedApps);
    await writeApplications(allApplications);
    logger.info(`[${getTimestamp()}] [API] 新申請已加入，總申請數:`, allApplications.length);
    logger.info(`[${getTimestamp()}] [API] POST /applications 處理完成，耗時: ${Date.now() - start}ms`);
    res.status(200).json({ message: '申請已成功接收！' });
  } catch (error) {
    logger.error(`[${getTimestamp()}] [API] 申請處理失敗:`, error);
    next(new AppError('處理申請時發生錯誤。', 500));
  }
});

// 取得所有申請（管理者用）
router.get('/', authenticateJWT, async (req, res, next) => {
  const start = Date.now();
  logger.info(`[${getTimestamp()}] [API] GET /applications 管理者查詢所有申請`);
  try {
    const applications = await readApplications();
    logger.info(`[${getTimestamp()}] [API] 取得所有申請，數量:`, applications.length);
    logger.info(`[${getTimestamp()}] [API] GET /applications 處理完成，耗時: ${Date.now() - start}ms`);
    res.json(applications);
  } catch (error) {
    logger.error(`[${getTimestamp()}] [API] 取得所有申請失敗:`, error);
    next(new AppError('取得申請資料失敗', 500));
  }
});

// 取得某單位/組別的申請（申請人用）
router.get('/unit/:unit', async (req, res, next) => {
  const start = Date.now();
  logger.info(`[${getTimestamp()}] [API] GET /applications/unit/${req.params.unit} 申請人查詢`);
  try {
    const unit = req.params.unit;
    const applications = await readApplications();
    logger.info(`[${getTimestamp()}] [API] 取得所有申請，數量:`, applications.length);
    const filtered = applications.filter(app => app.affiliatedUnit === unit);
    logger.info(`[${getTimestamp()}] [API] 單位 ${unit} 申請數量:`, filtered.length);
    logger.info(`[${getTimestamp()}] [API] GET /applications/unit/${unit} 處理完成，耗時: ${Date.now() - start}ms`);
    res.json(filtered);
  } catch (error) {
    logger.error(`[${getTimestamp()}] [API] 取得單位申請失敗:`, error);
    next(new AppError('取得申請資料失敗', 500));
  }
});

// 撤回申請 (申請人用)
router.patch('/:id/withdraw', async (req, res, next) => {
  const start = Date.now();
  logger.info(`[${getTimestamp()}] [API] PATCH /applications/${req.params.id}/withdraw 撤回申請`);
  try {
    const { id } = req.params;
    const applications = await readApplications();
    logger.info(`[${getTimestamp()}] [API] 取得所有申請，數量:`, applications.length);
    
    const targetApp = applications.find(app => app.id === id);

    if (!targetApp) {
      return next(new AppError('找不到申請紀錄', 404));
    }

    // 只有在審核中的申請才能被撤回
    if (targetApp.status !== 'pending') {
      return next(new AppError('只有在審核中的申請才能被撤回。', 400));
    }

    const submissionIdToWithdraw = targetApp.submissionId;
    const withdrawnApps = []; // 用於存放被更新的申請

    if (submissionIdToWithdraw) {
      // 如果有 submissionId，則撤回所有相關且在審核中的申請
      applications.forEach(app => {
        if (app.submissionId === submissionIdToWithdraw && app.status === 'pending') {
          app.status = 'withdrawn';
          app.updatedAt = new Date().toISOString();
          withdrawnApps.push(app); // 將更新後的 app 加入陣列
        }
      });
      logger.info(`[${getTimestamp()}] [API] 根據 submissionId: ${submissionIdToWithdraw}，共撤回 ${withdrawnApps.length} 筆申請`);
    } else {
      // Fallback for old data without submissionId
      targetApp.status = 'withdrawn';
      targetApp.updatedAt = new Date().toISOString();
      withdrawnApps.push(targetApp); // 將更新後的 app 加入陣列
      logger.info(`[${getTimestamp()}] [API] 申請 ${id} (無 submissionId) 已撤回`);
    }

    if (withdrawnApps.length > 0) {
      await writeApplications(applications);
    }

    logger.info(`[${getTimestamp()}] [API] PATCH /applications/${id}/withdraw 處理完成，耗時: ${Date.now() - start}ms`);
    // 在回應中回傳被更新的申請資料
    res.json({ 
      message: `共 ${withdrawnApps.length} 筆申請已成功撤回`,
      withdrawnApps: withdrawnApps
    });
  } catch (error) {
    logger.error(`[${getTimestamp()}] [API] 撤回申請失敗:`, error);
    next(new AppError('撤回申請失敗', 500));
  }
});

// 更新申請狀態（管理者用）
router.patch('/:id/status', authenticateJWT, async (req, res, next) => {
  const start = Date.now();
  logger.info(`[${getTimestamp()}] [API] PATCH /applications/${req.params.id}/status 管理者更新狀態`, req.body);
  try {
    const id = req.params.id;
    const { status } = req.body;
    const applications = await readApplications();
    logger.info(`[${getTimestamp()}] [API] 取得所有申請，數量:`, applications.length);
    const idx = applications.findIndex(app => app.id === id);
    logger.info(`[${getTimestamp()}] [API] 更新申請 index: ${idx}`);
    if (idx === -1) return next(new AppError('找不到申請紀錄', 404));

    const application = applications[idx];
    application.status = status;
    application.updatedAt = new Date().toISOString();

    // 如果狀態更新為 "已核准"，則產生並儲存 PDF
    if (status === 'approved') {
      // --- Start of custom logic for {{number}} ---
      const { affiliatedUnit, custodian, id } = application;
      
      const userApplications = applications
        .filter(app => 
          app.status === 'approved' &&
          app.affiliatedUnit === affiliatedUnit &&
          app.custodian === custodian
        )
        .sort((a, b) => new Date(a.updatedAt) - new Date(b.updatedAt));

      const number = userApplications.findIndex(app => app.id === id) + 1;
      application.appl_number = number || 1;

      logger.info(`[PDF Number] Application for ${custodian} in ${affiliatedUnit}. New number: ${application.appl_number}`);
      // --- End of custom logic ---

      let tempFiles = {};
      try {
        // 1. 在暫存目錄中產生 PDF (現在 application 物件已包含 number)
        tempFiles = await generatePdf(application);

        // 2. 定義最終儲存路徑，檔名為申請 ID
        const finalPdfPath = path.join(__dirname, '..', 'pdfs', `${application.id}.pdf`);

        // 3. 將暫存 PDF 移動到最終位置
        await fsp.rename(tempFiles.pdfPath, finalPdfPath);

        logger.info(`✅ PDF for application ${id} saved to ${finalPdfPath}`);

        // 4. 清理暫存的 ODT 檔案
        await cleanupFiles([tempFiles.odtPath]);
      } catch (pdfError) {
        logger.error(`❌ PDF generation failed for application ${id}: ${pdfError.message}`);
        // 即使 PDF 產生失敗，我們仍然儲存申請狀態的更新，並回傳一個帶有警告的訊息
        await writeApplications(applications);
        return res.status(200).json({ message: '狀態已更新，但 PDF 產生失敗。', application });
      }
    }

    await writeApplications(applications);
    logger.info(`[${getTimestamp()}] [API] 申請 ${id} 狀態已更新為 ${status}`);
    logger.info(`[${getTimestamp()}] [API] PATCH /applications/${id}/status 處理完成，耗時: ${Date.now() - start}ms`);
    res.json({ message: '狀態已更新', application });
  } catch (error) {
    logger.error(`[${getTimestamp()}] [API] 更新申請狀態失敗:`, error);
    next(new AppError('更新申請狀態失敗', 500));
  }
});

// Regenerate PDF for an approved application
router.post('/:id/regenerate-pdf', async (req, res, next) => {
    try {
        const { id } = req.params;
        const applications = await readApplications();
        const application = applications.find(app => app.id === id);

        if (!application) {
            return next(new AppError('Application not found', 404));
        }

        if (application.status !== 'approved') {
            return next(new AppError('Cannot generate PDF for a non-approved application.', 400));
        }

        // --- Start of custom logic for {{number}} ---
        const approvedUserApps = applications
          .filter(app => 
            app.status === 'approved' && 
            app.affiliatedUnit === application.affiliatedUnit && 
            app.custodian === application.custodian
          )
          .sort((a, b) => new Date(a.updatedAt) - new Date(b.updatedAt));
        
        const number = approvedUserApps.findIndex(app => app.id === application.id) + 1;
        application.appl_number = number || 1; // Default to 1 if not found
        logger.info(`[PDF Number] REGENERATING for ${application.custodian} in ${application.affiliatedUnit}. Found ${approvedUserApps.length} apps. New number: ${application.appl_number}`);
        // --- End of custom logic ---

        // --- PDF Generation Logic ---
        let tempFiles = {};
        try {
            tempFiles = await generatePdf(application);
            const finalPdfPath = path.join(__dirname, '..', 'pdfs', `${application.id}.pdf`);
            await fsp.rename(tempFiles.pdfPath, finalPdfPath);
            logger.info(`✅ PDF for application ${id} REGENERATED and saved to ${finalPdfPath}`);
            await cleanupFiles([tempFiles.odtPath]);
        } catch (pdfError) {
            logger.error(`❌ PDF regeneration failed for application ${id}: ${pdfError.message}`);
            return next(new AppError('PDF regeneration failed.', 500));
        }
        // --- End of PDF Generation Logic ---

        res.status(200).json({ message: 'PDF 已成功重新產生。' });

    } catch (error) {
        logger.error('❌ Error regenerating PDF:', error);
        next(new AppError('Failed to regenerate PDF.', 500));
    }
});

// Download approved PDF
router.get('/:id/download', async (req, res, next) => {
    try {
        const { id } = req.params;
        const pdfPath = path.join(__dirname, '..', 'pdfs', `${id}.pdf`);

        // 1. 檢查檔案是否存在
        await fsp.access(pdfPath);
        const applications = await readApplications();
        const application = applications.find(app => app.id === id);

        if (!application) {
            // 這種情況很少見，但作為一個保險措施
            return next(new AppError('找不到對應的申請資料，無法確定檔名。', 404));
        }

        const filename = `可攜式儲存媒體申請單_${application.affiliatedUnit}_${application.custodian}.pdf`;
        
        // 3. 使用 res.download() 將檔案傳送給客戶端
        res.download(pdfPath, filename, (err) => {
            if (err) {
                logger.error(`下載申請 ${id} 的 PDF 時發生錯誤:`, err);
            }
        });
    } catch (error) {
        if (error.code === 'ENOENT') {
            // 回傳一個特定的 JSON 錯誤，讓前端可以識別並提示使用者
            return res.status(404).json({
                message: '找不到 PDF 檔案，可能尚未產生或已被移除。',
                code: 'PDF_NOT_FOUND'
            });
        }
        logger.error('❌ 下載 PDF 時發生錯誤:', error);
        next(new AppError('無法下載檔案。', 500));
    }
});

module.exports = router;
