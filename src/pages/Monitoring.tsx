import IdleHint from '@/components/IdleHint';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, X, Camera, Filter, Trash2, Grid2x2, Square as SquareIcon, Columns2, Settings, FolderOpen, Film } from 'lucide-react';
import { useCameraRegistry } from '@/hooks/useCameraRegistry';
import { useCameraSlots, slotCamera, slotSettings, type SlotCount } from '@/hooks/useCameraSlots';
import CameraTile from '@/components/multicam/CameraTile';
import {
  clipFolderSupported, getClipFolderLabel, getClipSeconds, pickClipFolder, setClipSeconds,
} from '@/lib/clipRecorder';
import type { DetectionEvent } from '@/types/multicam';

const typeIcon: Record<string, string> = {
  fire: '🔥', smoke: '💨', human: '🧍', object: '📦',
  'face-distress': '😨', 'audio-distress': '🗣️', saliency: '✨',
};

export default function Monitoring() {
  const navigate = useNavigate();
  const { settings, events, addEvent, updateEvent, clearEvents } = useCameraRegistry();
  const { count, activeSlots, setCount } = useCameraSlots();
  const [focused, setFocused] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const [showSettings, setShowSettings] = useState(false);
  const [folder, setFolder] = useState(getClipFolderLabel());
  const [seconds, setSeconds] = useState(getClipSeconds());
  const [folderError, setFolderError] = useState('');

  const connected = useMemo(() => activeSlots.filter(s => s.ip.trim() && s.connected), [activeSlots]);
  const visible = focused ? connected.filter(s => `slot-${s.index}` === focused) : connected;
  const filtered = filter === 'all' ? events : events.filter(e => e.cameraId === filter);
  const alerts = filtered.filter(e => ['fire', 'smoke', 'face-distress', 'audio-distress'].includes(e.type));

  const handleEvent = (evt: Omit<DetectionEvent, 'id'>) => {
    const id = crypto.randomUUID();
    addEvent({ ...evt, id });
    return id;
  };

  const chooseFolder = async () => {
    setFolderError('');
    try {
      setFolder(await pickClipFolder());
    } catch (err) {
      setFolderError(err instanceof Error ? err.message : 'Could not open the folder picker.');
    }
  };

  const gridClass = count === 1 ? 'grid-cols-1' : count === 2 ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1 md:grid-cols-2';

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card/60 backdrop-blur-sm px-4 py-3 flex items-center justify-between flex-wrap gap-2">
        <button onClick={() => navigate('/')} className="flex items-center gap-2 group">
          <Shield className="w-6 h-6 text-primary" />
          <h1 className="text-lg font-bold tracking-tight group-hover:text-primary transition-colors">MSDSystem</h1>
        </button>
        <div className="flex items-center gap-2">
          <span className="text-[15px] font-semibold text-muted-foreground">
            {connected.length} camera{connected.length === 1 ? '' : 's'} monitoring
          </span>
          <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1">
            {([1, 2, 3, 4] as SlotCount[]).map(n => (
              <button
                key={n}
                onClick={() => { setCount(n); setFocused(null); }}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[14px] font-semibold transition-colors ${
                  count === n && !focused ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                }`}
                title={`${n} camera layout`}
              >
                {n === 1 ? <SquareIcon className="w-4 h-4" /> : n === 2 ? <Columns2 className="w-4 h-4" /> : <Grid2x2 className="w-4 h-4" />}
                {n}
              </button>
            ))}
          </div>
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-1.5 text-[15px] font-semibold text-accent bg-accent/10 hover:bg-accent/20 px-3 py-1.5 rounded-full"
          >
            <Camera className="w-4 h-4" /> Dashboard
          </button>
        </div>
      </header>

      <main className="p-4 grid lg:grid-cols-[1fr_360px] gap-4">
        <section>
          {focused && (
            <button
              onClick={() => setFocused(null)}
              className="mb-3 flex items-center gap-1.5 text-[15px] font-semibold text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" /> Exit single-camera view
            </button>
          )}
          {connected.length === 0 ? (
            <div className="border border-dashed border-border rounded-lg p-10 text-center">
              <p className="text-[17px] font-semibold mb-2">No cameras connected yet</p>
              <p className="text-[15px] text-muted-foreground mb-4">
                Open Connect on the dashboard, choose 1, 2 or 4 cameras and type each camera's local
                server IP address. Every feed runs its own saliency detection pipeline.
              </p>
              <div className="relative inline-block">
                <IdleHint message="Go to Connect to add your first camera" />
                <button
                  onClick={() => navigate('/dashboard')}
                  className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-[15px] font-bold"
                >
                  Go to Connect
                </button>
              </div>
            </div>
          ) : (
            <div className={`grid gap-4 ${focused ? 'grid-cols-1' : gridClass}`}>
              {visible.map(slot => {
                // Follow the AI On/Off choice made when connecting each camera.
                const camera = slotCamera(slot);
                return (
                  <CameraTile
                    key={slot.index}
                    camera={camera}
                    settings={slotSettings(slot, settings)}
                    onEvent={handleEvent}
                    onClip={(id, clipFile, clipUrl) => updateEvent(id, { clipFile, clipUrl })}
                    onExpand={id => setFocused(prev => (prev === id ? null : id))}
                    audioControls={slot.index !== 1}
                  />
                );
              })}
            </div>
          )}
        </section>

        {/* Alerts + Event history */}
        <aside className="space-y-4">
          <div className="bg-card border border-border rounded-lg">
            <div className="px-3 py-2 border-b border-border flex items-center gap-2">
              <span className="text-[15px] font-bold">Alerts</span>
              <span className="text-[13px] text-muted-foreground">{alerts.length}</span>
            </div>
            <div className="max-h-64 overflow-y-auto divide-y divide-border">
              {alerts.length === 0 && (
                <p className="p-3 text-[14px] text-muted-foreground">No alerts yet.</p>
              )}
              {alerts.slice(0, 40).map(a => (
                <div key={a.id} className="p-3">
                  <div className="text-[15px] font-bold">
                    {typeIcon[a.type]} {a.label}
                  </div>
                  <div className="text-[14px] text-muted-foreground">
                    Camera: <span className="font-semibold text-foreground">{a.cameraName}</span>
                    {a.location ? ` · ${a.location}` : ''}
                  </div>
                  <div className="text-[14px] text-muted-foreground">
                    Confidence: {(a.confidence * 100).toFixed(0)}% · {new Date(a.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg">
            <div className="px-3 py-2 border-b border-border flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <select
                value={filter}
                onChange={e => setFilter(e.target.value)}
                className="flex-1 bg-background border border-border rounded px-2 py-1 text-[14px]"
              >
                <option value="all">All cameras</option>
                {activeSlots.map(s => (
                  <option key={s.index} value={`slot-${s.index}`}>{s.name}</option>
                ))}
              </select>
              <button
                onClick={() => setShowSettings(v => !v)}
                className={`p-1.5 rounded hover:bg-muted ${showSettings ? 'text-primary' : 'text-muted-foreground'}`}
                title="Recording settings"
                aria-expanded={showSettings}
              >
                <Settings className="w-4 h-4" />
              </button>
              <button onClick={clearEvents} className="p-1.5 rounded hover:bg-muted" title="Clear history">
                <Trash2 className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            {showSettings && (
              <div className="px-3 py-3 border-b border-border bg-primary/5 space-y-2">
                <p className="text-[14px] font-semibold">Where should emergency videos be saved?</p>
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={chooseFolder}
                    disabled={!clipFolderSupported()}
                    className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-[14px] font-semibold hover:bg-muted disabled:opacity-60"
                  >
                    <FolderOpen className="w-4 h-4" /> Choose folder
                  </button>
                  <span className="text-[14px] text-muted-foreground">
                    {folder ? `Saving to “${folder}”` : 'Saving to your Downloads folder'}
                  </span>
                </div>
                {!clipFolderSupported() && (
                  <p className="text-[13px] text-muted-foreground">
                    This browser cannot pick a folder, so clips go to Downloads.
                  </p>
                )}
                {folderError && <p className="text-[13px] text-destructive">{folderError}</p>}
                <label className="block text-[14px] font-semibold">
                  Clip length: {seconds} seconds
                  <input
                    type="range"
                    min={5}
                    max={30}
                    step={5}
                    value={seconds}
                    onChange={e => { const v = Number(e.target.value); setSeconds(v); setClipSeconds(v); }}
                    className="w-full mt-1"
                  />
                </label>
              </div>
            )}

            <div className="max-h-[420px] overflow-y-auto divide-y divide-border">
              {filtered.length === 0 && (
                <p className="p-3 text-[14px] text-muted-foreground">No events recorded.</p>
              )}
              {filtered.slice(0, 100).map(e => (
                <div key={e.id} className="p-2.5 flex gap-2 items-start">
                  {e.clipUrl ? (
                    <video src={e.clipUrl} controls className="w-24 h-16 rounded border border-border bg-background" />
                  ) : e.snapshot ? (
                    <img src={e.snapshot} alt={`${e.type} snapshot from ${e.cameraName}`} className="w-16 h-12 object-cover rounded border border-border" />
                  ) : (
                    <div className="w-16 h-12 rounded bg-muted flex items-center justify-center text-lg">{typeIcon[e.type]}</div>
                  )}
                  <div className="min-w-0">
                    <div className="text-[14px] font-semibold truncate">{e.label}</div>
                    <div className="text-[13px] text-muted-foreground truncate">
                      {e.cameraName}{e.location ? ` · ${e.location}` : ''} · {(e.confidence * 100).toFixed(0)}%
                    </div>
                    <div className="text-[13px] text-muted-foreground">{new Date(e.timestamp).toLocaleString()}</div>
                    {e.clipFile && (
                      <div className="flex items-center gap-1 text-[13px] text-primary truncate">
                        <Film className="w-3.5 h-3.5 shrink-0" /> {e.clipFile}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
}
