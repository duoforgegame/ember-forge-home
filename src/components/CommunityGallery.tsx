import { useEffect, useState } from "react";
import { ArrowBigUp, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  fetchGallerySkins,
  listMyUpvotes,
  toggleSkinUpvote,
  type GallerySkin,
  type GallerySort,
} from "@/lib/skincreator";

const PAGE_SIZE = 20;

const SORTS: { id: GallerySort; label: string }[] = [
  { id: "newest", label: "Newest" },
  { id: "top", label: "Most upvoted" },
];

export function CommunityGallery() {
  const [skins, setSkins] = useState<GallerySkin[]>([]);
  const [loading, setLoading] = useState(true);
  const [more, setMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [sort, setSort] = useState<GallerySort>("newest");
  const [myVotes, setMyVotes] = useState<Set<string>>(new Set());
  const [voting, setVoting] = useState<string | null>(null);

  const markVoted = async (rows: GallerySkin[]) => {
    try {
      const ids = await listMyUpvotes(rows.map((r) => r.id));
      setMyVotes((prev) => new Set([...prev, ...ids]));
    } catch {
      /* votes stay unmarked, voting still works */
    }
  };

  const load = async (offset: number, nextSort: GallerySort) => {
    const rows = await fetchGallerySkins(offset, PAGE_SIZE, nextSort);
    setSkins((prev) => (offset === 0 ? rows : [...prev, ...rows]));
    setHasMore(rows.length === PAGE_SIZE);
    void markVoted(rows);
  };

  useEffect(() => {
    let active = true;
    setLoading(true);
    (async () => {
      try {
        if (active) await load(0, sort);
      } catch (e) {
        toast.error((e as Error).message || "Could not load the community gallery");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [sort]);

  const loadMore = async () => {
    setMore(true);
    try {
      await load(skins.length, sort);
    } catch (e) {
      toast.error((e as Error).message || "Could not load more skins");
    } finally {
      setMore(false);
    }
  };

  const vote = async (id: string) => {
    setVoting(id);
    const mine = myVotes.has(id);
    try {
      const { voted, vote_count } = await toggleSkinUpvote(id, mine);
      setMyVotes((prev) => {
        const next = new Set(prev);
        if (voted) next.add(id); else next.delete(id);
        return next;
      });
      setSkins((prev) => prev.map((s) => (s.id === id ? { ...s, vote_count } : s)));
    } catch (e) {
      toast.error((e as Error).message || "Could not save your vote");
    } finally {
      setVoting(null);
    }
  };

  return (
    <section className="mt-20 border-t border-border pt-10">
      <h2 className="font-display text-2xl font-bold tracking-tight">
        Community <span className="text-primary">Gallery</span>
      </h2>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        Skins created by the community and approved by our team. You can give every skin one upvote, click again to take
        it back. No account needed, one vote per skin and browser.
      </p>

      <div className="mt-5 flex flex-wrap gap-2">
        {SORTS.map((s) => (
          <button
            key={s.id}
            onClick={() => setSort(s.id)}
            className={`rounded-sm border px-3 py-1 text-xs uppercase tracking-wider transition-colors ${
              sort === s.id
                ? "border-primary/60 bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:text-foreground"
            }`}
            aria-pressed={sort === s.id}
          >
            {s.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="mt-6 flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading gallery…
        </div>
      ) : skins.length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">No approved skins yet, yours could be the first.</p>
      ) : (
        <>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {skins.map((s) => {
              const mine = myVotes.has(s.id);
              return (
                <article key={s.id} className="overflow-hidden rounded-lg border border-border bg-card">
                  <div className="relative flex h-36 items-center justify-center bg-[#111] p-3">
                    {s.status === "in_game" && (
                      <span className="absolute left-2 top-2 rounded-sm border border-primary/60 bg-primary/15 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-primary">
                        In Game
                      </span>
                    )}
                    {s.preview_image_url ? (
                      <img
                        src={s.preview_image_url}
                        alt={s.skin_name || s.weapon_name || "Community skin"}
                        loading="lazy"
                        className="max-h-full max-w-full"
                        style={{ imageRendering: "pixelated" }}
                      />
                    ) : (
                      <span className="text-xs text-muted-foreground">No preview</span>
                    )}
                  </div>
                  <div className="p-3">
                    <div className="text-sm font-semibold">{s.skin_name || "Untitled skin"}</div>
                    <div className="text-xs text-muted-foreground">{s.weapon_name || "Unknown weapon"}</div>
                    <div className="mt-1 flex items-center justify-between gap-2">
                      <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
                        by {s.player_name?.trim() || "Anonymous"}
                      </span>
                      <Button
                        variant={mine ? "default" : "outline"}
                        size="sm"
                        className="h-7 gap-1 px-2"
                        onClick={() => vote(s.id)}
                        disabled={voting === s.id}
                        aria-pressed={mine}
                        aria-label={mine ? "Remove your upvote" : "Upvote this skin"}
                        title={mine ? "Remove your upvote" : "Upvote this skin"}
                      >
                        {voting === s.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <ArrowBigUp className="h-3.5 w-3.5" />
                        )}
                        <span className="text-xs tabular-nums">{Number(s.vote_count ?? 0)}</span>
                      </Button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          {hasMore && (
            <div className="mt-6 flex justify-center">
              <Button variant="outline" onClick={loadMore} disabled={more}>
                {more ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading…
                  </>
                ) : (
                  "Load more"
                )}
              </Button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
