import { Firestore, Timestamp } from "@google-cloud/firestore";
import type { LifeUpdateDoc } from "./types";

function getFirestoreConfig(): {
  databaseId: string;
  projectId?: string;
  keyFilename?: string;
  credentials?: object;
} {
  const config: {
    databaseId: string;
    projectId?: string;
    keyFilename?: string;
    credentials?: object;
  } = {
    databaseId: "arasaka",
  };

  const projectId = process.env.GOOGLE_CLOUD_PROJECT;
  if (projectId && projectId !== "your-project-id") {
    config.projectId = projectId;
  }

  const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (credentialsPath) {
    config.keyFilename = credentialsPath;
  }

  const base64Key = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
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

let firestore: Firestore;
try {
  const config = getFirestoreConfig();
  if (config.credentials) {
    firestore = new Firestore({
      databaseId: config.databaseId,
      projectId: config.projectId,
      credentials: config.credentials,
    });
  } else {
    firestore = new Firestore(config);
  }
} catch (error) {
  console.error("Failed to initialize Firestore:", error);
  throw new Error(
    "Firestore initialization failed. Please ensure:\n" +
      "1. You have run: gcloud auth application-default login\n" +
      "2. Your .env.local file has GOOGLE_CLOUD_PROJECT set\n" +
      "3. For deployment: Set GOOGLE_SERVICE_ACCOUNT_KEY (base64 encoded JSON)"
  );
}

const COLLECTION = "life_updates";

export async function listLifeUpdates(): Promise<
  Array<LifeUpdateDoc & { id: string }>
> {
  try {
    const snap = await firestore
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

export async function createLifeUpdate(data: Omit<LifeUpdateDoc, "createdAt">) {
  try {
    const docData: LifeUpdateDoc = {
      ...data,
      createdAt: Timestamp.now(),
    };
    const ref = await firestore.collection(COLLECTION).add(docData);
    return ref.id;
  } catch (error) {
    console.error("Firestore createLifeUpdate error:", error);
    throw error;
  }
}
