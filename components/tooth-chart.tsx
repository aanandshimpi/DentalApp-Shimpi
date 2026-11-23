"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Box, X } from "lucide-react";
import { maxToothDetailsLength, toothCharts, toothSurfaces, type ToothSurface } from "@/lib/teeth";
import { ToothModel } from "./tooth-model";
import { Button } from "./ui/button";

export type ToothDetails = {
  tooth: string; details: string; diagnosis?: string; procedure?: string;
  suggestedTreatment?: string; surfaces?: ToothSurface[];
};

export function ToothChart({ selected, onChange, procedures = [], findings = false, referenceTeeth = [] }: {
  selected: ToothDetails[];
  onChange: (teeth: ToothDetails[]) => void;
  procedures?: readonly { id: string; label: string }[];
  findings?: boolean; referenceTeeth?: string[];
}) {
  const [chart, setChart] = useState<keyof typeof toothCharts>("Permanent");
  const [multi, setMulti] = useState(false);
  const [active, setActive] = useState<string | null>(null);
  const [angle, setAngle] = useState(-22);
  const dialog = useRef<HTMLDialogElement>(null);
  const fieldId = useId();
  const current = selected.find(({ tooth }) => tooth === active);

  useEffect(() => {
    const element = dialog.current;
    if (current && element && !element.open) element.showModal();
  }, [current]);

  function edit(tooth: string) {
    setActive(tooth);
    setAngle(-22);
  }

  function select(tooth: string) {
    const exists = selected.some((entry) => entry.tooth === tooth);
    if (multi && exists) {
      onChange(selected.filter((entry) => entry.tooth !== tooth));
    } else {
      if (!exists) onChange([...selected, { tooth, details: "" }]);
      if (!multi) edit(tooth);
    }
  }

  function update(values: Partial<ToothDetails>) {
    onChange(selected.map((entry) => entry.tooth === active ? { ...entry, ...values } : entry));
  }

  function remove() {
    dialog.current?.close();
    onChange(selected.filter(({ tooth }) => tooth !== active));
  }

  return <section className="tooth-chart tooth-workspace" aria-labelledby={`${fieldId}-title`}>
    <div className="tooth-workspace-heading">
      <h3 id={`${fieldId}-title`}><Box size={17} /> {findings ? "3D checkup chart" : "3D treatment chart"}</h3>
      <span>{selected.length} selected</span>
    </div>
    <div className="tooth-controls">
      <label htmlFor={`${fieldId}-dentition`}>Tooth set</label>
      <select id={`${fieldId}-dentition`} value={chart} onChange={(event) => setChart(event.target.value as keyof typeof toothCharts)}>
        <option value="Permanent">Permanent (adult)</option>
        <option value="Primary">Primary (child)</option>
      </select>
      <label className="tooth-multi"><input type="checkbox" checked={multi}
        onChange={(event) => setMulti(event.target.checked)} /> Select multiple</label>
    </div>
    <p>{multi ? "Select teeth, then open their details." : "Select a tooth to open its details."} {findings ? "Record teeth with findings." : "Choose the teeth you plan to treat."}</p>
    {referenceTeeth.length > 0 && <p><span className="checkup-marker" aria-hidden="true" /> Teeth marked in the linked checkup</p>}
    <div className="tooth-quadrants">
      {toothCharts[chart].map(({ label, teeth }) => <div key={label} className="tooth-quadrant">
        <h4>{label}</h4>
        <div className="tooth-row" role="group" aria-label={label}>
          {teeth.map((tooth) => <button type="button" className="chart-tooth" key={tooth} onClick={() => select(tooth)}
            aria-label={`Tooth ${tooth}`} data-charted={referenceTeeth.includes(tooth)} aria-pressed={selected.some((entry) => entry.tooth === tooth)}>
            <ToothModel tooth={tooth} />{tooth}
          </button>)}
        </div>
      </div>)}
    </div>
    {selected.length > 0 && <div className="tooth-selection">
      <div className="tooth-selection-chips">
        {selected.map(({ tooth }) => <button key={tooth} type="button" onClick={() => edit(tooth)} aria-label={`Edit tooth ${tooth}`}>{tooth}</button>)}
      </div>
      <Button type="button" variant="outline" onClick={() => edit(selected[0].tooth)}>Open tooth details</Button>
    </div>}
    <input type="hidden" name="teeth" value={JSON.stringify(selected)} />

    <dialog ref={dialog} className="tooth-editor" aria-labelledby={`${fieldId}-editor-title`} onClose={() => setActive(null)}>
      {current && <>
        <header>
          <div><h3 id={`${fieldId}-editor-title`}>Tooth {current.tooth}</h3>
            <p>{findings ? "Consultation findings" : "Treatment plan details"}</p>
          </div>
          <Button size="icon" variant="ghost" type="button" aria-label="Close tooth details" onClick={() => dialog.current?.close()}>
            <X size={20} />
          </Button>
        </header>
        {selected.length > 1 && <div className="tooth-selection-chips" aria-label="Selected teeth">
          {selected.map(({ tooth }) => <button key={tooth} type="button" aria-pressed={tooth === active}
            onClick={() => edit(tooth)} aria-label={`Details for tooth ${tooth}`}>{tooth}</button>)}
        </div>}
        <div className="tooth-preview">
          <ToothModel tooth={current.tooth} angle={angle} large />
          <label>Rotate model<input type="range" min={-180} max={180} value={angle}
            onChange={(event) => setAngle(Number(event.target.value))} /></label>
        </div>
        <fieldset className="tooth-surfaces">
          <legend>Surfaces (optional)</legend>
          {Object.entries(toothSurfaces).map(([surface, label]) => {
            const id = surface as ToothSurface;
            const surfaces = current.surfaces ?? [];
            return <label key={id}><input type="checkbox" checked={surfaces.includes(id)}
              onChange={(event) => update({ surfaces: event.target.checked ? [...surfaces, id] : surfaces.filter((value) => value !== id) })} />{label}</label>;
          })}
        </fieldset>
        <div className="tooth-editor-fields">
          <label htmlFor={`${fieldId}-examination`}>Examination findings</label>
          <textarea id={`${fieldId}-examination`} rows={3} value={current.details} maxLength={maxToothDetailsLength}
            onChange={(event) => update({ details: event.target.value })} />
          <label htmlFor={`${fieldId}-diagnosis`}>Diagnosis</label>
          <textarea id={`${fieldId}-diagnosis`} rows={2} value={current.diagnosis ?? ""} maxLength={maxToothDetailsLength}
            onChange={(event) => update({ diagnosis: event.target.value })} />
          {!findings && <>
            {procedures.length > 0 && <>
              <label htmlFor={`${fieldId}-procedure`}>Treatment option</label>
              <select id={`${fieldId}-procedure`} value={current.procedure ?? ""}
                onChange={(event) => update({ procedure: event.target.value || undefined })}>
                <option value="">Select a specialty procedure</option>
                {procedures.map(({ id, label }) => <option key={id} value={id}>{label}</option>)}
              </select>
            </>}
            <label htmlFor={`${fieldId}-suggested`}>Suggested treatment or notes</label>
            <textarea id={`${fieldId}-suggested`} rows={3} value={current.suggestedTreatment ?? ""} maxLength={maxToothDetailsLength}
              onChange={(event) => update({ suggestedTreatment: event.target.value })} />
          </>}
        </div>
        <footer>
          <Button variant="ghost" type="button" className="remove-chart-tooth" onClick={remove}>Remove tooth</Button>
          <Button type="button" onClick={() => dialog.current?.close()}>Done</Button>
        </footer>
      </>}
    </dialog>
  </section>;
}
