import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ApiStatus, Match, MatchesCache, Participant } from '../../shared/types';
import { buildOwnerFinder } from '../../shared/matchResult';
import { computeEliminatedTeams } from '../../shared/elimination';
import {
  fetchMatches,
  fetchParticipants,
  fetchStatus,
  isFixtureDataStale,
  subscribeToUpdates,
} from './api';
import { BracketView } from './components/BracketView';
import { FixtureList } from './components/FixtureList';
import { LiveGamesBar } from './components/LiveGamesBar';
import { ParticipantGrid } from './components/ParticipantGrid';
import styles from './App.module.css';

type FixtureView = 'schedule' | 'bracket';

const FINISHED_STATUSES = new Set(['FINISHED', 'AWARDED', 'CANCELLED']);

/**
 * Picks the "next game" to pre-highlight: the soonest non-finished fixture at or
 * after now, falling back to the earliest non-finished fixture otherwise.
 * Knockout matches are preferred (the bracket is the default view); if none are
 * pending we fall back to the next match overall.
 */
function pickNextMatch(matches: Match[]): Match | null {
  const now = Date.now();
  const byDate = (a: Match, b: Match) =>
    new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime();

  const pickFrom = (pool: Match[]): Match | null => {
    const pending = pool.filter((m) => !FINISHED_STATUSES.has(m.status));
    const future = pending
      .filter((m) => new Date(m.utcDate).getTime() >= now)
      .sort(byDate);
    if (future.length > 0) return future[0];
    return [...pending].sort(byDate)[0] ?? null;
  };

  const knockout = matches.filter((m) => m.stage !== 'GROUP_STAGE');
  return pickFrom(knockout) ?? pickFrom(matches);
}

export default function App() {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [matches, setMatches] = useState<MatchesCache | null>(null);
  const [status, setStatus] = useState<ApiStatus | null>(null);
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [selectedFixtureId, setSelectedFixtureId] = useState<number | null>(null);
  const [highlightedSlugs, setHighlightedSlugs] = useState<string[]>([]);
  const [fixtureView, setFixtureView] = useState<FixtureView>('bracket');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const seededNextMatchId = useRef<number | null>(null);
  const hasInteractedRef = useRef(false);

  const nextMatch = useMemo(
    () => (matches ? pickNextMatch(matches.matches) : null),
    [matches],
  );

  const elimination = useMemo(
    () => computeEliminatedTeams(matches?.matches ?? []),
    [matches],
  );

  const loadData = useCallback(async () => {
    const errors: string[] = [];

    const [participantsResult, matchesResult, statusResult] =
      await Promise.allSettled([
        fetchParticipants(),
        fetchMatches(),
        fetchStatus(),
      ]);

    if (participantsResult.status === 'fulfilled') {
      setParticipants(participantsResult.value);
    } else {
      errors.push(
        participantsResult.reason instanceof Error
          ? participantsResult.reason.message
          : 'Failed to load participants',
      );
    }

    if (matchesResult.status === 'fulfilled') {
      setMatches(matchesResult.value);
    } else {
      errors.push(
        matchesResult.reason instanceof Error
          ? matchesResult.reason.message
          : 'Failed to load matches',
      );
    }

    if (statusResult.status === 'fulfilled') {
      setStatus(statusResult.value);
    }

    setError(errors.length > 0 ? errors.join(' · ') : null);
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    const unsubscribe = subscribeToUpdates(() => {
      void loadData();
    });
    return unsubscribe;
  }, [loadData]);

  useEffect(() => {
    if (!status?.activeWindow) return;

    const interval = setInterval(() => {
      void loadData();
    }, 60_000);

    return () => clearInterval(interval);
  }, [status?.activeWindow, loadData]);

  useEffect(() => {
    if (!isFixtureDataStale(status)) return;

    const interval = setInterval(() => {
      void loadData();
    }, 60_000);

    return () => clearInterval(interval);
  }, [status, loadData]);

  useEffect(() => {
    if (!matches || participants.length === 0) return;
    if (hasInteractedRef.current) return;

    if (!nextMatch) {
      seededNextMatchId.current = null;
      return;
    }

    if (seededNextMatchId.current === nextMatch.id) return;

    const findOwner = buildOwnerFinder(participants);
    const slugs = Array.from(
      new Set(
        [findOwner(nextMatch.homeTeam)?.slug, findOwner(nextMatch.awayTeam)?.slug].filter(
          (slug): slug is string => Boolean(slug),
        ),
      ),
    );

    seededNextMatchId.current = nextMatch.id;
    setHighlightedSlugs(slugs);
  }, [matches, nextMatch, participants]);

  const handleSelect = (slug: string) => {
    hasInteractedRef.current = true;
    const deselect = selectedSlug === slug;
    setSelectedFixtureId(null);
    setSelectedSlug(deselect ? null : slug);
    setHighlightedSlugs(deselect ? [] : [slug]);
  };

  const handleFixtureSelect = (fixtureId: number, participantSlugs: string[]) => {
    hasInteractedRef.current = true;
    const deselect = selectedFixtureId === fixtureId;
    setSelectedSlug(null);
    setSelectedFixtureId(deselect ? null : fixtureId);
    setHighlightedSlugs(deselect ? [] : participantSlugs);
  };

  const selected = participants.find((p) => p.slug === selectedSlug) ?? null;

  if (loading) {
    return <div className={styles.centered}>Loading sweepstakes data…</div>;
  }

  if (error && !matches && participants.length === 0) {
    return <div className={styles.centered}>{error}</div>;
  }

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <h1>World Cup 2026 Sweepstakes</h1>
          <p className={styles.subtitle}>
            Click a name to highlight their teams&apos; fixtures
          </p>
          {status && (
            <div className={styles.statusBar}>
              <span>
                {status.matchCount} fixtures
                {status.lastFetch && (
                  <> · Updated {new Date(status.lastFetch).toLocaleString()}</>
                )}
              </span>
              {status.activeWindow && (
                <span className={styles.liveBadge}>Live polling</span>
              )}
            </div>
          )}
        </div>
      </header>

      {matches && <LiveGamesBar matches={matches.matches} />}

      <main className={styles.main}>
        {error && (
          <p className={styles.loadWarning} role="status">
            {error}
          </p>
        )}
        <section>
          <h2 className={styles.sectionTitle}>Participants</h2>
          <ParticipantGrid
            participants={participants}
            selectedSlug={selectedSlug}
            highlightedSlugs={highlightedSlugs}
            elimination={elimination}
            onSelect={handleSelect}
          />
        </section>

        <section>
          <div className={styles.fixtureHeader}>
            <h2 className={styles.sectionTitle}>
              Fixtures
              {selected && (
                <span className={styles.selectedLabel}>
                  — {selected.name}&apos;s teams
                </span>
              )}
            </h2>
            <div className={styles.viewTabs} role="tablist" aria-label="Fixture views">
              <button
                type="button"
                role="tab"
                aria-selected={fixtureView === 'schedule'}
                className={`${styles.viewTab} ${fixtureView === 'schedule' ? styles.viewTabActive : ''}`}
                onClick={() => setFixtureView('schedule')}
              >
                Groups &amp; Schedule
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={fixtureView === 'bracket'}
                className={`${styles.viewTab} ${fixtureView === 'bracket' ? styles.viewTabActive : ''}`}
                onClick={() => setFixtureView('bracket')}
              >
                Knockout Bracket
              </button>
            </div>
          </div>
          {matches ? (
            fixtureView === 'schedule' ? (
              <FixtureList
                matches={matches.matches}
                selected={selected}
                groupStageOnly
              />
            ) : (
              <BracketView
                matches={matches.matches}
                selected={selected}
                participants={participants}
                nextMatchId={nextMatch?.id ?? null}
                selectedFixtureId={selectedFixtureId}
                onFixtureSelect={handleFixtureSelect}
              />
            )
          ) : (
            <p className={styles.empty}>No fixture data available yet.</p>
          )}
        </section>
      </main>
    </div>
  );
}
