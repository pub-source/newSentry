
/**
 * Visual Diagrams for Research Documentation
 * Clean, readable diagrams: Use Case, DFD, Activity, Sequence, ERD, State, Conceptual Framework
 */

/* ============================================================
 * 1. USE CASE DIAGRAM
 * ============================================================ */
export function UseCaseDiagram() {
  return (
    <div className="bg-card border border-border rounded-md p-4">
      <p className="text-[10px] font-mono text-primary uppercase tracking-wider mb-3">
        Figure 1.2 — Use Case Diagram
      </p>
      <div className="bg-background rounded-md p-6 border border-border overflow-x-auto">
        <svg viewBox="0 0 860 600" className="w-full max-w-4xl mx-auto" style={{ minWidth: '600px' }}>
          {/* System boundary */}
          <rect x="220" y="15" width="420" height="570" rx="14" className="fill-primary/5 stroke-primary" strokeWidth="1.5" strokeDasharray="8,4"/>
          <text x="430" y="42" textAnchor="middle" className="fill-primary text-[11px] font-mono font-bold">
            Multimodal Saliency Detection System
          </text>

          {/* ---- ACTORS ---- */}
          {/* Homeowner (left) */}
          <circle cx="90" cy="160" r="20" className="fill-none stroke-foreground" strokeWidth="1.5"/>
          <line x1="90" y1="180" x2="90" y2="225" className="stroke-foreground" strokeWidth="1.5"/>
          <line x1="60" y1="198" x2="120" y2="198" className="stroke-foreground" strokeWidth="1.5"/>
          <line x1="90" y1="225" x2="60" y2="260" className="stroke-foreground" strokeWidth="1.5"/>
          <line x1="90" y1="225" x2="120" y2="260" className="stroke-foreground" strokeWidth="1.5"/>
          <text x="90" y="280" textAnchor="middle" className="fill-foreground text-[10px] font-mono font-bold">Homeowner</text>
          <text x="90" y="293" textAnchor="middle" className="fill-muted-foreground text-[8px] font-mono">(Primary)</text>

          {/* Household Member (left lower) */}
          <circle cx="90" cy="420" r="20" className="fill-none stroke-foreground" strokeWidth="1.5"/>
          <line x1="90" y1="440" x2="90" y2="485" className="stroke-foreground" strokeWidth="1.5"/>
          <line x1="60" y1="458" x2="120" y2="458" className="stroke-foreground" strokeWidth="1.5"/>
          <line x1="90" y1="485" x2="60" y2="520" className="stroke-foreground" strokeWidth="1.5"/>
          <line x1="90" y1="485" x2="120" y2="520" className="stroke-foreground" strokeWidth="1.5"/>
          <text x="90" y="538" textAnchor="middle" className="fill-foreground text-[10px] font-mono font-bold">Household</text>
          <text x="90" y="551" textAnchor="middle" className="fill-foreground text-[10px] font-mono font-bold">Member</text>

          {/* Camera/Mic (right) */}
          <rect x="740" y="110" width="80" height="50" rx="6" className="fill-accent/10 stroke-accent" strokeWidth="1.5"/>
          <text x="780" y="132" textAnchor="middle" className="fill-accent text-[9px] font-mono font-bold">Camera</text>
          <text x="780" y="148" textAnchor="middle" className="fill-accent text-[9px] font-mono font-bold">+ Mic</text>

          {/* Cloud Database (right lower) */}
          <ellipse cx="780" cy="440" rx="40" ry="14" className="fill-info/10 stroke-info" strokeWidth="1.5"/>
          <rect x="740" y="440" width="80" height="28" className="fill-info/10 stroke-info" strokeWidth="1.5"/>
          <ellipse cx="780" cy="468" rx="40" ry="14" className="fill-info/10 stroke-info" strokeWidth="1.5"/>
          <text x="780" y="500" textAnchor="middle" className="fill-info text-[9px] font-mono font-bold">Cloud DB</text>

          {/* ---- USE CASES ---- */}
          {/* UC1 */}
          <ellipse cx="370" cy="90" rx="100" ry="26" className="fill-primary/8 stroke-primary" strokeWidth="1.2"/>
          <text x="370" y="87" textAnchor="middle" className="fill-foreground text-[9px] font-mono font-bold">UC1: Configure</text>
          <text x="370" y="100" textAnchor="middle" className="fill-foreground text-[8px] font-mono">System Settings</text>

          {/* UC2 */}
          <ellipse cx="370" cy="165" rx="100" ry="26" className="fill-primary/8 stroke-primary" strokeWidth="1.2"/>
          <text x="370" y="162" textAnchor="middle" className="fill-foreground text-[9px] font-mono font-bold">UC2: Monitor</text>
          <text x="370" y="175" textAnchor="middle" className="fill-foreground text-[8px] font-mono">Live Camera Feed</text>

          {/* UC3 */}
          <ellipse cx="370" cy="240" rx="100" ry="26" className="fill-accent/8 stroke-accent" strokeWidth="1.2"/>
          <text x="370" y="237" textAnchor="middle" className="fill-foreground text-[9px] font-mono font-bold">UC3: Manage</text>
          <text x="370" y="250" textAnchor="middle" className="fill-foreground text-[8px] font-mono">Wake Words</text>

          {/* UC4 - Central */}
          <ellipse cx="430" cy="320" rx="110" ry="28" className="fill-destructive/8 stroke-destructive" strokeWidth="1.5"/>
          <text x="430" y="317" textAnchor="middle" className="fill-destructive text-[9px] font-mono font-bold">UC4: Receive</text>
          <text x="430" y="330" textAnchor="middle" className="fill-destructive text-[8px] font-mono">Security Alerts</text>

          {/* UC5 */}
          <ellipse cx="510" cy="170" rx="100" ry="26" className="fill-warning/8 stroke-warning" strokeWidth="1.2"/>
          <text x="510" y="167" textAnchor="middle" className="fill-foreground text-[9px] font-mono font-bold">UC5: Compute</text>
          <text x="510" y="180" textAnchor="middle" className="fill-foreground text-[8px] font-mono">Saliency Map</text>

          {/* UC6 */}
          <ellipse cx="510" cy="395" rx="100" ry="26" className="fill-warning/8 stroke-warning" strokeWidth="1.2"/>
          <text x="510" y="392" textAnchor="middle" className="fill-foreground text-[9px] font-mono font-bold">UC6: Classify</text>
          <text x="510" y="405" textAnchor="middle" className="fill-foreground text-[8px] font-mono">Audio Events</text>

          {/* UC7 */}
          <ellipse cx="370" cy="395" rx="100" ry="26" className="fill-warning/8 stroke-warning" strokeWidth="1.2"/>
          <text x="370" y="392" textAnchor="middle" className="fill-foreground text-[9px] font-mono font-bold">UC7: Detect</text>
          <text x="370" y="405" textAnchor="middle" className="fill-foreground text-[8px] font-mono">Objects (COCO-SSD)</text>

          {/* UC8 */}
          <ellipse cx="430" cy="470" rx="100" ry="26" className="fill-info/8 stroke-info" strokeWidth="1.2"/>
          <text x="430" y="467" textAnchor="middle" className="fill-foreground text-[9px] font-mono font-bold">UC8: Log Alert</text>
          <text x="430" y="480" textAnchor="middle" className="fill-foreground text-[8px] font-mono">to Cloud History</text>

          {/* UC9 */}
          <ellipse cx="340" cy="540" rx="100" ry="26" className="fill-primary/8 stroke-primary" strokeWidth="1.2"/>
          <text x="340" y="537" textAnchor="middle" className="fill-foreground text-[9px] font-mono font-bold">UC9: Create/Join</text>
          <text x="340" y="550" textAnchor="middle" className="fill-foreground text-[8px] font-mono">Household</text>

          {/* UC10 */}
          <ellipse cx="530" cy="540" rx="100" ry="26" className="fill-destructive/12 stroke-destructive" strokeWidth="1.5"/>
          <text x="530" y="537" textAnchor="middle" className="fill-destructive text-[9px] font-mono font-bold">UC10: Trigger</text>
          <text x="530" y="550" textAnchor="middle" className="fill-destructive text-[8px] font-mono">911 Emergency</text>

          {/* ---- ASSOCIATIONS: Homeowner ---- */}
          <line x1="130" y1="155" x2="270" y2="90" className="stroke-foreground/40" strokeWidth="1"/>
          <line x1="130" y1="160" x2="270" y2="165" className="stroke-foreground/40" strokeWidth="1"/>
          <line x1="130" y1="170" x2="270" y2="240" className="stroke-foreground/40" strokeWidth="1"/>
          <line x1="130" y1="180" x2="320" y2="310" className="stroke-foreground/40" strokeWidth="1"/>

          {/* ---- ASSOCIATIONS: Household Member ---- */}
          <line x1="130" y1="420" x2="320" y2="320" className="stroke-foreground/40" strokeWidth="1"/>
          <line x1="130" y1="440" x2="240" y2="540" className="stroke-foreground/40" strokeWidth="1"/>
          <line x1="130" y1="445" x2="430" y2="540" className="stroke-foreground/40" strokeWidth="1"/>

          {/* ---- ASSOCIATIONS: Camera/Mic ---- */}
          <line x1="740" y1="130" x2="610" y2="170" className="stroke-accent/50" strokeWidth="1"/>
          <line x1="740" y1="140" x2="610" y2="395" className="stroke-accent/50" strokeWidth="1"/>
          <line x1="740" y1="135" x2="540" y2="310" className="stroke-accent/50" strokeWidth="1"/>

          {/* ---- ASSOCIATIONS: Cloud DB ---- */}
          <line x1="740" y1="450" x2="530" y2="470" className="stroke-info/50" strokeWidth="1"/>

          {/* ---- INCLUDE/EXTEND relationships ---- */}
          {/* UC4 includes UC5 */}
          <line x1="470" y1="295" x2="500" y2="196" className="stroke-warning" strokeWidth="1" strokeDasharray="5,3"/>
          <rect x="458" y="240" width="62" height="14" rx="2" className="fill-background"/>
          <text x="489" y="250" textAnchor="middle" className="fill-warning text-[7px] font-mono">{'<<include>>'}</text>

          {/* UC4 includes UC7 */}
          <line x1="410" y1="348" x2="380" y2="369" className="stroke-warning" strokeWidth="1" strokeDasharray="5,3"/>
          <rect x="360" y="348" width="62" height="14" rx="2" className="fill-background"/>
          <text x="391" y="358" textAnchor="middle" className="fill-warning text-[7px] font-mono">{'<<include>>'}</text>

          {/* UC4 includes UC6 */}
          <line x1="470" y1="345" x2="500" y2="370" className="stroke-warning" strokeWidth="1" strokeDasharray="5,3"/>
          <rect x="468" y="348" width="62" height="14" rx="2" className="fill-background"/>
          <text x="499" y="358" textAnchor="middle" className="fill-warning text-[7px] font-mono">{'<<include>>'}</text>

          {/* UC4 extends UC8 */}
          <line x1="430" y1="348" x2="430" y2="444" className="stroke-info" strokeWidth="1" strokeDasharray="5,3"/>
          <rect x="434" y="395" width="62" height="14" rx="2" className="fill-background"/>
          <text x="465" y="405" textAnchor="middle" className="fill-info text-[7px] font-mono">{'<<extend>>'}</text>

          {/* UC4 extends UC10 */}
          <line x1="470" y1="345" x2="520" y2="514" className="stroke-destructive" strokeWidth="1" strokeDasharray="5,3"/>
          <rect x="478" y="440" width="62" height="14" rx="2" className="fill-background"/>
          <text x="509" y="450" textAnchor="middle" className="fill-destructive text-[7px] font-mono">{'<<extend>>'}</text>
        </svg>
      </div>
      <p className="text-[9px] font-mono text-muted-foreground mt-2">
        UC4 (Receive Alerts) is central — it <em>includes</em> UC5 (Saliency), UC6 (Audio), UC7 (Object Detection) 
        as prerequisites, and <em>extends</em> to UC8 (Logging) and UC10 (911 Emergency) conditionally.
      </p>
    </div>
  );
}

/* ============================================================
 * 2. DATA FLOW DIAGRAM (Level 0 Context + Level 1)
 * ============================================================ */
export function DataFlowDiagram() {
  return (
    <div className="bg-card border border-border rounded-md p-4 space-y-6">
      {/* ----- LEVEL 0 (Context Diagram) ----- */}
      <div>
        <p className="text-[10px] font-mono text-primary uppercase tracking-wider mb-3">
          Figure 2.2a — Data Flow Diagram (Level 0 — Context Diagram)
        </p>
        <div className="bg-background rounded-md p-6 border border-border overflow-x-auto">
          <svg viewBox="0 0 800 300" className="w-full max-w-3xl mx-auto" style={{ minWidth: '500px' }}>
            {/* External entities */}
            <rect x="20" y="30" width="120" height="50" className="fill-primary/10 stroke-primary" strokeWidth="2"/>
            <text x="80" y="55" textAnchor="middle" className="fill-primary text-[10px] font-mono font-bold">Webcam</text>
            <text x="80" y="70" textAnchor="middle" className="fill-muted-foreground text-[8px] font-mono">Video Source</text>

            <rect x="20" y="120" width="120" height="50" className="fill-info/10 stroke-info" strokeWidth="2"/>
            <text x="80" y="145" textAnchor="middle" className="fill-info text-[10px] font-mono font-bold">Microphone</text>
            <text x="80" y="160" textAnchor="middle" className="fill-muted-foreground text-[8px] font-mono">Audio Source</text>

            <rect x="20" y="220" width="120" height="50" className="fill-foreground/10 stroke-foreground" strokeWidth="2"/>
            <text x="80" y="245" textAnchor="middle" className="fill-foreground text-[10px] font-mono font-bold">User</text>
            <text x="80" y="260" textAnchor="middle" className="fill-muted-foreground text-[8px] font-mono">Homeowner</text>

            {/* Central process */}
            <circle cx="400" cy="150" r="70" className="fill-accent/10 stroke-accent" strokeWidth="2"/>
            <text x="400" y="140" textAnchor="middle" className="fill-accent text-[10px] font-mono font-bold">0</text>
            <text x="400" y="155" textAnchor="middle" className="fill-foreground text-[9px] font-mono">Saliency</text>
            <text x="400" y="168" textAnchor="middle" className="fill-foreground text-[9px] font-mono">Detection System</text>

            {/* Data store */}
            <rect x="640" y="200" width="140" height="50" className="fill-info/10 stroke-info" strokeWidth="0"/>
            <line x1="640" y1="200" x2="780" y2="200" className="stroke-info" strokeWidth="2"/>
            <line x1="640" y1="250" x2="780" y2="250" className="stroke-info" strokeWidth="2"/>
            <text x="660" y="220" className="fill-info text-[9px] font-mono font-bold">D1</text>
            <text x="710" y="232" textAnchor="middle" className="fill-foreground text-[8px] font-mono">Cloud Database</text>

            {/* Flows */}
            <line x1="140" y1="55" x2="330" y2="120" className="stroke-primary" strokeWidth="1.2" markerEnd="url(#aDFD)"/>
            <text x="220" y="78" className="fill-primary text-[8px] font-mono">RGB frames</text>

            <line x1="140" y1="145" x2="330" y2="150" className="stroke-info" strokeWidth="1.2" markerEnd="url(#aDFD)"/>
            <text x="225" y="140" className="fill-info text-[8px] font-mono">PCM audio</text>

            <line x1="140" y1="240" x2="330" y2="185" className="stroke-foreground/50" strokeWidth="1.2" markerEnd="url(#aDFD)"/>
            <text x="210" y="215" className="fill-muted-foreground text-[8px] font-mono">config / commands</text>

            <line x1="400" y1="220" x2="400" y2="260" className="stroke-destructive" strokeWidth="1.2"/>
            <line x1="400" y1="260" x2="140" y2="260" className="stroke-destructive" strokeWidth="1.2" markerEnd="url(#aDFDR)"/>
            <text x="270" y="275" className="fill-destructive text-[8px] font-mono">alerts / notifications</text>

            <line x1="470" y1="180" x2="640" y2="220" className="stroke-info" strokeWidth="1.2" markerEnd="url(#aDFD)"/>
            <text x="545" y="192" className="fill-info text-[8px] font-mono">alert logs</text>

            <line x1="640" y1="235" x2="470" y2="165" className="stroke-accent/60" strokeWidth="1" strokeDasharray="4,3" markerEnd="url(#aDFDR)"/>
            <text x="560" y="215" className="fill-accent text-[7px] font-mono">wake words</text>

            <rect x="640" y="50" width="140" height="50" className="fill-destructive/10 stroke-destructive" strokeWidth="2"/>
            <text x="710" y="72" textAnchor="middle" className="fill-destructive text-[10px] font-mono font-bold">Household</text>
            <text x="710" y="88" textAnchor="middle" className="fill-muted-foreground text-[8px] font-mono">Members</text>

            <line x1="470" y1="120" x2="640" y2="75" className="stroke-destructive" strokeWidth="1.2" markerEnd="url(#aDFD)"/>
            <text x="555" y="90" className="fill-destructive text-[8px] font-mono">SMS / push</text>

            <defs>
              <marker id="aDFD" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
                <polygon points="0 0, 8 3, 0 6" className="fill-foreground/60"/>
              </marker>
              <marker id="aDFDR" markerWidth="8" markerHeight="6" refX="0" refY="3" orient="auto">
                <polygon points="8 0, 0 3, 8 6" className="fill-foreground/60"/>
              </marker>
            </defs>
          </svg>
        </div>
        <p className="text-[9px] font-mono text-muted-foreground mt-2">
          <strong>Level 0</strong> shows the system as a single process with external entities (Webcam, Microphone, User, Household Members) and one data store (Cloud Database).
        </p>
      </div>

      {/* ----- LEVEL 1 ----- */}
      <div>
        <p className="text-[10px] font-mono text-primary uppercase tracking-wider mb-3">
          Figure 2.2b — Data Flow Diagram (Level 1 — Decomposed Processes)
        </p>
        <div className="bg-background rounded-md p-6 border border-border overflow-x-auto">
          <svg viewBox="0 0 900 480" className="w-full max-w-4xl mx-auto" style={{ minWidth: '600px' }}>
            {/* External Entities */}
            <rect x="10" y="30" width="110" height="45" className="fill-primary/10 stroke-primary" strokeWidth="2"/>
            <text x="65" y="50" textAnchor="middle" className="fill-primary text-[9px] font-mono font-bold">Webcam</text>
            <text x="65" y="63" textAnchor="middle" className="fill-muted-foreground text-[7px] font-mono">Video Source</text>

            <rect x="10" y="110" width="110" height="45" className="fill-info/10 stroke-info" strokeWidth="2"/>
            <text x="65" y="130" textAnchor="middle" className="fill-info text-[9px] font-mono font-bold">Microphone</text>
            <text x="65" y="143" textAnchor="middle" className="fill-muted-foreground text-[7px] font-mono">Audio Source</text>

            <rect x="10" y="380" width="110" height="45" className="fill-foreground/10 stroke-foreground" strokeWidth="2"/>
            <text x="65" y="400" textAnchor="middle" className="fill-foreground text-[9px] font-mono font-bold">User</text>
            <text x="65" y="413" textAnchor="middle" className="fill-muted-foreground text-[7px] font-mono">Homeowner</text>

            {/* Processes */}
            <circle cx="260" cy="52" r="35" className="fill-primary/8 stroke-primary" strokeWidth="1.5"/>
            <text x="260" y="48" textAnchor="middle" className="fill-primary text-[9px] font-mono font-bold">P1</text>
            <text x="260" y="62" textAnchor="middle" className="fill-foreground text-[7px] font-mono">Capture</text>

            <circle cx="440" cy="52" r="40" className="fill-accent/8 stroke-accent" strokeWidth="1.5"/>
            <text x="440" y="45" textAnchor="middle" className="fill-accent text-[9px] font-mono font-bold">P2</text>
            <text x="440" y="57" textAnchor="middle" className="fill-foreground text-[7px] font-mono">Saliency</text>
            <text x="440" y="68" textAnchor="middle" className="fill-foreground text-[7px] font-mono">Engine</text>

            <circle cx="440" cy="165" r="40" className="fill-info/8 stroke-info" strokeWidth="1.5"/>
            <text x="440" y="158" textAnchor="middle" className="fill-info text-[9px] font-mono font-bold">P3</text>
            <text x="440" y="170" textAnchor="middle" className="fill-foreground text-[7px] font-mono">Audio</text>
            <text x="440" y="181" textAnchor="middle" className="fill-foreground text-[7px] font-mono">Analyzer</text>

            <circle cx="440" cy="280" r="40" className="fill-warning/8 stroke-warning" strokeWidth="1.5"/>
            <text x="440" y="273" textAnchor="middle" className="fill-warning text-[9px] font-mono font-bold">P4</text>
            <text x="440" y="285" textAnchor="middle" className="fill-foreground text-[7px] font-mono">Object</text>
            <text x="440" y="296" textAnchor="middle" className="fill-foreground text-[7px] font-mono">Detection</text>

            <circle cx="660" cy="165" r="48" className="fill-destructive/8 stroke-destructive" strokeWidth="2"/>
            <text x="660" y="158" textAnchor="middle" className="fill-destructive text-[10px] font-mono font-bold">P5</text>
            <text x="660" y="172" textAnchor="middle" className="fill-foreground text-[8px] font-mono">Attention</text>
            <text x="660" y="184" textAnchor="middle" className="fill-foreground text-[8px] font-mono">Fusion</text>

            <circle cx="830" cy="165" r="40" className="fill-destructive/8 stroke-destructive" strokeWidth="1.5"/>
            <text x="830" y="158" textAnchor="middle" className="fill-destructive text-[9px] font-mono font-bold">P6</text>
            <text x="830" y="170" textAnchor="middle" className="fill-foreground text-[7px] font-mono">Alert</text>
            <text x="830" y="181" textAnchor="middle" className="fill-foreground text-[7px] font-mono">Engine</text>

            {/* Data Stores */}
            <line x1="680" y1="400" x2="880" y2="400" className="stroke-info" strokeWidth="1.5"/>
            <line x1="680" y1="420" x2="880" y2="420" className="stroke-info" strokeWidth="1.5"/>
            <text x="700" y="414" className="fill-info text-[8px] font-mono font-bold">D1</text>
            <text x="790" y="414" textAnchor="middle" className="fill-foreground text-[8px] font-mono">alert_history</text>

            <line x1="680" y1="440" x2="880" y2="440" className="stroke-accent" strokeWidth="1.5"/>
            <line x1="680" y1="460" x2="880" y2="460" className="stroke-accent" strokeWidth="1.5"/>
            <text x="700" y="454" className="fill-accent text-[8px] font-mono font-bold">D2</text>
            <text x="790" y="454" textAnchor="middle" className="fill-foreground text-[8px] font-mono">wake_words</text>

            {/* Flows */}
            <line x1="120" y1="52" x2="225" y2="52" className="stroke-primary" strokeWidth="1" markerEnd="url(#aDFD1)"/>
            <text x="172" y="45" textAnchor="middle" className="fill-primary text-[7px] font-mono">RGB frames</text>

            <line x1="120" y1="132" x2="400" y2="160" className="stroke-info" strokeWidth="1" markerEnd="url(#aDFD1)"/>
            <text x="250" y="140" textAnchor="middle" className="fill-info text-[7px] font-mono">PCM audio</text>

            <line x1="295" y1="52" x2="400" y2="52" className="stroke-accent" strokeWidth="1" markerEnd="url(#aDFD1)"/>
            <text x="348" y="44" textAnchor="middle" className="fill-accent text-[7px] font-mono">ImageData</text>

            <line x1="275" y1="82" x2="408" y2="248" className="stroke-warning" strokeWidth="1" markerEnd="url(#aDFD1)"/>
            <text x="320" y="175" className="fill-warning text-[7px] font-mono">V(t)</text>

            <line x1="480" y1="52" x2="625" y2="135" className="stroke-accent" strokeWidth="1" markerEnd="url(#aDFD1)"/>
            <text x="555" y="82" textAnchor="middle" className="fill-accent text-[7px] font-mono">S(t) score</text>

            <line x1="480" y1="165" x2="612" y2="165" className="stroke-info" strokeWidth="1" markerEnd="url(#aDFD1)"/>
            <text x="546" y="158" textAnchor="middle" className="fill-info text-[7px] font-mono">E(t), dB</text>

            <line x1="470" y1="252" x2="630" y2="195" className="stroke-warning" strokeWidth="1" markerEnd="url(#aDFD1)"/>
            <text x="555" y="232" textAnchor="middle" className="fill-warning text-[7px] font-mono">O(t)</text>

            <line x1="708" y1="165" x2="790" y2="165" className="stroke-destructive" strokeWidth="1" markerEnd="url(#aDFD1)"/>
            <text x="749" y="158" textAnchor="middle" className="fill-destructive text-[7px] font-mono">α(t)</text>

            <line x1="840" y1="205" x2="840" y2="400" className="stroke-info" strokeWidth="1" markerEnd="url(#aDFD1)"/>
            <text x="855" y="310" className="fill-info text-[7px] font-mono">log</text>

            <line x1="790" y1="200" x2="120" y2="395" className="stroke-destructive" strokeWidth="1" markerEnd="url(#aDFD1)"/>
            <text x="430" y="325" textAnchor="middle" className="fill-destructive text-[7px] font-mono">SMS / Push / 911</text>

            <line x1="680" y1="450" x2="470" y2="195" className="stroke-accent/60" strokeWidth="1" strokeDasharray="4,3" markerEnd="url(#aDFD1)"/>
            <text x="580" y="350" className="fill-accent text-[7px] font-mono">wake words</text>

            <line x1="90" y1="380" x2="250" y2="85" className="stroke-foreground/40" strokeWidth="1" markerEnd="url(#aDFD1)"/>
            <text x="145" y="230" className="fill-muted-foreground text-[7px] font-mono">config</text>

            <defs>
              <marker id="aDFD1" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
                <polygon points="0 0, 8 3, 0 6" className="fill-foreground/60"/>
              </marker>
            </defs>
          </svg>
        </div>
        <p className="text-[9px] font-mono text-muted-foreground mt-2">
          <strong>Level 1</strong> decomposes the system into six processes (P1–P6), two data stores (D1, D2), and four external entities. Dashed lines are lookup/reference flows.
        </p>
      </div>
    </div>
  );
}

/* ============================================================
 * 3. ACTIVITY DIAGRAM — Complete with User → Function → Output
 * ============================================================ */
export function ActivityDiagram() {
  return (
    <div className="bg-card border border-border rounded-md p-4">
      <p className="text-[10px] font-mono text-primary uppercase tracking-wider mb-3">
        Figure 3.2 — Activity Diagram (User → Function → Output)
      </p>
      <div className="bg-background rounded-md p-6 border border-border overflow-x-auto">
        <svg viewBox="0 0 880 750" className="w-full max-w-4xl mx-auto" style={{ minWidth: '600px' }}>
          {/* Swimlane headers */}
          <rect x="15" y="10" width="210" height="730" rx="6" className="fill-primary/3 stroke-primary/20" strokeWidth="1"/>
          <text x="120" y="32" textAnchor="middle" className="fill-primary text-[10px] font-mono font-bold">USER</text>

          <rect x="235" y="10" width="260" height="730" rx="6" className="fill-accent/3 stroke-accent/20" strokeWidth="1"/>
          <text x="365" y="32" textAnchor="middle" className="fill-accent text-[10px] font-mono font-bold">FUNCTION / PROCESS</text>

          <rect x="505" y="10" width="120" height="730" rx="6" className="fill-info/3 stroke-info/20" strokeWidth="1"/>
          <text x="565" y="32" textAnchor="middle" className="fill-info text-[10px] font-mono font-bold">OUTPUT</text>

          <rect x="635" y="10" width="230" height="730" rx="6" className="fill-destructive/3 stroke-destructive/20" strokeWidth="1"/>
          <text x="750" y="32" textAnchor="middle" className="fill-destructive text-[10px] font-mono font-bold">DECISION & ALERT</text>

          {/* Start */}
          <circle cx="120" cy="60" r="10" className="fill-foreground"/>
          <line x1="120" y1="70" x2="120" y2="90" className="stroke-foreground" strokeWidth="1.5" markerEnd="url(#aAct)"/>

          {/* User: Opens Dashboard */}
          <rect x="35" y="90" width="170" height="35" rx="6" className="fill-primary/10 stroke-primary" strokeWidth="1"/>
          <text x="120" y="112" textAnchor="middle" className="fill-foreground text-[8px] font-mono">Open Dashboard</text>
          <line x1="120" y1="125" x2="120" y2="145" className="stroke-primary" strokeWidth="1" markerEnd="url(#aAct)"/>

          {/* User: Starts Camera */}
          <rect x="35" y="145" width="170" height="35" rx="6" className="fill-primary/10 stroke-primary" strokeWidth="1"/>
          <text x="120" y="167" textAnchor="middle" className="fill-foreground text-[8px] font-mono">Start Camera + Mic</text>
          <line x1="205" y1="162" x2="255" y2="162" className="stroke-accent" strokeWidth="1" markerEnd="url(#aAct)"/>

          {/* Fork bar */}
          <rect x="255" y="195" width="220" height="4" rx="2" className="fill-foreground"/>
          <line x1="365" y1="180" x2="365" y2="195" className="stroke-accent" strokeWidth="1"/>

          {/* Function: Capture Frame */}
          <rect x="255" y="215" width="100" height="35" rx="6" className="fill-accent/10 stroke-accent" strokeWidth="1"/>
          <text x="305" y="237" textAnchor="middle" className="fill-foreground text-[8px] font-mono">Capture V(t)</text>

          {/* Function: Sample Audio */}
          <rect x="375" y="215" width="100" height="35" rx="6" className="fill-info/10 stroke-info" strokeWidth="1"/>
          <text x="425" y="237" textAnchor="middle" className="fill-foreground text-[8px] font-mono">Sample A(t)</text>

          {/* Video pipeline */}
          <line x1="305" y1="250" x2="305" y2="270" className="stroke-accent" strokeWidth="1" markerEnd="url(#aAct)"/>
          <rect x="255" y="270" width="100" height="35" rx="6" className="fill-accent/10 stroke-accent" strokeWidth="1"/>
          <text x="305" y="292" textAnchor="middle" className="fill-foreground text-[8px] font-mono">Grayscale</text>

          <line x1="305" y1="305" x2="305" y2="325" className="stroke-accent" strokeWidth="1" markerEnd="url(#aAct)"/>

          {/* Mode Decision */}
          <polygon points="305,325 360,350 305,375 250,350" className="fill-accent/10 stroke-accent" strokeWidth="1.2"/>
          <text x="305" y="354" textAnchor="middle" className="fill-accent text-[7px] font-mono">Mode?</text>

          <line x1="250" y1="350" x2="240" y2="350" className="stroke-accent" strokeWidth="1"/>
          <text x="242" y="402" textAnchor="middle" className="fill-accent text-[6px] font-mono">Sobel</text>
          <line x1="240" y1="350" x2="240" y2="390" className="stroke-accent" strokeWidth="1"/>

          <line x1="305" y1="375" x2="305" y2="390" className="stroke-accent" strokeWidth="1"/>
          <text x="315" y="386" className="fill-accent text-[6px] font-mono">Lap</text>

          <line x1="360" y1="350" x2="370" y2="350" className="stroke-accent" strokeWidth="1"/>
          <text x="368" y="402" textAnchor="middle" className="fill-accent text-[6px] font-mono">Motion</text>
          <line x1="370" y1="350" x2="370" y2="390" className="stroke-accent" strokeWidth="1"/>

          {/* Merge */}
          <line x1="240" y1="410" x2="370" y2="410" className="stroke-accent" strokeWidth="1.5"/>
          <line x1="305" y1="410" x2="305" y2="430" className="stroke-accent" strokeWidth="1" markerEnd="url(#aAct)"/>

          {/* Apply Threshold + Object Detection */}
          <rect x="255" y="430" width="100" height="35" rx="6" className="fill-accent/10 stroke-accent" strokeWidth="1"/>
          <text x="305" y="447" textAnchor="middle" className="fill-foreground text-[8px] font-mono">Threshold</text>
          <text x="305" y="459" textAnchor="middle" className="fill-muted-foreground text-[6px] font-mono">S(t) score</text>

          <line x1="305" y1="465" x2="305" y2="485" className="stroke-accent" strokeWidth="1" markerEnd="url(#aAct)"/>

          <rect x="255" y="485" width="100" height="35" rx="6" className="fill-warning/10 stroke-warning" strokeWidth="1"/>
          <text x="305" y="507" textAnchor="middle" className="fill-foreground text-[8px] font-mono">COCO-SSD</text>

          {/* Audio pipeline */}
          <line x1="425" y1="250" x2="425" y2="270" className="stroke-info" strokeWidth="1" markerEnd="url(#aAct)"/>
          <rect x="375" y="270" width="100" height="35" rx="6" className="fill-info/10 stroke-info" strokeWidth="1"/>
          <text x="425" y="292" textAnchor="middle" className="fill-foreground text-[8px] font-mono">FFT + dB</text>

          <line x1="425" y1="305" x2="425" y2="325" className="stroke-info" strokeWidth="1" markerEnd="url(#aAct)"/>
          <rect x="375" y="325" width="100" height="35" rx="6" className="fill-info/10 stroke-info" strokeWidth="1"/>
          <text x="425" y="347" textAnchor="middle" className="fill-foreground text-[8px] font-mono">ZCR + Bands</text>

          <line x1="425" y1="360" x2="425" y2="380" className="stroke-info" strokeWidth="1" markerEnd="url(#aAct)"/>
          <rect x="375" y="380" width="100" height="35" rx="6" className="fill-info/10 stroke-info" strokeWidth="1"/>
          <text x="425" y="402" textAnchor="middle" className="fill-foreground text-[8px] font-mono">Classify E(t)</text>

          <line x1="425" y1="415" x2="425" y2="430" className="stroke-info" strokeWidth="1" markerEnd="url(#aAct)"/>
          <rect x="375" y="430" width="100" height="35" rx="6" className="fill-info/10 stroke-info" strokeWidth="1"/>
          <text x="425" y="452" textAnchor="middle" className="fill-foreground text-[8px] font-mono">Pitch (ACF)</text>

          {/* OUTPUT: Saliency Map */}
          <line x1="355" y1="447" x2="515" y2="447" className="stroke-accent" strokeWidth="1" markerEnd="url(#aAct)"/>
          <rect x="515" y="430" width="100" height="35" rx="6" className="fill-info/10 stroke-info" strokeWidth="1"/>
          <text x="565" y="447" textAnchor="middle" className="fill-foreground text-[7px] font-mono">Saliency Map</text>
          <text x="565" y="459" textAnchor="middle" className="fill-muted-foreground text-[6px] font-mono">+ Heatmap</text>

          {/* OUTPUT: Audio Features */}
          <line x1="475" y1="397" x2="515" y2="397" className="stroke-info" strokeWidth="1" markerEnd="url(#aAct)"/>
          <rect x="515" y="380" width="100" height="35" rx="6" className="fill-info/10 stroke-info" strokeWidth="1"/>
          <text x="565" y="397" textAnchor="middle" className="fill-foreground text-[7px] font-mono">Audio Features</text>
          <text x="565" y="409" textAnchor="middle" className="fill-muted-foreground text-[6px] font-mono">dB, E(t), f0</text>

          {/* Join bar */}
          <rect x="255" y="540" width="220" height="4" rx="2" className="fill-foreground"/>
          <line x1="305" y1="520" x2="305" y2="540" className="stroke-accent" strokeWidth="1"/>
          <line x1="425" y1="465" x2="425" y2="540" className="stroke-info" strokeWidth="1"/>

          {/* Fusion */}
          <line x1="475" y1="542" x2="655" y2="570" className="stroke-destructive" strokeWidth="1.5" markerEnd="url(#aAct)"/>
          <rect x="655" y="560" width="180" height="40" rx="6" className="fill-destructive/10 stroke-destructive" strokeWidth="1.5"/>
          <text x="745" y="578" textAnchor="middle" className="fill-destructive text-[9px] font-mono font-bold">Compute α(t)</text>
          <text x="745" y="592" textAnchor="middle" className="fill-muted-foreground text-[7px] font-mono">S + speech + dB boost</text>

          {/* OUTPUT: Attention Score */}
          <line x1="655" y1="580" x2="615" y2="580" className="stroke-destructive" strokeWidth="1"/>
          <line x1="615" y1="580" x2="615" y2="510" className="stroke-info" strokeWidth="1" markerEnd="url(#aAct)"/>
          <rect x="515" y="490" width="100" height="30" rx="6" className="fill-destructive/10 stroke-destructive" strokeWidth="1"/>
          <text x="565" y="509" textAnchor="middle" className="fill-destructive text-[7px] font-mono">α(t) ∈ [0,100]</text>

          {/* Decision */}
          <line x1="745" y1="600" x2="745" y2="625" className="stroke-destructive" strokeWidth="1" markerEnd="url(#aAct)"/>
          <polygon points="745,625 800,650 745,675 690,650" className="fill-destructive/10 stroke-destructive" strokeWidth="1.5"/>
          <text x="745" y="654" textAnchor="middle" className="fill-destructive text-[8px] font-mono">α {'>'} T?</text>

          {/* No → loop */}
          <line x1="690" y1="650" x2="650" y2="650" className="stroke-muted-foreground" strokeWidth="1"/>
          <text x="670" y="643" textAnchor="middle" className="fill-muted-foreground text-[7px] font-mono">No</text>
          <circle cx="640" cy="650" r="8" className="fill-none stroke-foreground" strokeWidth="1.5"/>
          <circle cx="640" cy="650" r="5" className="fill-foreground"/>
          <text x="640" y="670" textAnchor="middle" className="fill-muted-foreground text-[6px] font-mono">loop</text>

          {/* Yes → Alert */}
          <line x1="800" y1="650" x2="840" y2="650" className="stroke-destructive" strokeWidth="1.5" markerEnd="url(#aAct)"/>
          <text x="820" y="643" className="fill-destructive text-[7px] font-mono">Yes</text>
          <rect x="840" y="632" width="30" height="36" rx="4" className="fill-destructive/20 stroke-destructive" strokeWidth="1.5"/>
          <text x="855" y="648" textAnchor="middle" className="fill-destructive text-[8px] font-mono font-bold">!</text>
          <text x="855" y="661" textAnchor="middle" className="fill-destructive text-[6px] font-mono">Alert</text>

          {/* User feedback: sees dashboard */}
          <line x1="565" y1="520" x2="175" y2="520" className="stroke-primary/40" strokeWidth="1" strokeDasharray="4,3"/>
          <line x1="175" y1="520" x2="175" y2="540" className="stroke-primary/40" strokeWidth="1" markerEnd="url(#aAct)"/>
          <rect x="80" y="540" width="190" height="30" rx="6" className="fill-primary/10 stroke-primary" strokeWidth="1"/>
          <text x="175" y="559" textAnchor="middle" className="fill-foreground text-[8px] font-mono">View Dashboard + Alerts</text>

          <line x1="120" y1="570" x2="120" y2="600" className="stroke-primary" strokeWidth="1" markerEnd="url(#aAct)"/>
          <rect x="35" y="600" width="170" height="35" rx="6" className="fill-primary/10 stroke-primary" strokeWidth="1"/>
          <text x="120" y="622" textAnchor="middle" className="fill-foreground text-[8px] font-mono">Review Alert History</text>

          <defs>
            <marker id="aAct" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
              <polygon points="0 0, 8 3, 0 6" className="fill-foreground/60"/>
            </marker>
          </defs>
        </svg>
      </div>
      <p className="text-[9px] font-mono text-muted-foreground mt-2">
        Four swim lanes: <strong>User</strong> (actions), <strong>Function/Process</strong> (algorithms), 
        <strong>Output</strong> (results), <strong>Decision & Alert</strong> (threshold evaluation and notification).
        Fork/join bars show parallel video and audio processing.
      </p>
    </div>
  );
}

/* ============================================================
 * 4. SEQUENCE DIAGRAM
 * ============================================================ */
export function SequenceDiagram() {
  return (
    <div className="bg-card border border-border rounded-md p-4">
      <p className="text-[10px] font-mono text-primary uppercase tracking-wider mb-3">
        Figure 4.2 — Sequence Diagram (One Processing Cycle)
      </p>
      <div className="bg-background rounded-md p-6 border border-border overflow-x-auto">
        <svg viewBox="0 0 900 560" className="w-full max-w-4xl mx-auto" style={{ minWidth: '600px' }}>
          {/* Lifeline headers */}
          {[
            { x: 80, label: 'Dashboard', sub: 'Index.tsx', color: 'primary' },
            { x: 230, label: 'Camera', sub: 'useCamera', color: 'primary' },
            { x: 380, label: 'Saliency', sub: 'saliency.ts', color: 'accent' },
            { x: 530, label: 'Audio', sub: 'useAudio', color: 'info' },
            { x: 680, label: 'COCO-SSD', sub: 'useObjDet', color: 'warning' },
            { x: 830, label: 'Cloud', sub: 'useHousehold', color: 'destructive' },
          ].map(({ x, label, sub, color }) => (
            <g key={label}>
              <rect x={x - 45} y="10" width="90" height="40" rx="4" className={`fill-${color}/10 stroke-${color}`} strokeWidth="1.5"/>
              <text x={x} y="28" textAnchor="middle" className={`fill-${color} text-[8px] font-mono font-bold`}>{label}</text>
              <text x={x} y="42" textAnchor="middle" className="fill-muted-foreground text-[6px] font-mono">{sub}</text>
              <line x1={x} y1="50" x2={x} y2="550" className="stroke-border" strokeWidth="1" strokeDasharray="4,4"/>
            </g>
          ))}

          {/* Activation box */}
          <rect x="68" y="70" width="24" height="480" className="fill-primary/5 stroke-primary/20" strokeWidth="0.5"/>

          {/* getImageData() */}
          <line x1="92" y1="90" x2="230" y2="90" className="stroke-primary" strokeWidth="1" markerEnd="url(#arrowSeq)"/>
          <text x="160" y="85" textAnchor="middle" className="fill-primary text-[7px] font-mono">getImageData()</text>
          <line x1="230" y1="110" x2="92" y2="110" className="stroke-primary" strokeWidth="1" strokeDasharray="3,3" markerEnd="url(#arrowSeqR)"/>
          <text x="160" y="105" textAnchor="middle" className="fill-primary text-[7px] font-mono">ImageData V(t)</text>

          {/* computeSaliency */}
          <line x1="92" y1="135" x2="380" y2="135" className="stroke-accent" strokeWidth="1" markerEnd="url(#arrowSeq)"/>
          <text x="236" y="130" textAnchor="middle" className="fill-accent text-[7px] font-mono">computeSaliency(V(t), mode, τ)</text>
          <rect x="368" y="135" width="24" height="60" className="fill-accent/10 stroke-accent" strokeWidth="0.5"/>
          <text x="380" y="155" textAnchor="middle" className="fill-accent text-[6px] font-mono">Gray</text>
          <text x="380" y="165" textAnchor="middle" className="fill-accent text-[6px] font-mono">Conv</text>
          <text x="380" y="175" textAnchor="middle" className="fill-accent text-[6px] font-mono">Thresh</text>
          <line x1="380" y1="195" x2="92" y2="195" className="stroke-accent" strokeWidth="1" strokeDasharray="3,3" markerEnd="url(#arrowSeqR)"/>
          <text x="236" y="190" textAnchor="middle" className="fill-accent text-[7px] font-mono">S(t): saliency map + score</text>

          {/* Audio */}
          <line x1="92" y1="220" x2="530" y2="220" className="stroke-info" strokeWidth="1" markerEnd="url(#arrowSeq)"/>
          <text x="310" y="215" textAnchor="middle" className="fill-info text-[7px] font-mono">getByteFrequencyData() + getByteTimeDomainData()</text>
          <rect x="518" y="220" width="24" height="60" className="fill-info/10 stroke-info" strokeWidth="0.5"/>
          <text x="530" y="240" textAnchor="middle" className="fill-info text-[6px] font-mono">RMS</text>
          <text x="530" y="250" textAnchor="middle" className="fill-info text-[6px] font-mono">FFT</text>
          <text x="530" y="260" textAnchor="middle" className="fill-info text-[6px] font-mono">ZCR</text>
          <line x1="530" y1="280" x2="92" y2="280" className="stroke-info" strokeWidth="1" strokeDasharray="3,3" markerEnd="url(#arrowSeqR)"/>
          <text x="310" y="275" textAnchor="middle" className="fill-info text-[7px] font-mono">AudioFeatures: dB, E(t), f0, waveform</text>

          {/* Object Detection */}
          <line x1="92" y1="305" x2="680" y2="305" className="stroke-warning" strokeWidth="1" markerEnd="url(#arrowSeq)"/>
          <text x="386" y="300" textAnchor="middle" className="fill-warning text-[7px] font-mono">model.detect(canvas) [async, ~50ms]</text>
          <rect x="668" y="305" width="24" height="50" className="fill-warning/10 stroke-warning" strokeWidth="0.5"/>
          <text x="680" y="325" textAnchor="middle" className="fill-warning text-[6px] font-mono">CNN</text>
          <text x="680" y="335" textAnchor="middle" className="fill-warning text-[6px] font-mono">NMS</text>
          <line x1="680" y1="355" x2="92" y2="355" className="stroke-warning" strokeWidth="1" strokeDasharray="3,3" markerEnd="url(#arrowSeqR)"/>
          <text x="386" y="350" textAnchor="middle" className="fill-warning text-[7px] font-mono">O(t): DetectedObject[] with bbox + confidence</text>

          {/* Fusion (self-call) */}
          <line x1="92" y1="385" x2="110" y2="385" className="stroke-destructive" strokeWidth="1"/>
          <line x1="110" y1="385" x2="110" y2="405" className="stroke-destructive" strokeWidth="1"/>
          <line x1="110" y1="405" x2="92" y2="405" className="stroke-destructive" strokeWidth="1" markerEnd="url(#arrowSeqR)"/>
          <text x="140" y="393" className="fill-destructive text-[7px] font-mono">α = S + speech(20) + dB_boost</text>

          {/* Alt fragment */}
          <rect x="50" y="420" width="170" height="30" rx="4" className="fill-destructive/5 stroke-destructive" strokeWidth="1" strokeDasharray="4,3"/>
          <text x="135" y="433" textAnchor="middle" className="fill-destructive text-[7px] font-mono">alt [α {'>'} threshold]</text>

          {/* logAlert */}
          <line x1="92" y1="460" x2="830" y2="460" className="stroke-destructive" strokeWidth="1" markerEnd="url(#arrowSeq)"/>
          <text x="460" y="455" textAnchor="middle" className="fill-destructive text-[7px] font-mono">logAlert(type, message, snapshotUrl)</text>
          <rect x="818" y="460" width="24" height="30" className="fill-destructive/10 stroke-destructive" strokeWidth="0.5"/>
          <text x="830" y="480" textAnchor="middle" className="fill-destructive text-[6px] font-mono">INSERT</text>
          <line x1="830" y1="490" x2="92" y2="490" className="stroke-destructive" strokeWidth="1" strokeDasharray="3,3" markerEnd="url(#arrowSeqR)"/>
          <text x="460" y="500" textAnchor="middle" className="fill-destructive text-[7px] font-mono">alert logged to alert_history</text>

          {/* Loop frame */}
          <rect x="40" y="60" width="860" height="480" rx="6" className="fill-none stroke-muted-foreground" strokeWidth="1" strokeDasharray="6,4"/>
          <rect x="40" y="60" width="60" height="16" className="fill-muted stroke-muted-foreground" strokeWidth="1"/>
          <text x="70" y="72" textAnchor="middle" className="fill-muted-foreground text-[7px] font-mono font-bold">loop</text>
          <text x="110" y="72" className="fill-muted-foreground text-[6px] font-mono">[each animation frame @ ~30fps]</text>

          <defs>
            <marker id="arrowSeq" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
              <polygon points="0 0, 8 3, 0 6" className="fill-foreground/60"/>
            </marker>
            <marker id="arrowSeqR" markerWidth="8" markerHeight="6" refX="0" refY="3" orient="auto">
              <polygon points="8 0, 0 3, 8 6" className="fill-foreground/40"/>
            </marker>
          </defs>
        </svg>
      </div>
      <p className="text-[9px] font-mono text-muted-foreground mt-2">
        One complete processing cycle across six components. The loop repeats at ~30fps. The "alt" fragment shows conditional alert logging.
      </p>
    </div>
  );
}

/* ============================================================
 * 5. ENTITY RELATIONSHIP DIAGRAM — Clean readable layout
 * ============================================================ */
export function ERDiagram() {
  return (
    <div className="bg-card border border-border rounded-md p-4">
      <p className="text-[10px] font-mono text-primary uppercase tracking-wider mb-3">
        Figure 5.2 — Entity Relationship Diagram
      </p>
      <div className="bg-background rounded-md p-6 border border-border overflow-x-auto">
        <svg viewBox="0 0 900 480" className="w-full max-w-4xl mx-auto" style={{ minWidth: '600px' }}>
          {/* ===== auth.users ===== */}
          <rect x="20" y="130" width="180" height="130" rx="4" className="fill-muted/20 stroke-muted-foreground" strokeWidth="1.5"/>
          <rect x="20" y="130" width="180" height="28" rx="4" className="fill-muted/40 stroke-muted-foreground" strokeWidth="1.5"/>
          <text x="110" y="149" textAnchor="middle" className="fill-foreground text-[10px] font-mono font-bold">auth.users</text>
          <text x="30" y="175" className="fill-primary text-[8px] font-mono font-bold">PK  id : uuid</text>
          <line x1="20" y1="182" x2="200" y2="182" className="stroke-border" strokeWidth="0.5"/>
          <text x="30" y="198" className="fill-foreground text-[8px] font-mono">    email : text</text>
          <text x="30" y="214" className="fill-foreground text-[8px] font-mono">    encrypted_password</text>
          <text x="30" y="230" className="fill-foreground text-[8px] font-mono">    created_at : timestamptz</text>
          <text x="30" y="250" className="fill-muted-foreground text-[7px] font-mono">    Managed by Auth service</text>

          {/* ===== households ===== */}
          <rect x="320" y="20" width="210" height="155" rx="4" className="fill-primary/5 stroke-primary" strokeWidth="1.5"/>
          <rect x="320" y="20" width="210" height="28" rx="4" className="fill-primary/15 stroke-primary" strokeWidth="1.5"/>
          <text x="425" y="39" textAnchor="middle" className="fill-primary text-[10px] font-mono font-bold">households</text>
          <text x="330" y="65" className="fill-primary text-[8px] font-mono font-bold">PK  id : uuid</text>
          <line x1="320" y1="72" x2="530" y2="72" className="stroke-border" strokeWidth="0.5"/>
          <text x="330" y="88" className="fill-foreground text-[8px] font-mono">    name : text</text>
          <text x="330" y="104" className="fill-foreground text-[8px] font-mono">    invite_code : text (UNIQUE)</text>
          <text x="330" y="120" className="fill-accent text-[8px] font-mono">FK  created_by : uuid → auth.users</text>
          <text x="330" y="136" className="fill-foreground text-[8px] font-mono">    created_at : timestamptz</text>
          <text x="330" y="165" className="fill-muted-foreground text-[7px] font-mono">    invite_code auto-generated</text>

          {/* ===== household_members ===== */}
          <rect x="300" y="240" width="250" height="175" rx="4" className="fill-accent/5 stroke-accent" strokeWidth="1.5"/>
          <rect x="300" y="240" width="250" height="28" rx="4" className="fill-accent/15 stroke-accent" strokeWidth="1.5"/>
          <text x="425" y="259" textAnchor="middle" className="fill-accent text-[10px] font-mono font-bold">household_members</text>
          <text x="310" y="285" className="fill-primary text-[8px] font-mono font-bold">PK  id : uuid</text>
          <line x1="300" y1="292" x2="550" y2="292" className="stroke-border" strokeWidth="0.5"/>
          <text x="310" y="308" className="fill-accent text-[8px] font-mono">FK  household_id : uuid → households</text>
          <text x="310" y="324" className="fill-accent text-[8px] font-mono">FK  user_id : uuid → auth.users</text>
          <text x="310" y="340" className="fill-foreground text-[8px] font-mono">    display_name : text</text>
          <text x="310" y="356" className="fill-foreground text-[8px] font-mono">    phone_number : text</text>
          <text x="310" y="372" className="fill-foreground text-[8px] font-mono">    is_admin : boolean (default false)</text>
          <text x="310" y="388" className="fill-foreground text-[8px] font-mono">    created_at : timestamptz</text>
          <text x="310" y="408" className="fill-muted-foreground text-[7px] font-mono">    UNIQUE(user_id, household_id)</text>

          {/* ===== wake_words ===== */}
          <rect x="640" y="20" width="230" height="150" rx="4" className="fill-warning/5 stroke-warning" strokeWidth="1.5"/>
          <rect x="640" y="20" width="230" height="28" rx="4" className="fill-warning/15 stroke-warning" strokeWidth="1.5"/>
          <text x="755" y="39" textAnchor="middle" className="fill-warning text-[10px] font-mono font-bold">wake_words</text>
          <text x="650" y="65" className="fill-primary text-[8px] font-mono font-bold">PK  id : uuid</text>
          <line x1="640" y1="72" x2="870" y2="72" className="stroke-border" strokeWidth="0.5"/>
          <text x="650" y="88" className="fill-accent text-[8px] font-mono">FK  household_id : uuid → households</text>
          <text x="650" y="104" className="fill-foreground text-[8px] font-mono">    phrase : text</text>
          <text x="650" y="120" className="fill-foreground text-[8px] font-mono">    is_emergency : boolean</text>
          <text x="650" y="136" className="fill-accent text-[8px] font-mono">FK  created_by : uuid → auth.users</text>
          <text x="650" y="152" className="fill-foreground text-[8px] font-mono">    created_at : timestamptz</text>

          {/* ===== alert_history ===== */}
          <rect x="640" y="240" width="230" height="165" rx="4" className="fill-destructive/5 stroke-destructive" strokeWidth="1.5"/>
          <rect x="640" y="240" width="230" height="28" rx="4" className="fill-destructive/15 stroke-destructive" strokeWidth="1.5"/>
          <text x="755" y="259" textAnchor="middle" className="fill-destructive text-[10px] font-mono font-bold">alert_history</text>
          <text x="650" y="285" className="fill-primary text-[8px] font-mono font-bold">PK  id : uuid</text>
          <line x1="640" y1="292" x2="870" y2="292" className="stroke-border" strokeWidth="0.5"/>
          <text x="650" y="308" className="fill-accent text-[8px] font-mono">FK  household_id : uuid → households</text>
          <text x="650" y="324" className="fill-foreground text-[8px] font-mono">    alert_type : text</text>
          <text x="650" y="340" className="fill-foreground text-[8px] font-mono">    message : text</text>
          <text x="650" y="356" className="fill-accent text-[8px] font-mono">FK  triggered_by : uuid → auth.users</text>
          <text x="650" y="372" className="fill-foreground text-[8px] font-mono">    snapshot_url : text (nullable)</text>
          <text x="650" y="388" className="fill-foreground text-[8px] font-mono">    created_at : timestamptz</text>

          {/* ===== RELATIONSHIPS ===== */}
          {/* auth.users 1──* household_members */}
          <line x1="200" y1="200" x2="300" y2="324" className="stroke-foreground" strokeWidth="1.5"/>
          <text x="210" y="210" className="fill-foreground text-[10px] font-mono font-bold">1</text>
          <line x1="300" y1="319" x2="288" y2="311" className="stroke-foreground" strokeWidth="1.5"/>
          <line x1="300" y1="324" x2="288" y2="324" className="stroke-foreground" strokeWidth="1.5"/>
          <line x1="300" y1="329" x2="288" y2="337" className="stroke-foreground" strokeWidth="1.5"/>
          <text x="280" y="340" className="fill-foreground text-[9px] font-mono">*</text>

          {/* households 1──* household_members */}
          <line x1="425" y1="175" x2="425" y2="240" className="stroke-primary" strokeWidth="1.5"/>
          <text x="433" y="190" className="fill-primary text-[10px] font-mono font-bold">1</text>
          <line x1="420" y1="240" x2="413" y2="230" className="stroke-primary" strokeWidth="1.5"/>
          <line x1="425" y1="240" x2="418" y2="240" className="stroke-primary" strokeWidth="1.5"/>
          <line x1="430" y1="240" x2="437" y2="230" className="stroke-primary" strokeWidth="1.5"/>
          <text x="440" y="238" className="fill-primary text-[9px] font-mono">*</text>

          {/* households 1──* wake_words */}
          <line x1="530" y1="80" x2="640" y2="88" className="stroke-warning" strokeWidth="1.5"/>
          <text x="545" y="75" className="fill-warning text-[10px] font-mono font-bold">1</text>
          <line x1="640" y1="83" x2="628" y2="75" className="stroke-warning" strokeWidth="1.5"/>
          <line x1="640" y1="88" x2="628" y2="88" className="stroke-warning" strokeWidth="1.5"/>
          <line x1="640" y1="93" x2="628" y2="101" className="stroke-warning" strokeWidth="1.5"/>
          <text x="620" y="100" className="fill-warning text-[9px] font-mono">*</text>

          {/* households 1──* alert_history */}
          <line x1="530" y1="140" x2="640" y2="308" className="stroke-destructive" strokeWidth="1.5"/>
          <text x="545" y="170" className="fill-destructive text-[10px] font-mono font-bold">1</text>
          <line x1="640" y1="303" x2="628" y2="295" className="stroke-destructive" strokeWidth="1.5"/>
          <line x1="640" y1="308" x2="628" y2="308" className="stroke-destructive" strokeWidth="1.5"/>
          <line x1="640" y1="313" x2="628" y2="321" className="stroke-destructive" strokeWidth="1.5"/>
          <text x="620" y="320" className="fill-destructive text-[9px] font-mono">*</text>

          {/* Legend */}
          <rect x="20" y="440" width="850" height="30" rx="4" className="fill-card stroke-border" strokeWidth="1"/>
          <text x="40" y="459" className="fill-muted-foreground text-[8px] font-mono font-bold">LEGEND:</text>
          <text x="110" y="459" className="fill-primary text-[8px] font-mono">PK = Primary Key</text>
          <text x="240" y="459" className="fill-accent text-[8px] font-mono">FK = Foreign Key</text>
          <line x1="360" y1="455" x2="390" y2="455" className="stroke-foreground" strokeWidth="1.5"/>
          <text x="395" y="459" className="fill-foreground text-[8px] font-mono">1 ──┤{'<'} * = One-to-Many</text>
          <text x="580" y="459" className="fill-muted-foreground text-[8px] font-mono">Crow's foot notation</text>
          <text x="740" y="459" className="fill-muted-foreground text-[8px] font-mono">RLS enabled on all tables</text>
        </svg>
      </div>
      <p className="text-[9px] font-mono text-muted-foreground mt-2">
        Four entities with crow's foot notation. A <strong>household</strong> has many <strong>members</strong>, <strong>wake words</strong>, and <strong>alerts</strong>. Each member references <strong>auth.users</strong>. All tables have RLS policies.
      </p>
    </div>
  );
}

/* ============================================================
 * 6. STATE MACHINE DIAGRAM — Complete lifecycle
 * ============================================================ */
export function StateDiagram() {
  return (
    <div className="bg-card border border-border rounded-md p-4">
      <p className="text-[10px] font-mono text-primary uppercase tracking-wider mb-3">
        Figure 6.2 — State Machine Diagram (Complete System Lifecycle)
      </p>
      <div className="bg-background rounded-md p-6 border border-border overflow-x-auto">
        <svg viewBox="0 0 900 520" className="w-full max-w-4xl mx-auto" style={{ minWidth: '600px' }}>
          {/* Initial state */}
          <circle cx="50" cy="100" r="12" className="fill-foreground"/>
          <line x1="62" y1="100" x2="115" y2="100" className="stroke-foreground" strokeWidth="1.5" markerEnd="url(#aState)"/>

          {/* IDLE */}
          <rect x="115" y="65" width="140" height="70" rx="14" className="fill-muted/30 stroke-foreground" strokeWidth="1.5"/>
          <text x="185" y="93" textAnchor="middle" className="fill-foreground text-[11px] font-mono font-bold">IDLE</text>
          <text x="185" y="110" textAnchor="middle" className="fill-muted-foreground text-[7px] font-mono">Camera off</text>
          <text x="185" y="122" textAnchor="middle" className="fill-muted-foreground text-[7px] font-mono">No processing</text>

          {/* IDLE → AUTHENTICATING */}
          <line x1="185" y1="135" x2="185" y2="175" className="stroke-primary" strokeWidth="1.5" markerEnd="url(#aState)"/>
          <text x="200" y="158" className="fill-primary text-[7px] font-mono">login()</text>

          {/* AUTHENTICATING */}
          <rect x="115" y="175" width="140" height="60" rx="14" className="fill-primary/10 stroke-primary" strokeWidth="1.5"/>
          <text x="185" y="200" textAnchor="middle" className="fill-primary text-[11px] font-mono font-bold">AUTH</text>
          <text x="185" y="215" textAnchor="middle" className="fill-muted-foreground text-[7px] font-mono">Verifying user</text>
          <text x="185" y="227" textAnchor="middle" className="fill-muted-foreground text-[7px] font-mono">Loading household</text>

          {/* AUTH → IDLE (fail) */}
          <path d="M 115 210 C 80 210, 80 100, 115 100" className="fill-none stroke-destructive/50" strokeWidth="1" strokeDasharray="3,3" markerEnd="url(#aState)"/>
          <text x="70" y="155" className="fill-destructive/60 text-[7px] font-mono">fail</text>

          {/* AUTH → INITIALIZING */}
          <line x1="255" y1="205" x2="340" y2="205" className="stroke-accent" strokeWidth="1.5" markerEnd="url(#aState)"/>
          <text x="298" y="198" textAnchor="middle" className="fill-accent text-[7px] font-mono">success</text>

          {/* INITIALIZING */}
          <rect x="340" y="170" width="155" height="70" rx="14" className="fill-accent/10 stroke-accent" strokeWidth="1.5"/>
          <text x="418" y="197" textAnchor="middle" className="fill-accent text-[11px] font-mono font-bold">INITIALIZING</text>
          <text x="418" y="213" textAnchor="middle" className="fill-muted-foreground text-[7px] font-mono">Loading COCO-SSD</text>
          <text x="418" y="225" textAnchor="middle" className="fill-muted-foreground text-[7px] font-mono">Opening camera + mic</text>

          {/* INIT → IDLE (error) */}
          <line x1="380" y1="170" x2="220" y2="135" className="stroke-destructive/50" strokeWidth="1" strokeDasharray="3,3" markerEnd="url(#aState)"/>
          <text x="300" y="145" className="fill-destructive/60 text-[7px] font-mono">error</text>

          {/* INIT → MONITORING */}
          <line x1="495" y1="205" x2="570" y2="205" className="stroke-primary" strokeWidth="1.5" markerEnd="url(#aState)"/>
          <text x="533" y="198" textAnchor="middle" className="fill-primary text-[7px] font-mono">ready</text>

          {/* MONITORING */}
          <rect x="570" y="160" width="160" height="90" rx="14" className="fill-primary/10 stroke-primary" strokeWidth="2"/>
          <text x="650" y="192" textAnchor="middle" className="fill-primary text-[12px] font-mono font-bold">MONITORING</text>
          <text x="650" y="210" textAnchor="middle" className="fill-muted-foreground text-[7px] font-mono">Processing frames</text>
          <text x="650" y="222" textAnchor="middle" className="fill-muted-foreground text-[7px] font-mono">@ ~30fps loop</text>
          <text x="650" y="240" textAnchor="middle" className="fill-muted-foreground text-[7px] font-mono">Saliency + Audio + Obj</text>

          {/* Self-loop on MONITORING */}
          <path d="M 650 160 C 650 125, 720 125, 720 160" className="fill-none stroke-primary" strokeWidth="1" markerEnd="url(#aState)"/>
          <text x="700" y="133" className="fill-primary text-[6px] font-mono">next frame</text>

          {/* MONITORING → IDLE (stop) */}
          <line x1="570" y1="230" x2="255" y2="110" className="stroke-muted-foreground" strokeWidth="1.5" markerEnd="url(#aState)"/>
          <text x="420" y="165" className="fill-muted-foreground text-[7px] font-mono">stop()</text>

          {/* MONITORING → ALERTING */}
          <line x1="730" y1="205" x2="730" y2="330" className="stroke-destructive" strokeWidth="1.5" markerEnd="url(#aState)"/>
          <text x="745" y="270" className="fill-destructive text-[7px] font-mono">α {'>'} T</text>

          {/* ALERTING */}
          <rect x="600" y="330" width="180" height="85" rx="14" className="fill-destructive/10 stroke-destructive" strokeWidth="2"/>
          <text x="690" y="358" textAnchor="middle" className="fill-destructive text-[12px] font-mono font-bold">ALERTING</text>
          <text x="690" y="376" textAnchor="middle" className="fill-muted-foreground text-[7px] font-mono">Log to cloud</text>
          <text x="690" y="388" textAnchor="middle" className="fill-muted-foreground text-[7px] font-mono">SMS + Push notification</text>
          <text x="690" y="400" textAnchor="middle" className="fill-muted-foreground text-[7px] font-mono">Capture snapshot</text>

          {/* ALERTING → MONITORING (cooldown) */}
          <line x1="600" y1="360" x2="600" y2="250" className="stroke-accent" strokeWidth="1.5" markerEnd="url(#aState)"/>
          <text x="555" y="310" className="fill-accent text-[7px] font-mono">cooldown</text>
          <text x="555" y="322" className="fill-accent text-[7px] font-mono">expired</text>

          {/* ALERTING → 911 PROMPT (sub-state) */}
          <line x1="690" y1="415" x2="690" y2="445" className="stroke-destructive" strokeWidth="1.5" strokeDasharray="3,3" markerEnd="url(#aState)"/>
          <rect x="610" y="445" width="160" height="55" rx="10" className="fill-destructive/20 stroke-destructive" strokeWidth="1.5" strokeDasharray="5,3"/>
          <text x="690" y="468" textAnchor="middle" className="fill-destructive text-[10px] font-mono font-bold">911 PROMPT</text>
          <text x="690" y="485" textAnchor="middle" className="fill-muted-foreground text-[7px] font-mono">isEmergency || scream</text>
          <text x="690" y="495" textAnchor="middle" className="fill-muted-foreground text-[7px] font-mono">|| bang detected</text>

          {/* PAUSED state */}
          <rect x="300" y="340" width="140" height="60" rx="14" className="fill-muted/20 stroke-muted-foreground" strokeWidth="1.5"/>
          <text x="370" y="365" textAnchor="middle" className="fill-muted-foreground text-[11px] font-mono font-bold">PAUSED</text>
          <text x="370" y="382" textAnchor="middle" className="fill-muted-foreground text-[7px] font-mono">Camera on, loop off</text>
          <text x="370" y="394" textAnchor="middle" className="fill-muted-foreground text-[7px] font-mono">User reviewing data</text>

          {/* MONITORING → PAUSED */}
          <line x1="600" y1="245" x2="440" y2="345" className="stroke-muted-foreground" strokeWidth="1.5" markerEnd="url(#aState)"/>
          <text x="530" y="285" className="fill-muted-foreground text-[7px] font-mono">pause()</text>

          {/* PAUSED → MONITORING */}
          <line x1="440" y1="360" x2="570" y2="210" className="stroke-primary" strokeWidth="1.5" markerEnd="url(#aState)"/>
          <text x="500" y="298" className="fill-primary text-[7px] font-mono">resume()</text>

          {/* Final state (from IDLE) */}
          <line x1="185" y1="65" x2="185" y2="35" className="stroke-foreground" strokeWidth="1.5" markerEnd="url(#aState)"/>
          <text x="200" y="45" className="fill-muted-foreground text-[7px] font-mono">logout()</text>
          <circle cx="185" cy="20" r="10" className="fill-none stroke-foreground" strokeWidth="1.5"/>
          <circle cx="185" cy="20" r="6" className="fill-foreground"/>

          {/* Resource info */}
          <rect x="20" y="440" width="250" height="60" rx="6" className="fill-card stroke-border" strokeWidth="1"/>
          <text x="30" y="458" className="fill-muted-foreground text-[8px] font-mono font-bold">STATE MEMORY USAGE:</text>
          <text x="30" y="473" className="fill-foreground text-[7px] font-mono">IDLE: ~0 MB  |  AUTH: ~0.5 MB</text>
          <text x="30" y="488" className="fill-foreground text-[7px] font-mono">INIT: ~4 MB  |  MONITORING: ~5.2 MB</text>
          <text x="30" y="498" className="fill-foreground text-[7px] font-mono">ALERTING: +15 MB (snapshots)</text>

          <defs>
            <marker id="aState" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
              <polygon points="0 0, 8 3, 0 6" className="fill-foreground/60"/>
            </marker>
          </defs>
        </svg>
      </div>
      <p className="text-[9px] font-mono text-muted-foreground mt-2">
        Complete lifecycle: <strong>IDLE → AUTH → INIT → MONITORING ↔ PAUSED → ALERTING → 911 PROMPT</strong>. 
        MONITORING self-loops on each frame. ALERTING returns to MONITORING after cooldown. 
        PAUSED allows user review. 911 PROMPT is a conditional sub-state.
      </p>
    </div>
  );
}

/* ============================================================
 * 7. CONCEPTUAL FRAMEWORK DIAGRAM
 * ============================================================ */
export function ConceptualFrameworkDiagram() {
  const stages = [
    { number: 1, title: 'Data Acquisition', items: ['Camera video feed (WebRTC)', 'Microphone audio stream', 'User preferences & config', 'Household settings (Cloud)'] },
    { number: 2, title: 'Pre-processing', items: ['RGB → Grayscale (BT.601)', 'Audio normalization', 'Frame alignment', 'Data validation'] },
    { number: 3, title: 'Feature Extraction', items: ['Edge detection (Sobel/Lap)', 'Motion analysis (∂I/∂t)', 'FFT + Band energy + ZCR', 'Speech/pitch detection'] },
    { number: 4, title: 'Detection Models', items: ['COCO-SSD object recognition', 'Person/knife detection', 'Audio event classification', 'Priority scoring'] },
    { number: 5, title: 'Multimodal Fusion', items: ['Visual + audio combination', 'Weighted scoring α(t)', 'Temporal EMA smoothing', 'Confidence rating'] },
    { number: 6, title: 'Decision & Alerting', items: ['Severity classification', 'Threshold evaluation', 'Alert generation', 'Emergency 911 prompt'] },
    { number: 7, title: 'Output & Storage', items: ['Real-time dashboard', 'Cloud alert history', 'Snapshot storage', 'Household notification'] },
  ];

  return (
    <div className="bg-card border border-border rounded-md p-4">
      <p className="text-[10px] font-mono text-primary uppercase tracking-wider mb-3">
        Figure 7 — Conceptual Framework: Methodological Pipeline
      </p>
      <div className="bg-background rounded-md p-6 border border-border">
        {/* Row 1: Steps 1-4 */}
        <div className="flex flex-wrap justify-center items-start gap-2 mb-4">
          {stages.slice(0, 4).map((stage, i) => (
            <div key={stage.number} className="flex items-start gap-2">
              <div className="flex flex-col items-center">
                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold font-mono">
                  {stage.number}
                </div>
              </div>
              <div className="border border-border rounded-lg p-3 w-44 bg-card">
                <p className="text-[11px] font-mono font-bold text-foreground mb-2">{stage.title}</p>
                <ul className="space-y-0.5">
                  {stage.items.map((item, j) => (
                    <li key={j} className="text-[9px] font-mono text-muted-foreground flex items-start gap-1">
                      <span className="text-primary mt-0.5">•</span> {item}
                    </li>
                  ))}
                </ul>
              </div>
              {i < 3 && (
                <div className="flex items-center self-center text-muted-foreground text-lg font-mono">→</div>
              )}
            </div>
          ))}
        </div>

        <div className="flex justify-end pr-20 mb-4">
          <span className="text-muted-foreground text-lg font-mono">↓</span>
        </div>

        {/* Row 2: Steps 5-7 */}
        <div className="flex flex-wrap justify-center items-start gap-2">
          {stages.slice(4).reverse().map((stage, i) => (
            <div key={stage.number} className="flex items-start gap-2">
              {i > 0 && (
                <div className="flex items-center self-center text-muted-foreground text-lg font-mono">←</div>
              )}
              <div className="flex flex-col items-center">
                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold font-mono">
                  {stage.number}
                </div>
              </div>
              <div className="border border-border rounded-lg p-3 w-44 bg-card">
                <p className="text-[11px] font-mono font-bold text-foreground mb-2">{stage.title}</p>
                <ul className="space-y-0.5">
                  {stage.items.map((item, j) => (
                    <li key={j} className="text-[9px] font-mono text-muted-foreground flex items-start gap-1">
                      <span className="text-primary mt-0.5">•</span> {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 pt-3 border-t border-dashed border-border">
          <p className="text-[9px] font-mono text-muted-foreground text-center">
            ↻ Continuous feedback loop — repeats every frame cycle (~30fps)
          </p>
        </div>
      </div>
    </div>
  );
}
