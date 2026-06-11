import { useCallback, useEffect, useState } from 'react';
import type { ApiStatus, MatchesCache, Participant } from '../../shared/types';
import {
  fetchMatches,
  fetchParticipants,
  fetchStatus,
  subscribeToUpdates,
} from './api';
import { BracketView } from './components/BracketView';
import { FixtureList } from './components/FixtureList';
import { ParticipantGrid } from './components/ParticipantGrid';
import styles from './App.module.css';

type FixtureView = 'schedule' | 'bracket';

export default function App() {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [matches, setMatches] = useState<MatchesCache | null>(null);
  const [status, setStatus] = useState<ApiStatus | null>(null);
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [fixtureView, setFixtureView] = useState<FixtureView>('schedule');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [p, m, s] = await Promise.all([
        fetchParticipants(),
        fetchMatches(),
        fetchStatus(),
      ]);
      setParticipants(p);
      setMatches(m);
      setStatus(s);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
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

  const handleSelect = (slug: string) => {
    setSelectedSlug((current) => (current === slug ? null : slug));
  };

  const selected = participants.find((p) => p.slug === selectedSlug) ?? null;

  if (loading) {
    return <div className={styles.centered}>Loading sweepstakes data…</div>;
  }

  if (error && !matches) {
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

      <main className={styles.main}>
        <section>
          <h2 className={styles.sectionTitle}>Participants</h2>
          <ParticipantGrid
            participants={participants}
            selectedSlug={selectedSlug}
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
              <BracketView matches={matches.matches} selected={selected} />
            )
          ) : (
            <p className={styles.empty}>No fixture data available yet.</p>
          )}
        </section>
      </main>
    </div>
  );
}
