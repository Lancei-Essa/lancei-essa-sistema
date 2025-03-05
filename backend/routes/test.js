const express = require('express');
const router = express.Router();
const TestModel = require('../models/TestModel');

// Rota para criar um documento de teste
router.post('/create', async (req, res) => {
  try {
    const newTest = new TestModel({
      message: 'Teste de conexão com MongoDB Atlas'
    });
    
    const savedTest = await newTest.save();
    
    res.status(201).json({
      success: true,
      data: savedTest
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Rota para buscar todos os documentos de teste
router.get('/all', async (req, res) => {
  try {
    const tests = await TestModel.find();
    
    res.status(200).json({
      success: true,
      count: tests.length,
      data: tests
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;