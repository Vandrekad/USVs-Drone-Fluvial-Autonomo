import admin from "firebase-admin";

function parsePositiveInt(value, fallback) {
  const parsed = Number.parseInt(value ?? "", 10);
  if (Number.isFinite(parsed) && parsed > 0) {
    return parsed;
  }
  return fallback;
}

function getCredentials() {
  const rawJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (rawJson) {
    try {
      const serviceAccount = JSON.parse(rawJson);
      return admin.credential.cert(serviceAccount);
    } catch (error) {
      throw new Error(`FIREBASE_SERVICE_ACCOUNT_JSON invalido: ${error.message}`);
    }
  }

  return admin.credential.applicationDefault();
}

function initDatabase() {
  const databaseURL = process.env.FIREBASE_DATABASE_URL;
  if (!databaseURL) {
    throw new Error("Defina FIREBASE_DATABASE_URL antes de rodar a limpeza de logs.");
  }

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: getCredentials(),
      databaseURL,
    });
  }

  return admin.database();
}

async function deleteBatchByField(logsRef, fieldName, threshold, limit) {
  const snapshot = await logsRef
    .orderByChild(fieldName)
    .endAt(threshold)
    .limitToFirst(limit)
    .get();

  if (!snapshot.exists()) {
    return 0;
  }

  const updates = {};
  snapshot.forEach((child) => {
    updates[child.key] = null;
  });

  await logsRef.update(updates);
  return Object.keys(updates).length;
}

async function cleanupLogs() {
  const retentionDays = parsePositiveInt(process.env.LOG_RETENTION_DAYS, 90);
  const maxDeletesPerRun = parsePositiveInt(process.env.LOG_MAX_DELETES_PER_RUN, 2000);
  const batchSize = parsePositiveInt(process.env.LOG_DELETE_BATCH_SIZE, 500);

  const nowSec = Math.floor(Date.now() / 1000);
  const retentionWindowSec = retentionDays * 24 * 60 * 60;
  const timestampThreshold = nowSec - retentionWindowSec;

  const db = initDatabase();
  const logsRef = db.ref("logs");

  let deletedByTimestamp = 0;
  while (deletedByTimestamp < maxDeletesPerRun) {
    const remaining = maxDeletesPerRun - deletedByTimestamp;
    const currentBatchSize = Math.min(batchSize, remaining);
    const deleted = await deleteBatchByField(logsRef, "timestamp", timestampThreshold, currentBatchSize);
    deletedByTimestamp += deleted;
    if (deleted === 0) {
      break;
    }
  }

  let deletedByExpiresAt = 0;
  while (deletedByTimestamp + deletedByExpiresAt < maxDeletesPerRun) {
    const remaining = maxDeletesPerRun - deletedByTimestamp - deletedByExpiresAt;
    const currentBatchSize = Math.min(batchSize, remaining);
    const deleted = await deleteBatchByField(logsRef, "expires_at", nowSec, currentBatchSize);
    deletedByExpiresAt += deleted;
    if (deleted === 0) {
      break;
    }
  }

  const totalDeleted = deletedByTimestamp + deletedByExpiresAt;
  console.log("Log cleanup concluido.");
  console.log(`- Retencao (dias): ${retentionDays}`);
  console.log(`- Removidos por timestamp: ${deletedByTimestamp}`);
  console.log(`- Removidos por expires_at: ${deletedByExpiresAt}`);
  console.log(`- Total removido: ${totalDeleted}`);
  console.log(`- Limite por execucao: ${maxDeletesPerRun}`);
}

cleanupLogs()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Falha ao limpar logs:", error.message);
    process.exit(1);
  });
