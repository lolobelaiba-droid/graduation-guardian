import { useEffect, useState } from "react";
import { Download, X, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

const isElectronEnv = typeof window !== "undefined" && !!(window as any).electronAPI;

// الإصدار الحالي للتطبيق — يُحدَّث مع كل إصدار جديد
const CURRENT_VERSION = "1.0.0";

// رابط مستودع GitHub (يجب تعديله لمستودعك الخاص)
const GITHUB_REPO = "your-username/your-repo";
const CHECK_INTERVAL_MS = 60 * 60 * 1000; // كل ساعة

interface ReleaseInfo {
  version: string;
  url: string;
  name: string;
  body: string;
}

function compareVersions(a: string, b: string): number {
  const pa = a.replace(/^v/, "").split(".").map(Number);
  const pb = b.replace(/^v/, "").split(".").map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const na = pa[i] || 0;
    const nb = pb[i] || 0;
    if (na > nb) return 1;
    if (na < nb) return -1;
  }
  return 0;
}

async function checkForUpdate(): Promise<ReleaseInfo | null> {
  try {
    const res = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`,
      { headers: { Accept: "application/vnd.github.v3+json" } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const latestVersion = (data.tag_name || "").replace(/^v/, "");
    if (compareVersions(latestVersion, CURRENT_VERSION) > 0) {
      return {
        version: latestVersion,
        url: data.html_url,
        name: data.name || `v${latestVersion}`,
        body: data.body || "",
      };
    }
    return null;
  } catch {
    return null;
  }
}

export function UpdateBanner() {
  const [release, setRelease] = useState<ReleaseInfo | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // فقط في نسخة سطح المكتب
    if (!isElectronEnv) return;

    // التحقق الأول بعد 10 ثوانٍ من بدء التطبيق
    const initialTimer = setTimeout(() => {
      checkForUpdate().then(setRelease);
    }, 10_000);

    // التحقق الدوري
    const interval = setInterval(() => {
      checkForUpdate().then(setRelease);
    }, CHECK_INTERVAL_MS);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, []);

  if (!isElectronEnv || !release || dismissed) return null;

  const handleOpen = () => {
    window.open(release.url, "_blank");
  };

  return (
    <div className="border-b px-4 py-2.5 flex items-center justify-between gap-3 animate-in slide-in-from-top-2 duration-300 bg-primary/10 border-primary/30">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="shrink-0 rounded-full bg-primary/20 p-1.5">
          <Download className="h-4 w-4 text-primary" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-primary truncate">
            🎉 تتوفر نسخة جديدة: {release.name}
          </p>
          <p className="text-xs text-primary/70 truncate">
            الإصدار الحالي: v{CURRENT_VERSION} — الإصدار الجديد: v{release.version}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Button
          size="sm"
          variant="default"
          className="gap-1.5 text-xs"
          onClick={handleOpen}
        >
          <ExternalLink className="h-3.5 w-3.5" />
          تحميل التحديث
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7 text-primary/60 hover:text-primary"
          onClick={() => setDismissed(true)}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
