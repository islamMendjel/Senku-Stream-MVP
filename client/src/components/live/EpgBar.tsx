import React, { useEffect, useState } from 'react';
import { LiveChannel, EpgProgram } from '../../../../shared/types.js';
import { XtreamClient } from '../../services/xtream.js';
import { useAppStore } from '../../store/useAppStore.js';
import { Play, Clock, Calendar, Tv, Radio } from 'lucide-react';
import { Badge } from '../common/Badge.js';

interface EpgBarProps {
  channel: LiveChannel | null;
  onPlay: (channel: LiveChannel) => void;
}

export const EpgBar: React.FC<EpgBarProps> = ({ channel, onPlay }) => {
  const { activeProfile, settings } = useAppStore();
  const [epgList, setEpgList] = useState<EpgProgram[]>([]);
  const [isLoadingEpg, setIsLoadingEpg] = useState(false);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    if (!channel || !activeProfile || activeProfile.type !== 'xtream') {
      setEpgList([]);
      return;
    }

    let isMounted = true;
    setIsLoadingEpg(true);

    const xtream = new XtreamClient(activeProfile, settings.appPassword);
    xtream
      .getShortEpg(channel.stream_id, 4)
      .then((res) => {
        if (isMounted) {
          setEpgList(res.epg_listings || []);
          setIsLoadingEpg(false);
        }
      })
      .catch(() => {
        if (isMounted) {
          setEpgList([]);
          setIsLoadingEpg(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [channel?.stream_id, activeProfile]);

  if (!channel) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 text-center font-mono text-xs text-textDim border-l border-borderDim bg-surfaceLight/20">
        <Tv size={28} className="mb-2 opacity-30 text-cyanNeon" />
        <p>No channel coordinate locked.</p>
        <p className="text-[11px] mt-1 text-textMuted">Select a channel to inspect EPG telemetry.</p>
      </div>
    );
  }

  const currentProgram = epgList[0];

  return (
    <div className="h-full w-80 flex flex-col border-l border-borderDim bg-surface/95 overflow-hidden">
      {/* Channel Header Banner */}
      <div className="p-4 border-b border-borderDim bg-surfaceLight/40 flex flex-col items-center text-center">
        <div className="w-16 h-16 rounded-xl bg-void border border-borderDim p-2 mb-3 flex items-center justify-center">
          {channel.stream_icon && !imgError ? (
            <img
              src={channel.stream_icon}
              alt={channel.name}
              onError={() => setImgError(true)}
              className="w-full h-full object-contain"
            />
          ) : (
            <Tv size={24} className="text-textDim" />
          )}
        </div>
        <h3 className="font-mono text-sm font-bold text-textBright truncate w-full">
          {channel.name}
        </h3>
        <span className="text-[10px] font-mono text-cyanNeon mt-1">
          ID: {channel.stream_id}
        </span>

        {/* Play Action */}
        <button
          onClick={() => onPlay(channel)}
          className="mt-3 w-full py-2 bg-portal/20 hover:bg-portal/30 text-portal border border-portal/50 rounded-lg text-xs font-mono font-bold tracking-wider flex items-center justify-center gap-2 shadow-portal-glow transition-all"
        >
          <Play size={14} className="fill-portal" />
          <span>ENGAGE SIGNAL</span>
        </button>
      </div>

      {/* Program Schedule */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between text-[11px] font-mono text-textMuted uppercase tracking-wider">
          <span className="flex items-center gap-1.5 text-portal">
            <Radio size={12} />
            <span>EPG TELEMETRY</span>
          </span>
          {isLoadingEpg && <span className="text-cyanNeon animate-pulse">Syncing...</span>}
        </div>

        {epgList.length === 0 && !isLoadingEpg && (
          <div className="text-center py-8 text-xs font-mono text-textDim">
            Null set. No EPG telemetry broadcasted for this stream.
          </div>
        )}

        {epgList.map((prog, idx) => {
          const isNow = idx === 0;
          return (
            <div
              key={prog.id || idx}
              className={`p-3 rounded-lg border font-mono text-xs ${
                isNow
                  ? 'bg-portal/10 border-portal/40 text-textBright shadow-portal-glow/20'
                  : 'bg-surfaceLight/30 border-borderDim text-textMuted'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-cyanNeon">
                  {prog.start ? prog.start.substring(11, 16) : ''} - {prog.end ? prog.end.substring(11, 16) : ''}
                </span>
                {isNow && <Badge variant="portal" size="sm" pulse>NOW</Badge>}
              </div>

              <div className="font-semibold text-textBright line-clamp-1">
                {prog.title}
              </div>

              {prog.description && (
                <p className="text-[11px] text-textMuted mt-1 line-clamp-3 leading-relaxed">
                  {prog.description}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
