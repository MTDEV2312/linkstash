import mongoose from 'mongoose';
import dns from 'dns';
import { getLogger } from '../utils/logger.js';

try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {
  // Ignorar si falla la configuración de DNS
}

const logger = getLogger('Database');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      family: 4 // Use IPv4
    });

    logger.info(`🗄️  MongoDB conectado: ${conn.connection.host}`);
    
    // Configurar eventos de la conexión
    mongoose.connection.on('error', (err) => {
      logger.error('❌ Error de MongoDB', err);
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('📵 MongoDB desconectado');
    });

    mongoose.connection.on('reconnected', () => {
      logger.info('🔗 MongoDB reconectado');
    });

    return conn;

  } catch (error) {
    logger.error('❌ Error conectando a MongoDB', error);
    logger.warn('Servidor continuará sin base de datos (modo testing)');
    return null;
    // process.exit(1); // Comentado para permitir tests E2E
  }
};

export default connectDB;
