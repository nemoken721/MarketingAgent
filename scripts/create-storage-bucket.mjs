/**
 * exports Storageバケット作成スクリプト
 *
 * Usage: node scripts/create-storage-bucket.mjs
 */

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env.local
dotenv.config({ path: join(__dirname, "..", ".env.local") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function createBucket() {
  console.log("Creating exports storage bucket...");

  // バケットが存在するか確認
  const { data: buckets, error: listError } = await supabase.storage.listBuckets();

  if (listError) {
    console.error("Failed to list buckets:", listError);
    return;
  }

  const existingBucket = buckets.find((b) => b.name === "exports");

  if (existingBucket) {
    console.log("✅ exports bucket already exists");
    return;
  }

  // バケット作成
  const { data, error } = await supabase.storage.createBucket("exports", {
    public: true,
    fileSizeLimit: 50 * 1024 * 1024, // 50MB (Supabase free tier limit)
    allowedMimeTypes: [
      "image/png",
      "image/jpeg",
      "video/mp4",
    ],
  });

  if (error) {
    console.error("Failed to create bucket:", error);
    return;
  }

  console.log("✅ exports bucket created successfully");

  // RLS設定はダッシュボードで必要に応じて追加
  console.log("\n📝 Note: Configure bucket policies in Supabase dashboard if needed:");
  console.log("   - Allow authenticated users to upload to their folder");
  console.log("   - Allow public read access for generated files");
}

createBucket().catch(console.error);
