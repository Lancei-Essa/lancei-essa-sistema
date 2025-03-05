const jwt = require('jsonwebtoken');
const User = require('../models/user');

exports.protect = async (req, res, next) => {
  let token;

  console.log('Headers de autorização:', req.headers.authorization);

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
    console.log('Token extraído:', token);
  }

  if (!token) {
    console.log('Nenhum token encontrado');
    return res.status(401).json({
      success: false,
      message: 'Não autorizado para acessar esta rota'
    });
  }

  try {
    console.log('Verificando token com secret:', process.env.JWT_SECRET);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Token decodificado:', decoded);

    req.user = await User.findById(decoded.id).select('-password');
    
    if (!req.user) {
      console.log('Usuário não encontrado');
      return res.status(401).json({
        success: false,
        message: 'Usuário não encontrado'
      });
    }

    console.log('Usuário autenticado:', req.user);
    next();
  } catch (err) {
    console.error('Erro na autenticação:', err);
    return res.status(401).json({
      success: false,
      message: 'Não autorizado para acessar esta rota',
      error: err.message
    });
  }
};

exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Usuário com papel ${req.user.role} não está autorizado a acessar esta rota`
      });
    }
    next();
  };
};