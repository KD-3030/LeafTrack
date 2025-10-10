/**
 * Migration Script: Move BOM and Raw Materials to Test Database
 * This script migrates BOM and RawMaterial collections from 'leaftrack' to 'test' database
 */

const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

// Connection URIs
const SOURCE_DB = 'mongodb+srv://kinjaldutta005_db_admin:vvPa0vD3JkA6o6GN@cluster0.v4xifhz.mongodb.net/leaftrack?retryWrites=true&w=majority&appName=Cluster0';
const TARGET_DB = 'mongodb+srv://kinjaldutta005_db_admin:vvPa0vD3JkA6o6GN@cluster0.v4xifhz.mongodb.net/test?retryWrites=true&w=majority&appName=Cluster0';

// Raw Material Schema
const RawMaterialSchema = new mongoose.Schema({
  name: String,
  description: String,
  unit: String,
  base_cost_per_unit: Number,
  current_stock: Number,
  min_stock_level: Number,
  supplier: String,
  is_active: Boolean,
  created_at: Date,
  updated_at: Date,
});

// BOM Schema
const BOMSchema = new mongoose.Schema({
  product_id: mongoose.Schema.Types.ObjectId,
  product_name: String,
  version: Number,
  materials: [{
    material_id: String,
    material_name: String,
    quantity: Number,
    unit: String,
    cost_per_unit: Number,
    total_cost: Number,
  }],
  total_manufacturing_cost: Number,
  overhead_percentage: Number,
  final_cost: Number,
  status: String,
  is_current: Boolean,
  notes: String,
  created_by: mongoose.Schema.Types.ObjectId,
  created_by_name: String,
  created_at: Date,
  updated_at: Date,
});

async function migrateData() {
  let sourceConn, targetConn;

  try {
    console.log('🔌 Connecting to source database (leaftrack)...');
    sourceConn = await mongoose.createConnection(SOURCE_DB).asPromise();
    console.log('✅ Connected to source database\n');

    console.log('🔌 Connecting to target database (test)...');
    targetConn = await mongoose.createConnection(TARGET_DB).asPromise();
    console.log('✅ Connected to target database\n');

    // Create models
    const SourceRawMaterial = sourceConn.model('RawMaterial', RawMaterialSchema);
    const SourceBOM = sourceConn.model('BOM', BOMSchema);
    
    const TargetRawMaterial = targetConn.model('RawMaterial', RawMaterialSchema);
    const TargetBOM = targetConn.model('BOM', BOMSchema);

    console.log('═══════════════════════════════════════');
    console.log('📦 MIGRATING RAW MATERIALS');
    console.log('═══════════════════════════════════════\n');

    // Migrate Raw Materials
    const sourceRawMaterials = await SourceRawMaterial.find({});
    console.log(`📊 Found ${sourceRawMaterials.length} raw materials in source database`);

    if (sourceRawMaterials.length > 0) {
      // Clear existing data in target
      const existingRawMaterials = await TargetRawMaterial.countDocuments();
      if (existingRawMaterials > 0) {
        console.log(`⚠️  Clearing ${existingRawMaterials} existing raw materials in target database...`);
        await TargetRawMaterial.deleteMany({});
      }

      // Insert new data
      console.log('📥 Inserting raw materials into target database...');
      await TargetRawMaterial.insertMany(sourceRawMaterials.map(rm => rm.toObject()));
      console.log(`✅ Migrated ${sourceRawMaterials.length} raw materials\n`);

      sourceRawMaterials.forEach((rm, index) => {
        console.log(`   ${index + 1}. ${rm.name} - ₹${rm.base_cost_per_unit}/${rm.unit}`);
      });
    } else {
      console.log('ℹ️  No raw materials to migrate\n');
    }

    console.log('\n═══════════════════════════════════════');
    console.log('📋 MIGRATING BOMS');
    console.log('═══════════════════════════════════════\n');

    // Migrate BOMs
    const sourceBOMs = await SourceBOM.find({});
    console.log(`📊 Found ${sourceBOMs.length} BOMs in source database`);

    if (sourceBOMs.length > 0) {
      // Clear existing data in target
      const existingBOMs = await TargetBOM.countDocuments();
      if (existingBOMs > 0) {
        console.log(`⚠️  Clearing ${existingBOMs} existing BOMs in target database...`);
        await TargetBOM.deleteMany({});
      }

      // Insert new data
      console.log('📥 Inserting BOMs into target database...');
      await TargetBOM.insertMany(sourceBOMs.map(bom => bom.toObject()));
      console.log(`✅ Migrated ${sourceBOMs.length} BOMs\n`);

      sourceBOMs.forEach((bom, index) => {
        console.log(`   ${index + 1}. ${bom.product_name} v${bom.version} - ₹${bom.final_cost} (${bom.status})`);
      });
    } else {
      console.log('ℹ️  No BOMs to migrate\n');
    }

    console.log('\n═══════════════════════════════════════');
    console.log('✅ MIGRATION COMPLETE!');
    console.log('═══════════════════════════════════════\n');
    console.log('Summary:');
    console.log(`   Raw Materials migrated: ${sourceRawMaterials.length}`);
    console.log(`   BOMs migrated: ${sourceBOMs.length}`);
    console.log('\n📌 Database changed from: leaftrack → test');
    console.log('📌 .env.local updated to use test database\n');

  } catch (error) {
    console.error('❌ Migration error:', error);
    throw error;
  } finally {
    if (sourceConn) {
      await sourceConn.close();
      console.log('🔌 Source database connection closed');
    }
    if (targetConn) {
      await targetConn.close();
      console.log('🔌 Target database connection closed');
    }
  }
}

// Run migration
console.log('\n🚀 Starting Migration Process...\n');
migrateData()
  .then(() => {
    console.log('\n✅ Migration completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  });
