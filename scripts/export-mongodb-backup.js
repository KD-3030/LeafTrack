#!/usr/bin/env node
/**
 * MongoDB Backup Export Script
 * Exports all collections as JSON files for archival before Supabase migration.
 * 
 * Usage:
 *   node scripts/export-mongodb-backup.js
 * 
 * Requires MONGODB_URI in .env or .env.local
 */

const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env.local') });

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('ERROR: MONGODB_URI not found in environment variables.');
  process.exit(1);
}

const BACKUP_BASE = process.env.BACKUP_PATH || path.resolve(__dirname, '..', 'backups');
const BACKUP_DIR = path.join(BACKUP_BASE, `mongodb-backup-${new Date().toISOString().slice(0, 10)}`);

async function exportAll() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const db = client.db(); // uses default db from URI
    const collections = await db.listCollections().toArray();

    // Create backup directory
    fs.mkdirSync(BACKUP_DIR, { recursive: true });

    let totalDocs = 0;

    for (const col of collections) {
      const name = col.name;
      console.log(`Exporting collection: ${name}...`);

      const docs = await db.collection(name).find({}).toArray();
      const filePath = path.join(BACKUP_DIR, `${name}.json`);

      fs.writeFileSync(filePath, JSON.stringify(docs, null, 2), 'utf-8');
      console.log(`  → ${docs.length} documents saved to ${name}.json`);
      totalDocs += docs.length;
    }

    // Write metadata
    const metadata = {
      exported_at: new Date().toISOString(),
      mongodb_uri: MONGODB_URI.replace(/\/\/.*@/, '//***@'), // redact credentials
      collections: collections.map(c => c.name),
      total_documents: totalDocs,
    };
    fs.writeFileSync(path.join(BACKUP_DIR, '_metadata.json'), JSON.stringify(metadata, null, 2), 'utf-8');

    console.log(`\nBackup complete! ${totalDocs} documents across ${collections.length} collections.`);
    console.log(`Saved to: ${BACKUP_DIR}`);
  } catch (error) {
    console.error('Export failed:', error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

exportAll();
