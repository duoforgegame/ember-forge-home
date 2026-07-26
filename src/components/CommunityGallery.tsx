import { useEffect, useState } from "react";
import { ArrowBigUp, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { fetchGallerySkins, type GallerySkin } from "@/lib/skincreator";
import { getSkinUser, listMyVotes, toggleSkinVote } from "@/lib/skinauth";

const PAGE_SIZE = 20;

export function CommunityGallery() {
  const [skins, setSkins] = useState<GallerySkin[]>([]);
  const [loading, setLoading] = useState(true);
  const [more, setMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [myVotes, setMyVotes] = useState<Set<string>>(new Set());
  const [voting, setVoting] = useState<string | null>(null);
  const signedIn = !!getSkinUser();

  const load = async (offset: number) => {
    const rows = await fetchGallerySkins(offset, PAGE_SIZE);
    setSkins((prev) => (offset === 0 ? rows : [...prev, ...rows]));
    setHasMore(rows.length === PAGE_SIZE);
  };

  useEffect(() => {
    (async () => {
      try {
        await load(0);
      } catch (e) {
        toast.error((e as Error).message || "Could not load the community gallery");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!signedIn) {
      setMyVotes(new Set());
      return;
    }
    listMyVotes()
      .then((ids) => setMyVotes(new Set(ids)))
      .catch(() => { /* votes stay unmarked, voting still works */ });
  }, [signedIn]);

  const loadMore = async () => {
    setMore(true);
    try {
      await load(skins.length);
    } catch (e) {
      toast.error((e as Error).message || "Could not load more skins");
    } finally {
      setMore(false);
    }
  };

  const vote = async (id: string) => {
    if (!signedIn) {
      toast.error("Sign in to upvote community skins");
      return;
    }
    setVoting(id);
    try {
      const { voted, vote_count } = await toggleSkinVote(id);
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
        Skins created by the community and approved by our team.{" "}
        {signedIn
          ? "You can give every skin one upvote, click again to take it back."
          : "Sign in with a free account to upvote skins, one vote per skin."}
      </p>

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
                  <div className="flex h-36 items-center justify-center bg-[#111] p-3">
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
                        title={signedIn ? (mine ? "Remove your upvote" : "Upvote this skin") : "Sign in to upvote"}
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
