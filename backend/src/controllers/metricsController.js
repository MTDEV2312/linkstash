import mongoose from 'mongoose';
import queue from '../config/queue.js';
import { getLogger } from '../utils/logger.js';

const logger = getLogger('MetricsController');

const getMetrics = async (req, res) => {
  try {
    const uptime = process.uptime();
    const memory = process.memoryUsage();
    const nodeVersion = process.version;
    const env = process.env.NODE_ENV || 'development';

    let dbStatus = 'unknown';
    try {
      const state = mongoose.connection.readyState; // 0 disconnected,1 connected,2 connecting,3 disconnecting
      dbStatus = state === 1 ? 'connected' : state === 2 ? 'connecting' : state === 3 ? 'disconnecting' : 'disconnected';
    } catch (e) {
      dbStatus = 'error';
    }

    let queueStats = { info: 'not available' };
    try {
      queueStats = await queue.getStats();
    } catch (e) {
      queueStats = { error: e.message };
    }

    res.json({
      success: true,
      data: {
        uptime,
        memory,
        nodeVersion,
        env,
        dbStatus,
        queueStats,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Error en getMetrics', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
};

export { getMetrics };
