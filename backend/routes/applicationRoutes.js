const express = require('express');
const router = express.Router();
const logger = require('../utils/logger'); // 引入日誌工具
const AppError = require('../utils/appError'); // 引入自定義錯誤類別

const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

// 接收可攜式儲存媒體申請表單的資料
router.post('/', async (req, res, next) => {
  try {
    const { affiliatedUnit, applications: newApplications } = req.body;
    logger.info('📝 Received new application:', { affiliatedUnit, newApplications });

    const filePath = path.join(__dirname, '../applications.json');
    let allApplications = [];
    if (fs.existsSync(filePath)) {
      try {
        allApplications = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      } catch (e) {
        logger.warn('applications.json is corrupted or empty. Starting with a new array.');
        allApplications = [];
      }
    }

    const processedApps = newApplications.map(app => ({
      id: uuidv4(),
      affiliatedUnit: affiliatedUnit,
      ...app,
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));
    allApplications.push(...processedApps);
    fs.writeFileSync(filePath, JSON.stringify(allApplications, null, 2));
    res.status(200).json({ message: '申請已成功接收！' });
  } catch (error) {
    logger.error('❌ Error processing application:', error);
    next(new AppError('處理申請時發生錯誤。', 500));
  }
});

// 取得所有申請（管理者用）
router.get('/', async (req, res, next) => {
  try {
    const filePath = path.join(__dirname, '../applications.json');
    let applications = [];
    if (fs.existsSync(filePath)) {
      applications = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
    res.json(applications);
  } catch (error) {
    logger.error('❌ Error fetching applications:', error);
    next(new AppError('取得申請資料失敗', 500));
  }
});

// 取得某單位/組別的申請（申請人用）
router.get('/unit/:unit', async (req, res, next) => {
  try {
    const unit = req.params.unit;
    const filePath = path.join(__dirname, '../applications.json');
    let applications = [];
    if (fs.existsSync(filePath)) {
      applications = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
    // 根據主要單位 (affiliatedUnit) 進行過濾
    const filtered = applications.filter(app => app.affiliatedUnit === unit);
    res.json(filtered);
  } catch (error) {
    logger.error('❌ Error fetching unit applications:', error);
    next(new AppError('取得申請資料失敗', 500));
  }
});

// 更新申請狀態（管理者用）
router.patch('/:id/status', async (req, res, next) => {
  try {
    const id = req.params.id;
    const { status } = req.body;
    const filePath = path.join(__dirname, '../applications.json');
    let applications = [];
    if (fs.existsSync(filePath)) {
      applications = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
    const idx = applications.findIndex(app => app.id === id);
    if (idx === -1) return next(new AppError('找不到申請紀錄', 404));
    applications[idx].status = status;
    applications[idx].updatedAt = new Date().toISOString();
    fs.writeFileSync(filePath, JSON.stringify(applications, null, 2));
    res.json({ message: '狀態已更新', application: applications[idx] });
  } catch (error) {
    logger.error('❌ Error updating application status:', error);
    next(new AppError('更新申請狀態失敗', 500));
  }
});

module.exports = router;
