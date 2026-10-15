import React, { useEffect, useState } from 'react';
import { useAppStore } from './store/useAppStore.js';
import { usePlayerStore } from './store/usePlayerStore.js';
import { Layout } from './components/layout/Layout.js';
import { LiveView } from './components/live/LiveView.js';
import { MoviesView } from './components/movies/MoviesView.js';
import { SeriesView } from './components/series/SeriesView.js';
import { Player } from './components/player/Player.js';
import { Onboarding } from './components/onboarding/Onboarding.js';
import { SettingsModal } from './components/settings/SettingsModal.js';
import { CatalogDb } from './services/db.js';
import { XtreamClient } from './services/xtream.js';
import { LiveChannel } from '../../shared/types.js';

export const App: React.FC = () => {
  const {
    activeTab,
    profiles,
    activeProfile,
    loadProfiles,
    isLoadingProfiles,
    settings,
  } = useAppStore();

  const { currentMedia, playMedia } = usePlayerStore();

  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Initialize profiles on launch
  useEffect(() => {
    loadProfiles().then(() => {
      // If no profiles exist after loading, prompt onboarding
      const currentList = useAppStore.getState().profiles;
      if (currentList.length === 0) {
        setOnboardingOpen(true);
      }
    });
  }, []);

  // Channel Next / Previous navigation handler for Live TV
  const handleNextChannel = async () => {
    if (!activeProfile || currentMedia?.type !== 'live') return;
    try {
      const allChannels = await CatalogDb.getLiveChannels(activeProfile.id);
      const curIdx = allChannels.findIndex(
        (c) => String(c.stream_id) === String(currentMedia.streamId)
      );
      if (curIdx !== -1 && curIdx < allChannels.length - 1) {
        engageChannel(allChannels[curIdx + 1]);
      }
    } catch {}
  };

  const handlePreviousChannel = async () => {
    if (!activeProfile || currentMedia?.type !== 'live') return;
    try {
      const allChannels = await CatalogDb.getLiveChannels(activeProfile.id);
      const curIdx = allChannels.findIndex(
        (c) => String(c.stream_id) === String(currentMedia.streamId)
      );
      if (curIdx > 0) {
        engageChannel(allChannels[curIdx - 1]);
      }
    } catch {}
  };

  const engageChannel = (channel: LiveChannel) => {
    if (!activeProfile) return;
    let streamUrl = channel.url;
    if (!streamUrl && activeProfile.type === 'xtream') {
      const xtream = new XtreamClient(activeProfile, settings.appPassword);
      streamUrl = xtream.buildLiveStreamUrl(
        channel.stream_id,
        settings.preferredStreamFormat || 'm3u8'
      );
    } else if (streamUrl && !streamUrl.startsWith('/api/')) {
      streamUrl = `/api/stream?url=${encodeURIComponent(streamUrl)}`;
    }

    if (streamUrl) {
      playMedia({
        streamId: channel.stream_id,
        name: channel.name,
        type: 'live',
        url: streamUrl,
        poster: channel.stream_icon,
        subtitle: `CH ${channel.num || channel.stream_id}`,
      });
    }
  };

  return (
    <div className="h-full w-full bg-void flex flex-col overflow-hidden">
      <Layout
        onOpenOnboarding={() => setOnboardingOpen(true)}
        onOpenSettings={() => setSettingsOpen(true)}
      >
        {activeTab === 'live' && <LiveView />}
        {activeTab === 'movie' && <MoviesView />}
        {activeTab === 'series' && <SeriesView />}
      </Layout>

      {/* Global HLS Video Player Overlay */}
      <Player
        onPreviousChannel={handlePreviousChannel}
        onNextChannel={handleNextChannel}
      />

      {/* Onboarding Dialog */}
      <Onboarding
        isOpen={onboardingOpen}
        onClose={() => setOnboardingOpen(false)}
      />

      {/* Settings Dialog */}
      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </div>
  );
};
