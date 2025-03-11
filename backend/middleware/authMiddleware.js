const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Middleware para proteger rotas (verificar JWT)
const protect = async (req, res, next) => {
  try {
    let token;
    
    // Verificar se o token está no header de autorização
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      // Extrair token do header
      token = req.headers.authorization.split(' ')[1];
    }
    
    // Verificar se o token existe
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Não autorizado, token não fornecido'
      });
    }
    
    try {
      // Verificar o token
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'chave-secreta-desenvolvimento');
      
      // Atribuir o usuário à requisição
      req.user = { _id: decoded.id };
      
      // Se estamos usando o banco real, buscar mais informações do usuário
      if (global.usingMemoryDb !== true) {
        const user = await User.findById(decoded.id).select('-password');
        if (user) {
          req.user = user;
        }
      }
      
      next();
    } catch (error) {
      console.error('Erro na verificação do token:', error);
      return res.status(401).json({
        success: false,
        message: 'Não autorizado, token inválido',
        error: error.message
      });
    }
  } catch (error) {
    console.error('Erro no middleware de autenticação:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro no servidor',
      error: error.message
    });
  }
};

// Middleware para verificar permissões de admin
const admin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({
      success: false,
      message: 'Não autorizado, permissão de administrador necessária'
    });
  }
};

module.exports = { protect, admin };