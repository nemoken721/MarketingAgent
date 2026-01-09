"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Globe, Server, Check, Plus, Loader2, Zap } from "lucide-react";

interface Site {
  id: string;
  domain: string;
  status: string;
  serverProvider: string;
  hasCredentials: boolean;
  serverHost: string | null;
  serverUser: string | null;
  wpInstalled: boolean;
  wpVersion: string | null;
  lastUsed: string;
}

interface QuickSiteSelectorProps {
  onSelect: (siteId: string, domain: string) => void;
  onNewSite: () => void;
  selectedSiteId?: string;
}

export function QuickSiteSelector({
  onSelect,
  onNewSite,
  selectedSiteId,
}: QuickSiteSelectorProps) {
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSites();
  }, []);

  const fetchSites = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/websites/list");
      const data = await response.json();

      if (data.success) {
        setSites(data.sites);
      } else {
        setError(data.error || "サイト一覧の取得に失敗しました");
      }
    } catch (err) {
      setError("通信エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  const getProviderLabel = (provider: string) => {
    const providers: Record<string, string> = {
      xserver: "エックスサーバー",
      conoha: "ConoHa WING",
      sakura: "さくらサーバー",
      lolipop: "ロリポップ",
      other: "その他",
    };
    return providers[provider] || provider;
  };

  const getStatusBadge = (site: Site) => {
    if (site.wpInstalled) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded-full">
          <Check className="w-3 h-3" />
          WordPress済
        </span>
      );
    }
    if (site.hasCredentials) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-500/20 text-blue-400 text-xs rounded-full">
          <Server className="w-3 h-3" />
          接続設定済
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-500/20 text-gray-400 text-xs rounded-full">
        未設定
      </span>
    );
  };

  if (loading) {
    return (
      <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
        <div className="flex items-center gap-2 text-slate-400">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>サイト一覧を読み込み中...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-900/20 rounded-xl p-4 border border-red-800">
        <p className="text-red-400 text-sm">{error}</p>
      </div>
    );
  }

  // 接続設定済みのサイトを優先表示
  const sortedSites = [...sites].sort((a, b) => {
    if (a.hasCredentials && !b.hasCredentials) return -1;
    if (!a.hasCredentials && b.hasCredentials) return 1;
    return new Date(b.lastUsed).getTime() - new Date(a.lastUsed).getTime();
  });

  const connectedSites = sortedSites.filter((s) => s.hasCredentials);

  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-700 bg-slate-800/50">
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-amber-400" />
          <h3 className="font-semibold text-white">クイック接続</h3>
        </div>
        <p className="text-xs text-slate-400 mt-1">
          接続済みのサイトを選択してすぐに作業を開始できます
        </p>
      </div>

      {/* Site List */}
      <div className="p-2 max-h-64 overflow-y-auto">
        {connectedSites.length === 0 ? (
          <div className="text-center py-6">
            <Globe className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <p className="text-slate-400 text-sm">接続設定済みのサイトがありません</p>
          </div>
        ) : (
          <div className="space-y-1">
            {connectedSites.map((site) => (
              <motion.button
                key={site.id}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => onSelect(site.id, site.domain)}
                className={`w-full text-left p-3 rounded-lg transition-all ${
                  selectedSiteId === site.id
                    ? "bg-blue-600 border-blue-500"
                    : "bg-slate-700/50 hover:bg-slate-700 border-transparent"
                } border`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Globe className="w-4 h-4 text-slate-400 flex-shrink-0" />
                      <span className="font-medium text-white truncate">
                        {site.domain}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-slate-400">
                        {getProviderLabel(site.serverProvider)}
                      </span>
                      {site.wpVersion && (
                        <span className="text-xs text-slate-500">
                          WP {site.wpVersion}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex-shrink-0">{getStatusBadge(site)}</div>
                </div>
              </motion.button>
            ))}
          </div>
        )}
      </div>

      {/* New Site Button */}
      <div className="p-2 border-t border-slate-700">
        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          onClick={onNewSite}
          className="w-full flex items-center justify-center gap-2 p-3 rounded-lg bg-slate-700/30 hover:bg-slate-700/50 text-slate-300 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>新しいサイトを追加</span>
        </motion.button>
      </div>
    </div>
  );
}
