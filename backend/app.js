require('dotenv').config();
const express = require('express');
const multer = require('multer');
const sql = require('mssql');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');
const { authenticateJWT } = require('./auth');

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

const upload = multer({ dest: 'uploads/' });

const dbConfig = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  database: process.env.DB_DATABASE,
  options: {
    encrypt: process.env.DB_ENCRYPT === 'true',
    trustServerCertificate: true,
  },
};

// 登入取得 JWT
app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  console.log(`Login attempt for username: ${username}`); // Log username
  const users = JSON.parse(fs.readFileSync('users.json', 'utf-8'));
  const user = users.find((u) => u.username === username);

  if (user) {
    console.log('User found. Comparing passwords...');
    const isMatch = await bcrypt.compare(password, user.password);
    console.log(`Password match result: ${isMatch}`); // Log comparison result
    if (isMatch) {
      const token = jwt.sign({ username: user.username }, process.env.JWT_SECRET, {
        expiresIn: '1h',
      });
      res.json({ token });
    } else {
      res.status(401).send('Invalid credentials');
    }
  } else {
    console.log('User not found.');
    res.status(401).send('Invalid credentials');
  }
});

// Excel 上傳（需 JWT 驗證）
app.post('/upload', authenticateJWT, upload.single('file'), async (req, res) => {
  const filePath = req.file.path;
  try {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    const worksheet = workbook.getWorksheet(1); // 第一張工作表

    const rows = [];
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // 跳過標題列
      const [Category, AssetNumber, AssetName, Department, Custodian, ContactPerson, Remark, Status, LastAccessTime] = row.values.slice(1); // 跳過 index 0
      rows.push({
        Category: Category?.toString().trim() || '',
        AssetNumber: AssetNumber?.toString().trim() || '',
        AssetName: AssetName?.toString().trim() || '',
        Department: Department?.toString().trim() || '',
        Custodian: Custodian?.toString().trim() || '',
        ContactPerson: ContactPerson?.toString().trim() || '',
        Remark: Remark?.toString().trim() || '',
        Status: Status?.toString().trim() || '',
        LastAccrssTime: LastAccessTime? new Date(LastAccessTime) : null,
      });
    });
    console.log('📄 Excel 匯入結果：');
    console.table(rows); // 用表格顯示陣列內容
    res.send('✅ 資料讀取完成，已列印於 console');
    /*
    await sql.connect(dbConfig);

    for (let row of rows) {
      if (!row.name || !row.email || isNaN(row.age)) continue;

      await new sql.Request()
        .input('name', sql.VarChar, row.name)
        .input('email', sql.VarChar, row.email)
        .input('age', sql.Int, row.age)
        .query('INSERT INTO Users (name, email, age) VALUES (@name, @email, @age)');
    }

    res.send('✅ 資料匯入成功！');*/
  } catch (error) {
    console.error('❌ Excel 讀取失敗:',error);
    res.status(500).send('讀取失敗');
  } finally {
    fs.unlinkSync(filePath); // 清除上傳暫存檔
  }
});

// 取得 Excel 資料
app.get('/api/excel-data', async (req, res) => {
  const filePath = path.join(__dirname, 'uploads', 'test1.xlsx');

  try {
    if (!fs.existsSync(filePath)) {
      return res.status(404).send('Excel file not found.');
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    const worksheet = workbook.getWorksheet(1); // 假設是第一張工作表

    const rows = [];
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // 跳過標題列
      const rowData = {};
      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        // 使用第一列的標頭作為 JSON 的鍵
        const headerCell = worksheet.getRow(1).getCell(colNumber);
        rowData[headerCell.value] = cell.value;
      });
      rows.push(rowData);
    });

    res.json(rows);
  } catch (error) {
    console.error('❌ Error reading Excel file:', error);
    res.status(500).send('Error reading Excel file');
  }
});

app.listen(port, () => {
  console.log(`🚀 Server running at http://localhost:${port}`);
});
