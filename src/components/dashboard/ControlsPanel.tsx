import type { QualityMode } from '@/types/dashboard';
import { INDOOR_OBJECTS, DEFAULT_PRIORITY_OBJECTS } from '@/types/dashboard';

interface ControlsPanelProps {
  running: boolean;
  threshold: number;
  showBoundingBoxes: boolean;
  showHeatmap: boolean;
  showAlerts: boolean;
  quality: QualityMode;
  mirror: boolean;
  heatmapOpacity: number;
  simulationMode: boolean;
  minConfidence: number;
  priorityObjects: string[];
  onStart: () => void;
  onStop: () => void;
  onThresholdChange: (v: number) => void;
  onToggleBoundingBoxes: () => void;
  onToggleHeatmap: () => void;
  onToggleAlerts: () => void;
  onQualityChange: (q: QualityMode) => void;
  onToggleMirror: () => void;
  onHeatmapOpacityChange: (v: number) => void;
  onToggleSimulation: () => void;
  onPriorityObjectsChange: (objects: string[]) => void;
  onMinConfidenceChange: (v: number) => void;
  onExportCSV: () => void;
}

export default function ControlsPanel(props: ControlsPanelProps) {
  const {
    running, threshold, showBoundingBoxes, showHeatmap, showAlerts,
    quality, mirror, heatmapOpacity, simulationMode, priorityObjects, minConfidence,
    onStart, onStop, onThresholdChange,
    onToggleBoundingBoxes, onToggleHeatmap, onToggleAlerts,
    onQualityChange, onToggleMirror, onHeatmapOpacityChange,
    onToggleSimulation, onPriorityObjectsChange, onMinConfidenceChange, onExportCSV,
  } = props;

  const togglePriority = (obj: string) => {
    onPriorityObjectsChange(
      priorityObjects.includes(obj)
        ? priorityObjects.filter(o => o !== obj)
        : [...priorityObjects, obj]
    );
  };

  return (
    <div className="bg-card rounded-md border border-border panel-glow p-3 space-y-3">
      <span className="text-[10px] font-mono text-primary uppercase tracking-wider">Controls</span>


      {/* Toggles grid */}
      <div className="grid grid-cols-2 gap-1.5">
        {[
          { label: 'Boxes', active: showBoundingBoxes, toggle: onToggleBoundingBoxes },
          { label: 'Heatmap', active: showHeatmap, toggle: onToggleHeatmap },
          { label: 'Alerts', active: showAlerts, toggle: onToggleAlerts },
          { label: 'Mirror', active: mirror, toggle: onToggleMirror },
          { label: 'Simulate', active: simulationMode, toggle: onToggleSimulation },
        ].map(({ label, active, toggle }) => (
          <button
            key={label}
            onClick={toggle}
            className={`text-[10px] font-mono py-1.5 px-2 rounded transition-all border ${
              active
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border text-muted-foreground hover:border-muted-foreground'
            }`}
          >
            {active ? '●' : '○'} {label}
          </button>
        ))}
      </div>

      {/* Quality */}
      <div className="flex gap-1">
        {(['SD', 'HD'] as QualityMode[]).map(q => (
          <button
            key={q}
            onClick={() => onQualityChange(q)}
            className={`flex-1 text-[10px] font-mono py-1 rounded border transition-all ${
              quality === q
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border text-muted-foreground'
            }`}
          >
            {q}
          </button>
        ))}
      </div>

      {/* Threshold */}
      <div className="space-y-1">
        <div className="flex justify-between">
          <span className="text-[10px] font-mono text-muted-foreground">Threshold</span>
          <span className="text-[10px] font-mono text-foreground">{threshold}</span>
        </div>
        <input
          type="range"
          min={0}
          max={255}
          value={threshold}
          onChange={e => onThresholdChange(Number(e.target.value))}
          className="w-full h-1 bg-secondary rounded-full appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:cursor-pointer"
        />
      </div>

      {/* Heatmap Opacity */}
      <div className="space-y-1">
        <div className="flex justify-between">
          <span className="text-[10px] font-mono text-muted-foreground">Heatmap Opacity</span>
          <span className="text-[10px] font-mono text-foreground">{heatmapOpacity}%</span>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          value={heatmapOpacity}
          onChange={e => onHeatmapOpacityChange(Number(e.target.value))}
          className="w-full h-1 bg-secondary rounded-full appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:cursor-pointer"
        />
      </div>

      {/* Detection Confidence */}
      <div className="space-y-1">
        <div className="flex justify-between">
          <span className="text-[10px] font-mono text-muted-foreground">Detection Sensitivity</span>
          <span className="text-[10px] font-mono text-foreground">{minConfidence}%</span>
        </div>
        <input
          type="range"
          min={5}
          max={90}
          value={minConfidence}
          onChange={e => onMinConfidenceChange(Number(e.target.value))}
          className="w-full h-1 bg-secondary rounded-full appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:cursor-pointer"
        />
        <div className="flex justify-between text-[8px] font-mono text-muted-foreground">
          <span>More objects</span>
          <span>Higher accuracy</span>
        </div>
      </div>

      {/* Priority Objects */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-mono text-muted-foreground">Priority Objects</span>
          <button
            onClick={() => {
              const allObjects = [...INDOOR_OBJECTS];
              if (priorityObjects.length === allObjects.length) {
                onPriorityObjectsChange(DEFAULT_PRIORITY_OBJECTS);
              } else {
                onPriorityObjectsChange([...allObjects]);
              }
            }}
            className={`text-[9px] font-mono px-1.5 py-0.5 rounded border transition-all ${
              priorityObjects.length === INDOOR_OBJECTS.length
                ? 'border-accent bg-accent/10 text-accent'
                : 'border-border text-muted-foreground hover:border-primary'
            }`}
          >
            {priorityObjects.length === INDOOR_OBJECTS.length ? '● ALL' : '○ ALL'}
          </button>
        </div>
        <div className="flex flex-wrap gap-1 max-h-32 sm:max-h-40 overflow-y-auto">
          {[...INDOOR_OBJECTS].map(obj => (
            <button
              key={obj}
              onClick={() => togglePriority(obj)}
              className={`text-[9px] font-mono px-1.5 py-0.5 rounded border transition-all ${
                priorityObjects.includes(obj)
                  ? 'border-accent bg-accent/10 text-accent'
                  : 'border-border text-muted-foreground'
              }`}
            >
              {obj}
            </button>
          ))}
        </div>
      </div>

      {/* Export */}
      <button
        onClick={onExportCSV}
        className="w-full text-[10px] font-mono py-1.5 rounded border border-border text-muted-foreground hover:border-primary hover:text-primary transition-all"
      >
        ↓ Export CSV
      </button>
    </div>
  );
}
