import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { X, Info, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "gelag_announcement_seen";

type Announcement = {
  id: number;
  title: string;
  message: string;
  type: string;
  variant: string;
  displayFrequency: string;
  startDate: string;
  endDate: string;
};

const VARIANT_STYLES: Record<string, string> = {
  info: "bg-blue-50 border-blue-300 text-blue-800",
  warning: "bg-yellow-50 border-yellow-300 text-yellow-800",
  success: "bg-green-50 border-green-300 text-green-800",
  error: "bg-red-50 border-red-300 text-red-800",
};

const VARIANT_ICONS: Record<string, React.ReactNode> = {
  info: <Info className="h-4 w-4 flex-shrink-0" />,
  warning: <AlertTriangle className="h-4 w-4 flex-shrink-0" />,
  success: <CheckCircle2 className="h-4 w-4 flex-shrink-0" />,
  error: <XCircle className="h-4 w-4 flex-shrink-0" />,
};

function shouldShow(id: number, frequency: string): boolean {
  const raw = localStorage.getItem(STORAGE_KEY);
  const seen: Record<string, number> = raw ? JSON.parse(raw) : {};
  const lastSeen = seen[id] ?? 0;
  const now = Date.now();
  switch (frequency) {
    case "always": return true;
    case "once_per_session": {
      const sessionRaw = sessionStorage.getItem(STORAGE_KEY);
      const sessionSeen: Record<string, boolean> = sessionRaw ? JSON.parse(sessionRaw) : {};
      return !sessionSeen[id];
    }
    case "hourly": return (now - lastSeen) > 60 * 60 * 1000;
    case "daily": return (now - lastSeen) > 24 * 60 * 60 * 1000;
    default: return true;
  }
}

function markSeen(id: number, frequency: string) {
  const now = Date.now();
  if (frequency === "once_per_session") {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    const seen: Record<string, boolean> = raw ? JSON.parse(raw) : {};
    seen[id] = true;
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(seen));
  } else {
    const raw = localStorage.getItem(STORAGE_KEY);
    const seen: Record<string, number> = raw ? JSON.parse(raw) : {};
    seen[id] = now;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seen));
  }
}

export default function AnnouncementDisplay() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [dismissedBanners, setDismissedBanners] = useState<Set<number>>(new Set());
  const [modalAnnouncement, setModalAnnouncement] = useState<Announcement | null>(null);
  const processedToasts = useRef<Set<number>>(new Set());

  const { data: announcements = [] } = useQuery<Announcement[]>({
    queryKey: ["/api/announcements"],
    enabled: !!user,
    refetchInterval: 5 * 60 * 1000,
    staleTime: 4 * 60 * 1000,
  });

  useEffect(() => {
    if (!announcements.length) return;
    announcements.forEach(a => {
      if (!shouldShow(a.id, a.displayFrequency)) return;
      if (a.type === "toast" && !processedToasts.current.has(a.id)) {
        processedToasts.current.add(a.id);
        markSeen(a.id, a.displayFrequency);
        setTimeout(() => {
          toast({
            title: a.title,
            description: a.message,
            variant: a.variant === "error" ? "destructive" : "default",
            duration: 8000,
          });
        }, 1000 + Math.random() * 2000);
      }
      if (a.type === "modal" && !modalAnnouncement) {
        setModalAnnouncement(a);
        markSeen(a.id, a.displayFrequency);
      }
    });
  }, [announcements]);

  const banners = announcements.filter(
    a => a.type === "banner" && !dismissedBanners.has(a.id) && shouldShow(a.id, a.displayFrequency)
  );

  function dismissBanner(a: Announcement) {
    markSeen(a.id, a.displayFrequency);
    setDismissedBanners(prev => new Set([...prev, a.id]));
  }

  return (
    <>
      {banners.map(a => (
        <div
          key={a.id}
          className={`border-b px-4 py-2 flex items-start gap-2 text-sm ${VARIANT_STYLES[a.variant] || VARIANT_STYLES.info}`}
        >
          {VARIANT_ICONS[a.variant]}
          <div className="flex-1">
            <span className="font-semibold">{a.title}</span>
            {a.message && <span className="ml-2 opacity-90">{a.message}</span>}
          </div>
          <button
            onClick={() => dismissBanner(a)}
            className="opacity-60 hover:opacity-100 transition-opacity ml-2"
            aria-label="Cerrar aviso"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}

      <Dialog open={!!modalAnnouncement} onOpenChange={open => !open && setModalAnnouncement(null)}>
        {modalAnnouncement && (
          <DialogContent className="max-w-md">
            <DialogHeader>
              <div className="flex items-center gap-2">
                {VARIANT_ICONS[modalAnnouncement.variant]}
                <DialogTitle>{modalAnnouncement.title}</DialogTitle>
              </div>
            </DialogHeader>
            <p className="text-sm text-neutral-700 leading-relaxed">{modalAnnouncement.message}</p>
            <DialogFooter>
              <Button onClick={() => setModalAnnouncement(null)}>Entendido</Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </>
  );
}
