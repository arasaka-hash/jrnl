import { Firestore, Timestamp } from "@google-cloud/firestore";
import fs from "fs";
import path from "path";
import type { LifeUpdateDoc } from "./types";

/** Find project root by traversing up until we find package.json */
function findProjectRoot(): string {
  const dirsToTry: string[] = [process.cwd()];
  if (typeof __dirname !== "undefined") dirsToTry.unshift(__dirname);
  for (const start of dirsToTry) {
    let dir = path.resolve(start);
    for (let i = 0; i < 10; i++) {
      if (fs.existsSync(path.join(dir, "package.json"))) return dir;
      const parent = path.dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
  }
  return process.cwd();
}

/** Read env vars directly from .env.local - bypasses dotenv/Next.js loading issues */
function readEnvFromFile(): Record<string, string> {
  const root = findProjectRoot();
  const envPaths = [
    path.join(root, ".env.local"),
    path.join(root, ".env"),
  ];
  for (const envPath of envPaths) {
    if (!fs.existsSync(envPath)) continue;
    try {
      let content = fs.readFileSync(envPath, "utf-8");
      if (content.charCodeAt(0) === 0xfeff) content = content.slice(1);
      const parsed: Record<string, string> = {};
      for (const line of content.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const eq = trimmed.indexOf("=");
        if (eq <= 0) continue;
        const key = trimmed.slice(0, eq).trim();
        let value = trimmed.slice(eq + 1).trim();
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        parsed[key] = value;
      }
      return parsed;
    } catch {
      continue;
    }
  }
  return {};
}

function getFirestoreConfig(): {
  databaseId?: string;
  projectId?: string;
  keyFilename?: string;
  credentials?: object;
} {
  const fileEnv = readEnvFromFile();
  const projectId =
    process.env.GOOGLE_CLOUD_PROJECT ?? fileEnv.GOOGLE_CLOUD_PROJECT;
  const base64KeyRaw =
    process.env.GOOGLE_SERVICE_ACCOUNT_KEY ??
    fileEnv.GOOGLE_SERVICE_ACCOUNT_KEY;
  const credentialsPathRaw =
    process.env.GOOGLE_APPLICATION_CREDENTIALS ??
    fileEnv.GOOGLE_APPLICATION_CREDENTIALS;

  const dbId = process.env.FIRESTORE_DATABASE_ID ?? fileEnv.FIRESTORE_DATABASE_ID;
  const config: {
    databaseId?: string;
    projectId?: string;
    keyFilename?: string;
    credentials?: object;
  } = {};
  if (dbId?.trim()) {
    config.databaseId = dbId.trim();
  }
  // When databaseId is omitted, Firestore uses the default database
  if (projectId && projectId !== "your-project-id") {
    config.projectId = projectId;
  }

  const credentialsPath = credentialsPathRaw;
  if (credentialsPath) {
    config.keyFilename = credentialsPath;
  }

  const base64Key = base64KeyRaw;
  if (base64Key && !credentialsPath) {
    try {
      const keyJson = JSON.parse(
        Buffer.from(base64Key, "base64").toString("utf-8")
      );
      if (keyJson.project_id) {
        config.projectId = config.projectId || keyJson.project_id;
      }
      config.credentials = keyJson;
    } catch (e) {
      console.error("Failed to parse GOOGLE_SERVICE_ACCOUNT_KEY:", e);
    }
  }

  return config;
}

let _firestore: Firestore | null = null;

function getFirestoreClient(): Firestore {
  if (_firestore) return _firestore;
  const config = getFirestoreConfig();
  if (!config.credentials || !config.projectId) {
    throw new Error(
      "Firestore credentials not configured. Add GOOGLE_CLOUD_PROJECT and GOOGLE_SERVICE_ACCOUNT_KEY (base64) to .env.local. See .env.example."
    );
  }
  const firestoreOpts: { databaseId?: string; projectId?: string; credentials?: object } = {
    projectId: config.projectId,
    credentials: config.credentials,
  };
  if (config.databaseId) {
    firestoreOpts.databaseId = config.databaseId;
  }
  _firestore = new Firestore(firestoreOpts);
  return _firestore;
}

const COLLECTION = "life_updates";

export async function listLifeUpdates(): Promise<
  Array<LifeUpdateDoc & { id: string }>
> {
  try {
    const snap = await getFirestoreClient()
      .collection(COLLECTION)
      .orderBy("createdAt", "desc")
      .limit(200)
      .get();

    if (snap.empty) return [];

    return snap.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        headline: data.headline,
        narrative: data.narrative,
        date: data.date,
        scores: data.scores || [],
        rawInput: data.rawInput || "",
        createdAt: data.createdAt,
      };
    });
  } catch (error) {
    console.error("Firestore listLifeUpdates error:", error);
    return [];
  }
}

function isNotFoundError(err: unknown): boolean {
  const e = err as { code?: number; details?: string };
  return e?.code === 5 || (typeof e?.details === "string" && e.details.includes("NOT_FOUND"));
}

export async function createLifeUpdate(data: Omit<LifeUpdateDoc, "createdAt">) {
  try {
    const docData: LifeUpdateDoc = {
      ...data,
      createdAt: Timestamp.now(),
    };
    const ref = await getFirestoreClient().collection(COLLECTION).add(docData);
    return ref.id;
  } catch (error) {
    console.error("Firestore createLifeUpdate error:", error);
    if (isNotFoundError(error)) {
      throw new Error(
        "Firestore database not found. Create it in Firebase Console (Firestore → Create database) or remove FIRESTORE_DATABASE_ID to use the default database."
      );
    }
    throw error;
  }
}

export async function deleteLatestLifeUpdate(): Promise<boolean> {
  try {
    const snap = await getFirestoreClient()
      .collection(COLLECTION)
      .orderBy("createdAt", "desc")
      .limit(1)
      .get();
    if (snap.empty) return false;
    await snap.docs[0].ref.delete();
    return true;
  } catch (error) {
    console.error("Firestore deleteLatestLifeUpdate error:", error);
    throw error;
  }
}

export async function deleteAllLifeUpdates(): Promise<number> {
  try {
    const snap = await getFirestoreClient()
      .collection(COLLECTION)
      .get();
    const batch = getFirestoreClient().batch();
    snap.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
    return snap.size;
  } catch (error) {
    console.error("Firestore deleteAllLifeUpdates error:", error);
    throw error;
  }
}
