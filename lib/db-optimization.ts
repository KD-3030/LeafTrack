/**
 * Database optimization utilities for MongoDB
 * Includes connection pooling, indexing, and query optimization
 */

import mongoose, { Connection } from 'mongoose';
import { logger } from './logger';

/**
 * Optimized MongoDB connection configuration
 */
export const optimizedMongoConfig = {
  // Connection pool settings
  maxPoolSize: parseInt(process.env.MONGODB_MAX_POOL_SIZE || '50'),
  minPoolSize: 10,
  maxIdleTimeMS: 10000,
  serverSelectionTimeoutMS: parseInt(process.env.MONGODB_SERVER_SELECTION_TIMEOUT || '10000'),
  socketTimeoutMS: parseInt(process.env.MONGODB_SOCKET_TIMEOUT || '45000'),
  
  // Write concern for data durability
  w: 'majority',
  j: true, // Journal write concern
  wtimeoutMS: 5000,
  
  // Read preference for load balancing
  readPreference: 'secondaryPreferred',
  
  // Retry settings
  retryWrites: true,
  retryReads: true,
  
  // Compression
  compressors: ['snappy', 'zlib'],
  
  // SSL/TLS
  ssl: process.env.NODE_ENV === 'production',
  sslValidate: process.env.NODE_ENV === 'production',
};

/**
 * Create database indexes for optimal query performance
 */
export async function createIndexes(connection: Connection) {
  try {
    logger.info('Creating database indexes...');
    
    // User indexes
    await connection.collection('users').createIndexes([
      { key: { email: 1, role: 1 }, unique: true },
      { key: { role: 1 } },
      { key: { createdAt: -1 } },
    ]);
    
    // Product indexes
    await connection.collection('products').createIndexes([
      { key: { name: 1 }, unique: true },
      { key: { hsn_code: 1 } },
      { key: { totalStock: 1 } },
      { key: { createdAt: -1 } },
    ]);
    
    // Customer indexes
    await connection.collection('customers').createIndexes([
      { key: { email: 1 }, unique: true },
      { key: { phone: 1 } },
      { key: { gstin: 1 }, sparse: true },
      { key: { status: 1 } },
      { key: { state: 1 } },
      { key: { createdAt: -1 } },
    ]);
    
    // Assignment indexes
    await connection.collection('assignments').createIndexes([
      { key: { salesman_id: 1, createdAt: -1 } },
      { key: { productId: 1 } },
      { key: { status: 1 } },
      { key: { quantity: 1 } },
    ]);
    
    // Sale indexes
    await connection.collection('sales').createIndexes([
      { key: { salesman_id: 1, sale_date: -1 } },
      { key: { customer_id: 1, sale_date: -1 } },
      { key: { product_id: 1 } },
      { key: { invoice_generated: 1 } },
      { key: { sale_date: -1 } },
      { key: { total_amount: 1 } },
    ]);
    
    // Invoice indexes
    await connection.collection('invoices').createIndexes([
      { key: { invoice_number: 1 }, unique: true },
      { key: { customer_id: 1, invoice_date: -1 } },
      { key: { salesman_id: 1, invoice_date: -1 } },
      { key: { status: 1 } },
      { key: { payment_status: 1 } },
      { key: { due_date: 1 } },
      { key: { grand_total: 1 } },
    ]);
    
    // Payment indexes
    await connection.collection('payments').createIndexes([
      { key: { invoice_id: 1 } },
      { key: { customer_id: 1, payment_date: -1 } },
      { key: { payment_method: 1 } },
      { key: { status: 1 } },
      { key: { payment_date: -1 } },
    ]);
    
    // Location indexes (2dsphere for geospatial queries)
    await connection.collection('locations').createIndexes([
      { key: { coordinates: '2dsphere' } },
      { key: { user_id: 1, timestamp: -1 } },
      { key: { timestamp: -1 } },
    ]);
    
    // Text search indexes
    await connection.collection('products').createIndex(
      { name: 'text', description: 'text' },
      { weights: { name: 10, description: 5 } }
    );
    
    await connection.collection('customers').createIndex(
      { name: 'text', business_name: 'text', address: 'text' },
      { weights: { name: 10, business_name: 8, address: 3 } }
    );
    
    logger.info('✅ Database indexes created successfully');
  } catch (error) {
    logger.error('Error creating indexes:', error);
    throw error;
  }
}

/**
 * Optimize database queries with aggregation pipeline
 */
export class QueryOptimizer {
  /**
   * Get sales with optimized aggregation pipeline
   */
  static getSalesAggregation(filters: any = {}) {
    const pipeline = [];
    
    // Match stage (use indexes)
    if (Object.keys(filters).length > 0) {
      pipeline.push({ $match: filters });
    }
    
    // Sort stage (use indexes)
    pipeline.push({ $sort: { sale_date: -1 } });
    
    // Lookup stages (optimized with let/pipeline)
    pipeline.push({
      $lookup: {
        from: 'users',
        let: { salesmanId: '$salesman_id' },
        pipeline: [
          { $match: { $expr: { $eq: ['$_id', '$$salesmanId'] } } },
          { $project: { name: 1, email: 1 } }
        ],
        as: 'salesman'
      }
    });
    
    pipeline.push({
      $lookup: {
        from: 'customers',
        let: { customerId: '$customer_id' },
        pipeline: [
          { $match: { $expr: { $eq: ['$_id', '$$customerId'] } } },
          { $project: { name: 1, email: 1, phone: 1 } }
        ],
        as: 'customer'
      }
    });
    
    // Unwind with preserveNullAndEmptyArrays
    pipeline.push(
      { $unwind: { path: '$salesman', preserveNullAndEmptyArrays: true } },
      { $unwind: { path: '$customer', preserveNullAndEmptyArrays: true } }
    );
    
    // Project only necessary fields
    pipeline.push({
      $project: {
        _id: 1,
        sale_date: 1,
        quantity_sold: 1,
        unit_price: 1,
        total_amount: 1,
        payment_method: 1,
        invoice_generated: 1,
        'salesman.name': 1,
        'salesman.email': 1,
        'customer.name': 1,
        'customer.email': 1,
        'customer.phone': 1
      }
    });
    
    return pipeline;
  }
  
  /**
   * Get financial statistics with optimized aggregation
   */
  static getFinancialStatsAggregation(startDate: Date, endDate: Date) {
    return [
      // Match date range
      {
        $match: {
          invoice_date: {
            $gte: startDate,
            $lte: endDate
          }
        }
      },
      
      // Group by status and calculate totals
      {
        $facet: {
          totals: [
            {
              $group: {
                _id: null,
                totalInvoices: { $sum: 1 },
                totalAmount: { $sum: '$grand_total' },
                paidAmount: { $sum: '$paid_amount' },
                pendingAmount: { $sum: '$balance_due' }
              }
            }
          ],
          byStatus: [
            {
              $group: {
                _id: '$status',
                count: { $sum: 1 },
                amount: { $sum: '$grand_total' }
              }
            }
          ],
          byPaymentMethod: [
            {
              $group: {
                _id: '$payment_method',
                count: { $sum: 1 },
                amount: { $sum: '$paid_amount' }
              }
            }
          ],
          topCustomers: [
            {
              $group: {
                _id: '$customer_id',
                totalPurchases: { $sum: '$grand_total' },
                invoiceCount: { $sum: 1 }
              }
            },
            { $sort: { totalPurchases: -1 } },
            { $limit: 10 },
            {
              $lookup: {
                from: 'customers',
                localField: '_id',
                foreignField: '_id',
                as: 'customer'
              }
            },
            { $unwind: '$customer' },
            {
              $project: {
                customerName: '$customer.name',
                totalPurchases: 1,
                invoiceCount: 1
              }
            }
          ]
        }
      }
    ];
  }
}

/**
 * Database maintenance tasks
 */
export class DatabaseMaintenance {
  /**
   * Clean up old data
   */
  static async cleanupOldData(connection: Connection, retentionDays: number = 90) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
    
    try {
      // Clean up old location data
      const locationResult = await connection.collection('locations').deleteMany({
        timestamp: { $lt: cutoffDate }
      });
      logger.info(`Cleaned up ${locationResult.deletedCount} old location records`);
      
      // Archive old invoices (move to archive collection instead of deleting)
      const invoicesToArchive = await connection.collection('invoices').find({
        createdAt: { $lt: cutoffDate },
        status: 'Paid'
      }).toArray();
      
      if (invoicesToArchive.length > 0) {
        await connection.collection('invoices_archive').insertMany(invoicesToArchive);
        await connection.collection('invoices').deleteMany({
          _id: { $in: invoicesToArchive.map(i => i._id) }
        });
        logger.info(`Archived ${invoicesToArchive.length} old invoices`);
      }
      
    } catch (error) {
      logger.error('Error during cleanup:', error);
      throw error;
    }
  }
  
  /**
   * Optimize database performance
   */
  static async optimizeDatabase(connection: Connection) {
    try {
      // Run compact command on collections
      const collections = ['users', 'products', 'customers', 'sales', 'invoices'];
      
      for (const collectionName of collections) {
        await connection.db.command({
          compact: collectionName,
          force: true
        });
        logger.info(`Compacted collection: ${collectionName}`);
      }
      
      // Update statistics
      await connection.db.stats();
      
      logger.info('✅ Database optimization completed');
    } catch (error) {
      logger.error('Error optimizing database:', error);
      throw error;
    }
  }
  
  /**
   * Check database health
   */
  static async checkHealth(connection: Connection): Promise<{
    isHealthy: boolean;
    details: Record<string, any>;
  }> {
    try {
      const adminDb = connection.db.admin();
      
      // Ping database
      await adminDb.ping();
      
      // Get server status
      const serverStatus = await adminDb.serverStatus();
      
      // Get database statistics
      const dbStats = await connection.db.stats();
      
      // Check replication status (if replica set)
      let replicationStatus = null;
      try {
        replicationStatus = await adminDb.replSetGetStatus();
      } catch {
        // Not a replica set, ignore
      }
      
      const health = {
        isHealthy: true,
        details: {
          version: serverStatus.version,
          uptime: serverStatus.uptime,
          connections: {
            current: serverStatus.connections.current,
            available: serverStatus.connections.available
          },
          memory: {
            resident: serverStatus.mem.resident,
            virtual: serverStatus.mem.virtual
          },
          database: {
            collections: dbStats.collections,
            documents: dbStats.objects,
            dataSize: dbStats.dataSize,
            indexSize: dbStats.indexSize
          },
          replication: replicationStatus ? {
            set: replicationStatus.set,
            members: replicationStatus.members.length,
            primary: replicationStatus.members.find((m: any) => m.stateStr === 'PRIMARY')?.name
          } : null
        }
      };
      
      return health;
    } catch (error) {
      logger.error('Health check failed:', error);
      return {
        isHealthy: false,
        details: { error: error.message }
      };
    }
  }
}
