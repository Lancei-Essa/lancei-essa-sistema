const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    console.log('Iniciando conexão ao MongoDB...');
    
    // Usar MONGO_URI como definido no arquivo .env do script start.sh
    // ou MONGODB_URI se estiver definido (permitir ambos os formatos)
    const uri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/lancei-essa';
    
    console.log(`Tentando conectar a: ${uri.substring(0, uri.indexOf('://') + 3)}...`);
    
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000, // Reduzir timeout para 5 segundos
      socketTimeoutMS: 5000           // Reduzir timeout para 5 segundos
    });
    
    console.log(`✅ MongoDB conectado em: ${conn.connection.host}`);
    return true;
  } catch (error) {
    console.error('❌ Erro de conexão:', error.message);
    console.error('Tipo de erro:', error.name);
    
    // Fornecer mensagens mais úteis baseadas no tipo de erro
    if (error.name === 'MongoNetworkError' || error.message.includes('failed to connect')) {
      console.error('O MongoDB não está acessível. Verifique se:');
      console.error('1. O serviço MongoDB está rodando (para conexões locais)');
      console.error('2. A URI de conexão está correta');
      console.error('3. Há conectividade de rede com o servidor MongoDB');
    }
    
    return false;
  }
};

module.exports = connectDB;