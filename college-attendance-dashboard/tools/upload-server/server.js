const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const UPLOAD_DIR = path.join(__dirname, 'uploads');
if(!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname.replace(/\s+/g,'_'))
});
const upload = multer({ storage });

const app = express();
app.use('/uploads', express.static(UPLOAD_DIR));

app.post('/upload', upload.single('file'), (req, res) => {
  if(!req.file) return res.status(400).json({ error: 'No file' });
  const url = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
  return res.json({ url, filename: req.file.filename });
});

const port = process.env.PORT || 4001;
app.listen(port, () => console.log(`Upload server running on http://localhost:${port}`));
