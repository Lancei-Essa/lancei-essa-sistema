const fileUpload = require('express-fileupload');
const path = require('path');
const fs = require('fs');
const { promisify } = require('util');
const mkdirAsync = promisify(fs.mkdir);

// Cria a pasta para uploads se não existir
const createUploadDir = async () => {
  const uploadDir = path.join(__dirname, '../uploads');
  try {
    await mkdirAsync(uploadDir, { recursive: true });
  } catch (error) {
    if (error.code !== 'EEXIST') {
      console.error('Erro ao criar diretório de uploads:', error);
    }
  }
  return uploadDir;
};

// Middleware para upload de arquivos
const uploadMiddleware = fileUpload({
  createParentPath: true,
  limits: { 
    fileSize: 1024 * 1024 * 500 // 500 MB (limite para vídeos grandes)
  },
  abortOnLimit: true,
  useTempFiles: true,
  tempFileDir: path.join(__dirname, '../uploads/temp/')
});

// Verificar se é um arquivo de vídeo válido
const isValidVideoFile = (file) => {
  const validMimeTypes = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/x-ms-wmv'];
  return validMimeTypes.includes(file.mimetype);
};

// Verificar se é um arquivo de imagem válido
const isValidImageFile = (file) => {
  const validMimeTypes = ['image/jpeg', 'image/png', 'image/jpg'];
  return validMimeTypes.includes(file.mimetype);
};

// Middleware para upload de imagens
const imageUploadMiddleware = fileUpload({
  createParentPath: true,
  limits: { 
    fileSize: 1024 * 1024 * 10 // 10 MB (limite para imagens)
  },
  abortOnLimit: true,
  useTempFiles: true,
  tempFileDir: path.join(__dirname, '../uploads/temp/')
});

// Middleware para upload de múltiplos arquivos
const multipleFilesUploadMiddleware = fileUpload({
  createParentPath: true,
  limits: { 
    fileSize: 1024 * 1024 * 500 // 500 MB
  },
  abortOnLimit: true,
  useTempFiles: true,
  tempFileDir: path.join(__dirname, '../uploads/temp/'),
  safeFileNames: true,
  preserveExtension: true
});

module.exports = {
  uploadMiddleware,
  imageUploadMiddleware,
  multipleFilesUploadMiddleware,
  createUploadDir,
  isValidVideoFile,
  isValidImageFile
};